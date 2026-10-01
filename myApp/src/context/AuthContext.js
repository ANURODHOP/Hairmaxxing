import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../config/firebase';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';

import { getUserStatus } from '../components/callables';
import { initializeRevenueCat, loginRevenueCatUser, logoutRevenueCatUser } from '../services/revenuecat';

const AuthContext = createContext();

// ──────────────────────────────────────────────
// AsyncStorage cache keys & TTL
// ──────────────────────────────────────────────
const USER_STATUS_CACHE_KEY = 'user_status_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadCachedUserStatus(uid) {
  try {
    const raw = await AsyncStorage.getItem(`${USER_STATUS_CACHE_KEY}_${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data;
  } catch {
    return null;
  }
}

async function saveUserStatusCache(uid, data) {
  try {
    await AsyncStorage.setItem(
      `${USER_STATUS_CACHE_KEY}_${uid}`,
      JSON.stringify({ data, savedAt: Date.now() })
    );
  } catch {
    // non-critical
  }
}

async function clearUserStatusCache(uid) {
  try {
    await AsyncStorage.removeItem(`${USER_STATUS_CACHE_KEY}_${uid}`);
  } catch {
    // non-critical
  }
}

// ──────────────────────────────────────────────
// Cloud Function call with timeout guard
// ──────────────────────────────────────────────
const CLOUD_FN_TIMEOUT_MS = 8000;

async function fetchUserStatusWithTimeout() {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('getUserStatus timeout')), CLOUD_FN_TIMEOUT_MS)
  );
  return Promise.race([getUserStatus(), timeoutPromise]);
}

// ── Google Sign-In config (module level, runs once) ──
GoogleSignin.configure({
  webClientId: '1000400594570-p4fen6m80e75i5unq51kvdkj8upab5o0.apps.googleusercontent.com',
  offlineAccess: false,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // null = checking, true/false = resolved
  const [isNewUser, setIsNewUser] = useState(null);
  const [hasCompletedSurvey, setHasCompletedSurvey] = useState(null);
  // Cached analysis data so Analyze/Dashboard don't re-fetch
  const [cachedUserData, setCachedUserData] = useState(null);

  useEffect(() => {
    let unsubscribeAuth = () => {};

    const setupApp = async () => {
      // ── Step 0: Initialize RevenueCat (must complete before auth listener) ──
      try {
        await initializeRevenueCat();
      } catch (error) {
        console.warn('RevenueCat initialization warning:', error);
      }

      // ── Step 1: Register auth listener ──
      unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser || null);

        if (currentUser) {
          // ── A: Login RC (safe — RC is configured above) ──
          try {
            await loginRevenueCatUser(currentUser.uid);
          } catch (error) {
            console.warn('RevenueCat login warning:', error);
          }

          // ── B: Load from AsyncStorage cache (instant, no network) ──
          const cached = await loadCachedUserStatus(currentUser.uid);
          
          // Check local survey progress as fallback
          let isSurveyCompletedLocally = false;
          try {
            const surveyProgress = await AsyncStorage.getItem('@hair_survey_progress');
            if (surveyProgress) {
              const parsedSurvey = JSON.parse(surveyProgress);
              if (parsedSurvey?.step4?.hairProblem) {
                isSurveyCompletedLocally = true;
              }
            }
          } catch (e) {
            console.warn('Failed to parse local survey progress', e);
          }

          if (cached) {
            console.log('[AuthContext] ✅ Loaded user status from cache');
            // Override cache if we know for a fact they finished survey locally
            if (isSurveyCompletedLocally) {
              cached.hasCompletedSurvey = true;
              cached.isNewUser = false;
            }
            applyUserStatus(cached);
            setLoading(false);
            
            // ── C: Refresh from Cloud Function in background ──
            refreshFromBackend(currentUser.uid, cached, isSurveyCompletedLocally);
          } else if (isSurveyCompletedLocally) {
            console.log('[AuthContext] No cache, but local survey complete. Unblocking immediately.');
            setIsNewUser(false);
            setHasCompletedSurvey(true);
            setCachedUserData(null);
            setLoading(false);
            
            refreshFromBackend(currentUser.uid, null, true);
          } else {
            // If async doesn't have data, AT FIRST use backend call and save its data into async
            console.log('[AuthContext] No cache — fetching from backend first');
            try {
              const res = await fetchUserStatusWithTimeout();
              const d = res.data || {};
              
              await saveUserStatusCache(currentUser.uid, d);
              applyUserStatus(d);
            } catch (e) {
              console.warn('[AuthContext] Backend failed, applying defaults', e?.message || e);
              setIsNewUser(!isSurveyCompletedLocally);
              setHasCompletedSurvey(isSurveyCompletedLocally);
              setCachedUserData(null);
            }
            setLoading(false);
          }

        } else {
          // ── User logged out ──
          try {
            await logoutRevenueCatUser();
          } catch (error) {
            console.warn('RevenueCat logout warning:', error);
          }
          // Clear stale cache (user ref is the React state from previous render)
          if (user?.uid) {
            await clearUserStatusCache(user.uid);
          }
          setIsNewUser(null);
          setHasCompletedSurvey(null);
          setCachedUserData(null);
          setLoading(false);
        }
      });
    };

    // Helper: apply a user-status object to React state
    function applyUserStatus(d) {
      setIsNewUser(d.isNewUser);
      setHasCompletedSurvey(d.hasCompletedSurvey === true);
      if (d.hasCompletedSurvey && d.presentData) {
        setCachedUserData({
          presentData: d.presentData,
          futureData: d.futureData,
          graphData: d.graphData,
        });
      } else {
        setCachedUserData(null);
      }
    }

    // Helper: background Cloud Function refresh
    async function refreshFromBackend(uid, existingCache, localSurveyCompleted) {
      try {
        const res = await fetchUserStatusWithTimeout();
        const d = res.data;

        if (localSurveyCompleted) {
          d.hasCompletedSurvey = true;
          d.isNewUser = false;
        }

        // Persist to AsyncStorage for next launch
        await saveUserStatusCache(uid, d);

        // Update state — if the data differs from cache/defaults, UI re-renders
        applyUserStatus(d);
        console.log('[AuthContext] ✅ Background refresh complete');
      } catch (error) {
        console.warn('[AuthContext] getUserStatus failed (cache/defaults already applied):', error?.message || error);
        // No-op: cached state or safe defaults are already in place.
        // UI is responsive — user is not blocked.
      }
    }

    setupApp().catch((err) => {
      console.error('[AuthContext] setupApp unhandled error:', err);
      setLoading(false);
    });

    // ✨ GLOBAL SAFETY TIMEOUT ✨
    // Force loading=false after 10 seconds to ensure no one gets permanently stuck
    const fallbackTimer = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('[AuthContext] Global safety timeout triggered! Forcing unblock.');
          // Provide safe defaults so UI doesn't blank screen
          setIsNewUser(prevNew => prevNew === null ? false : prevNew);
          setHasCompletedSurvey(prevSurv => prevSurv === null ? true : prevSurv);
          return false;
        }
        return prev;
      });
    }, 10000);

    return () => {
      unsubscribeAuth();
      clearTimeout(fallbackTimer);
    };
  }, []);


  // ── Google Login ──
  const loginWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken ?? userInfo.idToken;

      if (!idToken) {
        throw new Error('Google ID Token not found');
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, googleCredential);

      return true;
    } catch (error) {
      console.log("Google Login Error:", error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("User cancelled login");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log("Sign in already in progress");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log("Play services not available");
      }

      return false;
    }
  };

  // ── Logout ──
  const logout = async () => {
    try {
      await GoogleSignin.signOut();
      await firebaseSignOut(auth);
      setUser(null);
    } catch (e) {
      console.log('Logout Error:', e);
    }
  };

  // ── Force refresh (callable from any screen) ──
  const refreshUserStatus = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetchUserStatusWithTimeout();
      const d = res.data;
      await saveUserStatusCache(user.uid, d);
      setIsNewUser(d.isNewUser);
      setHasCompletedSurvey(d.hasCompletedSurvey === true);
      if (d.hasCompletedSurvey && d.presentData) {
        setCachedUserData({
          presentData: d.presentData,
          futureData: d.futureData,
          graphData: d.graphData,
        });
      }
    } catch (error) {
      console.warn('[AuthContext] refreshUserStatus error:', error?.message || error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isNewUser,
      hasCompletedSurvey,
      cachedUserData,
      loginWithGoogle,
      logout,
      refreshUserStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
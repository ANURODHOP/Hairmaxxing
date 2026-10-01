import React, { useEffect, useState } from 'react';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import LandingScreen from '../src/screens/landingScreen';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { hasPremiumAccess } from '../src/services/revenuecat';

export default function Index() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { user, loading, isNewUser, hasCompletedSurvey, cachedUserData } = useAuth();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    // Wait for Expo Router layout to mount
    if (!rootNavigationState?.key) return;

    // Wait until auth + cache loading is done
    if (loading) return;

    // Not logged in → stay on landing
    if (!user) return;

    // Prevent double-navigation
    if (navigating) return;

    // Still resolving (shouldn't happen with new AuthContext, but safety net)
    if (isNewUser === null || hasCompletedSurvey === null) return;

    // New user → start survey
    if (isNewUser) {
      setNavigating(true);
      router.replace('/SurveyNameAge');
      return;
    }

    // Returning user who has completed survey
    if (hasCompletedSurvey) {
      // Check if analysis data exists (either from context cache or we'll check Firestore)
      const hasAnalysis = !!(cachedUserData?.presentData);

      if (hasAnalysis) {
        // Analysis done — check premium status via RevenueCat
        setNavigating(true);
        (async () => {
          try {
            const isPremium = await hasPremiumAccess();
            if (isPremium) {
              router.replace('/month');
            } else {
              // Change it to /Dashboard later
              router.replace('/month');
            }
          } catch (e) {
            console.warn('[index] Premium check failed, defaulting to Dashboard:', e);
            router.replace('/Dashboard');
          }
        })();
      } else {
        // No analysis data yet — show Analyze screen
        setNavigating(true);
        router.replace('/Analyze');
      }
      return;
    }

    // Returning user without completed survey → restart survey
    setNavigating(true);
    router.replace('/SurveyNameAge');
  }, [user, loading, isNewUser, hasCompletedSurvey, cachedUserData, rootNavigationState?.key]);


  // Still loading — show a minimal splash instead of a blank white page
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#8BC34A" />
      </View>
    );
  }

  // Logged in — navigation useEffect will fire, render nothing briefly
  if (user) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
      </View>
    );
  }

  // Not logged in → show landing screen
  return <LandingScreen />;
}

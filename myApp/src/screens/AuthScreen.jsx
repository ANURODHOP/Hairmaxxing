import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { hasPremiumAccess } from '../services/revenuecat';

const AuthScreen = () => {
  const router = useRouter();
  const { user, loading: authLoading, isNewUser, hasCompletedSurvey, cachedUserData, loginWithGoogle } = useAuth();

  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // ── After sign-in: route user to the correct screen ──
  useEffect(() => {
    if (!user) return;
    if (authLoading) return;
    if (isNewUser === null || hasCompletedSurvey === null) return;
    if (navigating) return;

    setNavigating(true);

    if (isNewUser) {
      router.replace('/SurveyNameAge');
      return;
    }

    if (hasCompletedSurvey) {
      const hasAnalysis = !!(cachedUserData?.presentData);

      if (hasAnalysis) {
        // Check premium status via RevenueCat
        hasPremiumAccess()
          .then((isPremium) => {
            if (isPremium) {
              router.replace('/month');
            } else {
              router.replace('/Dashboard');
            }
          })
          .catch(() => {
            router.replace('/Dashboard');
          });
      } else {
        router.replace('/Analyze');
      }
      return;
    }

    // Completed no survey yet
    router.replace('/SurveyNameAge');
  }, [user, authLoading, isNewUser, hasCompletedSurvey, cachedUserData]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const success = await loginWithGoogle();

      if (!success) {
        setError('Login failed. Please try again.');
        setLoading(false);
      }
      // If success=true, the useEffect above will handle navigation
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setError('Apple Sign In is coming soon.');
  };

  // Show full-screen loader while auth resolves after sign-in
  if (navigating || (user && authLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#8BC34A" />
        <Text style={styles.loadingText}>Setting up your account…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>✦</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to access your personalized hair analysis and daily plan.
          </Text>
        </View>

        {/* ERROR */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* GOOGLE BUTTON */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#111" />
          ) : (
            <>
              <FontAwesome
                name="google"
                size={20}
                color="#DB4437"
                style={styles.googleLogo}
              />
              <Text style={styles.googleText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* APPLE BUTTON */}
        <TouchableOpacity
          style={styles.appleButton}
          onPress={handleAppleLogin}
          disabled={loading}
          activeOpacity={0.88}
        >
          <Ionicons
            name="logo-apple"
            size={24}
            color="#fff"
            style={styles.appleLogo}
          />
          <Text style={styles.appleText}>Continue with Apple</Text>
        </TouchableOpacity>

        {/* CANCEL */}
        <TouchableOpacity
          style={styles.cancelContainer}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },

  loadingText: {
    color: '#8BC34A',
    fontSize: 15,
    fontWeight: '600',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  header: {
    alignItems: 'center',
    marginBottom: 40,
  },

  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139,195,74,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139,195,74,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  logoIcon: {
    color: '#8BC34A',
    fontSize: 28,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: '#8e8e93',
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  errorContainer: {
    backgroundColor: 'rgba(255,69,58,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.3)',
  },

  errorText: {
    color: '#ff453a',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },

  googleButton: {
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  googleLogo: {
    position: 'absolute',
    left: 22,
  },

  googleText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  appleButton: {
    height: 60,
    backgroundColor: '#171717',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2b2b2b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  appleLogo: {
    position: 'absolute',
    left: 22,
  },

  appleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  cancelContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  cancelText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },

  termsText: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 20,
    paddingHorizontal: 20,
  },
});
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const LandingScreen = () => {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background Image */}
      <Image
        source={require('../assets/landingImg.png')}
        style={styles.backgroundImage}
      />

      {/* Premium Gradient Overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)', '#000']}
        style={styles.overlay}
      />

      <SafeAreaView style={styles.contentContainer}>

        {/* Top Logo */}
        <View style={styles.topSection}>
          <Text style={styles.logoText}>HairMaxxing</Text>
        </View>

        {/* Center Content */}
        <View style={styles.mainContent}>
          <Text style={styles.headline}>Unlock Your</Text>
          <Text style={styles.headlineHighlight}>Full Potential</Text>

          <Text style={styles.subtext}>
            Science-backed tracking, analysis, and visualization for your hair growth journey.
          </Text>
        </View>

        {/* Footer - CTA + Login Redirect */}
        <View style={styles.footer}>

          {/* ✅ FIXED: Navigate to AuthScreen instead of /page */}
          <TouchableOpacity onPress={() => router.push('/AuthScreen')}>
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginLink}>Click here</Text>
            </Text>
          </TouchableOpacity>

          {/* Primary Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryButton}
            onPress={() => router.push('/SurveyNameAge')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

        </View>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 30,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  mainContent: {
    paddingHorizontal: 24,
  },
  headline: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 46,
  },
  headlineHighlight: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  subtext: {
    fontSize: 15.5,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 24,
    maxWidth: '90%',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loginText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  loginLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});

export default LandingScreen;
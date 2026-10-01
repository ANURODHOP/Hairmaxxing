import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Image, Animated, Platform, UIManager,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useRouter } from 'expo-router';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Global state
import { useSurvey } from '../context/useSurvey';

const THEME_PURPLE = '#6C63FF';

const SurveyGender = () => {
  const router = useRouter();

  const { step1Data, setStep1Data } = useSurvey();

  const [selectedGender, setSelectedGender] = useState(null);

  // Animation values
  const confirmOpacity = useRef(new Animated.Value(0)).current;
  const confirmTranslateY = useRef(new Animated.Value(40)).current;
  const confirmScale = useRef(new Animated.Value(0.95)).current;
  const baseOpacity = useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(baseOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(confirmOpacity, {
        toValue: 1,
        duration: 350,
        delay: 150,
        useNativeDriver: true,
      }),
      Animated.spring(confirmTranslateY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        useNativeDriver: true,
      }),
      Animated.spring(confirmScale, {
        toValue: 1,
        damping: 18,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = (callback) => {
    Animated.parallel([
      Animated.timing(confirmOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(confirmTranslateY, {
        toValue: 30,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(baseOpacity, {
        toValue: 1,
        duration: 300,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const handleSelect = (gender) => {
    setSelectedGender(gender);
    // Reset confirm anim values before animating in
    confirmTranslateY.setValue(40);
    confirmScale.setValue(0.95);
    animateIn();
  };

  const handleBack = () => {
    animateOut(() => {
      setSelectedGender(null);
    });
  };

  const handleNext = () => {
    if (!selectedGender) return;
    setStep1Data({ ...step1Data, gender: selectedGender });
    router.push('/surveyWeightHeight');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* BASE SELECTION VIEW */}
      <Animated.View
        style={[styles.contentWrapper, { opacity: baseOpacity }]}
        pointerEvents={selectedGender ? 'none' : 'auto'}
      >
        <View style={styles.progressContainer}>
          <View style={styles.progressSegments}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[styles.segment, step <= 2 && styles.activeSegment]}
              />
            ))}
          </View>
          <Text style={styles.stepText}>Step 2 of 4</Text>
        </View>

        <View style={styles.mainContent}>
          <Text style={styles.headline}>Select Your Gender</Text>
          <Text style={styles.subtext}>
            This helps us calculate accurate metrics and hormonal profiles.
          </Text>
          <View style={styles.selectionContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.genderButton}
              onPress={() => handleSelect('male')}
            >
              <Text style={styles.genderButtonText}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.genderButton}
              onPress={() => handleSelect('female')}
            >
              <Text style={styles.genderButtonText}>Female</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* CONFIRMATION VIEW — overlaid, animated in */}
      {selectedGender && (
        <Animated.View
          style={[
            styles.contentWrapper,
            styles.confirmOverlay,
            {
              opacity: confirmOpacity,
              transform: [
                { translateY: confirmTranslateY },
                { scale: confirmScale },
              ],
            },
          ]}
        >
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.expandedCard}>
            <Image
              source={
                selectedGender === 'male'
                  ? require('../assets/step2man.png')
                  : require('../assets/step2woman.png')
              }
              style={styles.largeImage}
              resizeMode="contain"
            />
            <Text style={styles.confirmationText}>
              {selectedGender === 'male' ? 'Male' : 'Female'}
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.primaryButton}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 35,
  },
  // Positions the confirm view on top of the base view
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  /* Progress */
  progressContainer: { marginBottom: 30 },
  progressSegments: { flexDirection: 'row', justifyContent: 'space-between' },
  segment: {
    flex: 1,
    height: 6,
    backgroundColor: '#222',
    borderRadius: 10,
    marginHorizontal: 4,
  },
  activeSegment: { backgroundColor: '#6C63FF' },
  stepText: {
    color: '#777',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  /* Selection View */
  mainContent: { flex: 1 },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 40,
    lineHeight: 22,
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 50,
  },
  genderButton: {
    width: '100%',
    paddingVertical: 30,
    backgroundColor: '#6C63FF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  genderButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },

  /* Confirmation View */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 15,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  expandedCard: {
    flex: 1,
    width: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  largeImage: {
    width: '100%',
    height: '90%',
  },
  confirmationText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    marginTop: 10,
  },

  /* Footer */
  footer: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default SurveyGender;
/**
 * Premium SurveyNameAge.jsx
 * Startup-grade onboarding screen
 * Smooth wheel picker + premium motion + tactile interactions
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Dimensions,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { useSurvey } from '../context/useSurvey';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */

const ITEM_HEIGHT = 64;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const MIN_AGE = 10;
const MAX_AGE = 100;

const AGES = Array.from(
  { length: MAX_AGE - MIN_AGE + 1 },
  (_, i) => i + MIN_AGE
);

/* ─────────────────────────────────────────────
   Animated Age Item
───────────────────────────────────────────── */

const AgeItem = memo(({ item, selectedAge, onPress }) => {
  const distance = Math.abs(item - selectedAge);

  const opacity =
    distance === 0 ? 1 :
    distance === 1 ? 0.55 :
    distance === 2 ? 0.22 : 0.08;

  const scale =
    distance === 0 ? 1.2 :
    distance === 1 ? 1 :
    distance === 2 ? 0.92 : 0.82;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(item)}
      style={wheel.itemContainer}
    >
      <Animated.Text
        allowFontScaling={false}
        style={[
          wheel.ageText,
          {
            opacity,
            transform: [{ scale }],
            color:
              distance === 0
                ? '#FFFFFF'
                : 'rgba(255,255,255,0.8)',

            fontWeight:
              distance === 0
                ? '900'
                : '600',
          },
        ]}
      >
        {item}
      </Animated.Text>
    </TouchableOpacity>
  );
});

/* ─────────────────────────────────────────────
   Wheel Picker
───────────────────────────────────────────── */

const WheelPicker = ({ value, onChange }) => {
  const listRef = useRef(null);

  const scrollToAge = useCallback(
    (age, animated = true) => {
      const index = age - MIN_AGE;

      listRef.current?.scrollToOffset({
        offset: index * ITEM_HEIGHT,
        animated,
      });
    },
    []
  );

  useEffect(() => {
    setTimeout(() => {
      scrollToAge(value, false);
    }, 50);
  }, []);

  const handleMomentumEnd = useCallback(
    async (e) => {
      const offsetY = e.nativeEvent.contentOffset.y;

      const index = Math.round(offsetY / ITEM_HEIGHT);

      const age = Math.min(
        MAX_AGE,
        Math.max(MIN_AGE, MIN_AGE + index)
      );

      onChange(age);

      Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Medium
      );

      scrollToAge(age);
    },
    [onChange]
  );

  const handlePress = useCallback(
    async (age) => {
      onChange(age);

      Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Light
      );

      scrollToAge(age);
    },
    [onChange]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <AgeItem
        item={item}
        selectedAge={value}
        onPress={handlePress}
      />
    ),
    [value]
  );

  return (
    <View style={wheel.container}>

      {/* Selection Glow */}
      <View style={wheel.selectionBand}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.08)',
            'rgba(255,255,255,0.02)',
          ]}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* Top Fade */}
      <LinearGradient
        pointerEvents="none"
        colors={['#050505', 'transparent']}
        style={[wheel.fade, wheel.fadeTop]}
      />

      {/* Bottom Fade */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', '#050505']}
        style={[wheel.fade, wheel.fadeBottom]}
      />

      <FlatList
        ref={listRef}
        data={AGES}
        keyExtractor={(item) => item.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{
          paddingVertical:
            (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
        }}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */

const SurveyNameAge = () => {
  const router = useRouter();

  const { step1Data, setStep1Data } = useSurvey();

  const [name, setName] = useState(
    step1Data.name || ''
  );

  const [age, setAge] = useState(
    step1Data.age || 22
  );

  const [focused, setFocused] = useState(false);

  const [error, setError] = useState('');

  /* ─────────────────────────────
     Animations
  ───────────────────────────── */

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(
    new Animated.Value(20)
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),

      Animated.spring(translateAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /* ─────────────────────────────
     Validation
  ───────────────────────────── */

  const handleContinue = useCallback(async () => {
    Keyboard.dismiss();

    if (name.trim().length < 2) {
      setError(
        'Please enter your name'
      );

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );

      return;
    }

    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );

    setStep1Data({
      ...step1Data,
      name: name.trim(),
      age,
    });

    router.push('/SurveyGender');
  }, [name, age]);

  const handleNameChange = useCallback(
    (text) => {
      setName(text);

      if (error) setError('');
    },
    [error]
  );

  const progressWidth = useMemo(() => '25%', []);

  return (
    <TouchableWithoutFeedback
      onPress={Keyboard.dismiss}
    >
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[
            '#000000',
            '#050505',
            '#090909',
          ]}
          style={StyleSheet.absoluteFillObject}
        />

        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }
          style={{ flex: 1 }}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: translateAnim,
                  },
                ],
              },
            ]}
          >

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.stepText}>
                Step 1 of 4
              </Text>

              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: progressWidth },
                  ]}
                />
              </View>
            </View>

            {/* Title */}
            <View style={styles.hero}>
              <Text style={styles.title}>
                {name
                  ? `Nice to meet you, ${name}`
                  : 'Tell us about yourself'}
              </Text>

              <Text style={styles.subtitle}>
                We’ll personalize your
                experience based on your profile.
              </Text>
            </View>

            {/* Name */}
            <View style={styles.section}>
              <Text style={styles.label}>
                YOUR NAME
              </Text>

              <TextInput
                value={name}
                onChangeText={handleNameChange}
                placeholder="Enter your first name"
                placeholderTextColor="#666"
                style={[
                  styles.input,
                  focused && styles.inputFocused,
                  error && styles.inputError,
                ]}
                autoCapitalize="words"
                returnKeyType="done"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />

              {!!error && (
                <Text style={styles.errorText}>
                  {error}
                </Text>
              )}
            </View>

            {/* Age */}
            <View style={styles.section}>
              <Text style={styles.label}>
                YOUR AGE
              </Text>

              <View style={styles.ageCard}>
                <WheelPicker
                  value={age}
                  onChange={setAge}
                />
              </View>
            </View>

            {/* Continue */}
            <View style={styles.footer}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.button}
                onPress={handleContinue}
              >
                <LinearGradient
                  colors={[
                    '#FFFFFF',
                    '#F2F2F2',
                  ]}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    Continue
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default SurveyNameAge;

/* ─────────────────────────────────────────────
   Wheel Styles
───────────────────────────────────────────── */

const wheel = StyleSheet.create({
  container: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
  },

  itemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },

  ageText: {
    fontSize: 34,
    letterSpacing: -1.5,
  },

  selectionBand: {
    position: 'absolute',
    top:
      PICKER_HEIGHT / 2 -
      ITEM_HEIGHT / 2,

    left: 12,
    right: 12,
    height: ITEM_HEIGHT,

    borderRadius: 22,

    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.08)',

    zIndex: 10,

    overflow: 'hidden',
  },

  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 90,
    zIndex: 20,
  },

  fadeTop: {
    top: 0,
  },

  fadeBottom: {
    bottom: 0,
  },
});

/* ─────────────────────────────────────────────
   Main Styles
───────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },

  header: {
    marginBottom: 54,
  },

  stepText: {
    color: '#777',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  progressTrack: {
    width: width * 0.34,
    height: 5,
    backgroundColor: '#151515',
    borderRadius: 999,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
  },

  hero: {
    marginBottom: 42,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: -2,
    marginBottom: 14,
  },

  subtitle: {
    color: '#8E8E93',
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
  },

  section: {
    marginBottom: 34,
  },

  label: {
    color: '#7A7A7A',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 14,
    letterSpacing: 1.5,
  },

  input: {
    backgroundColor:
      'rgba(255,255,255,0.04)',

    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.08)',

    borderRadius: 22,

    paddingHorizontal: 22,
    paddingVertical: 20,

    color: '#FFFFFF',

    fontSize: 18,
    fontWeight: '600',
  },

  inputFocused: {
    borderColor:
      'rgba(255,255,255,0.22)',

    shadowColor: '#FFFFFF',

    shadowOpacity: 0.12,
    shadowRadius: 20,

    shadowOffset: {
      width: 0,
      height: 0,
    },
  },

  inputError: {
    borderColor: '#FF453A',
  },

  errorText: {
    color: '#FF453A',
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },

  ageCard: {
    backgroundColor:
      'rgba(255,255,255,0.03)',

    borderRadius: 28,

    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.06)',

    overflow: 'hidden',
  },

  footer: {
    marginTop: 'auto',
  },

  button: {
    borderRadius: 22,

    shadowColor: '#FFFFFF',
    shadowOpacity: 0.18,
    shadowRadius: 24,

    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 8,
  },

  buttonGradient: {
    paddingVertical: 20,
    borderRadius: 22,
    alignItems: 'center',
  },

  buttonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
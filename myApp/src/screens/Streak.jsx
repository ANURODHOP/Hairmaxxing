import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getStreakState } from '../services/streakService';
import Svg, { Circle, Path, Defs, LinearGradient, Stop, G } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function StreakScreen() {
  const router = useRouter();
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadStreak = async () => {
      const state = await getStreakState();
      setStreakData(state);
      setIsLoading(false);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]).start();
    };

    loadStreak();
  }, []);

  const getMotivation = (streak) => {
    if (streak === 0) return "Every journey begins with a single step. Start your streak today!";
    if (streak <= 3) return "You're building momentum. Keep the consistency going!";
    if (streak <= 7) return "A solid week of dedication. You're doing amazing!";
    if (streak <= 14) return "Two weeks strong! Real habits are forming now.";
    if (streak <= 30) return "Unstoppable consistency. Your hair thanks you!";
    return "Legendary status unlocked. You are a master of consistency!";
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0E0A" />
      </SafeAreaView>
    );
  }

  // Circular progress math
  const size = 220;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  
  // Progress ratio (cap visual progress at 30 days for the circle)
  const targetProgress = Math.min(streakData.currentStreak / 30, 1) || 0.05;
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - targetProgress)]
  });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E0A" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STREAK</Text>
        <View style={{ width: 60 }} />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        
        {/* Streak Circle */}
        <View style={styles.circleContainer}>
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#8BC34A" stopOpacity="1" />
                <Stop offset="1" stopColor="#4CAF50" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            
            {/* Background Circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="rgba(139, 195, 74, 0.15)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            
            {/* Progress Circle */}
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#grad)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
            />
          </Svg>
          
          <View style={styles.circleTextContainer}>
            <Text style={styles.streakNumber}>{streakData.currentStreak}</Text>
            <Text style={styles.streakLabel}>Days</Text>
          </View>
        </View>

        {/* Motivational Text */}
        <Text style={styles.motivationText}>
          {getMotivation(streakData.currentStreak)}
        </Text>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statValue}>{streakData.currentStreak}</Text>
            <Text style={styles.statTitle}>Current</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statValue}>{streakData.longestStreak}</Text>
            <Text style={styles.statTitle}>Longest</Text>
          </View>
        </View>

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0E0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backBtn: {
    padding: 10,
    marginLeft: -10,
    width: 60,
  },
  backText: {
    color: '#8BC34A',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 30,
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#8BC34A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  circleTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNumber: {
    color: '#FFF',
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 80,
  },
  streakLabel: {
    color: '#8BC34A',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  motivationText: {
    color: '#D0E8D0',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 50,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 20,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#141E14',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,195,74,0.15)',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  statTitle: {
    color: '#8C9A8C',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

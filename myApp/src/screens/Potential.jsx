import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { getAnalytics } from '../components/callables';
import BottomNavbar from '../components/BottomNavbar';

const CACHE_KEY = 'analyze_cache_v3';
const METRIC_KEYS = ['Hairline', 'Density', 'Scalp Health', 'Thickness', 'Shed Control', 'DHT Blocking'];

export default function PotentialScreen() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cachedUserData } = useAuth();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const loadPotential = async () => {
      try {
        // 1. Try memory cache first
        if (cachedUserData?.presentData) {
          setData({
            present: cachedUserData.presentData['Maxxing Potential'] || cachedUserData.presentData['Overall Hair'] || 0,
            future: cachedUserData.futureData ? (cachedUserData.futureData['Maxxing Potential'] || cachedUserData.futureData['Overall Hair'] || 0) : 0,
            rawPresent: cachedUserData.presentData,
            rawFuture: cachedUserData.futureData || {},
          });
          setIsLoading(false);
          return;
        }

        // 2. Try AsyncStorage offline cache
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setData({
            present: parsed.present['Maxxing Potential'] || parsed.present['Overall Hair'] || 0,
            future: parsed.future['Maxxing Potential'] || parsed.future['Overall Hair'] || 0,
            rawPresent: parsed.present,
            rawFuture: parsed.future,
          });
          setIsLoading(false);
          // fetch silently in background
          fetchFromFirebase();
          return;
        }

        // 3. Fallback to Firebase
        await fetchFromFirebase();

      } catch (e) {
        console.warn('Potential fetch err', e);
        setError("Could not load your potential.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPotential();
  }, [cachedUserData]);

  const fetchFromFirebase = async () => {
    try {
      const res = await getAnalytics();
      if (res.data?.present) {
        const shaped = {
          present: res.data.present,
          future: res.data.future,
          graph: res.data.graph,
        };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(shaped));
        setData({
          present: res.data.present['Maxxing Potential'] || res.data.present['Overall Hair'] || 0,
          future: res.data.future['Maxxing Potential'] || res.data.future['Overall Hair'] || 0,
          rawPresent: res.data.present,
          rawFuture: res.data.future,
        });
      } else {
        setError("No analysis found. Complete your onboarding survey!");
      }
    } catch (e) {
      if (!data) setError("Failed to connect to servers.");
    }
  };

  useEffect(() => {
    if (!isLoading && data) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true })
      ]).start();
    }
  }, [isLoading, data]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E0A" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>YOUR POTENTIAL</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#8BC34A" />
            <Text style={styles.loadingText}>Calculating potential...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : data ? (
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            
            <Text style={styles.introText}>
              Based on your unique AI hair assessment, here is where you stand today and the peak aesthetic you can achieve.
            </Text>

            {/* Starting Potential */}
            <View style={styles.card}>
              <View style={styles.badgeWrapper}>
                <View style={[styles.badgeDot, { backgroundColor: '#6b7280' }]} />
                <Text style={styles.badgeText}>STARTING POTENTIAL</Text>
              </View>
              <Text style={styles.scoreText}>{data.present.toFixed(1)}<Text style={styles.scoreTotal}>/10</Text></Text>
              <Text style={styles.cardDesc}>This is your baseline aesthetic score before starting the regimen.</Text>
            </View>

            {/* Connection Arrow */}
            <View style={styles.arrowContainer}>
              <Text style={styles.arrowIcon}>↓</Text>
            </View>

            {/* Final Potential */}
            <View style={[styles.card, styles.cardActive]}>
              <View style={styles.badgeWrapper}>
                <View style={[styles.badgeDot, { backgroundColor: '#8BC34A' }]} />
                <Text style={styles.badgeTextActive}>FINAL POTENTIAL</Text>
              </View>
              <Text style={styles.scoreTextActive}>{data.future.toFixed(1)}<Text style={styles.scoreTotalActive}>/10</Text></Text>
              <Text style={styles.cardDescActive}>The maximum genetic potential for your hair with 100% adherence to the protocol.</Text>
            </View>

            {/* Difference highlight */}
            <View style={styles.deltaBox}>
              <Text style={styles.deltaText}>
                +{ (data.future - data.present).toFixed(1) } point improvement possible!
              </Text>
            </View>

            {/* Detailed Metrics Breakdown */}
            <View style={styles.metricsWrapper}>
              <Text style={styles.metricsTitle}>POTENTIAL BREAKDOWN</Text>
              
              {METRIC_KEYS.map((key, i) => {
                const p = data?.rawPresent?.[key] || 0;
                const f = data?.rawFuture?.[key] || 0;
                const diff = (f - p).toFixed(1);
                
                return (
                  <View key={key} style={styles.metricRow}>
                    <Text style={styles.metricLabel}>{key.toUpperCase()}</Text>
                    <View style={styles.metricValues}>
                      <Text style={styles.metricOld}>{p.toFixed(1)}</Text>
                      <Text style={styles.metricArrow}>→</Text>
                      <Text style={styles.metricNew}>{f.toFixed(1)}</Text>
                      <View style={styles.metricDelta}>
                        <Text style={styles.metricDeltaText}>+{diff}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

          </Animated.View>
        ) : null}
      </ScrollView>

      <BottomNavbar activeTab="potential" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0E0A',
    paddingVertical: 30
  },
  header: {
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  scroll: {
    padding: 24,
    paddingBottom: 100,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    color: '#8C9A8C',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
  },
  introText: {
    color: '#8C9A8C',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    width: '100%',
    backgroundColor: '#111811',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1C2C1C',
    alignItems: 'center',
  },
  cardActive: {
    backgroundColor: 'rgba(139,195,74,0.08)',
    borderColor: 'rgba(139,195,74,0.3)',
    shadowColor: '#8BC34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  badgeTextActive: {
    color: '#8BC34A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreText: {
    color: '#e5e7eb',
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
  },
  scoreTextActive: {
    color: '#FFF',
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
    textShadowColor: 'rgba(139,195,74,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  scoreTotal: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: '600',
  },
  scoreTotalActive: {
    fontSize: 24,
    color: '#8BC34A',
    fontWeight: '600',
  },
  cardDesc: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardDescActive: {
    color: '#A3CBA3',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  arrowContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIcon: {
    color: '#374151',
    fontSize: 24,
    fontWeight: '800',
  },
  deltaBox: {
    marginTop: 30,
    backgroundColor: '#8BC34A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    marginBottom: 40,
  },
  deltaText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 14,
  },
  metricsWrapper: {
    width: '100%',
    backgroundColor: '#111811',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1C2C1C',
  },
  metricsTitle: {
    color: '#8C9A8C',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2C1C',
    paddingBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  metricLabel: {
    color: '#D0E8D0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricOld: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '700',
  },
  metricArrow: {
    color: '#374151',
    fontSize: 14,
  },
  metricNew: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  metricDelta: {
    backgroundColor: 'rgba(139,195,74,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  metricDeltaText: {
    color: '#8BC34A',
    fontSize: 12,
    fontWeight: '800',
  }
});

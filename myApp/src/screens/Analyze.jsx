import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { getAnalytics } from '../components/callables';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Line,
  G,
  Text as SvgText,
} from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Cache key ─────────────────────────────────────────────────────────────────
const CACHE_KEY = 'hairAnalysisData';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const scoreColor = (s) => (s >= 7.0 ? '#8BC34A' : '#FF9800');
const METRIC_KEYS = ['Hairline', 'Density', 'Scalp Health', 'Thickness', 'Shed Control', 'DHT Blocking'];

const createSmoothLine = (pts) => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  const t = 0.3;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    d +=
      ` C ${(p1.x + (p2.x - p0.x) * t).toFixed(1)} ${(p1.y + (p2.y - p0.y) * t).toFixed(1)},` +
      ` ${(p2.x - (p3.x - p1.x) * t).toFixed(1)} ${(p2.y - (p3.y - p1.y) * t).toFixed(1)},` +
      ` ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
};

const createFillPath = (pts, bottomY) => {
  const line = createSmoothLine(pts);
  return `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${bottomY} L ${pts[0].x.toFixed(1)} ${bottomY} Z`;
};

// ─── Shared: Staggered Fade-In ────────────────────────────────────────────────
const AnimEntry = ({ children, delay = 0, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 480, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 480, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ─── Shared: Hero Card ────────────────────────────────────────────────────────
const HeroCard = ({ label, score, delay, subtitle }) => (
  <AnimEntry delay={delay} style={{ flex: 1 }}>
    <View style={s.heroCard}>
      <Text style={s.heroCardLabel}>{label}</Text>
      <Text style={s.heroCardScore}>{score.toFixed(1)}</Text>
      {subtitle ? <Text style={s.heroCardSub}>from {subtitle}</Text> : null}
      <View style={s.heroCardBar} />
    </View>
  </AnimEntry>
);

// ─── Shared: Metric Card ──────────────────────────────────────────────────────
const MetricCard = ({ label, score, delay, delta }) => {
  const c = scoreColor(score);
  return (
    <AnimEntry delay={delay} style={{ width: (SCREEN_WIDTH - 70) / 2 }}>
      <View style={s.metricCard}>
        <View style={s.metricHeader}>
          <Text style={s.metricLabel}>{label}</Text>
          {delta !== undefined && delta !== null ? (
            <View style={s.metricDeltaChip}>
              <Text style={s.metricDeltaTxt}>+{delta.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[s.metricScore, { color: c }]}>{score.toFixed(1)}</Text>
        <View style={s.metricBar}>
          <View style={[s.metricBarFill, { width: `${score * 10}%`, backgroundColor: c }]} />
        </View>
      </View>
    </AnimEntry>
  );
};

// ─── Shared: Difference Row (Page 3) ─────────────────────────────────────────
const DiffItem = ({ label, present, future, delta, delay }) => (
  <AnimEntry delay={delay}>
    <View style={s.diffCard}>
      <View style={s.diffRow}>
        <Text style={s.diffLabel}>{label}</Text>
        <View style={s.diffScoresWrap}>
          <Text style={s.diffPresent}>{present.toFixed(1)}</Text>
          <Text style={s.diffArrow}>→</Text>
          <Text style={[s.diffFuture, { color: scoreColor(future) }]}>{future.toFixed(1)}</Text>
          <View style={s.diffBadge}>
            <Text style={s.diffBadgeTxt}>+{delta.toFixed(1)}</Text>
          </View>
        </View>
      </View>
      <View style={s.diffBarBg}>
        <View style={[s.diffBarFill, { width: `${future * 10}%` }]} />
        <View style={[s.diffBarMarker, { left: `${present * 10}%` }]} />
      </View>
    </View>
  </AnimEntry>
);

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — Present Analysis
// ═══════════════════════════════════════════════════════════════════════════════
const Page1 = ({ data, onNext }) => {
  const p = data.present;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.pageScroll}>
      {/* Avatar */}
      <AnimEntry delay={60}>
        <View style={s.avatarWrap}>
          <View style={s.avatarRing} />
          <Image source={require('../assets/avatar-user.png')} style={s.avatarImg} />
        </View>
      </AnimEntry>

      {/* Badge */}
      <AnimEntry delay={130}>
        <View style={s.pageBadge}>
          <View style={s.pageBadgeDot} />
          <Text style={s.pageBadgeText}>PRESENT ANALYSIS</Text>
        </View>
      </AnimEntry>

      {/* Hero */}
      <View style={s.heroRow}>
        <HeroCard label="OVERALL HAIR" score={p['Overall Hair']} delay={220} />
        <HeroCard label="MAXXING POTENTIAL" score={p['Maxxing Potential']} delay={300} />
      </View>

      <View style={s.separator} />

      {/* Metrics */}
      <View style={s.metricsGrid}>
        {METRIC_KEYS.map((k, i) => (
          <MetricCard key={k} label={k.toUpperCase()} score={p[k]} delay={360 + i * 60} />
        ))}
      </View>

      <AnimEntry delay={780}>
        <TouchableOpacity style={s.btnNext} activeOpacity={0.8} onPress={onNext}>
          <Text style={s.btnNextText}>Next</Text>
        </TouchableOpacity>
      </AnimEntry>
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — Future Potential (same card format, with delta badges)
// ═══════════════════════════════════════════════════════════════════════════════
const Page2 = ({ data, onNext, onBack }) => {
  const f = data.future;
  const p = data.present;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.pageScroll}>
      <AnimEntry delay={0}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Text style={s.backBtn}>← Back</Text>
        </TouchableOpacity>
      </AnimEntry>

      <AnimEntry delay={60}>
        <View style={s.avatarWrap}>
          <View style={s.avatarRing} />
          <Image source={require('../assets/avatar-user.png')} style={s.avatarImg} />
        </View>
      </AnimEntry>

      <AnimEntry delay={130}>
        <View style={[s.pageBadge, s.pageBadgeAlt]}>
          <View style={s.pageBadgeDot} />
          <Text style={s.pageBadgeText}>FUTURE POTENTIAL</Text>
        </View>
      </AnimEntry>

      <View style={s.heroRow}>
        <HeroCard
          label="OVERALL HAIR"
          score={f['Overall Hair']}
          delay={220}
          subtitle={p['Overall Hair'].toFixed(1)}
        />
        <HeroCard
          label="MAXXING POTENTIAL"
          score={f['Maxxing Potential']}
          delay={300}
          subtitle={p['Maxxing Potential'].toFixed(1)}
        />
      </View>

      <View style={s.separator} />

      <View style={s.metricsGrid}>
        {METRIC_KEYS.map((k, i) => (
          <MetricCard
            key={k}
            label={k.toUpperCase()}
            score={f[k]}
            delay={360 + i * 60}
            delta={f[k] - p[k]}
          />
        ))}
      </View>

      <AnimEntry delay={780}>
        <TouchableOpacity style={s.btnNext} activeOpacity={0.8} onPress={onNext}>
          <Text style={s.btnNextText}>Next</Text>
        </TouchableOpacity>
      </AnimEntry>
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 3 — Graph + All Differences
// ═══════════════════════════════════════════════════════════════════════════════
const Page3 = ({ data, onBack, onDashboard, improvementMetric }) => {
  const gd = data.graph;
  const p = data.present;
  const f = data.future;
  
  const lineAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(lineAnim, {
      toValue: 1,
      duration: 1800,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Chart geometry ──
  const cW = SCREEN_WIDTH - 60;
  const cH = 240;
  const pad = { l: 38, r: 10, t: 12, b: 30 };
  const w = cW - pad.l - pad.r;
  const h = cH - pad.t - pad.b;

  // Dynamic Y range — clamps to data min/max so scores always stay inside the chart.
  const rawMin = Math.min(...gd);
  const rawMax = Math.max(...gd);
  const yMin = Math.max(0, Math.floor(rawMin * 2) / 2 - 0.5);
  const yMax = Math.min(10, Math.ceil(rawMax * 2) / 2 + 0.5);
  const yR = yMax - yMin || 1; // Prevent divide-by-zero if all values equal

  // Build 5 evenly-spaced Y gridlines between yMin and yMax.
  const yStep = (yMax - yMin) / 4;
  const yGrid = Array.from({ length: 5 }, (_, i) => {
    const v = yMin + i * yStep;
    return { y: pad.t + (1 - (v - yMin) / yR) * h, lbl: v.toFixed(1) };
  });

  const pts = gd.map((v, i) => ({
    x: pad.l + (i / (gd.length - 1)) * w,
    y: pad.t + (1 - (v - yMin) / yR) * h,
  }));

  const lineD = createSmoothLine(pts);
  const fillD = createFillPath(pts, pad.t + h);

  const diffs = METRIC_KEYS.map((k) => ({
    label: k.toUpperCase(),
    present: p[k],
    future: f[k],
    delta: f[k] - p[k],
  })).sort((a, b) => b.delta - a.delta);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.pageScroll}>
      <AnimEntry delay={0}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Text style={s.backBtn}>← Back</Text>
        </TouchableOpacity>
      </AnimEntry>

      <AnimEntry delay={60}>
        <Text style={s.graphIntro}>Your projected hair growth trajectory</Text>
      </AnimEntry>

      {/* ── Line Graph ── */}
      <AnimEntry delay={150}>
        <View style={s.graphCard}>
          <Text style={s.graphCardTitle}>12-WEEK PROJECTION</Text>
          <Svg width={cW} height={cH}>
            <Defs>
              <LinearGradient id="lgLine" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#3D6B3D" />
                <Stop offset="100%" stopColor="#8BC34A" />
              </LinearGradient>
              <LinearGradient id="lgFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#8BC34A" stopOpacity="0.25" />
                <Stop offset="100%" stopColor="#8BC34A" stopOpacity="0.01" />
              </LinearGradient>
            </Defs>

            {yGrid.map((g, i) => (
              <G key={`y${i}`}>
                <Line x1={pad.l} y1={g.y} x2={cW - pad.r} y2={g.y} stroke="#182218" strokeWidth={1} />
                <SvgText x={pad.l - 6} y={g.y + 3.5} fill="#3A4A3A" fontSize="9" textAnchor="end">
                  {g.lbl}
                </SvgText>
              </G>
            ))}

            <Path d={fillD} fill="url(#lgFill)" />
            <AnimatedPath
              d={lineD}
              stroke="url(#lgLine)"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={3000}
              strokeDashoffset={lineAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [3000, 0]
              })}
            />

            {pts.map((pt, i) => (
              <Animated.View key={`d${i}`} style={{
                position: 'absolute',
                left: pt.x - (i === pts.length - 1 ? 5 : 2.5),
                top: pt.y - (i === pts.length - 1 ? 5 : 2.5),
                opacity: lineAnim.interpolate({
                  inputRange: [0, i / pts.length, (i + 1) / pts.length, 1],
                  outputRange: [0, 0, 1, 1],
                  extrapolate: 'clamp'
                })
              }}>
                <Svg width={10} height={10}>
                  <Circle
                    cx={i === pts.length - 1 ? 5 : 2.5}
                    cy={i === pts.length - 1 ? 5 : 2.5}
                    r={i === pts.length - 1 ? 5 : 2.5}
                    fill="#8BC34A"
                    stroke="#0A0E0A"
                    strokeWidth={i === pts.length - 1 ? 2.5 : 1.5}
                  />
                </Svg>
              </Animated.View>
            ))}

            {pts.map((pt, i) => (
              <SvgText
                key={`xl${i}`}
                x={pt.x}
                y={cH - 6}
                fill="#3A4A3A"
                fontSize="7.5"
                textAnchor="middle"
                fontWeight="600"
              >
                W{i + 1}
              </SvgText>
            ))}
          </Svg>
        </View>
      </AnimEntry>

      {/* ── Summary Row ── */}
      <AnimEntry delay={320}>
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>START</Text>
            <Text style={s.summaryValue}>{gd[0].toFixed(1)}</Text>
            <Text style={s.summarySub}>Week 1</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>PEAK</Text>
            <Text style={[s.summaryValue, { color: '#8BC34A' }]}>{gd[gd.length - 1].toFixed(1)}</Text>
            <Text style={s.summarySub}>Week 12</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>GROWTH</Text>
            <Text style={[s.summaryValue, { color: '#8BC34A' }]}>+{(gd[gd.length - 1] - gd[0]).toFixed(1)}</Text>
            <Text style={s.summarySub}>Total</Text>
          </View>
        </View>
      </AnimEntry>

      {/* ── Insight ── */}
      <AnimEntry delay={440}>
        <View style={s.insightCard}>
          <Text style={s.insightTitle}>Steady Upward Trend</Text>
          <Text style={s.insightBody}>
            Score improved from {gd[0].toFixed(1)} to {gd[gd.length - 1].toFixed(1)} over 12 weeks. Minor dips
            around Week 2 & 9 are normal — consistency keeps the trajectory positive.
          </Text>
        </View>
      </AnimEntry>

      <View style={s.separator} />

      {/* ── Differences ── */}
      <AnimEntry delay={520}>
        <Text style={s.diffSectionTitle}>SCORE DIFFERENCES</Text>
      </AnimEntry>

      <View style={s.diffList}>
        {diffs.map((d, i) => (
          <DiffItem key={d.label} {...d} delay={580 + i * 55} />
        ))}
      </View>

      {/* ── Improvement Metric Card ── */}
      {improvementMetric ? (
        <AnimEntry delay={880}>
          <View style={s.improvementCard}>
            <Text style={s.improvementLabel}>📈 MILESTONE INSIGHT</Text>
            <Text style={s.improvementText}>{improvementMetric}</Text>
          </View>
        </AnimEntry>
      ) : null}

      <AnimEntry delay={960}>
        <TouchableOpacity style={s.btnNext} activeOpacity={0.8} onPress={onDashboard}>
          <Text style={s.btnNextText}>Continue to Dashboard →</Text>
        </TouchableOpacity>
      </AnimEntry>
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN — Orchestrator
// ═══════════════════════════════════════════════════════════════════════════════
export default function HairRatingsScreen() {
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState(null);
  const [improvementMetric, setImprovementMetric] = useState(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const { cachedUserData } = useAuth();

  // ── Initial data load (resets page, shown on first mount) ──
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. AuthContext in-memory cache (instant, no network)
      if (cachedUserData?.presentData) {
        const shaped = {
          present: cachedUserData.presentData,
          future: cachedUserData.futureData || {},
          graph: cachedUserData.graphData || [],
        };
        setAnalysisData(shaped);
        setPage(0); // Reset page on initial load only
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(shaped));
        setIsLoading(false);
        // Fetch improvement metric in background without resetting page
        reconcileInBackground();
        return;
      }

      // 2. AsyncStorage cache (fast, works offline)
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setAnalysisData(JSON.parse(cached));
        setPage(0);
        setIsLoading(false);
        reconcileInBackground();
        return;
      }

      // 3. First-ever load — full network fetch required
      const res = await getAnalytics();
      if (!res.data?.present) {
        setError('NO_ANALYSIS_YET');
        setIsLoading(false);
        return;
      }
      const shaped = {
        present: res.data.present,
        future: res.data.future,
        graph: res.data.graph,
      };
      setAnalysisData(shaped);
      setImprovementMetric(res.data.improvementMetric || null);
      setPage(0);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(shaped));
    } catch (e) {
      console.error('Analyze fetch error:', e);
      setError(e?.message || 'Failed to load your analysis.');
    } finally {
      setIsLoading(false);
    }
  }, [cachedUserData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Background reconcile (does NOT reset page or isLoading) ──
  const reconcileInBackground = useCallback(async () => {
    try {
      const res = await getAnalytics();
      if (res.data?.present) {
        const fresh = {
          present: res.data.present,
          future: res.data.future,
          graph: res.data.graph,
        };
        // Only update state if data actually changed (prevents flicker)
        setAnalysisData(prev => {
          const prevStr = JSON.stringify(prev);
          const freshStr = JSON.stringify(fresh);
          return prevStr === freshStr ? prev : fresh;
        });
        setImprovementMetric(res.data.improvementMetric || null);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
      }
    } catch (_) {
      // Silent fail — cached data is already displayed
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navigateTo = (target) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setPage(target);
      Animated.timing(fadeAnim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    });
  };

  // ── Loading skeleton — premium shimmer cards instead of a plain spinner ──
  if (isLoading) {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0E0A" />
        <View style={s.skeletonContainer}>
          {/* Skeleton hero row */}
          <View style={s.skeletonHeroRow}>
            <View style={[s.skeletonBlock, { flex: 1, height: 120 }]} />
            <View style={[s.skeletonBlock, { flex: 1, height: 120 }]} />
          </View>
          {/* Skeleton divider */}
          <View style={[s.skeletonBlock, { height: 1, opacity: 0.4 }]} />
          {/* Skeleton metric cards */}
          <View style={s.skeletonMetricRow}>
            {[0, 1].map(i => (
              <View key={i} style={[s.skeletonBlock, { flex: 1, height: 90 }]} />
            ))}
          </View>
          <View style={s.skeletonMetricRow}>
            {[0, 1].map(i => (
              <View key={i} style={[s.skeletonBlock, { flex: 1, height: 90 }]} />
            ))}
          </View>
          <View style={s.skeletonMetricRow}>
            {[0, 1].map(i => (
              <View key={i} style={[s.skeletonBlock, { flex: 1, height: 90 }]} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // No analysis run yet — guide the user to take their photos
  if (error === 'NO_ANALYSIS_YET') {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0E0A" />
        <View style={s.loadingBox}>
          <Text style={s.errorIcon}>📸</Text>
          <Text style={s.errorTitle}>No Analysis Yet</Text>
          <Text style={s.errorMsg}>
            Complete the photo survey to get your personalized hair analysis.
          </Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => router.replace('/SurveyNameAge')}>
            <Text style={s.retryBtnTxt}>Start Analysis</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0E0A" />
        <View style={s.loadingBox}>
          <Text style={s.errorIcon}>⚠️</Text>
          <Text style={s.errorTitle}>Couldn&apos;t Load Analysis</Text>
          <Text style={s.errorMsg}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadData}>
            <Text style={s.retryBtnTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!analysisData) return null;

  const pageLabels = ['PRESENT', 'PROJECTED', 'TRAJECTORY'];

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E0A" />

      <View style={s.topBar}>
        <Text style={s.topLabel}>{pageLabels[page]}</Text>
        <View style={s.dotRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[s.dot, i === page && s.dotActive]} />
          ))}
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {page === 0 && <Page1 data={analysisData} onNext={() => navigateTo(1)} />}
        {page === 1 && (
          <Page2 data={analysisData} onNext={() => navigateTo(2)} onBack={() => navigateTo(0)} />
        )}
        {page === 2 && (
          <Page3
            data={analysisData}
            onBack={() => navigateTo(1)}
            onDashboard={() => router.push('/Dashboard')}
            improvementMetric={improvementMetric}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0E0A' },

  /* Loading / Error */
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  loadingTxt: { color: '#E0E8E0', marginTop: 16, fontSize: 15, fontWeight: '500' },
  errorIcon: { fontSize: 42, marginBottom: 12 },
  errorTitle: { color: '#F0F5F0', fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  errorMsg: { color: '#5A7A5A', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  retryBtn: {
    backgroundColor: '#111A11',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#8BC34A',
  },
  retryBtnTxt: { color: '#8BC34A', fontSize: 14, fontWeight: '700' },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingTop: 14,
    paddingBottom: 6,
  },
  topLabel: { color: '#3A5040', fontSize: 10, fontWeight: '700', letterSpacing: 3 },
  dotRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#1A281A' },
  dotActive: { backgroundColor: '#8BC34A', width: 16, borderRadius: 3 },

  /* Page scroll — 30px vertical padding */
  pageScroll: {
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 140,
  },

  /* Avatar */
  avatarWrap: { alignItems: 'center', marginBottom: 28, position: 'relative' },
  avatarRing: {
    position: 'absolute',
    top: -5,
    left: '50%',
    marginLeft: -53,
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 1.5,
    borderColor: 'rgba(139,195,74,0.22)',
  },
  avatarImg: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: '#1A281A',
  },

  /* Page badge */
  pageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    marginBottom: 30,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(139,195,74,0.07)',
    borderRadius: 20,
  },
  pageBadgeAlt: { backgroundColor: 'rgba(139,195,74,0.12)' },
  pageBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8BC34A' },
  pageBadgeText: { color: '#8BC34A', fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  /* Hero cards */
  heroRow: { flexDirection: 'row', gap: 10 },
  heroCard: {
    backgroundColor: '#111A11',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: '#1C2C1C',
  },
  heroCardLabel: {
    color: '#8CA08C',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  heroCardScore: {
    color: '#F0F5F0',
    fontSize: 50,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 54,
  },
  heroCardSub: { color: '#4A604A', fontSize: 12, fontWeight: '500', marginTop: 2, marginBottom: 8 },
  heroCardBar: { marginTop: 14, width: '60%', height: 3, borderRadius: 2, backgroundColor: '#8BC34A' },

  /* Separator */
  separator: { height: 1, backgroundColor: '#141E14', marginVertical: 22 },

  /* Metrics grid */
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    backgroundColor: '#111A11',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#1C2C1C',
  },
  metricHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  metricLabel: { color: '#8CA08C', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  metricDeltaChip: {
    backgroundColor: 'rgba(139,195,74,0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metricDeltaTxt: { color: '#8BC34A', fontSize: 10, fontWeight: '700' },
  metricScore: { fontSize: 42, fontWeight: '900', letterSpacing: -2, lineHeight: 48, marginBottom: 12 },
  metricBar: { height: 3, borderRadius: 2, backgroundColor: '#1A281A', overflow: 'hidden' },
  metricBarFill: { height: 3, borderRadius: 2 },

  /* Back */
  backBtn: { color: '#8BC34A', fontSize: 14, fontWeight: '600', marginBottom: 8 },

  /* Next button */
  btnNext: {
    marginTop: 32,
    backgroundColor: '#111A11',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A3A2A',
  },
  btnNextText: { color: '#F0F5F0', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  /* ── Page 3: Graph ── */
  graphIntro: {
    color: '#5A7A5A',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  graphCard: {
    backgroundColor: '#111A11',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1C2C1C',
    marginBottom: 22,
  },
  graphCardTitle: {
    color: '#4A604A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    textAlign: 'center',
    marginBottom: 14,
  },

  /* Summary */
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#111A11',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1C2C1C',
  },
  summaryLabel: { color: '#4A604A', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  summaryValue: { color: '#F0F5F0', fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  summarySub: { color: '#3A4A3A', fontSize: 11, fontWeight: '500', marginTop: 4 },

  /* Insight */
  insightCard: {
    backgroundColor: '#111A11',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1C2C1C',
    marginBottom: 4,
  },
  insightTitle: { color: '#F0F5F0', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  insightBody: { color: '#5A7A5A', fontSize: 13, fontWeight: '400', lineHeight: 19 },

  /* Differences */
  diffSectionTitle: { color: '#4A604A', fontSize: 10, fontWeight: '700', letterSpacing: 2.5, marginBottom: 14 },
  diffList: { gap: 8 },
  diffCard: {
    backgroundColor: '#111A11',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1C2C1C',
  },
  diffRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  diffLabel: { color: '#8CA08C', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  diffScoresWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diffPresent: { color: '#4A604A', fontSize: 14, fontWeight: '600' },
  diffArrow: { color: '#2A3A2A', fontSize: 14 },
  diffFuture: { fontSize: 14, fontWeight: '800' },
  diffBadge: {
    backgroundColor: 'rgba(139,195,74,0.12)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 36,
    alignItems: 'center',
  },
  diffBadgeTxt: { color: '#8BC34A', fontSize: 11, fontWeight: '700' },
  diffBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1A281A',
    position: 'relative',
    overflow: 'visible',
  },
  diffBarFill: { height: 4, borderRadius: 2, backgroundColor: '#8BC34A', opacity: 0.3 },
  diffBarMarker: {
    position: 'absolute',
    top: -4,
    width: 2,
    height: 12,
    borderRadius: 1,
    backgroundColor: '#6B8568',
    marginLeft: -1,
  },

  /* Improvement Metric */
  improvementCard: {
    backgroundColor: 'rgba(139,195,74,0.07)',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(139,195,74,0.2)',
    marginBottom: 14,
    marginTop: 8,
  },
  improvementLabel: {
    color: '#8BC34A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  improvementText: {
    color: '#D0E8D0',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },

  /* ── Loading skeleton ── */
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    gap: 12,
  },
  skeletonHeroRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  skeletonMetricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skeletonBlock: {
    backgroundColor: '#141E14',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1C2C1C',
  },
});
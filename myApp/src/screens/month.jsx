import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { getLocalDayKey, getPreviousDayKey, getAppDayNumber } from '../utils/dateUtils';
import { getLastActiveDayKey, setLastActiveDayKey, finalizeDay, syncPendingDays } from '../utils/offlineSync';
import { getStreakState, processMissedDays, evaluateStreak } from '../services/streakService';
import Svg, {
Path,
Circle,
Defs,
LinearGradient,
Stop,
G,
Rect,
Polygon,
Ellipse,
} from 'react-native-svg';

import BottomNavbar from '../components/BottomNavbar.js';
import { auth, db } from '../config/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

// ─── Month data AsyncStorage cache ────────────────────────────────────────────
const MONTH_DATA_CACHE_KEY = 'month_data_cache';
// { displayDays: number, startDateKey: string | null, cachedAt: number }
const MONTH_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function loadMonthDataCache() {
  try {
    const raw = await AsyncStorage.getItem(MONTH_DATA_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Refresh cache if it is older than TTL (stale but still usable for instant render).
    return parsed;
  } catch {
    return null;
  }
}

async function saveMonthDataCache(displayDays, startDateKey) {
  try {
    await AsyncStorage.setItem(
      MONTH_DATA_CACHE_KEY,
      JSON.stringify({ displayDays, startDateKey, cachedAt: Date.now() }),
    );
  } catch {
    // Non-critical — safe to ignore
  }
}

const { width } = Dimensions.get('window');
const CX = width / 2;

const POS = {
start: { x: 74, y: 178 },
month1: { x: CX + 72, y: 295 },
month2: { x: CX - 78, y: 470 },
month3: { x: CX + 68, y: 645 },
final: { x: CX, y: 830 },
};

const PATHS = [
`M ${POS.start.x} ${POS.start.y} C ${POS.start.x + 100} ${POS.start.y + 10}, ${POS.month1.x - 60} ${POS.month1.y - 70}, ${POS.month1.x} ${POS.month1.y}`,
`M ${POS.month1.x} ${POS.month1.y} C ${POS.month1.x + 40} ${POS.month1.y + 80}, ${POS.month2.x + 80} ${POS.month2.y - 80}, ${POS.month2.x} ${POS.month2.y}`,
`M ${POS.month2.x} ${POS.month2.y} C ${POS.month2.x - 40} ${POS.month2.y + 80}, ${POS.month3.x - 80} ${POS.month3.y - 80}, ${POS.month3.x} ${POS.month3.y}`,
`M ${POS.month3.x} ${POS.month3.y} C ${POS.month3.x + 40} ${POS.month3.y + 80}, ${POS.final.x + 60} ${POS.final.y - 80}, ${POS.final.x} ${POS.final.y}`,
];

function bezierMidInfo(path) {
const nums = path.match(/[\d.]+/g)?.map(Number) ?? [];
if (nums.length < 8) return null;
const [x0, y0, cx1, cy1, cx2, cy2, x3, y3] = nums;
const t = 0.55;
const mt = 1 - t;
const mx = mt * mt * mt * x0 + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * x3;
const my = mt * mt * mt * y0 + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * y3;
const dx = 3 * mt * mt * (cx1 - x0) + 6 * mt * t * (cx2 - cx1) + 3 * t * t * (x3 - cx2);
const dy = 3 * mt * mt * (cy1 - y0) + 6 * mt * t * (cy2 - cy1) + 3 * t * t * (y3 - cy2);
const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
return { mx, my, angle };
}

function buildMonths(days) {
return [
{
id: 1,
title: 'MONTH 1',
subtitle: days > 30 ? 'Completed' : `${Math.max(1, days)} / 30 Days`,
progress: Math.min(days / 30, 1),
locked: false,
completed: days > 30,
pos: POS.month1,
align: 'right',
description: 'Foundation Phase',
},
{
id: 2,
title: 'MONTH 2',
subtitle: days > 60 ? 'Completed' : days > 30 ? `${days - 30} / 30 Days` : '30 Days',
progress: days > 30 ? Math.min((days - 30) / 30, 1) : 0,
locked: days <= 30,
completed: days > 60,
pos: POS.month2,
align: 'left',
description: 'Growth Phase',
},
{
id: 3,
title: 'MONTH 3',
subtitle: days > 90 ? 'Completed' : days > 60 ? `${days - 60} / 30 Days` : '30 Days',
progress: days > 60 ? Math.min((days - 60) / 30, 1) : 0,
locked: days <= 60,
completed: days > 90,
pos: POS.month3,
align: 'right',
description: 'Transformation Phase',
},
];
}

function avatarPosition(days) {
if (days <= 0) return POS.start;
if (days <= 30) return POS.month1;
if (days <= 60) return POS.month2;
if (days <= 90) return POS.month3;
return POS.final;
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND — layered gradient + subtle texture
// ═══════════════════════════════════════════════════════════════
const Background = () => {
const W = width;
return (
<G>
<Defs>
<LinearGradient id="bgGrad" x1="0" y1="0" x2="0.3" y2="1">
<Stop offset="0%" stopColor="#0c1a10" />
<Stop offset="40%" stopColor="#081208" />
<Stop offset="100%" stopColor="#050d07" />
</LinearGradient>
<LinearGradient id="mountGrad1" x1="0" y1="0" x2="0" y2="1">
<Stop offset="0%" stopColor="#0f2614" />
<Stop offset="100%" stopColor="#0a1a0d" />
</LinearGradient>
<LinearGradient id="mountGrad2" x1="0" y1="0" x2="0" y2="1">
<Stop offset="0%" stopColor="#0b2010" />
<Stop offset="100%" stopColor="#081408" />
</LinearGradient>
<LinearGradient id="mountGrad3" x1="0" y1="0" x2="0" y2="1">
<Stop offset="0%" stopColor="#091a0c" />
<Stop offset="100%" stopColor="#061006" />
</LinearGradient>
</Defs>

<Rect width={W} height={950} fill="url(#bgGrad)" />
<Ellipse cx={CX} cy={470} rx={W * 0.65} ry={320} fill="#0a1f0e" opacity={0.5} />
<Ellipse cx={CX} cy={470} rx={W * 0.35} ry={200} fill="#0d2511" opacity={0.3} />

<Polygon points={`0,360 60,250 150,310 ${CX - 40},210 ${CX + 60},250 ${W - 140},270 ${W - 50},220 ${W},260 ${W},950 0,950`} fill="url(#mountGrad1)" />
<Polygon points={`0,410 50,320 130,380 ${CX - 20},290 ${CX + 90},330 ${W - 70},310 ${W},350 ${W},950 0,950`} fill="url(#mountGrad2)" />
<Polygon points={`0,470 40,400 120,450 ${CX - 30},380 ${CX + 50},410 ${W - 50},390 ${W},420 ${W},950 0,950`} fill="url(#mountGrad3)" />

{[[12, 515], [30, 495], [6, 545], [24, 625], [8, 655], [40, 605], [18, 735], [38, 715], [4, 780]].map(([tx, ty], i) => (
<G key={`tl${i}`} opacity={0.7 - i * 0.025}>
<Polygon points={`${tx},${ty} ${tx + 10},${ty - 30} ${tx + 20},${ty}`} fill="#0d2a11" />
<Polygon points={`${tx - 2},${ty + 12} ${tx + 10},${ty - 16} ${tx + 22},${ty + 12}`} fill="#0a2210" />
<Rect x={tx + 8} y={ty + 12} width={4} height={12} rx={1} fill="#071008" />
</G>
))}

{[[W - 32, 495], [W - 12, 520], [W - 50, 475], [W - 24, 615], [W - 46, 635], [W - 10, 595], [W - 36, 725], [W - 14, 750], [W - 48, 770]].map(([tx, ty], i) => (
<G key={`tr${i}`} opacity={0.7 - i * 0.025}>
<Polygon points={`${tx - 10},${ty} ${tx},${ty - 30} ${tx + 10},${ty}`} fill="#0d2a11" />
<Polygon points={`${tx - 12},${ty + 12} ${tx},${ty - 16} ${tx + 12},${ty + 12}`} fill="#0a2210" />
<Rect x={tx - 2} y={ty + 12} width={4} height={12} rx={1} fill="#071008" />
</G>
))}

{[[48, 465], [62, 450], [W - 56, 455], [W - 42, 468], [36, 590], [W - 38, 580], [28, 700], [W - 30, 690], [55, 810], [W - 52, 820], [CX - 60, 350], [CX + 55, 360]].map(([cx, cy], i) => (
<Circle key={`dot${i}`} cx={cx} cy={cy} r={2.5} fill="#1e5a28" opacity={0.4} />
))}

<Rect width={W} height={950} fill="#000" opacity={0.15} />
</G>
);
};

// ═══════════════════════════════════════════════════════════════
// PATH LAYER
// ═══════════════════════════════════════════════════════════════
const PathLayer = ({ days }) => {
const segmentActive = (i) => days > i * 30;
return (
<G>
{PATHS.map((d, i) => {
const active = segmentActive(i);
const mid = bezierMidInfo(d);
const endNode = i < 3 ? [POS.month1, POS.month2, POS.month3][i] : POS.final;
return (
<G key={i}>
<Path d={d} stroke={active ? '#22c55e' : '#15291a'} strokeWidth={28} fill="none" strokeLinecap="round" opacity={active ? 0.06 : 0.1} />
<Path d={d} stroke={active ? '#22c55e' : '#15291a'} strokeWidth={16} fill="none" strokeLinecap="round" opacity={active ? 0.14 : 0.18} />
<Path d={d} stroke={active ? '#14532d' : '#0d1f12'} strokeWidth={10} fill="none" strokeLinecap="round" />
<Path d={d} stroke={active ? '#4ade80' : '#264d30'} strokeWidth={5} fill="none" strokeLinecap="round" />
{active && <Path d={d} stroke="#bbf7d0" strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.45} />}
{mid && (
<G transform={`translate(${mid.mx}, ${mid.my}) rotate(${mid.angle})`}>
<Path d="M -8 -5.5 L 0 0 L -8 5.5" stroke={active ? '#4ade80' : '#264d30'} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
</G>
)}
{active && (
<G>
<Circle cx={endNode.x} cy={endNode.y} r={14} fill="#22c55e" opacity={0.08} />
<Circle cx={endNode.x} cy={endNode.y} r={8} fill="#22c55e" stroke="#0a1a0d" strokeWidth={3} />
<Circle cx={endNode.x} cy={endNode.y} r={3} fill="#bbf7d0" opacity={0.6} />
</G>
)}
</G>
);
})}
</G>
);
};

const StartFlag = () => {
const { x, y } = POS.start;
const FLAG_SIZE = 100;
return (
<View style={{ position: 'absolute', left: x - FLAG_SIZE / 2, top: y - FLAG_SIZE - 4, zIndex: 25 }} pointerEvents="none">
<Image source={require('../assets/start-flag.png')} style={{ width: FLAG_SIZE, height: FLAG_SIZE }} resizeMode="contain" />
</View>
);
};

const Avatar = ({ pos }) => {
const bounce = useRef(new Animated.Value(0)).current;
const glow = useRef(new Animated.Value(0.4)).current;

useEffect(() => {
Animated.loop(Animated.sequence([Animated.timing(bounce, { toValue: -6, duration: 1000, useNativeDriver: true }), Animated.timing(bounce, { toValue: 0, duration: 1000, useNativeDriver: true })])).start();
Animated.loop(Animated.sequence([Animated.timing(glow, { toValue: 0.8, duration: 1500, useNativeDriver: true }), Animated.timing(glow, { toValue: 0.4, duration: 1500, useNativeDriver: true })])).start();
}, []);

const SIZE = 76;
return (
<Animated.View style={[styles.avatarWrap, { left: pos.x - SIZE / 2, top: pos.y - SIZE - 10, transform: [{ translateY: bounce }] }]}>
<Animated.View style={[styles.avatarGlow, { opacity: glow }]} />
<Image source={require('../assets/avatar-user.png')} style={styles.avatarImage} resizeMode="contain" />
<View style={styles.avatarShadow} />
</Animated.View>
);
};

const CARD_W = 228;
const CARD_H = 90;

const MonthCard = ({ title, subtitle, progress, locked, completed, pos, align, description, onPress, isExpired }) => {
const scale = useRef(new Animated.Value(1)).current;
const shimmer = useRef(new Animated.Value(0)).current;

useEffect(() => {
if (!locked && !completed) {
Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 2000, useNativeDriver: true })).start();
}
}, [locked, completed]);

const handlePress = () => {
if (locked || isExpired) return;
Animated.sequence([Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }), Animated.spring(scale, { toValue: 1, useNativeDriver: true })]).start(() => onPress?.());
};

const cardTop = pos.y - CARD_H / 2;
const cardLeft = align === 'right' ? pos.x - CARD_W - 14 : pos.x + 14;
const progressPercent = Math.round(progress * 100);

return (
<View style={[styles.cardOuter, { top: cardTop, left: cardLeft }]}>
<TouchableOpacity onPress={handlePress} disabled={locked || isExpired} activeOpacity={0.9}>
<Animated.View style={[styles.card, locked ? styles.cardLocked : completed ? styles.cardDone : styles.cardActive, { transform: [{ scale }] }]}>
{!locked && !completed && (
<Animated.View style={[styles.cardShimmer, { transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-CARD_W, CARD_W] }) }] }]} />
)}
<View style={styles.cardTopRow}>
<View style={[styles.monthBadge, locked ? styles.monthBadgeLocked : styles.monthBadgeActive]}>
<Text style={[styles.monthBadgeText, locked && styles.monthBadgeTextLocked]}>{title}</Text>
</View>
{!locked && !isExpired && (
<View style={styles.cardArrowWrap}>
<Text style={styles.cardArrow}>→</Text>
</View>
)}
</View>
<Text style={[styles.cardDesc, locked && styles.cardDescLocked]}>{description}</Text>
<View style={styles.cardBottomRow}>
<Text style={[styles.cardSub, locked ? styles.cardSubLocked : completed ? styles.cardSubDone : styles.cardSubActive]}>
{locked ? '🔒 Locked' : subtitle}
</Text>
</View>
{!locked && (
<View style={styles.progressTrack}>
<View style={[styles.progressFill, completed ? styles.progressFillDone : styles.progressFillActive, { width: `${progressPercent}%` }]} />
{!completed && <View style={[styles.progressGlow, { left: `${progressPercent}%` }]} />}
</View>
)}
{completed && (
<View style={styles.completedOverlay}>
<Text style={styles.completedCheck}>✓</Text>
</View>
)}
</Animated.View>
</TouchableOpacity>
<View style={[styles.connectorLine, { top: CARD_H / 2 - 1, left: align === 'right' ? CARD_W : 0, width: 14 }]} />
</View>
);
};

const ComingSoonNode = ({ days }) => {
const pulse = useRef(new Animated.Value(1)).current;
const glowOpacity = useRef(new Animated.Value(0.3)).current;

useEffect(() => {
Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1.04, duration: 2000, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true })])).start();
Animated.loop(Animated.sequence([Animated.timing(glowOpacity, { toValue: 0.6, duration: 2000, useNativeDriver: true }), Animated.timing(glowOpacity, { toValue: 0.3, duration: 2000, useNativeDriver: true })])).start();
}, []);

const { x, y } = POS.final;
const allLocked = days < 90;

return (
<View style={[styles.comingSoonOuter, { left: x - 115, top: y - 52 }]}>
<Animated.View style={{ transform: [{ scale: pulse }] }}>
<Animated.View style={[styles.csGlow, { opacity: glowOpacity }]} />
<View style={styles.csIconWrap}>
<Text style={styles.csIcon}>🔒</Text>
</View>
</Animated.View>
<View style={styles.csTextWrap}>
<Text style={styles.csTitle}>COMING SOON</Text>
<Text style={styles.csSub}>{allLocked ? 'Complete Month 3 to unlock' : 'Almost there...'}</Text>
<View style={styles.csDots}>
{[0, 1, 2].map((i) => (
<View key={i} style={[styles.csDot, { backgroundColor: i < Math.floor(days / 30) ? '#22c55e' : '#1a2e1c' }]} />
))}
</View>
</View>
</View>
);
};

const StreakBadge = ({ count, onPress }) => (
<TouchableOpacity style={styles.streakBadge} onPress={onPress} activeOpacity={0.7}>
<Text style={styles.streakFire}>🔥</Text>
<Text style={styles.streakCount}>{count}</Text>
<Text style={styles.streakLabel}>day streak</Text>
</TouchableOpacity>
);

const StatsRow = ({ days }) => {
const overallProgress = Math.min((days / 90) * 100, 100);
return (
<View style={styles.statsRow}>
<View style={styles.statItem}>
<Text style={styles.statValue}>{days}</Text>
<Text style={styles.statLabel}>Days</Text>
</View>
<View style={styles.statDivider} />
<View style={styles.statItem}>
<Text style={styles.statValue}>{Math.round(overallProgress)}%</Text>
<Text style={styles.statLabel}>Progress</Text>
</View>
<View style={styles.statDivider} />
<View style={styles.statItem}>
<Text style={styles.statValue}>{Math.min(Math.floor(days / 30) + 1, 3)}</Text>
<Text style={styles.statLabel}>Phase</Text>
</View>
</View>
);
};

const MAP_HEIGHT = 950;

export default function HairJourneyScreen() {
const router = useRouter();

// ─── Day count state ───────────────────────────────────────────────────────────
// Architecture: AsyncStorage cache renders instantly; Firestore refreshes in background.
const [displayDays, setDisplayDays] = useState(0);
const [isExpired, setIsExpired] = useState(false);
const [isFetching, setIsFetching] = useState(true);

// Derives { displayDays, startDateKey } from a raw Firestore user document.
// Uses timezone-safe getAppDayNumber instead of raw Date arithmetic.
const parseDaysFromUserDoc = useCallback((data) => {
  if (!data || !data.currentPeriodStart) {
    return { displayDays: 1, startDateKey: null };
  }
  const startDate = new Date(data.currentPeriodStart.toMillis());
  const startDateKey = getLocalDayKey(startDate);
  const currentDateKey = getLocalDayKey();
  const days = getAppDayNumber(startDateKey, currentDateKey);
  return { displayDays: Math.max(1, days), startDateKey };
}, []);

// Fetches the Firestore user doc and updates state + cache silently.
// Never blocks the UI — always called after cache has already rendered.
const refreshMonthDataFromFirebase = useCallback(async () => {
  if (!auth.currentUser) return;
  try {
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const data = userDoc.exists() ? userDoc.data() : {};
    const { displayDays: freshDays, startDateKey } = parseDaysFromUserDoc(data);

    // --- TESTING MODE: isActive always true ---
    // PRODUCTION: uncomment below and remove the line after it.
    // const allowedDays = data.planId === 'weekly' ? 7 : data.planId === 'monthly' ? 30 : 90;
    // const isActive = data.subscriptionStatus === 'active' && freshDays <= allowedDays;
    const isActive = true;

    if (isActive) {
      setDisplayDays(freshDays);
      setIsExpired(false);
    } else {
      setDisplayDays(Math.min(freshDays, 30));
      setIsExpired(true);
    }

    // Save to AsyncStorage so next launch is instant.
    await saveMonthDataCache(freshDays, startDateKey);
  } catch (error) {
    // Firebase offline or unavailable — keep cached value, no user-visible error.
    console.warn('[month.jsx] Background Firestore refresh failed (cached data shown):', error);
  }
}, [parseDaysFromUserDoc]);

useEffect(() => {
  const loadMonthData = async () => {
    if (!auth.currentUser) {
      router.replace('/Dashboard');
      return;
    }

    // A. Try AsyncStorage cache — renders in < 5ms, no network needed.
    const cached = await loadMonthDataCache();
    if (cached && typeof cached.displayDays === 'number' && cached.displayDays > 0) {
      let instantDays = cached.displayDays;
      // Re-calculate offline if the calendar day rolled over since last cache save
      if (cached.startDateKey) {
        instantDays = getAppDayNumber(cached.startDateKey, getLocalDayKey());
      }
      setDisplayDays(instantDays);
      setIsFetching(false);
      // B. Silently refresh from Firestore in background (no UI block).
      refreshMonthDataFromFirebase();
    } else {
      // C. First-ever launch — must wait for Firestore once.
      await refreshMonthDataFromFirebase();
      setIsFetching(false);
    }
  };

  loadMonthData();
}, [refreshMonthDataFromFirebase, router]);

const [streakCount, setStreakCount] = useState(0);

useEffect(() => {
  const handleLifecycle = async () => {
    if (isFetching || displayDays === 0) return;
    
    const todayKey = getLocalDayKey();
    const lastActive = await getLastActiveDayKey();

    // Rehydrate local streak state
    const state = await getStreakState();
    setStreakCount(state.currentStreak);

    if (lastActive && lastActive !== todayKey) {
      // Day transition detected!
      const cachedMonth = await loadMonthDataCache();
      let lastActiveDayNumber = displayDays - 1;
      if (cachedMonth && cachedMonth.startDateKey) {
        lastActiveDayNumber = getAppDayNumber(cachedMonth.startDateKey, lastActive);
        
        // Instantly update the display days for the new active day
        const newDisplayDays = getAppDayNumber(cachedMonth.startDateKey, todayKey);
        setDisplayDays(newDisplayDays);
        await saveMonthDataCache(newDisplayDays, cachedMonth.startDateKey);
      }
      
      // Finalize the previous day (evaluates streak, queues for sync, and uploads)
      await finalizeDay(lastActiveDayNumber, lastActive);
      await processMissedDays(todayKey);
      
      const newState = await getStreakState();
      setStreakCount(newState.currentStreak);
    }

    await setLastActiveDayKey(todayKey);
  };

  handleLifecycle();

  const sub = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      handleLifecycle();
    }
  });

  return () => sub.remove();
}, [isFetching, displayDays]);

const handleRenew = () => {
  // Navigate back to Dashboard paywall to subscribe via RevenueCat
  router.replace('/Dashboard');
};
// ═══════════════════════════════════════════════════════════════

const months = useMemo(() => buildMonths(displayDays), [displayDays]);
const avPos = useMemo(() => avatarPosition(displayDays), [displayDays]);

if (isFetching) {
  return (
    <View style={{ flex: 1, backgroundColor: '#060e07', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#22c55e" size="large" />
    </View>
  );
}

return (
<SafeAreaView style={styles.root}>
{/* ── Header ── */}
<View style={styles.header}>
<View>
<View style={styles.headerTop}>
<Text style={styles.headerBrand}>HAIRMAXXING</Text>
<View style={styles.headerDot} />
</View>
<Text style={styles.heading}>Your Journey</Text>
<Text style={styles.headingSub}>90-day transformation roadmap</Text>
</View>
<StreakBadge count={streakCount} onPress={() => router.push('/streak')} />
</View>

{/* ── Stats ── */}
<View style={{ marginVertical: 15 }}>
<StatsRow days={displayDays} />
</View>

{/* ── Map scroll ── */}
<ScrollView
style={styles.scroll}
contentContainerStyle={{
paddingTop: 15,
paddingBottom: isExpired ? 120 : 30
}}
showsVerticalScrollIndicator={false}
scrollEventThrottle={16}
>
<View style={{ width, height: MAP_HEIGHT }}>
<Svg width={width} height={MAP_HEIGHT} style={StyleSheet.absoluteFill}>
<Background />
<PathLayer days={displayDays} />
</Svg>

<StartFlag />
<Avatar pos={avPos} />

{months.map((m) => (
<MonthCard
key={m.id}
{...m}
isExpired={isExpired}
onPress={() => router.push({
pathname: '/day',
params: {
days: String(displayDays),
isExpired: String(isExpired)
}
})}
/>
))}

<ComingSoonNode days={displayDays} />
</View>
</ScrollView>

{/* ═══════════════════════════════════════════════════════════════ */}
{/* 🔥 EXPIRED SUBSCRIPTION OVERLAY BANNER — Commented for testing */}
{/* ═══════════════════════════════════════════════════════════════ */}
{isExpired && (
<View style={styles.expiredBanner}>
<View style={styles.expiredTextWrap}>
<Text style={styles.expiredTitle}>Subscription Ended</Text>
<Text style={styles.expiredSub}>Renew to continue your journey</Text>
</View>
<TouchableOpacity style={styles.renewButton} onPress={handleRenew} activeOpacity={0.8}>
<Text style={styles.renewText}>Renew</Text>
</TouchableOpacity>
</View>
)}

<BottomNavbar activeTab="journey" />
</SafeAreaView>
);
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
root: {
flex: 1,
backgroundColor: '#060e07',
paddingVertical : 30,
},
header: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'flex-start',
paddingHorizontal: 22,
paddingTop: 12,
paddingBottom: 8,
backgroundColor: '#060e07',
},
headerTop: {
flexDirection: 'row',
alignItems: 'center',
gap: 6,
marginBottom: 2,
},
headerBrand: {
fontSize: 10,
fontWeight: '800',
color: '#22c55e',
letterSpacing: 3,
opacity: 0.7,
},
headerDot: {
width: 4,
height: 4,
borderRadius: 2,
backgroundColor: '#22c55e',
opacity: 0.7,
},
heading: {
fontSize: 30,
fontWeight: '900',
color: '#ffffff',
letterSpacing: -1,
lineHeight: 34,
},
headingSub: {
fontSize: 13,
color: '#4b5563',
fontWeight: '500',
marginTop: 2,
letterSpacing: 0.2,
},
statsRow: {
flexDirection: 'row',
alignItems: 'center',
marginHorizontal: 22,
backgroundColor: '#0c1810',
borderRadius: 16,
paddingVertical: 12,
paddingHorizontal: 8,
borderWidth: 1,
borderColor: '#15291a',
...Platform.select({
ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
android: { elevation: 4 },
}),
},
statItem: { flex: 1, alignItems: 'center' },
statValue: { fontSize: 22, fontWeight: '900', color: '#ffffff', letterSpacing: -0.5 },
statLabel: { fontSize: 10, fontWeight: '700', color: '#4b5563', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' },
statDivider: { width: 1, height: 32, backgroundColor: '#1a2e1c' },
streakBadge: {
flexDirection: 'column',
alignItems: 'center',
backgroundColor: '#0f1d13',
borderRadius: 16,
paddingHorizontal: 16,
paddingVertical: 10,
borderWidth: 1,
borderColor: '#1a3520',
gap: 2,
...Platform.select({ ios: { shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 12 } }),
},
streakFire: { fontSize: 22 },
streakCount: { color: '#4ade80', fontSize: 22, fontWeight: '900', letterSpacing: -1, lineHeight: 24 },
streakLabel: { color: '#4b5563', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
scroll: { flex: 1 },
avatarWrap: { position: 'absolute', zIndex: 40, alignItems: 'center' },
avatarGlow: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: '#22c55e', top: -10, left: -10 },
avatarImage: { width: 76, height: 76, borderRadius: 38 },
avatarShadow: { width: 40, height: 8, borderRadius: 20, backgroundColor: '#000', opacity: 0.4, marginTop: 6 },
cardOuter: { position: 'absolute', zIndex: 30 },
card: {
width: CARD_W, height: CARD_H, borderRadius: 18, padding: 14, overflow: 'hidden',
...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 }, android: { elevation: 14 } }),
},
cardActive: { backgroundColor: '#0f2a16', borderWidth: 1.5, borderColor: '#22c55e', ...Platform.select({ ios: { shadowColor: '#22c55e', shadowOpacity: 0.2, shadowRadius: 24 } }) },
cardDone: { backgroundColor: '#0a2012', borderWidth: 1.5, borderColor: '#15803d', ...Platform.select({ ios: { shadowColor: '#15803d', shadowOpacity: 0.15 } }) },
cardLocked: { backgroundColor: '#163c1d', borderWidth: 1, borderColor: '#23462c', opacity: 0.6 },
cardShimmer: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#4ade80', opacity: 0.5, borderRadius: 1 },
cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
monthBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
monthBadgeActive: { backgroundColor: 'rgba(34,197,94,0.12)' },
monthBadgeLocked: { backgroundColor: '#111d14' },
monthBadgeText: { fontSize: 10, fontWeight: '900', color: '#22c55e', letterSpacing: 2 },
monthBadgeTextLocked: { color: '#4b5563' },
cardArrowWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(34,197,94,0.12)', justifyContent: 'center', alignItems: 'center' },
cardArrow: { color: '#4ade80', fontSize: 14, fontWeight: '700' },
cardDesc: { fontSize: 15, fontWeight: '700', color: '#e5e7eb', letterSpacing: -0.2, marginBottom: 4 },
cardDescLocked: { color: '#4b5563' },
cardBottomRow: { marginBottom: 8 },
cardSub: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
cardSubActive: { color: '#6b7280' },
cardSubDone: { color: '#22c55e' },
cardSubLocked: { color: '#354b6f' },
progressTrack: { height: 4, backgroundColor: '#0a150c', borderRadius: 2, overflow: 'visible', position: 'relative' },
progressFill: { height: '100%', borderRadius: 2, position: 'relative' },
progressFillActive: { backgroundColor: '#22c55e' },
progressFillDone: { backgroundColor: '#15803d' },
progressGlow: { position: 'absolute', top: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80', opacity: 0.8, marginLeft: -4 },
completedOverlay: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#15803d', justifyContent: 'center', alignItems: 'center' },
completedCheck: { color: '#bbf7d0', fontSize: 14, fontWeight: '900' },
connectorLine: { position: 'absolute', height: 2, backgroundColor: '#1a3520', opacity: 0.5 },
comingSoonOuter: { position: 'absolute', zIndex: 30, width: 230, flexDirection: 'row', alignItems: 'center', gap: 12 },
csGlow: { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: '#1a3520', top: -8, left: -8 },
csIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#111d14', borderWidth: 1.5, borderColor: '#1a3520', justifyContent: 'center', alignItems: 'center' },
csIcon: { fontSize: 24 },
csTextWrap: { flex: 1 },
csTitle: { color: '#6b7280', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginBottom: 3 },
csSub: { color: '#374151', fontSize: 11, fontWeight: '600', lineHeight: 15, marginBottom: 8 },
csDots: { flexDirection: 'row', gap: 6 },
csDot: { width: 24, height: 4, borderRadius: 2 },

// 🔥 EXPIRED BANNER STYLES — Kept for when you uncomment
expiredBanner: {
position: 'absolute',
bottom: 80,
left: 20,
right: 20,
backgroundColor: '#111111',
borderRadius: 20,
padding: 20,
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
borderWidth: 1,
borderColor: '#333333',
zIndex: 50,
...Platform.select({
ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.6, shadowRadius: 12 },
android: { elevation: 12 },
}),
},
expiredTextWrap: {
flex: 1,
marginRight: 15,
},
expiredTitle: {
color: '#FF4D4D',
fontSize: 16,
fontWeight: '800',
marginBottom: 2,
},
expiredSub: {
color: '#888888',
fontSize: 12,
fontWeight: '500',
},
renewButton: {
backgroundColor: '#FFFFFF',
paddingHorizontal: 20,
paddingVertical: 12,
borderRadius: 12,
},
renewText: {
color: '#000000',
fontSize: 14,
fontWeight: '800',
}
});
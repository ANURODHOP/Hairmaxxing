import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  StatusBar,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { generateWeeklySnapshot } from '../components/callables';

// ─── Bulletproof Markdown Parser ──────────────────────────────────────────
const parseSnapshotText = (text) => {
  if (!text) return [];
  
  const sections = [
    { key: 'snapshot', title: '🪞 THIS WEEK\'S HAIR SNAPSHOT' },
    { key: 'review', title: '📋 YOUR WEEK IN REVIEW' },
    { key: 'built', title: '🔗 WHAT THIS WEEK BUILT' },
    { key: 'potential', title: '💡 YOUR CURRENT POTENTIAL' },
    { key: 'motivation', title: '🌟 MOTIVATION MOMENT' },
    { key: 'closing', title: '🌱 ONE OPTIMISTIC CLOSING LINE' }
  ];

  // Split text using Regex that ignores exact spacing/quoting differences around headers
  const splitRegex = /###\s*🪞.*|###\s*📋.*|###\s*🔗.*|###\s*💡.*|###\s*🌟.*|###\s*🌱.*/g;
  const parts = text.split(splitRegex).filter(part => part.trim().length > 0);

  // Match headers found in the text to map content correctly
  const foundHeaders = text.match(splitRegex) || [];

  return sections.map((sec, index) => {
    // Find the matching header in the actual text (ignoring exact string match)
    const foundIdx = foundHeaders.findIndex(h => h.includes(sec.title.substring(2))); // check by emoji/core text
    const content = foundIdx !== -1 && parts[foundIdx] ? parts[foundIdx].trim() : '';

    return {
      id: sec.key,
      title: sec.title,
      content: content
    };
  }).filter(sec => sec.content.length > 0); // Don't render empty cards
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
  }, [delay, opacity, translateY]);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ─── Skeleton Shimmer Component ────────────────────────────────────────────────
const SkeletonCard = ({ delay }) => (
  <AnimEntry delay={delay} style={styles.card}>
    <View style={styles.skeletonHeader} />
    <View style={styles.skeletonLine} />
    <View style={[styles.skeletonLine, { width: '80%' }]} />
    <View style={styles.skeletonLine} />
  </AnimEntry>
);

export default function WeeklySnapshotScreen() {
  const params = useLocalSearchParams();
  const weekEndDay = params.weekEndDay || '7';
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSnapshot = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid, 'weeklySnapshots', `week_${weekEndDay}`);
        const snap = await getDoc(docRef);

        let rawText = '';
        if (snap.exists() && snap.data().snapshotText) {
          rawText = snap.data().snapshotText;
        } else {
          const res = await generateWeeklySnapshot({ weekEndDay: Number(weekEndDay) });
          rawText = res.data.text;
        }

        const parsed = parseSnapshotText(rawText);
        setSections(parsed);
      } catch (e) {
        console.error('Snapshot fetch error:', e);
        setError('Could not load your weekly review. Ensure you have an active internet connection.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSnapshot();
  }, [weekEndDay]);

  const renderSectionContent = (id, content) => {
    if (!content) return null;

    if (id === 'review') {
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      return lines.map((line, idx) => {
        let bgColor = '#111a11';
        let borderColor = '#1c2c1c';
        
        if (line.includes('✅')) { bgColor = '#0a2e16'; borderColor = '#22c55e'; }
        else if (line.includes('⚠️')) { bgColor = '#2d1b09'; borderColor = '#f59e0b'; }
        else if (line.includes('❌')) { bgColor = '#2e0a16'; borderColor = '#ef4444'; }

        const cleanLine = line.replace(/^(✅|⚠️|❌)\s*/, '');
        // More forgiving regex for Claude's bolding
        const match = cleanLine.match(/\*\*(.*?)\*\*[\s—]*(.*)/);
        
        return (
          <View key={idx} style={[styles.taskRow, { backgroundColor: bgColor, borderColor }]}>
            {line.includes('✅') && <Text style={styles.taskIcon}>✅</Text>}
            {line.includes('⚠️') && <Text style={styles.taskIcon}>⚠️</Text>}
            {line.includes('❌') && <Text style={styles.taskIcon}>❌</Text>}
            <View style={styles.taskTextWrap}>
              {match ? (
                <>
                  <Text style={styles.taskTitle}>{match[1].trim()}</Text>
                  {match[2].trim() ? <Text style={styles.taskDesc}>{match[2].trim()}</Text> : null}
                </>
              ) : (
                <Text style={styles.taskDesc}>{cleanLine}</Text>
              )}
            </View>
          </View>
        );
      });
    }

    if (id === 'snapshot') {
      const bullets = content.split('\n').filter(l => l.trim().length > 0);
      return bullets.map((b, idx) => {
        const cleanLine = b.replace(/^[✦\-*]\s*/, '');
        const match = cleanLine.match(/\*\*(.*?)\*\*[\s—]*(.*)/);
        return (
          <View key={idx} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              {match ? (
                <>
                  <Text style={{ fontWeight: '800', color: '#e5e7eb' }}>{match[1].trim()}</Text>
                  {match[2].trim() ? <Text style={{ color: '#9ca3af' }}> {match[2].trim()}</Text> : null}
                </>
              ) : (
                cleanLine
              )}
            </Text>
          </View>
        );
      });
    }

    return <Text style={styles.paragraph}>{content}</Text>;
  };

  // ─── Loading State with Skeletons ─────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#060e07" />
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerLabel}>WEEKLY SNAPSHOT</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} delay={i * 100} />)}
        </ScrollView>
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#22c55e" />
          <Text style={styles.loadingTxt}>AI is reviewing your week...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#060e07" />
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTxt}>{error}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main Render ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#060e07" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnSm} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerLabel}>WEEKLY SNAPSHOT</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {sections.map((section, idx) => (
          <AnimEntry key={section.id} delay={idx * 120} style={styles.card}>
            <Text style={styles.cardTitle}>{section.title}</Text>
            {renderSectionContent(section.id, section.content)}
          </AnimEntry>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060e07', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  
  // Skeleton Styles
  loadingFooter: { 
    position: 'absolute', bottom: 40, left: 0, right: 0, 
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 
  },
  loadingTxt: { color: '#22c55e', fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  skeletonHeader: { width: '45%', height: 14, backgroundColor: '#152215', borderRadius: 4, marginBottom: 16 },
  skeletonLine: { width: '100%', height: 12, backgroundColor: '#111a11', borderRadius: 4, marginBottom: 10 },
  
  // Error Styles
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorTxt: { color: '#9ca3af', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  backBtn: { backgroundColor: '#111a11', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1c2c1c' },
  backBtnTxt: { color: '#e5e7eb', fontWeight: '700' },
  
  // Header Styles
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, backgroundColor: '#060e07' },
  backBtnSm: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1d13', borderRadius: 12, borderWidth: 1, borderColor: '#1a3520' },
  backArrow: { color: '#4ade80', fontSize: 18, fontWeight: '700' },
  headerLabel: { color: '#22c55e', fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
  
  // Layout Styles
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  card: { backgroundColor: '#0a100a', borderRadius: 18, padding: 22, marginBottom: 16, borderWidth: 1, borderColor: '#152215' },
  cardTitle: { color: '#4ade80', fontSize: 13, fontWeight: '900', letterSpacing: 1, marginBottom: 16 },
  
  // Text Styles
  paragraph: { color: '#d1d5db', fontSize: 15, lineHeight: 24, fontWeight: '500' },
  
  // Bullet Styles (Snapshot)
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginTop: 8, marginRight: 12 },
  bulletText: { color: '#d1d5db', fontSize: 15, lineHeight: 24, flex: 1 },
  
  // Task Styles (Review)
  taskRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  taskIcon: { fontSize: 18, marginRight: 12 },
  taskTextWrap: { flex: 1 },
  taskTitle: { color: '#f3f4f6', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  taskDesc: { color: '#9ca3af', fontSize: 13, fontWeight: '500', lineHeight: 18 },
});
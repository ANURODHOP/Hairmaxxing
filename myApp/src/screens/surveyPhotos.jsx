import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { useSurvey } from '../context/useSurvey';
import { useAuth } from '../context/AuthContext';
import CameraModal from '../components/CameraModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { analyzeHair } from '../components/callables';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Must match the cache key used in Analyze.jsx
const ANALYSIS_CACHE_KEY = 'hairAnalysisData';

// --- SUB-COMPONENTS ---

const QuizSection = ({ question, data, selectedIds, onToggle, onNext, onBack, subtitle }) => (
  <View style={styles.quizContainer}>
    {onBack && (
      <TouchableOpacity onPress={onBack} style={styles.quizBackBtn}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>
    )}
    <View style={styles.questionBlock}>
      <Text style={styles.questionText}>{question}</Text>
      {subtitle ? <Text style={styles.questionSubtext}>{subtitle}</Text> : null}
    </View>
    <ScrollView style={styles.optionsList} contentContainerStyle={styles.optionsListContent}>
      {data.map((option) => {
        const isSelected = selectedIds.includes(option.id);
        return (
          <TouchableOpacity
            key={option.id}
            onPress={() => onToggle(option.id)}
            activeOpacity={0.7}
            style={[styles.optionRow, isSelected && styles.optionRowActive]}
          >
            <View style={styles.optionIconContainer}>
              <Text style={styles.optionIcon}>{option.icon}</Text>
            </View>
            <Text style={[styles.optionTitle, isSelected && styles.optionTitleActive]}>
              {option.title}
            </Text>
            {/* Checkbox instead of radio for multi-select */}
            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
    <View style={styles.footer}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.nextButton, selectedIds.length === 0 && styles.buttonDisabled]}
        onPress={onNext}
        disabled={selectedIds.length === 0}
      >
        <Text style={styles.nextButtonText}>Next</Text>
        <Text style={styles.nextArrow}> ›</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const PhotoCard = ({ step, imageUri, onAddPhoto }) => (
  <TouchableOpacity
    style={styles.verticalCard}
    onPress={() => onAddPhoto(step.key)}
    activeOpacity={0.9}
  >
    {imageUri ? (
      <>
        <Image source={{ uri: imageUri }} style={styles.verticalImage} />
        <View style={styles.verticalOverlay}>
          <View style={styles.verticalLabelContainer}>
            <Text style={styles.verticalLabelText}>{step.label}</Text>
            <View style={styles.checkBadge}>
              <Text style={styles.checkBadgeText}>✓</Text>
            </View>
          </View>
          <View style={styles.changePillSmall}>
            <Text style={styles.changePillSmallText}>Change</Text>
          </View>
        </View>
      </>
    ) : (
      <View style={styles.emptyVerticalContent}>
        <View style={styles.emptyIconCircle}>
          <Text style={styles.emptyIconText}>{step.icon}</Text>
        </View>
        <View style={styles.emptyTextContainer}>
          <Text style={styles.emptyLabel}>{step.label}</Text>
          <Text style={styles.emptySubLabel}>{step.subLabel}</Text>
        </View>
        <View style={styles.addPillSmall}>
          <Text style={styles.addPillSmallText}>Add</Text>
        </View>
      </View>
    )}
  </TouchableOpacity>
);

// --- MAIN COMPONENT ---

const SurveyPhotos = () => {
  const router = useRouter();
  const { user, cachedUserData } = useAuth(); // From your AuthContext
  const { step4Data, setStep4Data, updatePhotos, saveAllDataToFirebase } = useSurvey();

  // Flow State
  const [flowStep, setFlowStep] = useState('q1');

  // Form Data State (Initialized from Context/AsyncStorage)
  const [hairProblems, setHairProblems] = useState(
    Array.isArray(step4Data.hairProblems) ? step4Data.hairProblems
    : step4Data.hairProblem ? [step4Data.hairProblem]
    : []
  );
  const [problemDuration, setProblemDuration] = useState(step4Data.problemDuration || null);
  const [photos, setPhotos] = useState(step4Data.photos || { front: null, top: null, side: null });

  // UI State
  const [loading, setLoading] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [activePhotoType, setActivePhotoType] = useState(null);

  // --- DATA OPTIONS ---
  const problemOptions = [
    { id: 'none', title: 'No Problem', icon: '😎' },
    { id: 'fall', title: 'Hair Fall', icon: '🍂' },
    { id: 'dandruff', title: 'Dandruff', icon: '❄️' },
    { id: 'thinning', title: 'Hair Thinning', icon: '📉' },
    { id: 'receding', title: 'Receding Hairline', icon: '↩️' },
    { id: 'density', title: 'Low Hair Density', icon: '🕳️' },
  ];

  const durationOptions = [
    { id: 'new', title: 'Just Started (< 1 Month)', icon: '🆕' },
    { id: 'short', title: '1 - 3 Months', icon: '🕐' },
    { id: 'medium', title: '3 - 6 Months', icon: '🗓️' },
    { id: 'long', title: '6+ Months', icon: '📅' },
  ];

  const photoSteps = [
    { key: 'front', label: 'Front Selfie', subLabel: 'Face the camera directly', icon: '🧑' },
    { key: 'top', label: 'Top Selfie', subLabel: 'Bird\'s eye view', icon: '🔝' },
    { key: 'side', label: 'Side Selfie', subLabel: 'Profile view', icon: '👤' },
  ];

  // --- LOGIC ---

  /**
   * Toggle a hair problem in/out of the selection.
   * Special rule: selecting 'none' clears everything else; selecting any other
   * problem deselects 'none'.
   */
  const handleToggleProblem = (id) => {
    setHairProblems(prev => {
      let next;
      if (id === 'none') {
        // 'none' is mutually exclusive — selecting it clears all others
        next = prev.includes('none') ? [] : ['none'];
      } else {
        // Remove 'none' if it was selected, then toggle this id
        const without = prev.filter(p => p !== 'none');
        next = without.includes(id) ? without.filter(p => p !== id) : [...without, id];
      }
      setStep4Data(prev2 => ({ ...prev2, hairProblems: next }));
      return next;
    });
  };

  const handleSelectDuration = (id) => {
    setProblemDuration(id);
    setStep4Data(prev => ({ ...prev, problemDuration: id }));
  };

  const handleQ1Next = () => {
    if (hairProblems.includes('none')) {
      setProblemDuration(null);
      setStep4Data(prev => ({ ...prev, problemDuration: null }));
      setFlowStep('photos');
    } else {
      setFlowStep('q2');
    }
  };

  const openCamera = (type) => {
    setActivePhotoType(type);
    setCameraVisible(true);
  };

  const handleCapture = (uri) => {
    setPhotos(prev => ({ ...prev, [activePhotoType]: uri }));
    updatePhotos({ [activePhotoType]: uri });
    setCameraVisible(false);
  };

  const handleGetResult = async () => {
    const allFilled = Object.values(photos).every(p => p !== null);
    if (!allFilled) {
      Alert.alert('Incomplete', 'Please add all three photos to continue.');
      return;
    }

    if (!user) {
      // Not logged in — save locally and send to auth
      setStep4Data(prev => ({ ...prev, hairProblems, problemDuration, photos }));
      router.push('/AuthScreen');
      return;
    }

    setLoading(true);

    try {
      // 1. Save survey text data to Firestore
      setStep4Data(prev => ({ ...prev, hairProblems, problemDuration, photos }));
      await saveAllDataToFirebase();

      // If analysis is already done, use prev data without making a Gemini call
      if (user && cachedUserData && cachedUserData.presentData) {
        const shaped = { 
          present: cachedUserData.presentData, 
          future: cachedUserData.futureData, 
          graph: cachedUserData.graphData 
        };
        await AsyncStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(shaped));
        router.replace('/Analyze');
        return;
      }

      // 2. Convert photo URIs → base64 strings for the Cloud Function
      // Uses expo-image-manipulator (already installed) — no extra package needed
      const toBase64 = async (uri) => {
        const result = await manipulateAsync(
          uri,
          [{ resize: { width: 800 } }], // Resize to keep payload small
          { compress: 0.8, format: SaveFormat.JPEG, base64: true }
        );
        return result.base64;
      };

      const [frontImage, topImage, sideImage] = await Promise.all([
        toBase64(photos.front),
        toBase64(photos.top),
        toBase64(photos.side),
      ]);

      // 3. Call analyzeHair Cloud Function
      const result = await analyzeHair({ frontImage, sideImage, topImage });
      const { present, future, graph } = result.data.data;

      // 4. Cache result locally so Analyze.jsx shows instantly without re-fetching
      const shaped = { present, future, graph };
      await AsyncStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(shaped));

      // 5. Navigate to Analyze screen
      router.replace('/Analyze');

    } catch (e) {
      console.error('Analysis error:', e);
      const msg = e?.message ?? '';

      if (msg.includes('7-day limit')) {
        // Already analyzed recently — navigate to existing results
        Alert.alert(
          'Analysis Recent',
          'Your hair was analyzed recently. Showing your existing results.',
          [{ text: 'View Results', onPress: () => router.replace('/Analyze') }]
        );
      } else {
        Alert.alert(
          'Analysis Failed',
          'Could not complete the AI analysis. Please check your connection and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const filledCount = Object.values(photos).filter(p => p).length;
  const handlePhotoBack = () => {
    if (hairProblems.includes('none')) setFlowStep('q1');
    else setFlowStep('q2');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressSegments}>
          {[1, 2, 3, 4].map((step) => (
            <View key={step} style={[styles.segment, step <= 4 && styles.activeSegment]} />
          ))}
        </View>
        <Text style={styles.stepText}>Step 4 of 4</Text>
      </View>

      {/* Flow Renderer */}
      {flowStep === 'q1' && (
        <QuizSection
          question="What are your hair concerns?"
          subtitle="Select all that apply"
          data={problemOptions}
          selectedIds={hairProblems}
          onToggle={handleToggleProblem}
          onNext={handleQ1Next}
        />
      )}

      {flowStep === 'q2' && (
        <QuizSection
          question="Since how long have you noticed this?"
          data={durationOptions}
          selectedId={problemDuration}
          onSelect={handleSelectDuration}
          onNext={() => setFlowStep('photos')}
          onBack={() => setFlowStep('q1')}
        />
      )}

      {flowStep === 'photos' && (
        <View style={styles.photosMainContainer}>
          <View style={styles.photosHeader}>
            <TouchableOpacity onPress={handlePhotoBack} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerCounter}>{filledCount} of 3 Added</Text>
          </View>

          <Text style={styles.sectionTitle}>AI Analysis</Text>
          <Text style={styles.sectionSubtitle}>
            Upload the following angles for accurate density calculation.
          </Text>

          <ScrollView contentContainerStyle={styles.verticalScrollContent}>
            {photoSteps.map((step) => (
              <PhotoCard
                key={step.key}
                step={step}
                imageUri={photos[step.key]}
                onAddPhoto={openCamera}
              />
            ))}
          </ScrollView>

          <View style={styles.footerOverlay}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.nextButton, filledCount < 3 && styles.buttonDisabled]}
              onPress={handleGetResult}
              disabled={filledCount < 3 || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextButtonText}>Analyze Now</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <CameraModal
        visible={cameraVisible}
        type={activePhotoType}
        onClose={() => setCameraVisible(false)}
        onCapture={handleCapture}
      />
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  progressContainer: { paddingHorizontal: 24, marginBottom: 20, marginTop: 10, paddingTop: 30 },
  progressSegments: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  segment: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10 },
  activeSegment: { backgroundColor: '#4ADE80' },
  stepText: { color: '#555', fontSize: 11, marginTop: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'right' },

  /* Quiz Styles */
  quizContainer: { flex: 1, paddingHorizontal: 24 },
  questionBlock: { marginBottom: 30 },
  questionText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 30 },
  optionsList: { flex: 1 },
  optionsListContent: { paddingBottom: 20 },
  questionSubtext: { color: '#8b7cf8', fontSize: 12, fontWeight: '600', marginTop: 4, opacity: 0.8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  optionRowActive: { backgroundColor: 'rgba(139, 124, 248, 0.15)', borderColor: '#8b7cf8' },
  optionIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  optionIcon: { fontSize: 22 },
  optionTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  optionTitleActive: { color: '#a5b4fc' },
  // Checkbox styles (multi-select)
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginLeft: 10, backgroundColor: 'transparent' },
  checkboxActive: { borderColor: '#8b7cf8', backgroundColor: '#8b7cf8' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '900', lineHeight: 16 },
  quizBackBtn: { marginBottom: 10, padding: 5, marginLeft: -5 },
  backText: { color: '#4ADE80', fontSize: 16, fontWeight: '600' },

  /* Photo Styles */
  photosMainContainer: { flex: 1 },
  photosHeader: { paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { padding: 5 },
  headerCounter: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  sectionTitle: { paddingHorizontal: 24, color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  sectionSubtitle: { paddingHorizontal: 24, color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 },
  verticalScrollContent: { paddingHorizontal: 24, paddingBottom: 120 },
  verticalCard: { width: '100%', height: 180, borderRadius: 24, backgroundColor: '#151518', marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },

  emptyVerticalContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 20 },
  emptyIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  emptyIconText: { fontSize: 28 },
  emptyTextContainer: { flex: 1 },
  emptyLabel: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 4 },
  emptySubLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  addPillSmall: { backgroundColor: '#4ADE80', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  addPillSmallText: { color: '#000', fontWeight: '700', fontSize: 12 },

  verticalImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  verticalOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, backgroundColor: 'rgba(0,0,0,0.7)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  verticalLabelContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  verticalLabelText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  checkBadge: { marginLeft: 10, backgroundColor: '#4ADE80', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  checkBadgeText: { color: '#000', fontSize: 12, fontWeight: '900' },
  changePillSmall: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  changePillSmallText: { color: '#fff', fontWeight: '600', fontSize: 12 },

  footer: { paddingHorizontal: 24, marginTop: 'auto', paddingTop: 10, paddingBottom: 20 },
  footerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(10,10,15,0.95)', padding: 20 },
  nextButton: { backgroundColor: '#4ADE80', paddingVertical: 16, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
  buttonDisabled: { backgroundColor: '#333' },
  nextButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  nextArrow: { color: '#000', fontSize: 18, fontWeight: '700', marginLeft: 5 },
});

export default SurveyPhotos;
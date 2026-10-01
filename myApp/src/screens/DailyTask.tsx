import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { uploadMilestonePhoto } from '../components/callables';
import {
  useNotifications,
  registerForPushNotificationsAsync,
} from '../hooks/useNotifications';
import CameraModal from '../components/CameraModal';
import {
  saveTasksToLocal,
  loadTasksFromLocal,
  enqueueDayForSync,
  syncPendingDays,
} from '../utils/offlineSync';
import {
  isWashDayActive,
  isWeeklyPhotoDay,
  getWashDayInfoText,
  getWashDayButtonText,
  TaskState,
  TaskDef,
  TASKS,
  getTasksForDay,
  areRequiredTasksCompleted,
  getProblemsLabel,
} from '../utils/taskScheduling';

const MILESTONE_DAYS = [7, 14, 21, 28];
const isMilestone = (day: number) => MILESTONE_DAYS.includes(day);
const SURVEY_STORAGE_KEY = '@hair_survey_progress';

const DEFAULT_TASKS: TaskState = {
  washDay: false, scalpMassage: false, topicalTreatment: false, hydration: false, nutrientIntake: false, weeklyPhotoUpload: false,
};


// ── Circular progress bar ──
const CircularProgress: React.FC<{ percent: number; size: number }> = ({ percent, size }) => {
  const radius = (size - 8) / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 5, borderColor: '#1a2e1c' }} />
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 5, borderColor: 'transparent', borderTopColor: '#22c55e', transform: [{ rotate: `${(percent / 100) * 360 - 90}deg` }] }} />
      <Text style={{ color: '#22c55e', fontSize: 14, fontWeight: '900' }}>{Math.round(percent)}%</Text>
    </View>
  );
};

// ── Task card ──
const TaskCard: React.FC<any> = ({ task, done, onToggle, onSpecialAction, index, isEditable, isSpecialTask = false, washDayInfoText, washDayBtnText, weeklyPhotoBtnText }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(done ? 1 : 0)).current;

  useEffect(() => { Animated.spring(checkAnim, { toValue: done ? 1 : 0, useNativeDriver: true }).start(); }, [done]);

  const handlePress = () => {
    if (!isEditable) return;
    Animated.sequence([Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }), Animated.spring(scale, { toValue: 1, useNativeDriver: true })]).start();
    if (isSpecialTask && onSpecialAction) onSpecialAction(); else onToggle();
  };

  const isWashDay = task.key === 'washDay';
  const isWeeklyPhoto = task.key === 'weeklyPhotoUpload';
  const specialBtnLabel = done ? '✓ Done' : isWashDay ? (washDayBtnText ?? 'I washed my scalp today') : isWeeklyPhoto ? (weeklyPhotoBtnText ?? '📷 Take Progress Photo') : '→';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity 
        onPress={!isSpecialTask ? handlePress : undefined} 
        activeOpacity={isEditable && !isSpecialTask ? 0.85 : 1} 
        disabled={!isEditable || isSpecialTask} 
        style={[
          styles.taskCard, 
          done && styles.taskCardDone, 
          !isEditable && styles.taskCardLocked, 
          isSpecialTask && styles.taskCardSpecial
        ]}
      >
        {/* FIX: Use flex-start for special tasks so there's no empty gap/box on the right */}
        <View style={[styles.taskCardTopRow, isSpecialTask && styles.taskCardTopRowSpecial]}>
          <View style={styles.taskLeft}>
            <Text style={styles.taskEmoji}>{task.emoji}</Text>
            <View style={styles.taskTextWrap}>
              <Text style={[styles.taskTitle, done && styles.taskTitleDone, !isEditable && styles.taskTitleLocked]}>{task.title}</Text>
              <Text style={[styles.taskSubtitle, !isEditable && styles.taskSubtitleLocked]}>{task.subtitle}</Text>
            </View>
          </View>
          
          {/* Checkbox ONLY for standard (non-special) tasks */}
          {!isSpecialTask && (isEditable ? (
            <Animated.View style={[styles.checkbox, done && { backgroundColor: task.color, borderColor: task.color }, { transform: [{ scale: checkAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }]}>
              {done && <Text style={styles.checkmark}>✓</Text>}
            </Animated.View>
          ) : (
            <View style={[styles.checkbox, styles.checkboxDisabled]}>{done && <Text style={styles.checkmark}>✓</Text>}</View>
          ))}
        </View>

        {isWashDay && isEditable && washDayInfoText && (<View style={styles.washInfoChip}><Text style={styles.washInfoText}>⏱ {washDayInfoText}</Text></View>)}
        
        {isSpecialTask && isEditable && (
          <TouchableOpacity style={[styles.specialCTABtn, done && styles.specialCTABtnDone, isWeeklyPhoto && !done && styles.specialCTABtnPhoto]} onPress={handlePress} activeOpacity={0.8} disabled={done}>
            <Text style={[styles.specialCTAText, done && styles.specialCTATextDone]}>{specialBtnLabel}</Text>
          </TouchableOpacity>
        )}

        {/* Locked state for special tasks (view-only days) */}
        {isSpecialTask && !isEditable && done && (
          <View style={styles.lockedDoneBadge}>
            <Text style={styles.lockedDoneText}>✓ Completed</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Day Complete animation ──
const DayCompleteBurst: React.FC<{ visible: boolean; isMilestoneDay: boolean; currentDay: number; onDismiss: () => void }> = ({ visible, isMilestoneDay, currentDay, onDismiss }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (visible) { Animated.parallel([Animated.spring(scale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }), Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true })]).start(); } 
    else { opacity.setValue(0); scale.setValue(0.85); }
  }, [visible]);

  if (!visible) return null;

  if (isMilestoneDay) {
    return (
      <Animated.View style={[styles.completeBurst, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.burstEmoji}>🏆</Text>
        <Text style={styles.burstTitle}>Milestone Complete!</Text>
        <Text style={styles.burstSub}>Day {currentDay} achieved. You&apos;re building real habits.</Text>
        <TouchableOpacity style={styles.burstDismiss} onPress={onDismiss}><Text style={styles.burstDismissText}>Continue</Text></TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.subtleBurst, { opacity, transform: [{ scale }] }]}>
      <Text style={styles.subtleBurstText}>✓ Day complete — great consistency!</Text>
    </Animated.View>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════
export default function DailyTaskScreen() {
  const params = useLocalSearchParams<{ day?: string; isEditable?: string }>();
  const currentDay = Math.max(1, parseInt(params.day ?? '1', 10) || 1);
  const isEditable = params.isEditable !== 'false';
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskState>({ ...DEFAULT_TASKS });
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dayComplete, setDayComplete] = useState(false);
  const [milestoneUploading, setMilestoneUploading] = useState(false);
  const [milestoneResult, setMilestoneResult] = useState<string | null>(null);
  const [milestoneAlreadyDone, setMilestoneAlreadyDone] = useState(false);
  const [hairProblems, setHairProblems] = useState<string[]>([]);
  
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraCaptureType, setCameraCaptureType] = useState<'weekly' | 'milestone'>('weekly');
  const [currentMilestoneAngle, setCurrentMilestoneAngle] = useState<number>(0);
  const [milestoneBase64Strings, setMilestoneBase64Strings] = useState<string[]>([]);
  const [weeklyPhotoUploading, setWeeklyPhotoUploading] = useState(false);
  
  const pendingSyncRef = useRef<TaskState | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { scheduleTaskReminder, cancelAllReminders } = useNotifications();
  const isMilestoneDay = isMilestone(currentDay);
  const taskList = getTasksForDay(currentDay, hairProblems);

  const completedCount = taskList.filter(t => tasks[t.key]).length;
  const totalCount = taskList.length;
  const allDone = completedCount === totalCount && totalCount > 0;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  useEffect(() => { registerForPushNotificationsAsync(); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        // Load hair problems from survey cache for dynamic routines
        const surveyRaw = await AsyncStorage.getItem(SURVEY_STORAGE_KEY);
        if (surveyRaw) {
          const survey = JSON.parse(surveyRaw);
          const problems: string[] =
            survey?.step4?.hairProblems ??
            (survey?.step4?.hairProblem ? [survey.step4.hairProblem] : []);
          setHairProblems(problems);
        }

        const localTasks = await loadTasksFromLocal(currentDay);
        if (localTasks) {
          setTasks(localTasks);
          if (Object.values(localTasks).every(Boolean)) setDayComplete(true);
        }
        if (isMilestoneDay) {
          const stored = await AsyncStorage.getItem(`day_${currentDay}_milestone_photo_result`);
          if (stored) { setMilestoneAlreadyDone(true); setMilestoneResult(stored); }
        }
      } catch (e) { console.warn('Load err:', e); } 
      finally { setIsLoadingProgress(false); }
    };
    load();
  }, [currentDay, isMilestoneDay]);

  useEffect(() => {
    if (allDone) return;
    scheduleTaskReminder({ remainingTasks: totalCount - completedCount, delaySeconds: 1800 });
    return () => { cancelAllReminders(); };
  }, []);

  const saveProgress = useCallback(async (taskState: TaskState) => {
    try {
      await saveTasksToLocal(currentDay, taskState);
      
      // Periodically queue for sync and flush to Firebase in the background
      // This ensures daily progress is backed up without blocking the UI
      await enqueueDayForSync(currentDay);
      syncPendingDays(); // Fire and forget upload
      
      pendingSyncRef.current = null;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    } catch (e) { pendingSyncRef.current = taskState; }
  }, [currentDay]);

  // Helper to handle server offline errors gracefully
  const handleUploadError = (e: any, context: string) => {
    console.error(`${context} err:`, e);
    const isServerOffline = e?.code === 'INTERNAL' || e?.message?.includes('INTERNAL') || e?.message?.includes('unavailable');
    
    if (isServerOffline) {
      Alert.alert(
        'Server Offline', 
        'Could not reach the AI server. Please make sure your backend server is running and try again.'
      );
    } else {
      Alert.alert('Upload Failed', `Could not upload ${context.toLowerCase()}. Please try again.`);
    }
  };

  const handleCameraCapture = useCallback(async (photoUri: string, base64String: string | undefined) => {
    
    if (!base64String) {
      Alert.alert("Error", "Could not process image.");
      setCameraVisible(false);
      return;
    }

    if (cameraCaptureType === 'weekly') {
      setCameraVisible(false);
      setWeeklyPhotoUploading(true);
      try {
        const result = await uploadMilestonePhoto({ imageBase64: base64String, currentDay, mimeType: 'image/jpeg' });
        const metric = (result as any).data?.improvementMetric ?? 'Weekly photo saved!';
        await AsyncStorage.setItem(`day_${currentDay}_weekly_photo_result`, metric);
        const newTasks = { ...tasks, weeklyPhotoUpload: true };
        setTasks(newTasks);
        const nowAllDone = areRequiredTasksCompleted(currentDay, newTasks, hairProblems);
        await saveProgress(newTasks);
        if (nowAllDone) { setDayComplete(true); await cancelAllReminders(); }
      } catch (e) { 
        handleUploadError(e, 'Weekly photo'); 
      } finally { setWeeklyPhotoUploading(false); }
      return;
    }

    // MILESTONE 3-STEP
    const newBase64Array = [...milestoneBase64Strings, base64String];
    setMilestoneBase64Strings(newBase64Array);

    if (newBase64Array.length < 3) {
      setCurrentMilestoneAngle(newBase64Array.length); 
      return; 
    }

    setCameraVisible(false);
    setMilestoneUploading(true);

    try {
      // Send all 3 base64 images to the cloud function at once
      const result = await uploadMilestonePhoto({ 
        imagesBase64: newBase64Array, 
        currentDay, 
        mimeType: 'image/jpeg' 
      });
      
      const bestMetric = (result as any).data?.improvementMetric ?? 'All milestone photos saved!';

      await AsyncStorage.setItem(`day_${currentDay}_milestone_photo_result`, bestMetric);
      setMilestoneResult(bestMetric);
      setMilestoneAlreadyDone(true);

      const newTasks = { ...tasks, weeklyPhotoUpload: true };
      setTasks(newTasks);
      const nowAllDone = areRequiredTasksCompleted(currentDay, newTasks, hairProblems);
      await saveProgress(newTasks);
      if (nowAllDone) { setDayComplete(true); await cancelAllReminders(); }
    } catch (e) {
      handleUploadError(e, 'Milestone photos');
    } finally {
      setMilestoneUploading(false);
      setMilestoneBase64Strings([]);
      setCurrentMilestoneAngle(0);
    }
  }, [cameraCaptureType, currentDay, tasks, milestoneBase64Strings, saveProgress, taskList, cancelAllReminders]);

  const toggleTask = useCallback(async (key: keyof TaskState) => {
    if (!isEditable) return;
    const newTasks = { ...tasks, [key]: !tasks[key] };
    setTasks(newTasks);
    // Use the canonical areRequiredTasksCompleted as the single source of truth
    // for day completion — same logic used by streak & sync layers.
    const nowAllDone = areRequiredTasksCompleted(currentDay, newTasks, hairProblems);
    setIsSaving(true);
    await saveProgress(newTasks);
    setIsSaving(false);
    if (nowAllDone) { setDayComplete(true); await cancelAllReminders(); }
  }, [tasks, saveProgress, cancelAllReminders, isEditable, taskList, currentDay]);

  const handleWashDayPress = useCallback(async () => {
    if (!isEditable) return;
    Alert.alert(getWashDayButtonText(), 'Mark scalp washing as complete for today?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => toggleTask('washDay') },
    ]);
  }, [toggleTask, isEditable]);

  const handleWeeklyPhotoPress = useCallback(async () => {
    if (!isEditable) return;
    setCameraCaptureType('weekly');
    setCameraVisible(true);
  }, [isEditable]);

  const handleMilestoneUpload = async () => {
    setCameraCaptureType('milestone');
    setMilestoneBase64Strings([]);
    setCurrentMilestoneAngle(0); 
    setCameraVisible(true);
  };

  useEffect(() => { return () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); }; }, []);

  if (isLoadingProgress) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#060e07" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={{ color: '#4b5563', marginTop: 12, fontSize: 13, fontWeight: '600' }}>Loading routine...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const milestoneLabels = [`Front View (1/3)`, `Right Side View (2/3)`, `Top of Head (3/3)`];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#060e07" />

      <CameraModal
        visible={cameraVisible}
        type={cameraCaptureType === 'milestone' && currentMilestoneAngle === 2 ? 'top' : 'front'}
        onClose={() => {
          setCameraVisible(false);
          setMilestoneBase64Strings([]); 
          setCurrentMilestoneAngle(0);
        }}
        onCapture={handleCameraCapture}
        instructionLabel={cameraCaptureType === 'milestone' ? milestoneLabels[currentMilestoneAngle] : undefined}
      />

      <DayCompleteBurst visible={dayComplete} isMilestoneDay={isMilestoneDay} currentDay={currentDay} onDismiss={() => setDayComplete(false)} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}><Text style={styles.backArrow}>←</Text></TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>HAIRMAXXING</Text>
          <Text style={styles.headerDay}>Day {currentDay}</Text>
          {!isEditable && <Text style={styles.headerSubtitle}>View Only</Text>}
        </View>
        <CircularProgress percent={progressPct} size={52} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {!isEditable && (<View style={styles.readOnlyBanner}><Text style={styles.readOnlyText}>📖 This day is completed. View only.</Text></View>)}

        <View style={styles.subtitleRow}>
          <View style={styles.subtitleBadge}>
            <View style={styles.subtitleDot} />
            <Text style={styles.subtitleText}>
              {isEditable ? "TODAY'S ROUTINE" : `DAY ${currentDay} ROUTINE`}
            </Text>
          </View>
          {hairProblems.length > 0 && !hairProblems.includes('none') && (
            <View style={styles.problemsChip}>
              <Text style={styles.problemsChipText} numberOfLines={1}>
                {getProblemsLabel(hairProblems)}
              </Text>
            </View>
          )}
          {(isSaving || weeklyPhotoUploading || milestoneUploading) && (<ActivityIndicator size="small" color="#4ade80" style={{ marginLeft: 8 }} />)}
        </View>

        <Text style={styles.progressLabel}>{completedCount} of {totalCount} tasks completed</Text>

        <View style={styles.taskList}>
          {taskList.map((task, i) => {
            const isWashDayTask = task.key === 'washDay';
            const isWeeklyPhotoTask = task.key === 'weeklyPhotoUpload';
            return (
              <TaskCard key={task.key} task={task} done={!!tasks[task.key]} onToggle={() => toggleTask(task.key)}
                onSpecialAction={isWashDayTask ? handleWashDayPress : isWeeklyPhotoTask ? handleWeeklyPhotoPress : undefined}
                index={i} isEditable={isEditable} isSpecialTask={isWashDayTask || isWeeklyPhotoTask}
                washDayInfoText={isWashDayTask ? getWashDayInfoText() : undefined}
                washDayBtnText={isWashDayTask ? getWashDayButtonText() : undefined}
                weeklyPhotoBtnText={isWeeklyPhotoTask ? '📷 Take Progress Photo' : undefined}
              />
            );
          })}
        </View>

        {allDone && !dayComplete && (
          <View style={styles.allDoneBanner}>
            <Text style={styles.allDoneEmoji}>{isMilestoneDay ? '🏆' : '✓'}</Text>
            <Text style={styles.allDoneText}>All tasks done for Day {currentDay}!</Text>
          </View>
        )}

        {isMilestoneDay && (
          <View style={styles.milestoneCard}>
            <View style={styles.milestoneHeader}>
              <Text style={styles.milestoneBadge}>📸 MILESTONE CHECK-IN</Text>
              <Text style={styles.milestoneDay}>Day {currentDay}</Text>
            </View>
            <Text style={styles.milestoneDesc}>
              Day {currentDay} is a milestone! You will be prompted to take 3 photos (Front, Side, Top) so the AI can accurately measure improvement.
            </Text>

            {milestoneResult ? (
              <View style={styles.metricResult}>
                <Text style={styles.metricResultLabel}>📈 AI IMPROVEMENT METRIC</Text>
                <Text style={styles.metricResultText}>{milestoneResult}</Text>
              </View>
            ) : null}

            {!milestoneAlreadyDone && (
              <TouchableOpacity style={[styles.uploadBtn, milestoneUploading && styles.uploadBtnDisabled]} onPress={handleMilestoneUpload} disabled={milestoneUploading} activeOpacity={0.8}>
                {milestoneUploading ? (<ActivityIndicator size="small" color="#0a1a0d" />) : (<Text style={styles.uploadBtnText}>📷  Take 3 Progress Photos</Text>)}
              </TouchableOpacity>
            )}

            {milestoneAlreadyDone && (<View style={styles.uploadedBadge}><Text style={styles.uploadedText}>✓ All 3 Photos uploaded</Text></View>)}
          </View>
        )}

        {isMilestoneDay && allDone && (
          <View style={{ marginTop: 16 }}>
            <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: '#0a2e16', borderWidth: 1, borderColor: '#22c55e' }]} activeOpacity={0.8} onPress={() => router.push({ pathname: '/WeeklySnapshot', params: { weekEndDay: String(currentDay) } })}>
              <Text style={[styles.uploadBtnText, { color: '#4ade80' }]}>✨ Get Weekly HairAI Review</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060e07', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, backgroundColor: '#060e07' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1d13', borderRadius: 12, borderWidth: 1, borderColor: '#1a3520' },
  backArrow: { color: '#4ade80', fontSize: 18, fontWeight: '700' },
  headerCenter: { alignItems: 'center' },
  headerLabel: { color: '#22c55e', fontSize: 9, fontWeight: '800', letterSpacing: 3, opacity: 0.7 },
  headerDay: { color: '#ffffff', fontSize: 28, fontWeight: '900', letterSpacing: -1, lineHeight: 32 },
  headerSubtitle: { color: '#6b7280', fontSize: 11, fontWeight: '500', marginTop: 4 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 },
  subtitleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  subtitleDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#22c55e' },
  subtitleText: { color: '#22c55e', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  problemsChip: { backgroundColor: 'rgba(139,124,248,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(139,124,248,0.25)', maxWidth: 180 },
  problemsChipText: { color: '#a5b4fc', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  progressLabel: { color: '#4b5563', fontSize: 13, fontWeight: '600', marginBottom: 20, marginTop: 4 },
  taskList: { gap: 12, marginBottom: 20 },
  
  // FIX: Added special row style to remove empty gap
  taskCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taskCardTopRowSpecial: { justifyContent: 'flex-start' },
  
  taskCardSpecial: { paddingBottom: 14 },
  taskCard: { backgroundColor: '#0c1810', borderRadius: 18, padding: 18, borderWidth: 1.5, borderColor: '#15291a', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  taskCardDone: { borderColor: '#22c55e', backgroundColor: '#0a1e10', ...Platform.select({ ios: { shadowColor: '#22c55e', shadowOpacity: 0.12 } }) },
  taskLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  taskEmoji: { fontSize: 26 },
  taskTextWrap: { flex: 1 },
  taskTitle: { color: '#e5e7eb', fontSize: 16, fontWeight: '700', marginBottom: 3, letterSpacing: -0.2 },
  taskTitleDone: { color: '#4ade80' },
  taskSubtitle: { color: '#4b5563', fontSize: 12, fontWeight: '500', lineHeight: 16 },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#1a3520', backgroundColor: '#0c1810', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  checkmark: { color: '#000', fontSize: 14, fontWeight: '900' },
  
  // FIX: Added proper "Completed" badge for locked special tasks instead of floating checkbox
  lockedDoneBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  lockedDoneText: { color: '#4ade80', fontSize: 12, fontWeight: '700' },

  allDoneBanner: { backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)', marginBottom: 20 },
  allDoneEmoji: { fontSize: 24 },
  allDoneText: { color: '#4ade80', fontSize: 15, fontWeight: '700', flex: 1 },
  completeBurst: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,14,7,0.95)', zIndex: 100, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  burstEmoji: { fontSize: 72, marginBottom: 18 },
  burstTitle: { color: '#ffffff', fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 10, textAlign: 'center' },
  burstSub: { color: '#4b5563', fontSize: 15, fontWeight: '500', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  burstDots: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  burstDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  burstDismiss: { backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 48 },
  burstDismissText: { color: '#0a1a0d', fontSize: 16, fontWeight: '900' },
  subtleBurst: { position: 'absolute', bottom: 100, left: 24, right: 24, backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, zIndex: 50, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', alignItems: 'center' },
  subtleBurstText: { color: '#4ade80', fontSize: 14, fontWeight: '700' },
  milestoneCard: { backgroundColor: '#0c1810', borderRadius: 20, padding: 20, borderWidth: 1.5, borderColor: 'rgba(74,222,128,0.3)', marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }, android: { elevation: 6 } }) },
  milestoneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  milestoneBadge: { color: '#4ade80', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  milestoneDay: { color: '#1a3520', fontSize: 12, fontWeight: '700', backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  milestoneDesc: { color: '#6b7280', fontSize: 13, lineHeight: 19, marginBottom: 16, fontWeight: '500' },
  uploadBtn: { backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { color: '#0a1a0d', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  uploadedBadge: { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  uploadedText: { color: '#4ade80', fontSize: 14, fontWeight: '700' },
  metricResult: { backgroundColor: 'rgba(34,197,94,0.07)', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)' },
  metricResultLabel: { color: '#4ade80', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  metricResultText: { color: '#d1fae5', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  taskCardLocked: { opacity: 0.65, borderColor: '#0f1a12' },
  taskTitleLocked: { color: '#4b5563' },
  taskSubtitleLocked: { color: '#374151' },
  checkboxDisabled: { opacity: 0.5, borderColor: '#0f1a12' },
  specialCTABtn: { marginTop: 14, backgroundColor: '#0f2a16', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#22c55e', justifyContent: 'center', alignItems: 'center', width: '100%' },
  specialCTABtnDone: { backgroundColor: '#0a2012', borderColor: '#15803d' },
  specialCTABtnPhoto: { backgroundColor: '#1a1a05', borderColor: '#f59e0b' },
  specialCTAText: { color: '#4ade80', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  specialCTATextDone: { color: '#22c55e' },
  washInfoChip: { marginTop: 8, backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  washInfoText: { color: '#10b981', fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },
  readOnlyBanner: { backgroundColor: 'rgba(107,115,128,0.1)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(107,115,128,0.2)' },
  readOnlyText: { color: '#6b7280', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
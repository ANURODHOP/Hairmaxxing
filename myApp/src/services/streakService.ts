import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { getLocalDayKey, getPreviousDayKey, getDaysDifference } from '../utils/dateUtils';
import { loadTasksFromLocal } from '../utils/offlineSync';
import { areRequiredTasksCompleted } from '../utils/taskScheduling';

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDayKey: string | null;
  streakLastEvaluatedDayKey: string | null;
}

const DEFAULT_STREAK: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDayKey: null,
  streakLastEvaluatedDayKey: null,
};

const STREAK_STORAGE_KEY = 'user_streak_state';

export async function getStreakState(): Promise<StreakState> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load streak state from local storage', e);
  }
  return { ...DEFAULT_STREAK };
}

export async function saveStreakState(state: StreakState): Promise<void> {
  try {
    await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save streak state to local storage', e);
  }
}

/**
 * Hydrates local streak state from Firebase (useful on login or app re-install).
 */
export async function hydrateStreakFromFirebase(): Promise<void> {
  if (!auth.currentUser) return;
  try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists() && userDoc.data()?.streak) {
        const data = userDoc.data().streak as StreakState;
        await saveStreakState(data);
      }
  } catch (e) {
    console.warn('Failed to hydrate streak from Firebase', e);
  }
}

/**
 * Syncs the local streak state to Firebase.
 */
export async function syncStreakToFirebase(state: StreakState): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      streak: {
        ...state,
        updatedAt: new Date().toISOString(),
      }
    }, { merge: true });
  } catch (e) {
    console.warn('Failed to sync streak to Firebase', e);
  }
}

/**
 * Evaluates the streak safely and idempotently.
 * Call this on day finalization or app launch day transitions.
 */
export async function evaluateStreak(dayKeyToEvaluate: string, dayNumber: number): Promise<StreakState> {
  const state = await getStreakState();

  // Prevent double-evaluation for the exact same day.
  if (state.streakLastEvaluatedDayKey === dayKeyToEvaluate) {
    return state;
  }

  // Load tasks for the day being evaluated
  const tasks = await loadTasksFromLocal(dayNumber);
  const isCompleted = areRequiredTasksCompleted(dayNumber, tasks || {
    washDay: false, scalpMassage: false, topicalTreatment: false, hydration: false, nutrientIntake: false,
  });

  let newCurrentStreak = state.currentStreak;
  let newLastCompletedDayKey = state.lastCompletedDayKey;

  if (isCompleted) {
    // Determine if it is a continuous streak
    if (!state.lastCompletedDayKey || state.lastCompletedDayKey === getPreviousDayKey(dayKeyToEvaluate)) {
      newCurrentStreak += 1;
    } else {
      // There was a gap since the last completed day
      newCurrentStreak = 1;
    }
    newLastCompletedDayKey = dayKeyToEvaluate;
  } else {
    // Failed to complete all tasks before the day transitioned
    newCurrentStreak = 0;
  }

  const newState: StreakState = {
    currentStreak: newCurrentStreak,
    longestStreak: Math.max(state.longestStreak, newCurrentStreak),
    lastCompletedDayKey: newLastCompletedDayKey,
    streakLastEvaluatedDayKey: dayKeyToEvaluate,
  };

  await saveStreakState(newState);

  // Only sync to Firebase when the streak values actually changed.
  // Prevents redundant Firestore writes on repeated app launches on the same day.
  const streakChanged =
    state.currentStreak !== newState.currentStreak ||
    state.longestStreak !== newState.longestStreak ||
    state.lastCompletedDayKey !== newState.lastCompletedDayKey;
  if (streakChanged) {
    await syncStreakToFirebase(newState); // Fire and forget — non-blocking
  }

  return newState;
}

/**
 * Handle day transition logic. Reset streak to 0 if days were missed.
 */
export async function processMissedDays(currentDayKey: string): Promise<void> {
  const state = await getStreakState();
  if (!state.streakLastEvaluatedDayKey) return;

  const prevKey = getPreviousDayKey(currentDayKey);
  const diff = getDaysDifference(state.streakLastEvaluatedDayKey, currentDayKey);
  
  if (diff > 1) {
    // Gap of more than 1 day — user missed at least one day, reset streak.
    // Set the evaluation pointer to yesterday so the next evaluateStreak call
    // processes the correct day without skipping or double-counting.
    const newState = {
      ...state,
      currentStreak: 0,
      streakLastEvaluatedDayKey: getPreviousDayKey(currentDayKey),
    };
    await saveStreakState(newState);
    await syncStreakToFirebase(newState); // Always sync a reset — important for history
  }
}

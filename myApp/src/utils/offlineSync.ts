import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { TaskState } from './taskScheduling';
import { getLocalDayKey } from './dateUtils';
import { evaluateStreak } from '../services/streakService';
import { areRequiredTasksCompleted, getTasksForDay } from './taskScheduling';

const SURVEY_STORAGE_KEY = '@hair_survey_progress';

async function loadHairProblems(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SURVEY_STORAGE_KEY);
    if (raw) {
      const survey = JSON.parse(raw);
      return survey?.step4?.hairProblems ?? (survey?.step4?.hairProblem ? [survey.step4.hairProblem] : []);
    }
  } catch {}
  return [];
}

// ─── Local Task Storage ────────────────────────────────────────────────────────
const TASKS_CACHE_PREFIX = 'day_tasks_';

// Persists a mapping of dayNumber → YYYY-MM-DD dayKey.
// This guarantees syncPendingDays can always find the correct Firestore doc ID
// even days later when the calendar date has advanced.
const DAY_KEY_MAP_PREFIX = 'day_key_map_';

export async function saveDayKeyForDayNumber(
  dayNumber: number,
  dayKey: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(`${DAY_KEY_MAP_PREFIX}${dayNumber}`, dayKey);
  } catch (e) {
    console.warn(`Failed to save dayKey mapping for day ${dayNumber}`, e);
  }
}

export async function getDayKeyForDayNumber(
  dayNumber: number,
): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`${DAY_KEY_MAP_PREFIX}${dayNumber}`);
  } catch (e) {
    console.warn(`Failed to load dayKey mapping for day ${dayNumber}`, e);
    return null;
  }
}

/**
 * Saves tasks to AsyncStorage and simultaneously persists the dayNumber→dayKey
 * mapping so that the sync layer always has the correct Firestore path available.
 */
export async function saveTasksToLocal(
  dayNumber: number,
  tasks: TaskState,
): Promise<void> {
  const key = `${TASKS_CACHE_PREFIX}${dayNumber}`;
  try {
    await AsyncStorage.setItem(key, JSON.stringify(tasks));
    // Persist the calendar date for this day number. Overwriting is safe —
    // the dayKey never changes once a day has started.
    const dayKey = getLocalDayKey();
    await saveDayKeyForDayNumber(dayNumber, dayKey);
  } catch (e) {
    console.warn(`Failed to save tasks for day ${dayNumber} locally`, e);
  }
}

export async function loadTasksFromLocal(
  dayNumber: number,
): Promise<TaskState | null> {
  const key = `${TASKS_CACHE_PREFIX}${dayNumber}`;
  try {
    const data = await AsyncStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn(`Failed to load tasks for day ${dayNumber} locally`, e);
  }
  return null;
}

// ─── Active Day Tracking (Lifecycle) ───────────────────────────────────────────
const LAST_ACTIVE_DAY_KEY = 'last_active_day_key';

export async function getLastActiveDayKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_ACTIVE_DAY_KEY);
  } catch (e) {
    return null;
  }
}

export async function setLastActiveDayKey(dayKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_ACTIVE_DAY_KEY, dayKey);
  } catch (e) {
    // Ignore
  }
}

// ─── Unsynced Queue Management ─────────────────────────────────────────────────
const UNSYNCED_DAYS_QUEUE_KEY = 'unsynced_days_queue';

async function getUnsyncedQueue(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(UNSYNCED_DAYS_QUEUE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export async function enqueueDayForSync(dayNumber: number): Promise<void> {
  const queue = await getUnsyncedQueue();
  if (!queue.includes(dayNumber)) {
    queue.push(dayNumber);
    await AsyncStorage.setItem(UNSYNCED_DAYS_QUEUE_KEY, JSON.stringify(queue));
  }
}

async function dequeueDayForSync(dayNumber: number): Promise<void> {
  const queue = await getUnsyncedQueue();
  const newQueue = queue.filter(d => d !== dayNumber);
  await AsyncStorage.setItem(UNSYNCED_DAYS_QUEUE_KEY, JSON.stringify(newQueue));
}

// ─── Finalization & Synchronization ────────────────────────────────────────────

/**
 * Evaluates the streak for a finalized day, queues it for sync, and triggers
 * an async background upload. Call this on detected day transitions.
 * Safe to call multiple times — all operations are idempotent.
 */
export async function finalizeDay(
  dayNumber: number,
  dayKey: string,
): Promise<void> {
  // 1. Persist the dayKey mapping so sync always has the correct calendar date.
  await saveDayKeyForDayNumber(dayNumber, dayKey);

  // 2. Evaluate streak for this finalized day (idempotent guard inside evaluateStreak).
  await evaluateStreak(dayKey, dayNumber);

  // 3. Queue day for syncing.
  await enqueueDayForSync(dayNumber);

  // 4. Fire-and-forget upload. Will retry automatically on next app launch if offline.
  syncPendingDays();
}

/**
 * Flush all pending unsynced days to Firebase as finalized daily summaries.
 *
 * Design decisions:
 * - Firestore doc ID = YYYY-MM-DD dayKey (not integer dayNumber).
 * - Writes a lightweight summary payload — NOT the raw task state object.
 * - Idempotent via { merge: true } — safe to call multiple times.
 * - Items remain in queue on failure and retry on the next call.
 * - No UI blocking — always called fire-and-forget from finalizeDay.
 */
export async function syncPendingDays(): Promise<void> {
  if (!auth.currentUser) return;
  const queue = await getUnsyncedQueue();
  if (queue.length === 0) return;

  const uid = auth.currentUser.uid;
  const hairProblems = await loadHairProblems();

  for (const dayNumber of queue) {
    try {
      const tasks = await loadTasksFromLocal(dayNumber);
      if (!tasks) {
        // Tasks vanished locally — dequeue to prevent an infinite retry loop.
        await dequeueDayForSync(dayNumber);
        continue;
      }

      // Resolve YYYY-MM-DD key. Falls back to today only as a last resort.
      const dayKey =
        (await getDayKeyForDayNumber(dayNumber)) ?? getLocalDayKey();

      const allTaskDefs = getTasksForDay(dayNumber, hairProblems);
      const totalTasks = allTaskDefs.length;
      const completedTasks = allTaskDefs.filter(t => !!tasks[t.key]).length;
      const allTasksCompleted = areRequiredTasksCompleted(dayNumber, tasks, hairProblems);
      const completionPercentage =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Finalized daily summary — lightweight payload only, no raw task state.
      const payload = {
        dayKey,
        dayNumber,
        completedTasks,
        totalTasks,
        completionPercentage,
        allTasksCompleted,
        streakAwarded: allTasksCompleted,
        syncedAt: new Date().toISOString(),
      };

      // Firestore path: users/{uid}/dailyProgress/{YYYY-MM-DD}
      const userDocRef = doc(db, 'users', uid, 'dailyProgress', dayKey);
      await setDoc(userDocRef, payload, { merge: true });

      // Successfully synced → remove from queue.
      await dequeueDayForSync(dayNumber);
    } catch (e) {
      console.warn(
        `Failed to sync day ${dayNumber} to Firebase. Will retry later.`,
        e,
      );
      // Leave in queue — retries automatically on next syncPendingDays call.
    }
  }
}

// ─── Milestone Photos (Local) ──────────────────────────────────────────────────
export async function saveMilestonePhotoLocal(
  dayNumber: number,
  photoBase64: string,
): Promise<void> {
  const key = `day_${dayNumber}_milestone_photo`;
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        photoBase64,
        timestamp: new Date().toISOString(),
      }),
    );
  } catch (e) {}
}

export async function loadMilestonePhotoLocal(
  dayNumber: number,
): Promise<string | null> {
  const key = `day_${dayNumber}_milestone_photo`;
  try {
    const data = await AsyncStorage.getItem(key);
    if (data) return JSON.parse(data).photoBase64;
  } catch (e) {}
  return null;
}

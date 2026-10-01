/**
 * Task scheduling utilities — problem-aware dynamic routine generation
 *
 * Routines are composed of:
 *   1. Universal base tasks (everyone does these)
 *   2. Wash day (schedule-based, 2×/week)
 *   3. Problem-specific tasks injected based on the user's selected hair problems
 *   4. Weekly photo check-in (on multiples of 7)
 */

// ─── Wash Day Logic ────────────────────────────────────────────────────────────

/**
 * Wash day is active on days 3 and 6 of every 7-day cycle
 * Example: Days 3, 6, 10, 13, 17, 20, …
 */
export function isWashDayActive(dayNumber: number): boolean {
  const positionInCycle = ((dayNumber - 1) % 7) + 1; // 1-7
  return positionInCycle === 3 || positionInCycle === 6;
}

/**
 * Weekly photo upload is active on multiples of 7 (days 7, 14, 21, 28, …)
 */
export function isWeeklyPhotoDay(dayNumber: number): boolean {
  return dayNumber % 7 === 0;
}

export function getDayOfWeekInCycle(dayNumber: number): number {
  return ((dayNumber - 1) % 7) + 1;
}

export function getWashDayInfoText(): string {
  return 'Washing 2 times a week is enough.';
}

export function getWashDayButtonText(): string {
  return 'I washed my scalp today';
}

export function getWeeklyPhotoDescription(dayNumber: number): string {
  const weekNumber = Math.ceil(dayNumber / 7);
  return `Week ${weekNumber} photo check-in. Take a picture to track your progress this week.`;
}

export function isDayEditable(dayNumber: number, currentDayNumber: number): boolean {
  return dayNumber >= currentDayNumber;
}

export function getReadOnlyDayLabel(dayNumber: number, currentDayNumber: number): string {
  if (dayNumber > currentDayNumber) return 'Locked - Complete earlier days first';
  if (dayNumber < currentDayNumber) return 'Completed - Read only';
  return 'Today - Edit your progress';
}

// ─── Task Types ────────────────────────────────────────────────────────────────

/**
 * All possible task keys — base + problem-specific.
 * Adding a new problem task: add the key here + in PROBLEM_TASK_MAP below.
 */
export interface TaskState {
  // Universal base tasks
  washDay: boolean;
  scalpMassage: boolean;
  topicalTreatment: boolean;
  hydration: boolean;
  nutrientIntake: boolean;
  weeklyPhotoUpload?: boolean;
  // Hair fall / shedding
  antiSheddingOil?: boolean;
  coldRinse?: boolean;
  // Dandruff
  antiFungalShampoo?: boolean;
  teaTreeTreatment?: boolean;
  // Thinning
  dermaRoller?: boolean;
  minoxidilApplication?: boolean;
  // Receding hairline
  hairlineStimulation?: boolean;
  castoroilMassage?: boolean;
  // Low density
  plateletRichPlasmaRoutine?: boolean;
  densityBoosterSerum?: boolean;
}

export interface TaskDef {
  key: keyof TaskState;
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
}

// ─── Universal Base Tasks (shown for everyone every day) ──────────────────────

export const BASE_TASKS: TaskDef[] = [
  {
    key: 'scalpMassage',
    emoji: '💆',
    title: 'Scalp Stimulation',
    subtitle: '5-minute targeted massage to boost circulation',
    color: '#22c55e',
  },
  {
    key: 'topicalTreatment',
    emoji: '💧',
    title: 'Topical Treatment',
    subtitle: 'Apply prescribed serum or hair growth oil',
    color: '#34d399',
  },
  {
    key: 'hydration',
    emoji: '🫗',
    title: 'Hydration Goal',
    subtitle: 'Log 2.5L of water intake for the day',
    color: '#4ade80',
  },
  {
    key: 'nutrientIntake',
    emoji: '💊',
    title: 'Nutrient Intake',
    subtitle: 'Confirm daily Biotin & Zinc vitamins taken',
    color: '#86efac',
  },
];

// For backward-compat — keep TASKS exported (used in older screens)
export const TASKS: TaskDef[] = [
  { key: 'washDay', emoji: '🚿', title: 'Wash Day', subtitle: 'Strict 72-hour scalp sebum reset', color: '#10b981' },
  ...BASE_TASKS,
];

// ─── Problem-Specific Task Definitions ────────────────────────────────────────

/**
 * Maps each hair problem ID → the extra tasks it unlocks.
 * These are injected in addition to base tasks.
 */
export const PROBLEM_TASK_MAP: Record<string, TaskDef[]> = {
  fall: [
    {
      key: 'antiSheddingOil',
      emoji: '🌿',
      title: 'Anti-Shedding Oil',
      subtitle: 'Apply rosemary or bhringraj oil to scalp roots',
      color: '#10b981',
    },
    {
      key: 'coldRinse',
      emoji: '❄️',
      title: 'Cold Water Rinse',
      subtitle: 'Finish shower with 30-sec cold rinse to seal follicles',
      color: '#06b6d4',
    },
  ],
  dandruff: [
    {
      key: 'antiFungalShampoo',
      emoji: '🧴',
      title: 'Anti-Fungal Shampoo',
      subtitle: 'Use ketoconazole shampoo on affected areas',
      color: '#8b5cf6',
    },
    {
      key: 'teaTreeTreatment',
      emoji: '🌱',
      title: 'Tea Tree Treatment',
      subtitle: 'Apply diluted tea tree oil to scalp for 10 minutes',
      color: '#059669',
    },
  ],
  thinning: [
    {
      key: 'dermaRoller',
      emoji: '🔵',
      title: 'Derma Roller',
      subtitle: '0.5mm derma roller on thin areas to boost absorption',
      color: '#3b82f6',
    },
    {
      key: 'minoxidilApplication',
      emoji: '💉',
      title: 'Minoxidil Application',
      subtitle: 'Apply minoxidil solution to thinning zones',
      color: '#f59e0b',
    },
  ],
  receding: [
    {
      key: 'hairlineStimulation',
      emoji: '👆',
      title: 'Hairline Stimulation',
      subtitle: '3-minute focused massage on hairline temples',
      color: '#ec4899',
    },
    {
      key: 'castoroilMassage',
      emoji: '🫒',
      title: 'Castor Oil Massage',
      subtitle: 'Massage warm castor oil along hairline before bed',
      color: '#a78bfa',
    },
  ],
  density: [
    {
      key: 'plateletRichPlasmaRoutine',
      emoji: '🩸',
      title: 'PRP-Prep Routine',
      subtitle: 'Scalp exfoliation + circulation booster for density',
      color: '#ef4444',
    },
    {
      key: 'densityBoosterSerum',
      emoji: '✨',
      title: 'Density Booster Serum',
      subtitle: 'Apply peptide-based density serum to crown area',
      color: '#f97316',
    },
  ],
  // 'none' → no extra tasks, just base
  none: [],
};

// ─── Dynamic Task Builder ──────────────────────────────────────────────────────

/**
 * Builds the full task list for a given day + user's hair problems.
 *
 * @param dayNumber   Current day (1-based)
 * @param hairProblems  Array of problem IDs from the user's survey (e.g. ['fall', 'dandruff'])
 *                      If empty/null, falls back to base tasks only.
 */
export function getTasksForDay(dayNumber: number, hairProblems?: string[]): TaskDef[] {
  const tasks: TaskDef[] = [];
  const seenKeys = new Set<string>();

  const addTask = (t: TaskDef) => {
    if (!seenKeys.has(t.key)) {
      seenKeys.add(t.key);
      tasks.push(t);
    }
  };

  // 1. Wash Day (schedule-based — first so it appears at the top)
  if (isWashDayActive(dayNumber)) {
    addTask({ key: 'washDay', emoji: '🚿', title: 'Wash Day', subtitle: 'Strict 72-hour scalp sebum reset', color: '#10b981' });
  }

  // 2. Universal base tasks
  for (const t of BASE_TASKS) addTask(t);

  // 3. Problem-specific tasks
  const problems = hairProblems && hairProblems.length > 0 ? hairProblems : [];
  for (const problem of problems) {
    const extraTasks = PROBLEM_TASK_MAP[problem] ?? [];
    for (const t of extraTasks) addTask(t);
  }

  // 4. Weekly photo (last)
  if (isWeeklyPhotoDay(dayNumber)) {
    addTask({
      key: 'weeklyPhotoUpload',
      emoji: '📸',
      title: 'Weekly Photo Check-in',
      subtitle: 'Take a photo to track this week\'s progress',
      color: '#f59e0b',
    });
  }

  return tasks;
}

/**
 * Checks if all tasks for the day are completed.
 */
export function areRequiredTasksCompleted(dayNumber: number, tasks: TaskState, hairProblems?: string[]): boolean {
  if (!tasks) return false;
  const requiredTasks = getTasksForDay(dayNumber, hairProblems);
  return requiredTasks.every(t => !!tasks[t.key as keyof TaskState]);
}

/**
 * Builds a friendly summary of which problems a user has.
 * Used for display on DailyTask screen header.
 */
export function getProblemsLabel(hairProblems: string[]): string {
  const labels: Record<string, string> = {
    none: 'General Care',
    fall: 'Hair Fall',
    dandruff: 'Dandruff',
    thinning: 'Thinning',
    receding: 'Receding Hairline',
    density: 'Low Density',
  };
  if (!hairProblems || hairProblems.length === 0) return 'General Care';
  if (hairProblems.includes('none')) return 'General Care';
  return hairProblems.map(p => labels[p] ?? p).join(' • ');
}

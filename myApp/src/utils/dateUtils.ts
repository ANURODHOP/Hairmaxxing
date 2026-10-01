/**
 * Timezone-safe date utilities for day progression and sync.
 * Always rely on YYYY-MM-DD keys instead of raw timestamps to prevent timezone bugs.
 */

export function getLocalDayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPreviousDayKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() - 1);
  return getLocalDayKey(d);
}

export function getDaysDifference(startKey: string, endKey: string): number {
  const [sy, sm, sd] = startKey.split('-').map(Number);
  const [ey, em, ed] = endKey.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Computes actual days passed strictly based on the starting date.
 * If user started on 2026-05-24, and today is 2026-05-25, actualDaysPassed = 2.
 */
export function getAppDayNumber(startDateKey: string, currentDateKey: string): number {
  const [sy, sm, sd] = startDateKey.split('-').map(Number);
  const [cy, cm, cd] = currentDateKey.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const current = new Date(cy, cm - 1, cd);
  
  if (current < start) {
    return 1; // Fallback for invalid clocks
  }

  const diffTime = current.getTime() - start.getTime();
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return days + 1; // 1-indexed (Day 1 is purchase day)
}

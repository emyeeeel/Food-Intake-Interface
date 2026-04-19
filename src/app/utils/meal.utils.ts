import { Meal, MenuMode } from '../models/meal.model';
import { MealAssignment } from '../models/meal-assignment.mode';

export const MEAL_TIME_LETTER: Record<string, string> = {
  '午餐': 'L',
  '晚餐': 'D',
  '點心': 'S',
};

// Local YYYY-MM-DD. toISOString() would off-by-one in UTC+8.
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function compactDate(iso: string): string {
  return iso.replace(/-/g, '');
}

export function getMealMode(meal: Pick<Meal, 'menu_mode'>): MenuMode {
  return (meal.menu_mode ?? 'cyclic') as MenuMode;
}

// Display code: cyclic "L-3-248" / open "L-20260419-305".
export function getMealCode(meal: Meal | null | undefined): string {
  if (!meal) return '';
  const letter = (meal.meal_time && MEAL_TIME_LETTER[meal.meal_time]) || '';
  const id = meal.id ?? '';
  if (getMealMode(meal) === 'open' && meal.serve_date) {
    return `${letter}-${compactDate(meal.serve_date)}-${id}`;
  }
  return `${letter}-${meal.day_cycle ?? ''}-${id}`;
}

// Slot bucket key — callers compose meal_time / patient id themselves.
// cyclic "cyclic:d3" / open "open:2026-04-19".
export function getSlotKey(
  meal: Pick<Meal, 'menu_mode' | 'day_cycle' | 'serve_date'>,
): string {
  if (getMealMode(meal) === 'open') return `open:${meal.serve_date ?? ''}`;
  return `cyclic:d${meal.day_cycle ?? ''}`;
}

// "第 3 天" for cyclic, "-" for open.
export function formatDayLabel(
  meal: Pick<Meal, 'menu_mode' | 'day_cycle'>,
): string {
  if (getMealMode(meal) === 'open') return '-';
  return `第 ${meal.day_cycle ?? '?'} 天`;
}

// "2026-04-19 (週X)" for open; empty for cyclic/missing serve_date.
// weekdayLabel is provided by DateService.getWeekdayLabel (locale-aware).
export function formatOpenDateLabel(
  meal: Pick<Meal, 'menu_mode' | 'serve_date'>,
  weekdayLabel?: string,
): string {
  if (getMealMode(meal) !== 'open' || !meal.serve_date) return '';
  return weekdayLabel ? `${meal.serve_date} (${weekdayLabel})` : meal.serve_date;
}

// True iff assignment.meal_detail targets "today" in the given mode.
// Rejects orphans (meal_detail null) and mode mismatches.
// Does NOT filter meal_time — callers layer that on top.
export function isAssignmentForToday(
  a: MealAssignment,
  mode: MenuMode,
  todayISO: string,
  todayCycleDay: string,
): boolean {
  const meal = a.meal_detail;
  if (!meal) return false;
  if (((meal.menu_mode ?? 'cyclic') as MenuMode) !== mode) return false;
  if (mode === 'open') return meal.serve_date === todayISO;
  const day = (a.day_cycle?.toString() ?? meal.day_cycle?.toString() ?? '');
  return day === todayCycleDay;
}

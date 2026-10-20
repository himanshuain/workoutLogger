/** Habit runs every day (no active_days restriction, or all seven days). */
export function isDailyHabit(activeDays) {
  if (activeDays == null) return true;
  return activeDays.length === 7;
}

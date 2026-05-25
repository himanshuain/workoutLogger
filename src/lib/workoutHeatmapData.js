/**
 * Workout activity heatmap — completed workout sessions only (not habits, food, or legacy logs).
 * `count` is completed sets that day; days marked done with no sets still count as 1.
 */
export function buildWorkoutHeatmapFromSessions(sessions) {
  const byDate = new Map();

  for (const session of sessions || []) {
    if (session.status !== "completed") continue;

    const completedSets = (session.set_logs || []).filter(log => log.is_completed);
    const increment = completedSets.length > 0 ? completedSets.length : 1;
    byDate.set(session.date, (byDate.get(session.date) || 0) + increment);
  }

  return Array.from(byDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

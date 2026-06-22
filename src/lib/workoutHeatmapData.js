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

/** Completed split names per date (deduped, order preserved). */
export function buildWorkoutSplitsByDate(sessions) {
  const byDate = new Map();

  for (const session of sessions || []) {
    if (session.status !== "completed") continue;
    const name = (session.routine_name || "").trim() || "Workout";
    if (!byDate.has(session.date)) byDate.set(session.date, []);
    const names = byDate.get(session.date);
    if (!names.includes(name)) names.push(name);
  }

  return Object.fromEntries(byDate.entries());
}

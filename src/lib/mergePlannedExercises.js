/**
 * Merge template routine exercises with session "extras" (added same day).
 * Carries optional per-exercise `notes` from the routine row.
 */
export function mergePlannedExercises(routine, extras) {
  const map = new Map();
  for (const ex of routine?.routine_exercises || []) {
    const n = ex.notes != null ? String(ex.notes).trim() : "";
    map.set(ex.exercise_name, {
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      category: ex.category || "other",
      notes: n,
      equipment: "",
      added_today: false,
    });
  }
  for (const ex of extras) {
    if (!map.has(ex.exercise_name)) {
      const n = ex.notes != null ? String(ex.notes).trim() : "";
      map.set(ex.exercise_name, {
        ...ex,
        notes: n,
        added_today: true,
      });
    }
  }
  return [...map.values()];
}

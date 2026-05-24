/** JSON payload for replace_routine_exercises RPC (order = array order). */
export function buildRoutineExercisesJson(routineExercises) {
  return (routineExercises || []).map(ex => ({
    exercise_id: ex.exercise_id ?? null,
    exercise_name: ex.exercise_name,
    category: ex.category || "other",
    target_sets: ex.target_sets || 3,
    notes:
      ex.notes != null && String(ex.notes).trim()
        ? String(ex.notes).trim().slice(0, 500)
        : null,
  }));
}

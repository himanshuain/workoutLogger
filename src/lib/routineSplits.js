/** Named workout splits (routines not tied to weekdays). */

export const NEW_SPLIT_ID = "__new__";

export function sortRoutinesByName(routines) {
  return [...(routines || [])].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
  );
}

export function getRoutineById(routines, routineId) {
  if (!routineId || routineId === NEW_SPLIT_ID) return null;
  return (routines || []).find(r => r.id === routineId) ?? null;
}

export function routineExerciseCount(routine) {
  return routine?.routine_exercises?.length ?? 0;
}

/** Resolve catalog exercises by id or name. */

export function resolveExerciseIdForLibrary(exercises, { exerciseId, exerciseName } = {}) {
  const list = exercises || [];
  if (exerciseId) {
    const byId = list.find(e => e.id === exerciseId);
    if (byId) return byId.id;
  }
  if (exerciseName) {
    const trimmed = String(exerciseName).trim();
    const exact = list.find(e => e.name === trimmed);
    if (exact) return exact.id;
    const lower = trimmed.toLowerCase();
    const ci = list.find(e => (e.name || "").toLowerCase() === lower);
    if (ci) return ci.id;
  }
  return null;
}

export function resolveExerciseFromCatalog(exercises, { exerciseId, exerciseName } = {}) {
  const id = resolveExerciseIdForLibrary(exercises, { exerciseId, exerciseName });
  if (!id) return null;
  return (exercises || []).find(e => e.id === id) ?? null;
}

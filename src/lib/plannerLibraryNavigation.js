import { normalizeExerciseName } from "@/lib/exerciseCatalog";

/** Resolve catalog exercises by id or name. */

export function resolveExerciseIdForLibrary(exercises, { exerciseId, exerciseName } = {}) {
  const list = exercises || [];
  if (exerciseId) {
    const byId = list.find(e => e.id === exerciseId);
    if (byId) return byId.id;
  }
  if (exerciseName) {
    const trimmed = String(exerciseName).trim();
    if (!trimmed) return null;
    const exact = list.find(e => e.name === trimmed);
    if (exact) return exact.id;
    const key = normalizeExerciseName(trimmed);
    const byNorm = list.find(e => normalizeExerciseName(e.name) === key);
    if (byNorm) return byNorm.id;
  }
  return null;
}

export function resolveExerciseFromCatalog(exercises, { exerciseId, exerciseName } = {}) {
  const id = resolveExerciseIdForLibrary(exercises, { exerciseId, exerciseName });
  if (!id) return null;
  return (exercises || []).find(e => e.id === id) ?? null;
}

/** Minimal exercise row for planner preview when catalog lookup misses (custom / stale id). */
export function buildPlannerExerciseFallback({ exerciseId, exerciseName, category, notes } = {}) {
  const name = String(exerciseName || "").trim();
  if (!name) return null;

  const notesTrim = notes != null ? String(notes).trim() : "";
  return {
    id: exerciseId || undefined,
    name,
    category: String(category || "other").toLowerCase(),
    is_predefined: false,
    metadata: notesTrim ? { planner_notes: notesTrim } : {},
  };
}

export function resolveExerciseForPreview(exercises, opts = {}) {
  return resolveExerciseFromCatalog(exercises, opts) ?? buildPlannerExerciseFallback(opts);
}

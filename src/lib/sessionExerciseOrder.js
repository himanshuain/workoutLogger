import {
  getSessionExerciseOrder,
  setSessionExerciseOrder,
} from "@/lib/workoutSessionClient";

/**
 * Apply persisted per-session exercise order; syncs order when exercises are added/removed.
 */
export function orderPlannedExercises(exercises, sessionId) {
  if (!exercises?.length) return [];
  const names = exercises.map(e => e.exercise_name);
  let order = sessionId ? getSessionExerciseOrder(sessionId) : [];

  const nameSet = new Set(names);
  const pruned = order.filter(n => nameSet.has(n));
  const missing = names.filter(n => !pruned.includes(n));
  const nextOrder = [...pruned, ...missing];

  if (
    sessionId &&
    (missing.length > 0 || pruned.length !== order.length)
  ) {
    setSessionExerciseOrder(sessionId, nextOrder);
  }

  const index = new Map(nextOrder.map((name, i) => [name, i]));
  return [...exercises].sort(
    (a, b) =>
      (index.get(a.exercise_name) ?? 1e9) - (index.get(b.exercise_name) ?? 1e9),
  );
}

export function persistExerciseOrder(sessionId, orderedExercises) {
  if (!sessionId || !orderedExercises?.length) return;
  setSessionExerciseOrder(
    sessionId,
    orderedExercises.map(e => e.exercise_name),
  );
}

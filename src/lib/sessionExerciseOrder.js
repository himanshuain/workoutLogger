import { groupExercisesByArea } from "@/lib/exerciseAreaGroups";
import {
  getSessionExerciseOrder,
  setSessionExerciseOrder,
  moveSessionExerciseToTop,
} from "@/lib/workoutSessionClient";

export { moveSessionExerciseToTop };

export function isCompleteSessionExerciseOrder(order, exerciseNames) {
  const names = exerciseNames || [];
  if (!order?.length || order.length !== names.length) return false;
  const set = new Set(names);
  return order.every(n => set.has(n)) && new Set(order).size === names.length;
}

function sortBySessionOrder(exercises, sessionId) {
  const names = exercises.map(e => e.exercise_name);
  let order = sessionId ? getSessionExerciseOrder(sessionId) : [];

  const nameSet = new Set(names);
  const pruned = order.filter(n => nameSet.has(n));
  const missing = names.filter(n => !pruned.includes(n));
  const nextOrder = [...pruned, ...missing];

  if (
    sessionId &&
    (missing.length > 0 || pruned.length !== order.length) &&
    !isCompleteSessionExerciseOrder(order, names)
  ) {
    setSessionExerciseOrder(sessionId, nextOrder);
  }

  const index = new Map(nextOrder.map((name, i) => [name, i]));
  return [...exercises].sort(
    (a, b) =>
      (index.get(a.exercise_name) ?? 1e9) - (index.get(b.exercise_name) ?? 1e9),
  );
}

/**
 * Uses saved session order when complete (after drag / move-to-top); otherwise area groups.
 */
export function orderPlannedExercises(exercises, sessionId) {
  if (!exercises?.length) return [];
  const names = exercises.map(e => e.exercise_name);
  const order = sessionId ? getSessionExerciseOrder(sessionId) : [];
  const bySession = sortBySessionOrder(exercises, sessionId);
  if (isCompleteSessionExerciseOrder(order, names)) {
    return bySession;
  }
  return groupExercisesByArea(bySession).flatMap(g => g.exercises);
}

export function persistExerciseOrder(sessionId, orderedExercises) {
  if (!sessionId || !orderedExercises?.length) return;
  setSessionExerciseOrder(
    sessionId,
    orderedExercises.map(e => e.exercise_name),
  );
}

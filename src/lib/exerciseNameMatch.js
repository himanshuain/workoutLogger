import { exerciseTokenKey, looseNormalizeExerciseName, normalizeExerciseName } from "@/lib/exerciseNameNormalize";

export { exerciseTokenKey, looseNormalizeExerciseName, normalizeExerciseName };

/** Shared loose matching (SmartWorkout vs routine / legacy naming). */

export function findCatalogExerciseByLooseName(exercises, exerciseName) {
  const list = exercises || [];
  const key = exerciseTokenKey(exerciseName);
  if (!key) return null;

  for (const e of list) {
    if (exerciseTokenKey(e.name) === key) return e;
    const aliases = e.metadata?.smartworkout?.aliases;
    if (Array.isArray(aliases)) {
      for (const alias of aliases) {
        if (exerciseTokenKey(alias) === key) return e;
      }
    }
  }
  return null;
}

/** Shared loose matching (SmartWorkout vs routine / legacy naming). */

export function looseNormalizeExerciseName(name) {
  let s = String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  s = s.replace(/\bbenchpress\b/g, "bench press");
  s = s.replace(/\bdumbbells\b/g, "dumbbell");
  s = s.replace(/[^a-z0-9\s]/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/** Same words in any order — e.g. "Cable Seated Chest Press" ↔ "Seated Cable Chest Press". */
export function exerciseTokenKey(name) {
  const words = looseNormalizeExerciseName(name).split(" ").filter(Boolean);
  return [...words].sort().join(" ");
}

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

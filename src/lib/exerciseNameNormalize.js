/** Loose name normalization (shared by app matching + SmartWorkout sync). */

export function normalizeExerciseName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function looseNormalizeExerciseName(name) {
  let s = normalizeExerciseName(name);
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

import { exerciseMediaUrl } from "@/lib/exerciseMedia";

/** Higher = better row to show when names collide (seed + wger, etc.). */
function catalogRichnessScore(exercise) {
  let s = 0;
  if (exercise.gif_url) s += 400;
  else if (exercise.image_url) s += 200;
  const descLen = exercise.description?.trim().length ?? 0;
  if (descLen > 40) s += 50;
  else if (descLen > 0) s += 20;
  if (exercise.external_source === "exercisedb") s += 20;
  else if (exercise.external_source === "wger") s += 8;
  else if (exercise.external_source) s += 5;
  return s;
}

export function normalizeExerciseName(name) {
  return (name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * One row per display name: keep the richest catalog entry (GIF/image/description).
 */
export function dedupeExercisesForPicker(exercises) {
  if (!exercises?.length) return [];

  const bestByName = new Map();

  for (const ex of exercises) {
    const key = normalizeExerciseName(ex.name);
    if (!key) continue;

    const prev = bestByName.get(key);
    if (!prev) {
      bestByName.set(key, ex);
      continue;
    }

    const diff = catalogRichnessScore(ex) - catalogRichnessScore(prev);
    if (diff > 0) {
      bestByName.set(key, ex);
    } else if (diff === 0) {
      const exMedia = exerciseMediaUrl(ex);
      const prevMedia = exerciseMediaUrl(prev);
      if (exMedia && !prevMedia) bestByName.set(key, ex);
      else if (ex.external_source === "exercisedb" && prev.external_source === "wger") {
        bestByName.set(key, ex);
      } else if (ex.external_source === "wger" && !prev.external_source) bestByName.set(key, ex);
    }
  }

  return Array.from(bestByName.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

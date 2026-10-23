import { normalizeExerciseName, exerciseMatchesSearch } from "@/lib/exerciseCatalog";
import { normalizeComparableMediaUrl } from "@/lib/exerciseMedia";

function scoreLocalMatch(exercise, query) {
  const name = exercise?.name || "";
  const n = normalizeExerciseName(name);
  const q = normalizeExerciseName(query);
  if (!n || !q) return 0;
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  if (n.includes(q)) return 60;
  const words = q.split(" ").filter(w => w.length > 1);
  if (words.length && words.every(w => n.includes(w))) return 45;
  return exerciseMatchesSearch(exercise, query) ? 30 : 0;
}

export function isSmartworkoutCatalogExercise(exercise) {
  return (
    exercise?.external_source === "smartworkout" &&
    Boolean(exercise?.gif_url || exercise?.image_url)
  );
}

/** Search SmartWorkout catalog rows in the loaded exercise list. */
export function searchLocalExerciseGifs(exercises, query, limit = 24) {
  const q = String(query || "").trim();
  if (q.length < 2 || !Array.isArray(exercises)) return [];

  const catalog = exercises.filter(isSmartworkoutCatalogExercise);

  const ranked = catalog
    .map(ex => {
      const score = scoreLocalMatch(ex, q);
      if (!score) return null;
      const gifUrl = ex.gif_url || ex.image_url || null;
      if (!gifUrl) return null;
      return { id: ex.id, name: ex.name, gifUrl, source: "smartworkout", score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const seen = new Set();
  const out = [];
  for (const row of ranked) {
    const key = normalizeComparableMediaUrl(row.gifUrl);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: row.id, name: row.name, gifUrl: row.gifUrl, source: row.source });
    if (out.length >= limit) break;
  }
  return out;
}

/** Merge GIF hits, deduped by URL (kept for tests / future multi-source). */
export function mergeGifSearchResults(local = [], remote = [], limit = 24) {
  const seen = new Set();
  const out = [];
  for (const row of [...local, ...remote]) {
    const key = normalizeComparableMediaUrl(row.gifUrl);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

/** SmartWorkout library search only (no ExerciseDB or other catalogs). */
export async function searchExerciseGifs(query, { localExercises = [], limit = 24 } = {}) {
  return searchLocalExerciseGifs(localExercises, query, limit);
}

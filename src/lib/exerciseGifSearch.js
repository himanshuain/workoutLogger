import { normalizeExerciseName, exerciseMatchesSearch } from "@/lib/exerciseCatalog";
import { normalizeComparableMediaUrl } from "@/lib/exerciseMedia";

const EXERCISEDB_SEARCH = "https://oss.exercisedb.dev/api/v1/exercises/search";

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

/** Search loaded exercise catalog for GIF/image URLs matching query. */
export function searchLocalExerciseGifs(exercises, query, limit = 24) {
  const q = String(query || "").trim();
  if (q.length < 2 || !Array.isArray(exercises)) return [];

  const ranked = exercises
    .map(ex => {
      const score = scoreLocalMatch(ex, q);
      if (!score) return null;
      const gifUrl = ex.gif_url || ex.image_url || null;
      if (!gifUrl) return null;
      return { id: ex.id, name: ex.name, gifUrl, source: "local", score };
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

/** Client-side ExerciseDB search (CORS open; server-side fetch may fail on TLS). */
export async function searchExerciseDbGifs(query, limit = 24) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];

  const url = new URL(EXERCISEDB_SEARCH);
  url.searchParams.set("search", q);
  url.searchParams.set("limit", String(limit));

  const r = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) return [];

  const json = await r.json();
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows
    .map(row => ({
      id: row.exerciseId ?? row.id ?? null,
      name: row.name ?? "",
      gifUrl: row.gifUrl ?? row.gif_url ?? null,
      source: "exercisedb",
    }))
    .filter(row => row.gifUrl && row.name);
}

/** Merge local + remote GIF hits, deduped by URL. */
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

export async function searchExerciseGifs(query, { localExercises = [], limit = 24 } = {}) {
  const local = searchLocalExerciseGifs(localExercises, query, limit);
  let remote = [];
  try {
    remote = await searchExerciseDbGifs(query, limit);
  } catch {
    remote = [];
  }
  return mergeGifSearchResults(local, remote, limit);
}

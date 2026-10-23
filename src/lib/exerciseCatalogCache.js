const CACHE_VERSION = 1;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cacheKey(userId) {
  return `wl_exercise_catalog_v${CACHE_VERSION}_${userId}`;
}

/** Last prepared catalog from init — instant thumbnails on cold start while RPC runs. */
export function readCachedExerciseCatalog(userId) {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.exercises) || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return parsed.exercises;
  } catch {
    return null;
  }
}

export function writeCachedExerciseCatalog(userId, exercises) {
  if (typeof window === "undefined" || !userId || !Array.isArray(exercises)) return;
  try {
    localStorage.setItem(
      cacheKey(userId),
      JSON.stringify({ savedAt: Date.now(), exercises }),
    );
  } catch {
    /* quota — ignore */
  }
}

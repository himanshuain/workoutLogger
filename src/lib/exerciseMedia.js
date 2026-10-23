import {
  getExerciseMediaOverrideUrl,
  getExerciseMediaOverrideByName,
  getExerciseMediaOverrideState,
} from "@/lib/exerciseMediaOverrides";
import { resolveExerciseFromCatalog } from "@/lib/plannerLibraryNavigation";

/**
 * Prefer user override, then GIF (animated demo), then static image from catalog.
 */
export function exerciseMediaUrl(exercise, overrides) {
  if (!exercise) return null;
  const custom = getExerciseMediaOverrideUrl(exercise, overrides);
  if (custom) return custom;
  return exercise.gif_url || exercise.image_url || null;
}

function normalizeExerciseNameForLookup(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function findCatalogExerciseByName(exercises, exerciseName) {
  if (!Array.isArray(exercises) || !exerciseName) return null;
  const key = normalizeExerciseNameForLookup(exerciseName);
  if (!key) return null;
  return exercises.find(e => normalizeExerciseNameForLookup(e?.name) === key) ?? null;
}

/**
 * Thumbnail URL for a routine/log row (id + name catalog match + overrides).
 * @param {string | null | undefined} exerciseId — routine row id when available
 */
export function resolveExerciseMediaUrl(exercises, exerciseName, overrides, exerciseId = null) {
  const ex =
    resolveExerciseFromCatalog(exercises, { exerciseId, exerciseName }) ??
    findCatalogExerciseByName(exercises, exerciseName);
  if (ex) return exerciseMediaUrl(ex, overrides);
  return getExerciseMediaOverrideByName(exerciseName, overrides);
}

export function exerciseUsesGif(exercise) {
  return Boolean(exercise?.gif_url);
}

/** True when we can try /api/exercisedb-exercise for GIF URL (DB row missing gif_url). @see https://www.exercisedb.dev/docs */
export function canResolveExerciseDbThumbnail(exercise) {
  if (!exercise) return false;
  if (exercise.gif_url || exercise.image_url) return false;
  return (
    exercise.external_source === "exercisedb" &&
    exercise.external_id != null &&
    String(exercise.external_id).length > 0
  );
}

/** Equipment string from column (wger/legacy) or ExerciseDB metadata. */
export function getExerciseEquipment(exercise) {
  if (!exercise) return "";
  if (typeof exercise.equipment === "string" && exercise.equipment.trim()) {
    return exercise.equipment.trim();
  }
  const display = exercise.metadata?.equipment_display;
  if (typeof display === "string" && display.trim()) return display.trim();
  const list = exercise.metadata?.exercisedb?.equipments;
  if (Array.isArray(list) && list.length) return list.join(", ");
  const eapiEq = exercise.metadata?.exerciseapi?.equipment;
  if (typeof eapiEq === "string" && eapiEq.trim()) return eapiEq.trim();
  return "";
}

const GOOGLE_IMAGES_SITE_FILTER = "site:smartworkout.app";

/** Direct media hosted on SmartWorkout (paste-URL validation). */
export function isSmartworkoutMediaUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return host === "api.smartworkout.app" || host.endsWith(".smartworkout.app");
  } catch {
    return false;
  }
}

/** Google Images SERP URL for reference photos (embedding google.com in iframes is blocked). */
export function googleImagesSearchUrl(query) {
  if (typeof query !== "string") return null;
  const base = query.trim();
  if (!base) return null;
  const q = /\bsite:\s*(?:https?:\/\/)?smartworkout\.app\b/i.test(base)
    ? base
    : `${base} ${GOOGLE_IMAGES_SITE_FILTER}`;
  return `https://www.google.com/search?tbm=isch&hl=en&q=${encodeURIComponent(q)}`;
}

/** Hostnames configured in next.config `images.remotePatterns`. */
const NEXT_IMAGE_ALLOWED_HOSTS = ["wger.de", "static.exercisedb.dev"];

function isNextImageAllowedHost(url) {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return NEXT_IMAGE_ALLOWED_HOSTS.some(
      allowed => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

/**
 * Next/Image: use unoptimized when the URL is a GIF, from catalog hosts that need it,
 * or from any host not in next.config (e.g. user-pasted custom thumbnails).
 */
export function exerciseImageUnoptimized(url) {
  if (!url) return false;
  if (url.startsWith("data:")) return true;
  if (
    url.includes("wger.de") ||
    url.includes("exercisedb.dev") ||
    url.includes("api.smartworkout.app") ||
    /\.gif(\?|#|$)/i.test(url)
  ) {
    return true;
  }
  return !isNextImageAllowedHost(url);
}

/** Keep a slide visible while delete/sync is in flight (settings update is optimistic). */
export function mediaUrlsWithPendingDelete(urls, deletingUrl) {
  const list = Array.isArray(urls) ? urls.filter(u => typeof u === "string" && u.trim()) : [];
  if (!deletingUrl || typeof deletingUrl !== "string") return list;
  const key = normalizeComparableMediaUrl(deletingUrl);
  if (list.some(u => normalizeComparableMediaUrl(u) === key)) return list;
  return [deletingUrl.trim(), ...list];
}

export function normalizeComparableMediaUrl(url) {
  if (typeof url !== "string") return "";
  const t = url.trim();
  if (!t) return "";
  try {
    const u = new URL(t);
    let path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.origin.toLowerCase()}${path.toLowerCase()}${u.search}`;
  } catch {
    return t.toLowerCase().replace(/\/+$/, "");
  }
}

/** Distinct gif/image URLs stored on one exercise row. */
export function collectUrlsFromExerciseRow(exercise) {
  if (!exercise) return [];
  /** @type {string[]} */
  const out = [];
  const push = url => {
    if (typeof url !== "string" || !url.trim()) return;
    out.push(url.trim());
  };
  push(exercise.gif_url);
  push(exercise.image_url);
  const eapi = exercise.metadata?.exerciseapi;
  if (Array.isArray(eapi?.images)) {
    for (const img of eapi.images) {
      if (typeof img === "string") push(img);
      else if (img?.url) push(img.url);
    }
  }
  /** @type {Set<string>} */
  const seen = new Set();
  return out.filter(u => {
    const k = normalizeComparableMediaUrl(u);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function normalizeExerciseNameForMerge(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * All unique media URLs for an exercise: this row plus other library rows with the same normalized name.
 * Uses only real columns (`gif_url`, `image_url`).
 */
export function collectExerciseMediaUrls(exercise, allExercises, overrides) {
  if (!exercise) return [];
  const { primary, extras, hidden } = getExerciseMediaOverrideState(exercise, overrides);
  const hiddenSet = new Set(hidden.map(normalizeComparableMediaUrl));
  const list = [];
  if (primary) list.push(primary);
  for (const u of extras) list.push(u);
  list.push(...collectUrlsFromExerciseRow(exercise));

  const key = normalizeExerciseNameForMerge(exercise.name);
  if (Array.isArray(allExercises) && key) {
    for (const e of allExercises) {
      if (!e || e.id === exercise.id) continue;
      if (e.external_source !== "smartworkout") continue;
      if (normalizeExerciseNameForMerge(e.name) !== key) continue;
      list.push(...collectUrlsFromExerciseRow(e));
    }
  }

  const seen = new Set();
  return list.filter(u => {
    const k = normalizeComparableMediaUrl(u);
    if (hiddenSet.has(k)) return false;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

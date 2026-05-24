function normalizeName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Stable key for user_settings.exercise_media_overrides. */
export function getExerciseMediaOverrideKey(exercise) {
  if (!exercise) return null;
  if (exercise.id) return String(exercise.id);
  const name = normalizeName(exercise.name);
  return name ? `name:${name}` : null;
}

export function getExerciseMediaOverrideUrl(exercise, overrides) {
  if (!exercise || !overrides || typeof overrides !== "object") return null;
  const key = getExerciseMediaOverrideKey(exercise);
  if (!key) return null;
  const entry = overrides[key];
  if (!entry || typeof entry !== "object") return null;
  const url = entry.media_url ?? entry.url ?? entry.image_url ?? entry.gif_url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

export function mergeMediaUrlsWithOverride(urls, overrideUrl) {
  const list = Array.isArray(urls) ? urls.filter(u => typeof u === "string" && u.trim()) : [];
  if (!overrideUrl) return list;
  const trimmed = overrideUrl.trim();
  const rest = list.filter(u => u.trim() !== trimmed);
  return [trimmed, ...rest];
}

export function buildExerciseMediaOverridesPatch(overrides, exercise, mediaUrl) {
  const key = getExerciseMediaOverrideKey(exercise);
  if (!key) return null;
  const next = { ...(overrides && typeof overrides === "object" ? overrides : {}) };
  const trimmed = typeof mediaUrl === "string" ? mediaUrl.trim() : "";
  if (trimmed) {
    next[key] = { media_url: trimmed };
  } else {
    delete next[key];
  }
  return next;
}

export function isValidMediaUrl(raw) {
  if (typeof raw !== "string") return false;
  const t = raw.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

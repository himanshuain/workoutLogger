function normalizeName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** "Face Pull" and "Facepull" → "facepull" for stable override keys. */
export function compactExerciseName(name) {
  return normalizeName(name).replace(/[^a-z0-9]/g, "");
}

function readOverrideEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const url = entry.media_url ?? entry.url ?? entry.image_url ?? entry.gif_url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

/** All keys used to store/read a custom thumbnail for one exercise. */
export function getExerciseMediaOverrideKeys(exercise) {
  if (!exercise) return [];
  const keys = [];
  if (exercise.id) keys.push(String(exercise.id));
  const name = normalizeName(exercise.name);
  const compact = compactExerciseName(exercise.name);
  if (name) keys.push(`name:${name}`);
  if (compact) keys.push(`name:${compact}`);
  return [...new Set(keys)];
}

/** Primary key (legacy); prefer getExerciseMediaOverrideKeys for read/write. */
export function getExerciseMediaOverrideKey(exercise) {
  return getExerciseMediaOverrideKeys(exercise)[0] ?? null;
}

export function getExerciseMediaOverrideUrl(exercise, overrides) {
  if (!exercise || !overrides || typeof overrides !== "object") return null;
  const keys = getExerciseMediaOverrideKeys(exercise);
  for (const key of keys) {
    const url = readOverrideEntry(overrides[key]);
    if (url) return url;
  }
  return null;
}

/** Override when only the exercise name is known (e.g. routine row). */
export function getExerciseMediaOverrideByName(exerciseName, overrides) {
  if (!overrides || typeof overrides !== "object") return null;
  const keys = [
    `name:${normalizeName(exerciseName)}`,
    `name:${compactExerciseName(exerciseName)}`,
  ];
  for (const key of [...new Set(keys)]) {
    const url = readOverrideEntry(overrides[key]);
    if (url) return url;
  }
  return null;
}

export function mergeMediaUrlsWithOverride(urls, overrideUrl) {
  const list = Array.isArray(urls) ? urls.filter(u => typeof u === "string" && u.trim()) : [];
  if (!overrideUrl) return list;
  const trimmed = overrideUrl.trim();
  const rest = list.filter(u => u.trim() !== trimmed);
  return [trimmed, ...rest];
}

export function buildExerciseMediaOverridesPatch(overrides, exercise, mediaUrl) {
  const keys = getExerciseMediaOverrideKeys(exercise);
  if (!keys.length) return null;

  const next = { ...(overrides && typeof overrides === "object" ? overrides : {}) };
  const trimmed = typeof mediaUrl === "string" ? mediaUrl.trim() : "";

  for (const key of keys) {
    if (trimmed) {
      next[key] = { media_url: trimmed };
    } else {
      delete next[key];
    }
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

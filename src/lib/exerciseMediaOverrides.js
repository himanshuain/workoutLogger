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

function readOverrideEntryRaw(entry) {
  if (!entry || typeof entry !== "object") return null;
  return entry;
}

/** Match URLs for hide/remove (same rules as exerciseMedia.normalizeComparableMediaUrl). */
function comparableMediaUrl(url) {
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

function readStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(u => typeof u === "string" && u.trim())
    .map(u => u.trim());
}

/** User override state: custom URLs + catalog URLs hidden for this exercise. */
export function getExerciseMediaOverrideState(exercise, overrides) {
  if (!exercise || !overrides || typeof overrides !== "object") {
    return { primary: null, extras: [], hidden: [] };
  }
  let entry = null;
  for (const key of getExerciseMediaOverrideKeys(exercise)) {
    entry = readOverrideEntryRaw(overrides[key]);
    if (entry) break;
  }
  if (!entry) return { primary: null, extras: [], hidden: [] };
  return {
    primary: readOverrideEntry(entry),
    extras: readStringArray(entry.media_urls),
    hidden: readStringArray(entry.hidden_urls),
  };
}

function overrideEntryIsEmpty(entry) {
  if (!entry || typeof entry !== "object") return true;
  if (readOverrideEntry(entry)) return false;
  if (readStringArray(entry.media_urls).length) return false;
  if (readStringArray(entry.hidden_urls).length) return false;
  return true;
}

function writeOverrideEntryOnKeys(next, keys, entry) {
  const empty = overrideEntryIsEmpty(entry);
  for (const key of keys) {
    if (empty) delete next[key];
    else next[key] = { ...entry };
  }
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
      const prev = readOverrideEntryRaw(next[key]) ?? {};
      next[key] = { ...prev, media_url: trimmed };
    } else {
      const prev = readOverrideEntryRaw(next[key]);
      if (!prev) {
        delete next[key];
        continue;
      }
      const { media_url: _drop, ...rest } = prev;
      if (overrideEntryIsEmpty(rest)) delete next[key];
      else next[key] = rest;
    }
  }
  return next;
}

/** Remove one slide URL (custom override or hide catalog URL for this user). */
export function buildExerciseMediaRemoveUrlPatch(overrides, exercise, rawUrl) {
  const keys = getExerciseMediaOverrideKeys(exercise);
  if (!keys.length || typeof rawUrl !== "string" || !rawUrl.trim()) return null;

  const target = comparableMediaUrl(rawUrl);
  const next = { ...(overrides && typeof overrides === "object" ? overrides : {}) };

  let entry = null;
  for (const key of keys) {
    entry = readOverrideEntryRaw(next[key]);
    if (entry) break;
  }
  entry = entry ? { ...entry } : {};

  let removedCustom = false;
  const primary = readOverrideEntry(entry);
  if (primary && comparableMediaUrl(primary) === target) {
    delete entry.media_url;
    removedCustom = true;
  }

  const extras = readStringArray(entry.media_urls);
  if (extras.length) {
    const filtered = extras.filter(u => comparableMediaUrl(u) !== target);
    if (filtered.length !== extras.length) removedCustom = true;
    if (filtered.length) entry.media_urls = filtered;
    else delete entry.media_urls;
  }

  if (!removedCustom) {
    const hidden = readStringArray(entry.hidden_urls);
    if (!hidden.some(u => comparableMediaUrl(u) === target)) {
      entry.hidden_urls = [...hidden, rawUrl.trim()];
    }
  }

  writeOverrideEntryOnKeys(next, keys, entry);
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

export function isDataUrlGif(raw) {
  return typeof raw === "string" && /^data:image\/gif;/i.test(raw.trim());
}

/** HTTP(S) URLs or device-uploaded GIF data URLs stored in overrides. */
export function isPersistableMediaUrl(raw) {
  if (typeof raw !== "string") return false;
  const t = raw.trim();
  if (!t) return false;
  if (isValidMediaUrl(t)) return true;
  if (isDataUrlGif(t)) return t.length <= 12_000_000;
  return false;
}

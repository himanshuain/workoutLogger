/**
 * Client session state: ad-hoc exercises and per-exercise completion flags.
 * Persists to localStorage cache and optional Supabase `workout_sessions.client_meta`.
 */

const extrasKey = sessionId => `wl_session_extras_${sessionId}`;
const doneKey = sessionId => `wl_session_exercise_done_${sessionId}`;
const orderKey = sessionId => `wl_session_exercise_order_${sessionId}`;
const skippedKey = sessionId => `wl_session_skipped_${sessionId}`;

let persistMetaCallback = null;

export function setSessionMetaPersistCallback(fn) {
  persistMetaCallback = fn;
}

function readMeta(session) {
  const meta = session?.client_meta;
  if (meta && typeof meta === "object") return meta;
  return {};
}

function buildMeta(sessionId, extras, doneMap, exerciseOrder, skippedNames) {
  return {
    extras: extras ?? getSessionExtras(sessionId),
    exercise_done: doneMap ?? getExerciseDoneMap(sessionId),
    exercise_order: exerciseOrder ?? getSessionExerciseOrder(sessionId),
    skipped_exercises: skippedNames ?? getSessionSkippedNames(sessionId),
  };
}

function persistLocal(sessionId, extras, doneMap, exerciseOrder, skippedNames) {
  if (typeof window === "undefined" || !sessionId) return;
  const order = exerciseOrder ?? getSessionExerciseOrder(sessionId);
  const skipped = skippedNames ?? getSessionSkippedNames(sessionId);
  try {
    localStorage.setItem(extrasKey(sessionId), JSON.stringify(extras));
    localStorage.setItem(doneKey(sessionId), JSON.stringify(doneMap));
    localStorage.setItem(orderKey(sessionId), JSON.stringify(order));
    localStorage.setItem(skippedKey(sessionId), JSON.stringify(skipped));
  } catch {
    /* ignore */
  }
  if (persistMetaCallback) {
    persistMetaCallback(sessionId, buildMeta(sessionId, extras, doneMap, order, skipped));
  }
}

/** Hydrate localStorage from server session row. */
export function hydrateSessionClientState(session) {
  if (typeof window === "undefined" || !session?.id) return;
  const meta = readMeta(session);
  if (Array.isArray(meta.extras)) {
    localStorage.setItem(extrasKey(session.id), JSON.stringify(meta.extras));
  }
  if (meta.exercise_done && typeof meta.exercise_done === "object") {
    localStorage.setItem(doneKey(session.id), JSON.stringify(meta.exercise_done));
  }
  if (Array.isArray(meta.exercise_order)) {
    localStorage.setItem(orderKey(session.id), JSON.stringify(meta.exercise_order));
  }
  if (Array.isArray(meta.skipped_exercises)) {
    localStorage.setItem(skippedKey(session.id), JSON.stringify(meta.skipped_exercises));
  }
}

export function getSessionSkippedNames(sessionId) {
  if (typeof window === "undefined" || !sessionId) return [];
  try {
    const raw = localStorage.getItem(skippedKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(n => typeof n === "string" && n.trim()) : [];
  } catch {
    return [];
  }
}

/** Hide a split exercise for this session only (does not edit the saved split). */
export function skipSessionSplitExercise(sessionId, exerciseName) {
  if (typeof window === "undefined" || !sessionId || !exerciseName) return [];
  const name = String(exerciseName).trim();
  if (!name) return getSessionSkippedNames(sessionId);
  const skipped = getSessionSkippedNames(sessionId);
  if (skipped.includes(name)) return skipped;
  const next = [...skipped, name];
  persistLocal(
    sessionId,
    getSessionExtras(sessionId),
    getExerciseDoneMap(sessionId),
    getSessionExerciseOrder(sessionId),
    next,
  );
  const order = getSessionExerciseOrder(sessionId).filter(n => n !== name);
  setSessionExerciseOrder(sessionId, order);
  setExerciseDone(sessionId, name, false);
  return next;
}

export function getSessionExerciseOrder(sessionId) {
  if (typeof window === "undefined" || !sessionId) return [];
  try {
    const raw = localStorage.getItem(orderKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setSessionExerciseOrder(sessionId, order) {
  if (typeof window === "undefined" || !sessionId) return;
  const list = Array.isArray(order) ? order : [];
  persistLocal(
    sessionId,
    getSessionExtras(sessionId),
    getExerciseDoneMap(sessionId),
    list,
  );
}

/**
 * Prepend exercise to session order (2nd move → index 1). Syncs via client_meta on workout_sessions.
 * @param {string[]} displayOrderNames — current list order (all planned exercise names).
 */
export function moveSessionExerciseToTop(sessionId, exerciseName, displayOrderNames) {
  if (typeof window === "undefined" || !sessionId || !exerciseName) return;
  const names = Array.isArray(displayOrderNames) ? displayOrderNames.filter(Boolean) : [];
  let order = getSessionExerciseOrder(sessionId);
  const nameSet = new Set(names.length ? names : [exerciseName]);

  if (names.length) {
    const valid = order.filter(n => nameSet.has(n));
    const missing = names.filter(n => !valid.includes(n));
    order = [...valid, ...missing];
    if (order.length !== names.length) {
      order = [...names];
    }
  }

  order = order.filter(n => n !== exerciseName);
  order.unshift(exerciseName);
  setSessionExerciseOrder(sessionId, order);
}

export function getSessionExtras(sessionId) {
  if (typeof window === "undefined" || !sessionId) return [];
  try {
    const raw = localStorage.getItem(extrasKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setSessionExtras(sessionId, extras) {
  if (typeof window === "undefined" || !sessionId) return;
  persistLocal(sessionId, extras, getExerciseDoneMap(sessionId));
}

export function addSessionExtra(sessionId, exercise) {
  const list = getSessionExtras(sessionId);
  const exists = list.some(e => e.exercise_name === exercise.exercise_name);
  if (exists) return list;
  const next = [
    ...list,
    {
      exercise_id: exercise.exercise_id ?? null,
      exercise_name: exercise.exercise_name,
      category: exercise.category || "other",
      equipment: exercise.equipment || "",
      image_url: exercise.image_url || null,
      added_today: true,
    },
  ];
  setSessionExtras(sessionId, next);
  return next;
}

/** Remove one "added today" extra by name; clears its done flag. */
export function removeSessionExtra(sessionId, exerciseName) {
  if (typeof window === "undefined" || !sessionId || !exerciseName) return [];
  const list = getSessionExtras(sessionId);
  const next = list.filter(e => e.exercise_name !== exerciseName);
  setSessionExtras(sessionId, next);
  setExerciseDone(sessionId, exerciseName, false);
  const order = getSessionExerciseOrder(sessionId).filter(n => n !== exerciseName);
  setSessionExerciseOrder(sessionId, order);
  return next;
}

/** When server-side set_logs are renamed; keep extras + done map in sync. */
export function renameSessionExerciseClient(sessionId, oldName, newName) {
  if (
    typeof window === "undefined" ||
    typeof sessionId !== "string" ||
    typeof oldName !== "string" ||
    typeof newName !== "string" ||
    !oldName.trim() ||
    !newName.trim() ||
    oldName === newName
  ) {
    return;
  }
  const list = getSessionExtras(sessionId).map(e =>
    e.exercise_name === oldName ? { ...e, exercise_name: newName } : e,
  );
  const dm = getExerciseDoneMap(sessionId);
  const nextDone = { ...dm };
  if (nextDone[oldName]) {
    delete nextDone[oldName];
    nextDone[newName] = true;
  }
  const order = getSessionExerciseOrder(sessionId).map(n =>
    n === oldName ? newName : n,
  );
  persistLocal(sessionId, list, nextDone, order);
}

export function getExerciseDoneMap(sessionId) {
  if (typeof window === "undefined" || !sessionId) return {};
  try {
    const raw = localStorage.getItem(doneKey(sessionId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function setExerciseDone(sessionId, exerciseName, done = true) {
  if (typeof window === "undefined" || !sessionId || !exerciseName) return;
  const map = { ...getExerciseDoneMap(sessionId) };
  if (done) map[exerciseName] = true;
  else delete map[exerciseName];
  persistLocal(sessionId, getSessionExtras(sessionId), map);
}

export function clearSessionClientState(sessionId) {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    localStorage.removeItem(extrasKey(sessionId));
    localStorage.removeItem(doneKey(sessionId));
    localStorage.removeItem(orderKey(sessionId));
    localStorage.removeItem(skippedKey(sessionId));
  } catch {
    /* ignore */
  }
}

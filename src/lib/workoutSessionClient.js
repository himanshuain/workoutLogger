/**
 * Client session state: ad-hoc exercises and per-exercise completion flags.
 * Persists to localStorage cache and optional Supabase `workout_sessions.client_meta`.
 */

const extrasKey = sessionId => `wl_session_extras_${sessionId}`;
const doneKey = sessionId => `wl_session_exercise_done_${sessionId}`;

let persistMetaCallback = null;

export function setSessionMetaPersistCallback(fn) {
  persistMetaCallback = fn;
}

function readMeta(session) {
  const meta = session?.client_meta;
  if (meta && typeof meta === "object") return meta;
  return {};
}

function buildMeta(sessionId, extras, doneMap) {
  return {
    extras: extras ?? getSessionExtras(sessionId),
    exercise_done: doneMap ?? getExerciseDoneMap(sessionId),
  };
}

function persistLocal(sessionId, extras, doneMap) {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    localStorage.setItem(extrasKey(sessionId), JSON.stringify(extras));
    localStorage.setItem(doneKey(sessionId), JSON.stringify(doneMap));
  } catch {
    /* ignore */
  }
  if (persistMetaCallback) {
    persistMetaCallback(sessionId, buildMeta(sessionId, extras, doneMap));
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
  persistLocal(sessionId, list, nextDone);
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
  } catch {
    /* ignore */
  }
}

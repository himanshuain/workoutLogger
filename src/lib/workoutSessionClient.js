/**
 * Client-only session state: "added today" exercises and per-exercise completion flags.
 * Does not modify saved weekly routines.
 */

const extrasKey = (sessionId) => `wl_session_extras_${sessionId}`;
const doneKey = (sessionId) => `wl_session_exercise_done_${sessionId}`;

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
  try {
    localStorage.setItem(extrasKey(sessionId), JSON.stringify(extras));
  } catch {}
}

export function addSessionExtra(sessionId, exercise) {
  const list = getSessionExtras(sessionId);
  const exists = list.some((e) => e.exercise_name === exercise.exercise_name);
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
  const next = list.filter((e) => e.exercise_name !== exerciseName);
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
  setSessionExtras(sessionId, list);
  const dm = getExerciseDoneMap(sessionId);
  if (dm[oldName]) {
    const next = { ...dm };
    delete next[oldName];
    next[newName] = true;
    try {
      localStorage.setItem(doneKey(sessionId), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
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
  try {
    localStorage.setItem(doneKey(sessionId), JSON.stringify(map));
  } catch {}
}

export function clearSessionClientState(sessionId) {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    localStorage.removeItem(extrasKey(sessionId));
    localStorage.removeItem(doneKey(sessionId));
  } catch {}
}

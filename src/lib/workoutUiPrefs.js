const localKey = userId => `wl_workout_ui_prefs_${userId}`;

let persistCallback = null;

/** Register Supabase sync (WorkoutContext → updateSettings). */
export function setWorkoutUiPrefsPersistCallback(fn) {
  persistCallback = fn;
}

export function readLocalWorkoutUiPrefs(userId) {
  if (typeof window === "undefined" || !userId) return {};
  try {
    const raw = localStorage.getItem(localKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeLocalWorkoutUiPrefs(userId, prefs) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(prefs ?? {}));
  } catch {
    /* ignore */
  }
}

/** Merge server prefs into local cache (on init). */
export function hydrateWorkoutUiPrefsFromServer(userId, serverPrefs) {
  if (!userId || !serverPrefs || typeof serverPrefs !== "object") return;
  const local = readLocalWorkoutUiPrefs(userId);
  const merged = { ...serverPrefs, ...local };
  writeLocalWorkoutUiPrefs(userId, merged);

  const dual = merged.dual_pulley_by_exercise;
  if (dual && typeof dual === "object") {
    try {
      localStorage.setItem(`wl_exercise_dual_pulley_${userId}`, JSON.stringify(dual));
    } catch {
      /* ignore */
    }
  }
  if (merged.exercise_tile_layout) {
    try {
      localStorage.setItem("wl_workout_tile_size", merged.exercise_tile_layout);
    } catch {
      /* ignore */
    }
  }
}

function queuePersist(userId, prefs) {
  if (!userId || !persistCallback) return;
  void persistCallback(prefs);
}

/** Shallow-merge a patch, update localStorage, sync to user_settings.workout_ui_prefs. */
export function patchWorkoutUiPrefs(userId, patch) {
  if (!userId || !patch || typeof patch !== "object") return;
  const next = { ...readLocalWorkoutUiPrefs(userId), ...patch };
  writeLocalWorkoutUiPrefs(userId, next);
  queuePersist(userId, next);
  return next;
}

export function readDualPulleyMapFromPrefs(userId) {
  const prefs = readLocalWorkoutUiPrefs(userId);
  const map = prefs.dual_pulley_by_exercise;
  return map && typeof map === "object" ? map : {};
}

export function writeDualPulleyPrefToPrefs(userId, exerciseName, enabled) {
  if (!userId || !exerciseName) return;
  const map = { ...readDualPulleyMapFromPrefs(userId) };
  if (enabled) map[exerciseName] = true;
  else delete map[exerciseName];
  patchWorkoutUiPrefs(userId, { dual_pulley_by_exercise: map });
  try {
    localStorage.setItem(`wl_exercise_dual_pulley_${userId}`, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function readDualPulleyPrefFromPrefs(userId, exerciseName) {
  if (!userId || !exerciseName) return false;
  return Boolean(readDualPulleyMapFromPrefs(userId)[exerciseName]);
}

export function persistExerciseTileLayoutPref(userId, layout) {
  if (!userId || !layout) return;
  patchWorkoutUiPrefs(userId, { exercise_tile_layout: layout });
  try {
    localStorage.setItem("wl_workout_tile_size", layout);
  } catch {
    /* ignore */
  }
}

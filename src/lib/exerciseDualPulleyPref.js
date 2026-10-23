import {
  readDualPulleyPrefFromPrefs,
  writeDualPulleyPrefToPrefs,
} from "@/lib/workoutUiPrefs";

/** @deprecated legacy key — reads via workout_ui_prefs cache */
export function readDualPulleyPref(userId, exerciseName) {
  return readDualPulleyPrefFromPrefs(userId, exerciseName);
}

export function writeDualPulleyPref(userId, exerciseName, enabled) {
  writeDualPulleyPrefToPrefs(userId, exerciseName, enabled);
}

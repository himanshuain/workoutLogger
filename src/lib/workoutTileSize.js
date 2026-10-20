const STORAGE_KEY = "wl_workout_tile_size";

/** @typedef {"list" | "normal" | "compact"} WorkoutExerciseLayout */

/** @returns {WorkoutExerciseLayout} */
export function getWorkoutExerciseLayout() {
  if (typeof window === "undefined") return "normal";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "compact" || v === "list") return v;
    return "normal";
  } catch {
    return "normal";
  }
}

/** @deprecated use getWorkoutExerciseLayout */
export function getWorkoutTileSize() {
  return getWorkoutExerciseLayout();
}

/** @param {WorkoutExerciseLayout} layout */
export function setWorkoutExerciseLayout(layout) {
  if (typeof window === "undefined") return;
  const v =
    layout === "compact" || layout === "list" ? layout : "normal";
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* ignore */
  }
}

/** @deprecated use setWorkoutExerciseLayout */
export function setWorkoutTileSize(size) {
  setWorkoutExerciseLayout(size);
}

export function tileSizeGridClass(layout) {
  if (layout === "compact") return "grid-cols-3 gap-1.5";
  return "grid-cols-2 gap-2";
}

export function isListLayout(layout) {
  return layout === "list";
}

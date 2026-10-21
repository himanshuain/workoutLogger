const STORAGE_KEY = "wl_workout_tile_size";

/** @typedef {"list" | "normal" | "compact"} WorkoutExerciseLayout */

/** @returns {WorkoutExerciseLayout} */
export function getWorkoutExerciseLayout() {
  if (typeof window === "undefined") return "normal";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "compact" || v === "list" || v === "normal") return v;
    const n = parseInt(v, 10);
    if (n === 0) return "list";
    if (n === 1 || n === 2) return "compact";
    if (Number.isFinite(n)) return "normal";
    return "normal";
  } catch {
    return "normal";
  }
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

/** @deprecated use getWorkoutExerciseLayout */
export function getWorkoutTileSize() {
  return getWorkoutExerciseLayout();
}

/** @deprecated use setWorkoutExerciseLayout */
export function setWorkoutTileSize(size) {
  setWorkoutExerciseLayout(size);
}

export function isListLayout(layout) {
  return layout === "list";
}

export function tileSizeGridClass(layout) {
  if (layout === "compact") {
    return "grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8";
  }
  return "grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7";
}

/**
 * Prefer GIF (animated demo) when available; otherwise static image from catalog.
 */
export function exerciseMediaUrl(exercise) {
  if (!exercise) return null;
  return exercise.gif_url || exercise.image_url || null;
}

export function exerciseUsesGif(exercise) {
  return Boolean(exercise?.gif_url);
}

/** True when we can try /api/exercisedb-exercise for GIF URL (DB row missing gif_url). @see https://www.exercisedb.dev/docs */
export function canResolveExerciseDbThumbnail(exercise) {
  if (!exercise) return false;
  if (exercise.gif_url || exercise.image_url) return false;
  return (
    exercise.external_source === "exercisedb" &&
    exercise.external_id != null &&
    String(exercise.external_id).length > 0
  );
}

/** Equipment string from column (wger/legacy) or ExerciseDB metadata. */
export function getExerciseEquipment(exercise) {
  if (!exercise) return "";
  if (typeof exercise.equipment === "string" && exercise.equipment.trim()) {
    return exercise.equipment.trim();
  }
  const display = exercise.metadata?.equipment_display;
  if (typeof display === "string" && display.trim()) return display.trim();
  const list = exercise.metadata?.exercisedb?.equipments;
  if (Array.isArray(list) && list.length) return list.join(", ");
  return "";
}

/** Next/Image: skip optimizer for GIFs and known external hosts. */
export function exerciseImageUnoptimized(url) {
  if (!url) return false;
  return (
    url.includes("wger.de") ||
    url.includes("exercisedb.dev") ||
    /\.gif(\?|#|$)/i.test(url)
  );
}

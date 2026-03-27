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

/** Single Supabase Storage bucket for all app-uploaded files. */
export const WORKOUTLOGGER_STORAGE_BUCKET = "workoutlogger";

/** Folder inside the bucket (add more prefixes as features need uploads). */
export const STORAGE_PREFIX_EXERCISE_MEDIA = "exercise-media";

/** @deprecated Legacy bucket name — still parsed for delete/migrate. */
export const LEGACY_EXERCISE_MEDIA_BUCKET = "exercise-media";

export function parseWorkoutloggerStorageObjectUrl(publicUrl) {
  if (typeof publicUrl !== "string" || !publicUrl.trim()) return null;
  try {
    const u = new URL(publicUrl.trim());
    for (const bucket of [WORKOUTLOGGER_STORAGE_BUCKET, LEGACY_EXERCISE_MEDIA_BUCKET]) {
      const marker = `/storage/v1/object/public/${bucket}/`;
      const idx = u.pathname.indexOf(marker);
      if (idx === -1) continue;
      const path = u.pathname.slice(idx + marker.length);
      if (!path) continue;
      return { bucket, path };
    }
    return null;
  } catch {
    return null;
  }
}

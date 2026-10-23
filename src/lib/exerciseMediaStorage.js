import { supabase } from "@/lib/supabase";
import {
  compactExerciseName,
  getExerciseMediaOverrideKeys,
} from "@/lib/exerciseMediaOverrides";
import {
  parseWorkoutloggerStorageObjectUrl,
  STORAGE_PREFIX_EXERCISE_MEDIA,
  WORKOUTLOGGER_STORAGE_BUCKET,
} from "@/lib/workoutloggerStorage";

function sanitizeStorageSegment(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 96);
}

/** Stable object path under workoutlogger bucket (upsert on re-upload). */
export function buildExerciseMediaStoragePath(userId, exercise) {
  if (!userId || !exercise) return null;
  const keys = getExerciseMediaOverrideKeys(exercise);
  const key = keys[0] || `name_${compactExerciseName(exercise.name)}`;
  const segment = sanitizeStorageSegment(key) || "exercise";
  return `${STORAGE_PREFIX_EXERCISE_MEDIA}/${userId}/${segment}.gif`;
}

export function parseExerciseMediaStoragePath(publicUrl) {
  const ref = parseWorkoutloggerStorageObjectUrl(publicUrl);
  if (!ref) return null;
  if (!ref.path.startsWith(`${STORAGE_PREFIX_EXERCISE_MEDIA}/`)) return null;
  return ref.path;
}

export function isExerciseMediaStorageUrl(url) {
  return Boolean(parseExerciseMediaStoragePath(url));
}

export function getExerciseMediaPublicUrl(storagePath) {
  if (!storagePath) return null;
  const { data } = supabase.storage.from(WORKOUTLOGGER_STORAGE_BUCKET).getPublicUrl(storagePath);
  return data?.publicUrl ?? null;
}

/**
 * Upload a GIF from the device; returns HTTPS URL stored in exercise_media_overrides.
 */
export async function uploadExerciseMediaGif(userId, exercise, file) {
  if (!userId || !exercise || !file) {
    throw new Error("Missing upload parameters");
  }
  const path = buildExerciseMediaStoragePath(userId, exercise);
  if (!path) throw new Error("Could not build storage path");

  const { error } = await supabase.storage.from(WORKOUTLOGGER_STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "image/gif",
    upsert: true,
  });

  if (error) throw error;

  const publicUrl = getExerciseMediaPublicUrl(path);
  if (!publicUrl) throw new Error("Could not resolve public URL");
  return publicUrl;
}

/** Best-effort remove when user deletes a custom thumbnail hosted in our bucket. */
export async function tryDeleteExerciseMediaFromStorage(mediaUrl) {
  const ref = parseWorkoutloggerStorageObjectUrl(mediaUrl);
  if (!ref?.path.startsWith(`${STORAGE_PREFIX_EXERCISE_MEDIA}/`)) return;
  const { error } = await supabase.storage.from(ref.bucket).remove([ref.path]);
  if (error) {
    console.warn("Could not delete exercise media from storage:", error.message);
  }
}

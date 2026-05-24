import { useMemo } from "react";
import { useWorkout } from "@/context/WorkoutContext";
import { readLocalExerciseMediaOverrides } from "@/lib/userPrefsMigration";
import { mergeExerciseMediaOverrides } from "@/lib/exerciseMediaOverridesStorage";

/**
 * Custom exercise thumbnails — merges React settings with localStorage (survives refresh
 * even when Supabase row/column is missing).
 */
export function useExerciseMediaOverrides() {
  const { settings, user } = useWorkout();
  const settingsOverrides = settings?.exercise_media_overrides;

  return useMemo(() => {
    const local =
      typeof window !== "undefined" && user?.id
        ? readLocalExerciseMediaOverrides(user.id)
        : {};
    const merged = mergeExerciseMediaOverrides(local, settingsOverrides);
    return Object.keys(merged).length ? merged : null;
  }, [user?.id, settingsOverrides]);
}

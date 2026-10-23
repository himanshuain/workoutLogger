import { useMemo } from "react";
import { collectExerciseMediaUrls } from "@/lib/exerciseMedia";

/**
 * Unique media URLs from SmartWorkout DB row + overrides (same-name SmartWorkout duplicates only).
 *
 * Preview/detail only — not for long lists.
 */
export function useResolvedExerciseMediaSlides(exercise, allExercises, overrides) {
  return useMemo(
    () => collectExerciseMediaUrls(exercise, allExercises, overrides),
    [exercise, allExercises, overrides],
  );
}

/**
 * Legacy: first resolved URL (GIF preferred path via catalog columns).
 */
export function useResolvedExerciseMedia(exercise) {
  const slides = useResolvedExerciseMediaSlides(exercise, []);
  return slides[0] ?? null;
}

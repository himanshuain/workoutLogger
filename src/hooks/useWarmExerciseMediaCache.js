import { useEffect } from "react";
import { warmExerciseMediaCache } from "@/lib/exerciseMediaCache";
import { exerciseMediaUrl } from "@/lib/exerciseMedia";

/**
 * Preloads exercise media for a list of exercises (session memory cache).
 * Safe to call with large catalogs — only deduped URLs are touched.
 */
export function useWarmExerciseMediaCache(exercises, mediaOverrides, { enabled = true } = {}) {
  useEffect(() => {
    if (!enabled || !exercises?.length) return;
    const urls = exercises.map(ex => exerciseMediaUrl(ex, mediaOverrides)).filter(Boolean);
    if (urls.length === 0) return;
    warmExerciseMediaCache(urls);
  }, [enabled, exercises, mediaOverrides]);
}

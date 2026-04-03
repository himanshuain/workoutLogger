import { useState, useEffect, useMemo } from "react";
import { exerciseMediaUrl, canResolveExerciseDbThumbnail } from "@/lib/exerciseMedia";

const remoteMediaCache = new Map();

function cacheKey(exercise) {
  if (!exercise?.external_source || exercise.external_id == null) return null;
  return `${exercise.external_source}:${String(exercise.external_id)}`;
}

/**
 * Returns gif_url/image_url from DB, or resolves ExerciseDB GIF via API when missing.
 * Used on exercise preview only — not on long lists (avoids dozens of parallel API calls).
 */
export function useResolvedExerciseMedia(exercise) {
  const direct = useMemo(() => exerciseMediaUrl(exercise), [exercise]);
  const key = useMemo(() => (exercise ? cacheKey(exercise) : null), [exercise]);
  const needsEdb = Boolean(exercise && !direct && canResolveExerciseDbThumbnail(exercise));

  const [resolved, setResolved] = useState(null);

  useEffect(() => {
    if (direct) {
      setResolved(null);
      return;
    }
    if (!exercise || !key) {
      setResolved(null);
      return;
    }
    if (!needsEdb) {
      setResolved(null);
      return;
    }
    if (remoteMediaCache.has(key)) {
      setResolved(remoteMediaCache.get(key));
      return;
    }

    setResolved(null);
    let cancelled = false;
    fetch(`/api/exercisedb-exercise?id=${encodeURIComponent(exercise.external_id)}`)
      .then((r) => r.json())
      .then((data) => {
        const u = data.url || null;
        if (u) remoteMediaCache.set(key, u);
        if (!cancelled) setResolved(u);
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      });

    return () => {
      cancelled = true;
    };
  }, [direct, exercise, key, needsEdb]);

  return direct || resolved || null;
}

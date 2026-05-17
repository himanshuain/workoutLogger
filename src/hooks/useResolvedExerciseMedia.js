import { useState, useEffect, useMemo } from "react";
import {
  normalizeComparableMediaUrl,
  collectExerciseMediaUrls,
} from "@/lib/exerciseMedia";

const remoteSlidesCache = new Map();

function cacheKey(exercise) {
  if (!exercise?.external_source || exercise.external_id == null) return null;
  return `${exercise.external_source}:${String(exercise.external_id)}`;
}

function dedupeConcat(local, remote) {
  const seen = new Set(local.map(normalizeComparableMediaUrl));
  /** @type {string[]} */
  const out = [...local];
  for (const u of remote) {
    const t = typeof u === "string" ? u.trim() : "";
    if (!t) continue;
    const k = normalizeComparableMediaUrl(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * Unique media URLs from DB rows + merged same-name duplicates; optional ExerciseDB extras when entirely missing thumbnails.
 *
 * Preview/detail only — not for long lists.
 */
export function useResolvedExerciseMediaSlides(exercise, allExercises) {
  const staticUrls = useMemo(
    () => collectExerciseMediaUrls(exercise, allExercises),
    [exercise, allExercises]
  );

  const key = useMemo(() => (exercise ? cacheKey(exercise) : null), [exercise]);
  const needsEdb =
    Boolean(exercise) &&
    staticUrls.length === 0 &&
    exercise.external_source === "exercisedb" &&
    exercise.external_id != null &&
    String(exercise.external_id).trim().length > 0;

  const [fetched, setFetched] = useState(/** @type {string[]} */ ([]));

  useEffect(() => {
    if (!needsEdb || !exercise || !key) {
      setFetched([]);
      return;
    }
    if (remoteSlidesCache.has(key)) {
      setFetched(remoteSlidesCache.get(key) || []);
      return;
    }

    setFetched([]);
    let cancelled = false;
    fetch(`/api/exercisedb-exercise?id=${encodeURIComponent(exercise.external_id)}`)
      .then(r => r.json())
      .then(data => {
        const urls = Array.isArray(data.urls) ? data.urls.filter(Boolean) : [];
        const one = typeof data.url === "string" && data.url.trim() ? [data.url.trim()] : [];
        const mergedFetch = urls.length ? urls.map(String).map(s => s.trim()).filter(Boolean) : one;
        if (mergedFetch.length) remoteSlidesCache.set(key, mergedFetch);
        else remoteSlidesCache.set(key, []);
        if (!cancelled) setFetched(mergedFetch);
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      });

    return () => {
      cancelled = true;
    };
  }, [needsEdb, exercise, key]);

  return useMemo(
    () => (staticUrls.length ? staticUrls : dedupeConcat(staticUrls, fetched)),
    [staticUrls, fetched]
  );
}

/**
 * Legacy: first resolved URL (GIF preferred path via catalog columns).
 */
export function useResolvedExerciseMedia(exercise) {
  const slides = useResolvedExerciseMediaSlides(exercise, []);
  return slides[0] ?? null;
}

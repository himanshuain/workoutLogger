import { useCallback, useEffect, useRef, useState } from "react";
import { searchExerciseGifs } from "@/lib/exerciseGifSearch";

/**
 * Search local catalog + ExerciseDB for GIF demos (browser-side ExerciseDB call).
 */
export function useExerciseGifSearch(
  initialQuery = "",
  { enabled = true, debounceMs = 350, localExercises = [] } = {},
) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const requestId = useRef(0);

  const runSearch = useCallback(
    async (term, { silent = false } = {}) => {
      const q = String(term || "").trim();
      if (q.length < 2) {
        setResults([]);
        setSearched(false);
        setLoading(false);
        return;
      }

      const id = ++requestId.current;
      if (!silent) setLoading(true);
      try {
        const merged = await searchExerciseGifs(q, { localExercises, limit: 24 });
        if (id !== requestId.current) return;
        setResults(merged);
        setSearched(true);
      } catch {
        if (id !== requestId.current) return;
        setResults([]);
        setSearched(true);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [localExercises],
  );

  useEffect(() => {
    if (!enabled) return;
    const q = String(query || "").trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = window.setTimeout(() => {
      void runSearch(q);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [query, enabled, debounceMs, runSearch]);

  const reset = useCallback((nextQuery = "") => {
    requestId.current += 1;
    setQuery(nextQuery);
    setResults([]);
    setSearched(false);
    setLoading(false);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    searched,
    runSearch,
    reset,
  };
}

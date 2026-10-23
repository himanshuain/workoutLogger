import { useEffect, useMemo, useState } from "react";
import {
  detailFromCatalogExercise,
  primaryMuscleLabel,
  stabilizingMusclesSummary,
} from "@/lib/smartworkoutExerciseDetail";

export function useSmartworkoutExerciseDetail(exercise) {
  const base = useMemo(() => detailFromCatalogExercise(exercise), [exercise]);
  const [fetched, setFetched] = useState(null);
  const [loading, setLoading] = useState(false);

  const needsFetch = Boolean(base?.needsFetch && base.libraryPath);

  useEffect(() => {
    if (!needsFetch || !base?.libraryPath) {
      setFetched(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const path = encodeURIComponent(base.libraryPath);
    fetch(`/api/smartworkout-exercise-detail?path=${path}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return;
        setFetched(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setFetched(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [needsFetch, base?.libraryPath]);

  return useMemo(() => {
    if (!base) return { detail: null, loading: false };

    if (!fetched) {
      return { detail: base, loading: needsFetch && loading };
    }

    const exerciseMuscles = fetched.exerciseMuscles || base.exerciseMuscles || {};
    const bodyPart = fetched.bodyPart || base.bodyPart;

    return {
      loading: false,
      detail: {
        ...base,
        description: fetched.description || base.description,
        instructions: fetched.instructions?.length ? fetched.instructions : base.instructions,
        tips: fetched.tips?.length ? fetched.tips : base.tips,
        commonMistakes: fetched.commonMistakes?.length ? fetched.commonMistakes : base.commonMistakes,
        bodyPart,
        primaryMuscle: primaryMuscleLabel(bodyPart),
        stabilizingMuscles: stabilizingMusclesSummary(exerciseMuscles, bodyPart),
        exerciseMuscles,
        needsFetch: false,
      },
    };
  }, [base, fetched, needsFetch, loading]);
}

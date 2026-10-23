import { useState, useMemo, useCallback, useEffect } from "react";
import { useWorkout } from "@/context/WorkoutContext";
import {
  REPS_PILLS,
  nearestPill,
  isBarWeight,
  BAR_WEIGHT_KG,
  halveSelectedWeightKg,
  weightPillsForLogMode,
} from "@/lib/pillConstants";
import { deriveEquipmentTags } from "@/lib/exerciseEquipmentFilter";
import { readDualPulleyPref, writeDualPulleyPref } from "@/lib/exerciseDualPulleyPref";
import {
  captureHomeScrollPosition,
  restoreHomeScrollPositionSnapshot,
} from "@/lib/homeScrollRestore";

export function useExerciseSetLogger({
  sessionId,
  exerciseName,
  category,
  catalogExercise,
  explicitPicks = false,
}) {
  const {
    activeSession,
    exerciseHistory,
    addSetLog,
    updateSetLog,
    deleteSetLog,
    getWorkoutSession,
    loadActiveSession,
    user,
  } = useWorkout();

  const [localSession, setLocalSession] = useState(null);
  const [editWeight, setEditWeight] = useState(explicitPicks ? null : 20);
  const [reps, setReps] = useState(explicitPicks ? null : 15);
  const [logMode, setLogMode] = useState("barbell");
  const [dualPulleyActive, setDualPulleyActive] = useState(false);
  const [removingSetId, setRemovingSetId] = useState(null);

  const effectiveSession = useMemo(() => {
    if (activeSession?.id === sessionId) return activeSession;
    return localSession;
  }, [activeSession, sessionId, localSession]);

  useEffect(() => {
    if (!sessionId || activeSession?.id === sessionId) {
      setLocalSession(null);
      return;
    }
    let cancelled = false;
    getWorkoutSession(sessionId).then(data => {
      if (!cancelled) setLocalSession(data);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, activeSession?.id, getWorkoutSession]);

  useEffect(() => {
    if (!sessionId || !exerciseName) return;
    setDualPulleyActive(readDualPulleyPref(user?.id, exerciseName));
    if (explicitPicks) {
      setEditWeight(null);
      setReps(null);
    }
  }, [sessionId, exerciseName, explicitPicks, user?.id]);

  const setsForExercise = useMemo(() => {
    const logs = effectiveSession?.set_logs || [];
    return logs
      .filter(l => l.exercise_name === exerciseName && l.is_completed)
      .sort((a, b) => a.set_number - b.set_number);
  }, [effectiveSession, exerciseName]);

  const currentSetWeight = useMemo(() => {
    if (editWeight == null) return null;
    if (isBarWeight(editWeight)) return editWeight;
    return dualPulleyActive ? halveSelectedWeightKg(editWeight) : editWeight;
  }, [dualPulleyActive, editWeight]);

  const weightPills = useMemo(() => weightPillsForLogMode(logMode), [logMode]);

  useEffect(() => {
    if (!exerciseName) return;
    const tags = deriveEquipmentTags(catalogExercise || { name: exerciseName });
    if (tags.includes("bodyweight") && !tags.includes("barbell")) {
      setLogMode("bodyweight");
    } else {
      setLogMode("barbell");
    }
  }, [exerciseName, catalogExercise]);

  useEffect(() => {
    if (explicitPicks) return;
    setEditWeight(w => (isBarWeight(w) ? w : nearestPill(w, weightPills)));
  }, [weightPills, explicitPicks]);

  const lastLogged = setsForExercise[setsForExercise.length - 1];
  const hasLoggedSets = setsForExercise.length > 0;

  useEffect(() => {
    if (!exerciseName || explicitPicks) return;
    const pills = weightPillsForLogMode(logMode);
    if (lastLogged) {
      if (!dualPulleyActive) {
        setEditWeight(nearestPill(lastLogged.weight, pills));
      }
      setReps(nearestPill(lastLogged.reps, REPS_PILLS));
      return;
    }
    const h = exerciseHistory?.[exerciseName];
    const defaultWeight = logMode === "bodyweight" ? 0 : 20;
    setEditWeight(nearestPill(h?.last_weight ?? defaultWeight, pills));
    setReps(nearestPill(h?.last_reps ?? 15, REPS_PILLS));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit logMode so Bar/BW pill taps are not overwritten.
  }, [exerciseName, exerciseHistory, lastLogged?.id, setsForExercise.length, dualPulleyActive, explicitPicks]);

  const handleLogModePill = useCallback(mode => {
    setLogMode(mode);
    setEditWeight(BAR_WEIGHT_KG);
  }, []);

  const handleDualPulleyToggle = useCallback(() => {
    setDualPulleyActive(prev => {
      const next = !prev;
      if (user?.id && exerciseName) {
        writeDualPulleyPref(user.id, exerciseName, next);
      }
      return next;
    });
  }, [user?.id, exerciseName]);
  const picksComplete = editWeight != null && reps != null;

  const refreshSession = useCallback(async () => {
    if (!sessionId) return;
    if (activeSession?.id === sessionId) {
      await loadActiveSession();
      return;
    }
    const updated = await getWorkoutSession(sessionId);
    setLocalSession(updated);
  }, [sessionId, activeSession?.id, loadActiveSession, getWorkoutSession]);

  const handleSaveSet = useCallback(async () => {
    if (!sessionId || !exerciseName || editWeight == null || reps == null) return;
    const row = await addSetLog({
      sessionId,
      exerciseName,
      category,
    });
    if (!row) return;
    await updateSetLog(row.id, {
      weight: currentSetWeight,
      reps,
      is_completed: true,
    });
    const scrollSnapshot = captureHomeScrollPosition();
    await refreshSession();
    restoreHomeScrollPositionSnapshot(scrollSnapshot);
  }, [
    sessionId,
    exerciseName,
    category,
    currentSetWeight,
    reps,
    dualPulleyActive,
    addSetLog,
    updateSetLog,
    refreshSession,
  ]);

  const handleRemoveSet = useCallback(
    async setLogId => {
      if (!sessionId) return;
      setRemovingSetId(setLogId);
      try {
        const ok = await deleteSetLog(setLogId);
        if (!ok) return;
        const scrollSnapshot = captureHomeScrollPosition();
        await refreshSession();
        restoreHomeScrollPositionSnapshot(scrollSnapshot);
      } finally {
        setRemovingSetId(null);
      }
    },
    [sessionId, deleteSetLog, refreshSession],
  );

  return {
    logMode,
    picksComplete,
    editWeight,
    setEditWeight,
    reps,
    setReps,
    weightPills,
    currentSetWeight,
    dualPulleyActive,
    hasLoggedSets,
    setsForExercise,
    removingSetId,
    handleLogModePill,
    handleDualPulleyToggle,
    handleSaveSet,
    handleRemoveSet,
  };
}

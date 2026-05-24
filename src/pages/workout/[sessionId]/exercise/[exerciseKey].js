import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import { WEIGHT_PILLS_KG, REPS_PILLS, nearestPill, formatWeightPill, formatWeightDisplay, isBarWeight } from "@/lib/pillConstants";
import { isSessionToday } from "@/lib/workoutNavigation";
import PillRail from "@/components/workout/PillRail";
import { Trash2, X } from "lucide-react";

export default function ExerciseLoggerPage() {
  const router = useRouter();
  const { sessionId, exerciseKey, category: categoryQuery } = router.query;
  const { isDarkMode } = useTheme();
  const {
    user,
    activeSession,
    getWorkoutSession,
    exercises,
    exerciseHistory,
    addSetLog,
    updateSetLog,
    deleteSetLog,
    loadActiveSession,
  } = useWorkout();

  const categoryFromQuery =
    typeof categoryQuery === "string" ? decodeURIComponent(categoryQuery) : null;

  const exerciseName = useMemo(() => {
    if (!exerciseKey || typeof exerciseKey !== "string") return "";
    try {
      return decodeURIComponent(exerciseKey);
    } catch {
      return exerciseKey;
    }
  }, [exerciseKey]);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!sessionId || !user) return;
      setLoading(true);
      const data = await getWorkoutSession(sessionId);
      setSession(data);
      setLoading(false);
    }
    load();
  }, [sessionId, user, getWorkoutSession]);

  const catalogExercise = useMemo(() => {
    if (!exerciseName) return null;
    return (
      exercises.find((e) => e.name === exerciseName) ||
      exercises.find((e) => e.name?.toLowerCase() === exerciseName?.toLowerCase()) ||
      null
    );
  }, [exercises, exerciseName]);

  const category = categoryFromQuery || catalogExercise?.category || "other";

  const effectiveSession = useMemo(() => {
    if (activeSession?.id === sessionId) return activeSession;
    return session;
  }, [activeSession, sessionId, session]);

  const setsForExercise = useMemo(() => {
    const logs = effectiveSession?.set_logs || [];
    return logs
      .filter((l) => l.exercise_name === exerciseName && l.is_completed)
      .sort((a, b) => a.set_number - b.set_number);
  }, [effectiveSession, exerciseName]);

  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(15);
  const [removingSetId, setRemovingSetId] = useState(null);

  const lastLogged = setsForExercise[setsForExercise.length - 1];
  const hasLoggedSets = setsForExercise.length > 0;

  useEffect(() => {
    if (!exerciseName) return;
    if (lastLogged) {
      setWeight(nearestPill(lastLogged.weight, WEIGHT_PILLS_KG));
      setReps(nearestPill(lastLogged.reps, REPS_PILLS));
      return;
    }
    const h = exerciseHistory?.[exerciseName];
    setWeight(nearestPill(h?.last_weight ?? 20, WEIGHT_PILLS_KG));
    setReps(nearestPill(h?.last_reps ?? 15, REPS_PILLS));
  }, [exerciseName, exerciseHistory, lastLogged?.id, setsForExercise.length]);

  const handleSaveSet = useCallback(async () => {
    if (!sessionId || !exerciseName) return;
    const row = await addSetLog({
      sessionId,
      exerciseName,
      category,
    });
    if (!row) return;
    await updateSetLog(row.id, {
      weight,
      reps,
      is_completed: true,
    });
    const updated = await getWorkoutSession(sessionId);
    setSession(updated);
    await loadActiveSession();
  }, [
    sessionId,
    exerciseName,
    category,
    weight,
    reps,
    addSetLog,
    updateSetLog,
    getWorkoutSession,
    loadActiveSession,
  ]);

  const handleRemoveSet = useCallback(
    async (setLogId) => {
      if (!sessionId) return;
      setRemovingSetId(setLogId);
      try {
        const ok = await deleteSetLog(setLogId);
        if (!ok) return;
        const updated = await getWorkoutSession(sessionId);
        setSession(updated);
        await loadActiveSession();
      } finally {
        setRemovingSetId(null);
      }
    },
    [sessionId, deleteSetLog, getWorkoutSession, loadActiveSession],
  );

  const handleClose = () => {
    // Return to session overview for past dates, home for today
    if (isSessionToday(effectiveSession)) {
      router.push("/");
    } else {
      router.push(`/workout/${sessionId}`);
    }
  };

  if (!router.isReady || loading || !sessionId) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDarkMode ? "bg-iron-950" : "bg-slate-50"
        }`}
      >
        <div
          className={`w-8 h-8 border-2 rounded-full animate-spin ${
            isDarkMode ? "border-lift-primary border-t-transparent" : "border-workout-primary border-t-transparent"
          }`}
        />
      </div>
    );
  }

  // Allow logging even if exercise not in catalog (custom names)
  const title = exerciseName || "Exercise";

  return (
    <div
      className={`min-h-screen flex flex-col ${isDarkMode ? "bg-iron-950" : "bg-slate-50"}`}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <header
        className={`shrink-0 flex items-start justify-between gap-4 px-5 pt-6 pb-4 border-b ${
          isDarkMode ? "border-iron-800/90 bg-iron-950/95" : "border-slate-200 bg-white/80"
        }`}
      >
        <div className="min-w-0 flex-1">
          <h1
            className={`text-xl font-semibold tracking-tight leading-tight ${
              isDarkMode ? "text-iron-50" : "text-slate-900"
            }`}
          >
            {title}
          </h1>
          <p
            className={`text-sm mt-1 capitalize ${
              isDarkMode ? "text-iron-500" : "text-slate-500"
            }`}
          >
            {category && category !== "other" ? category : "General"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className={`shrink-0 w-11 h-11 rounded-card flex items-center justify-center ${
            isDarkMode ? "bg-iron-800 text-iron-300" : "bg-slate-100 text-slate-600"
          }`}
          aria-label="Done"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8">
        <PillRail
          label="Weight"
          values={WEIGHT_PILLS_KG}
          selected={weight}
          onSelect={setWeight}
          format={formatWeightPill}
          isDarkMode={isDarkMode}
        />

        <PillRail
          label="Reps"
          values={REPS_PILLS}
          selected={reps}
          onSelect={setReps}
          isDarkMode={isDarkMode}
        />

        <div
          className={`rounded-card p-6 space-y-4 ${
            isDarkMode ? "bg-iron-900/80 border border-iron-800" : "bg-white border border-slate-200 shadow-sm"
          }`}
        >
          <p
            className={`text-[11px] font-semibold uppercase tracking-widest ${
              isDarkMode ? "text-iron-500" : "text-slate-500"
            }`}
          >
            Current set
          </p>
          <div className="flex flex-col items-center gap-1">
            <span className={`text-2xl font-semibold tabular-nums ${isDarkMode ? "text-iron-50" : "text-slate-900"}`}>
              {formatWeightDisplay(weight)}
            </span>
            <span className={`text-lg tabular-nums ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
              {reps} reps
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveSet}
            className={`w-full py-3.5 rounded-card font-semibold transition-colors ${
              hasLoggedSets
                ? "bg-emerald-500 text-iron-950"
                : isDarkMode
                  ? "bg-lift-primary text-iron-950"
                  : "bg-workout-primary text-white"
            }`}
          >
            {hasLoggedSets ? "Log another set" : "Save set"}
          </button>
        </div>

        <div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${
              isDarkMode ? "text-iron-500" : "text-slate-500"
            }`}
          >
            Logged sets
          </p>
          <div className="flex flex-wrap gap-2">
            {setsForExercise.map((s) => (
              <div
                key={s.id}
                className={`inline-flex items-center gap-2 text-sm font-medium pl-3 pr-1 py-1.5 rounded-card ${
                  isDarkMode ? "bg-iron-800 text-iron-200" : "bg-slate-100 text-slate-800"
                }`}
              >
                <span className="tabular-nums">
                  {isBarWeight(s.weight) ? "Bar" : s.weight}×{s.reps}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSet(s.id)}
                  disabled={removingSetId === s.id}
                  className={`shrink-0 rounded-lg p-1.5 transition-colors disabled:opacity-40 ${
                    isDarkMode
                      ? "text-iron-500 hover:bg-iron-700 hover:text-red-400"
                      : "text-slate-400 hover:bg-slate-200 hover:text-red-600"
                  }`}
                  aria-label={`Delete set ${s.weight}×${s.reps}`}
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2.25} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

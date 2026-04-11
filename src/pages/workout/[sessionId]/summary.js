import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import { getSessionExtras } from "@/lib/workoutSessionClient";
import { getPostWorkoutReturnPath, isSessionToday } from "@/lib/workoutNavigation";
import { toast } from "sonner";

export default function WorkoutSummaryPage() {
  const router = useRouter();
  const { sessionId } = router.query;
  const { isDarkMode } = useTheme();
  const {
    user,
    getWorkoutSession,
    completeWorkoutSession,
    getTodayRoutine,
    getRoutineForDay,
    updateRoutine,
    routines,
  } = useWorkout();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const extras = useMemo(() => {
    if (typeof sessionId !== "string") return [];
    return getSessionExtras(sessionId);
  }, [sessionId]);

  const stats = useMemo(() => {
    const logs = (session?.set_logs || []).filter((l) => l.is_completed);
    const names = [...new Set(logs.map((l) => l.exercise_name))];
    const addedTodayNames = new Set(extras.map((e) => e.exercise_name));
    const completedExercises = names.length;
    const addedToday = extras.length;
    const totalSets = logs.length;
    return {
      completedExercises,
      addedToday,
      totalSets,
      exerciseNames: names,
      addedTodayNames,
    };
  }, [session, extras]);

  // Get the routine for the session's date, not today's date
  const sessionRoutine = useMemo(() => {
    if (!session?.date) return getTodayRoutine();
    
    const sessionDate = new Date(session.date);
    const dayOfWeek = sessionDate.getDay();
    return getRoutineForDay(dayOfWeek);
  }, [session?.date, getTodayRoutine, getRoutineForDay]);

  const todayRoutine = useMemo(() => getTodayRoutine(), [getTodayRoutine, routines]);

  const handleSaveWorkout = async () => {
    if (typeof sessionId !== "string") return;
    setSaving(true);
    try {
      await completeWorkoutSession(sessionId);
      toast.success("Workout saved");
      const returnPath = getPostWorkoutReturnPath(session);
      router.replace(returnPath);
    } catch {
      toast.error("Could not save workout");
    } finally {
      setSaving(false);
    }
  };

  const handleAddExtrasToRoutine = async () => {
    if (!todayRoutine?.id || extras.length === 0) {
      toast.message("Nothing to add or no routine for today");
      return;
    }
    const existing = (todayRoutine.routine_exercises || []).map((ex) => ({
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      category: ex.category || "other",
      target_sets: ex.target_sets || 3,
    }));
    const seen = new Set(existing.map((e) => e.exercise_name));
    for (const ex of extras) {
      if (seen.has(ex.exercise_name)) continue;
      seen.add(ex.exercise_name);
      existing.push({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        category: ex.category || "other",
        target_sets: 3,
      });
    }
    await updateRoutine(todayRoutine.id, {
      name: todayRoutine.name,
      day_of_week: todayRoutine.day_of_week,
      color: todayRoutine.color || "#3b82f6",
      exercises: existing,
    });
    toast.success("Added to your routine");
    router.push("/plan");
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

  return (
    <div
      className={`min-h-screen flex flex-col px-5 pt-10 pb-12 ${
        isDarkMode ? "bg-iron-950" : "bg-slate-50"
      }`}
      style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}
    >
      <h1
        className={`text-2xl font-semibold tracking-tight ${
          isDarkMode ? "text-iron-50" : "text-slate-900"
        }`}
      >
        Workout complete
      </h1>
      <p className={`mt-2 text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
        {session?.routine_name || "Session"}
      </p>

      <div className="mt-8 space-y-3">
        {[
          { label: "Completed exercises", value: stats.completedExercises },
          { label: "Added today", value: stats.addedToday },
          { label: "Total sets", value: stats.totalSets },
        ].map((row) => (
          <div
            key={row.label}
            className={`flex justify-between items-center py-3 px-4 rounded-2xl ${
              isDarkMode ? "bg-iron-900/70 border border-iron-800" : "bg-white border border-slate-200 shadow-sm"
            }`}
          >
            <span className={isDarkMode ? "text-iron-400" : "text-slate-600"}>{row.label}</span>
            <span className={`font-semibold ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <p
          className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${
            isDarkMode ? "text-iron-500" : "text-slate-500"
          }`}
        >
          Exercises
        </p>
        <div className="space-y-2">
          {stats.exerciseNames.map((name) => (
            <div
              key={name}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-xl ${
                isDarkMode ? "bg-iron-900/50" : "bg-slate-100"
              }`}
            >
              <span className="text-emerald-500">✓</span>
              <span className={isDarkMode ? "text-iron-100" : "text-slate-800"}>{name}</span>
              {stats.addedTodayNames.has(name) && (
                <span
                  className={`text-[10px] ml-auto px-2 py-0.5 rounded-full font-semibold ${
                    isDarkMode ? "bg-violet-500/15 text-violet-300" : "bg-violet-100 text-violet-700"
                  }`}
                >
                  Added today
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-10 space-y-3">
        <button
          type="button"
          onClick={handleSaveWorkout}
          disabled={saving}
          className={`w-full py-4 rounded-2xl font-semibold ${
            isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
          }`}
        >
          {saving ? "Saving…" : "Save workout"}
        </button>
        {extras.length > 0 && (
          <button
            type="button"
            onClick={handleAddExtrasToRoutine}
            className={`w-full py-4 rounded-2xl font-semibold border ${
              isDarkMode ? "border-iron-700 text-iron-200" : "border-slate-300 text-slate-800"
            }`}
          >
            {isSessionToday(session) 
              ? "Add added-today exercises to routine"
              : "Add exercises to routine"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const returnPath = getPostWorkoutReturnPath(session);
            router.push(returnPath);
          }}
          className={`w-full py-3 text-sm font-medium ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
        >
          {isSessionToday(session) ? "Back to home" : "Back to log"}
        </button>
      </div>
    </div>
  );
}

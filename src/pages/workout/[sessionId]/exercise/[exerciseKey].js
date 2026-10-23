import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import { isSessionToday } from "@/lib/workoutNavigation";
import ExerciseSetLogPanel, { useCatalogExerciseForName } from "@/components/workout/ExerciseSetLogPanel";
import { ArrowLeft } from "lucide-react";
import { actionSecondary } from "@/lib/actionButtonStyles";
import { cn } from "@/lib/utils";

export default function ExerciseLoggerPage() {
  const router = useRouter();
  const { sessionId, exerciseKey, category: categoryQuery } = router.query;
  const { isDarkMode } = useTheme();
  const { user, activeSession, getWorkoutSession, exercises } = useWorkout();

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

  const catalogExercise = useCatalogExerciseForName(exercises, exerciseName);
  const category = categoryFromQuery || catalogExercise?.category || "other";

  const effectiveSession = useMemo(() => {
    if (activeSession?.id === sessionId) return activeSession;
    return session;
  }, [activeSession, sessionId, session]);

  const handleClose = () => {
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

  const title = exerciseName || "Exercise";

  return (
    <div
      className={`min-h-screen flex flex-col ${isDarkMode ? "bg-iron-950" : "bg-slate-50"}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <header
        className={`shrink-0 px-4 pt-4 pb-3 border-b flex items-start gap-3 ${
          isDarkMode ? "border-iron-800/90 bg-iron-950/95" : "border-slate-200 bg-white/80"
        }`}
      >
        <button
          type="button"
          onClick={handleClose}
          className={cn(
            actionSecondary(isDarkMode),
            "mt-0.5 shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-card p-0",
          )}
          aria-label={isSessionToday(effectiveSession) ? "Back to workout" : "Back"}
        >
          <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden />
        </button>
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
      </header>

      <div className="flex-1 overflow-y-auto pb-8">
        <ExerciseSetLogPanel
          sessionId={typeof sessionId === "string" ? sessionId : null}
          exerciseName={exerciseName}
          category={category}
          catalogExercise={catalogExercise}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}

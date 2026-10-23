import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import { getSessionExtras, removeSessionExtra } from "@/lib/workoutSessionClient";
import { resolveExerciseMediaUrl } from "@/lib/exerciseMedia";
import { useExerciseMediaOverrides } from "@/hooks/useExerciseMediaOverrides";
import { mergePlannedExercises } from "@/lib/mergePlannedExercises";
import {
  orderPlannedExercises,
  persistExerciseOrder,
  moveSessionExerciseToTop,
} from "@/lib/sessionExerciseOrder";
import ReorderableExerciseTileGrid from "@/components/workout/ReorderableExerciseTileGrid";
import { getPostWorkoutReturnPath, isSessionToday } from "@/lib/workoutNavigation";
import { toast } from "sonner";
import {
  Plus,
  ArrowLeft,
  Calendar,
  Target,
  Flame,
  Dumbbell,
  RotateCw,
  CircleCheck,
  House,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { SpringIn } from "@/components/ui/fade-in";
import { narrowMobileWideDesktopClass } from "@/components/layout/PageContainer";
import {
  exerciseHasLoggedSets,
  completedSetCountForExercise,
} from "@/components/workout/ExerciseSessionResetButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// exerciseStatus + statusLabel mirror Today / WorkoutSessionView helpers
function exerciseStatus(name, setLogs) {
  const completed = (setLogs || []).filter(l => l.exercise_name === name && l.is_completed);
  if (completed.length > 0) return "in_progress";
  return "not_started";
}

export default function WorkoutSessionPage() {
  const router = useRouter();
  const { sessionId } = router.query;
  const { isDarkMode } = useTheme();
  const {
    user,
    routines,
    exercises,
    getWorkoutSession,
    completeWorkoutSession,
    deleteWorkoutSession,
    resetSessionExerciseLogs,
    loadActiveSession,
    activeSession,
  } = useWorkout();
  const mediaOverrides = useExerciseMediaOverrides();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extrasVersion, setExtrasVersion] = useState(0);
  const [thumbFailed, setThumbFailed] = useState({});
  const [completing, setCompleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resettingExercise, setResettingExercise] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const bumpExtras = useCallback(() => setExtrasVersion(v => v + 1), []);

  // Load session data
  useEffect(() => {
    async function load() {
      if (!sessionId || !user) return;
      setLoading(true);
      try {
        const data = await getWorkoutSession(sessionId);
        setSession(data);
      } catch (error) {
        console.error("Error loading session:", error);
        toast.error("Could not load workout session");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, user, getWorkoutSession]);

  // Get routine for this session
  const sessionRoutine = useMemo(() => {
    if (!session?.routine_id) return null;
    return routines.find(r => r.id === session.routine_id) || null;
  }, [session?.routine_id, routines]);

  // Get extras
  const extras = useMemo(() => {
    if (!sessionId || typeof sessionId !== "string") return [];
    return getSessionExtras(sessionId);
  }, [sessionId, extrasVersion]);

  // Merge planned exercises
  const plannedExercises = useMemo(() => {
    const merged = mergePlannedExercises(sessionRoutine, extras);
    const sid = typeof sessionId === "string" ? sessionId : null;
    return orderPlannedExercises(merged, sid);
  }, [sessionRoutine, extras, sessionId, extrasVersion]);

  useEffect(() => {
    setThumbFailed({});
  }, [sessionId, plannedExercises.length]);

  const effectiveSession =
    activeSession?.id === sessionId && typeof sessionId === "string" ? activeSession : session;
  const setLogs = effectiveSession?.set_logs || [];

  // Calculate stats
  const stats = useMemo(() => {
    let completed = 0;
    let added = 0;
    for (const ex of plannedExercises) {
      const st = exerciseStatus(ex.exercise_name, setLogs);
      if (st === "in_progress") completed += 1;
      if (ex.added_today) added += 1;
    }
    return {
      planned: plannedExercises.length,
      completed,
      addedToday: added,
    };
  }, [plannedExercises, setLogs]);

  // Focus refresh for extras
  useEffect(() => {
    const onFocus = () => bumpExtras();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [bumpExtras]);

  // Navigation handlers

  const handleMoveExerciseToTop = useCallback(
    exerciseName => {
      if (!sessionId || typeof sessionId !== "string") return;
      moveSessionExerciseToTop(
        sessionId,
        exerciseName,
        plannedExercises.map(e => e.exercise_name),
      );
      bumpExtras();
    },
    [sessionId, plannedExercises, bumpExtras],
  );

  const handleRemoveAddedToday = useCallback(
    exerciseName => {
      if (!sessionId || typeof sessionId !== "string") return;
      removeSessionExtra(sessionId, exerciseName);
      bumpExtras();
      toast.success("Removed from today");
    },
    [sessionId, bumpExtras]
  );

  const handleResetExercise = useCallback(
    async exerciseName => {
      if (!sessionId || typeof sessionId !== "string" || session?.status !== "active") return;
      setResettingExercise(exerciseName);
      try {
        const ok = await resetSessionExerciseLogs(sessionId, exerciseName);
        if (ok) {
          const data = await getWorkoutSession(sessionId);
          setSession(data);
          await loadActiveSession?.();
          toast.success("Exercise reset");
        } else {
          toast.error("Could not reset exercise");
        }
      } finally {
        setResettingExercise(null);
      }
    },
    [sessionId, session?.status, resetSessionExerciseLogs, getWorkoutSession, loadActiveSession],
  );

  const handleAddExercise = () => {
    router.push(`/exercises?sessionId=${encodeURIComponent(sessionId)}`);
  };

  const handleComplete = async () => {
    if (!sessionId || typeof sessionId !== "string") return;
    setCompleting(true);
    try {
      await completeWorkoutSession(sessionId);
      toast.success("Workout completed");
      const returnPath = getPostWorkoutReturnPath(session);
      router.push(returnPath);
    } catch (error) {
      console.error("Error completing workout:", error);
      toast.error("Could not complete workout");
    } finally {
      setCompleting(false);
    }
  };

  const handleBack = () => {
    const returnPath = getPostWorkoutReturnPath(session);
    router.push(returnPath);
  };

  const handleResetInProgress = () => {
    if (!sessionId || typeof sessionId !== "string" || session?.status !== "active") return;
    setShowDiscardConfirm(true);
  };

  const confirmDiscardWorkout = async () => {
    if (!sessionId || typeof sessionId !== "string") return;
    setResetting(true);
    try {
      const success = await deleteWorkoutSession(sessionId);
      if (success) {
        toast.success("Workout reset");
        await loadActiveSession?.();
        router.push(getPostWorkoutReturnPath(session));
      } else {
        toast.error("Could not reset workout");
      }
    } finally {
      setResetting(false);
      setShowDiscardConfirm(false);
    }
  };

  const resolveExerciseMedia = exerciseName =>
    resolveExerciseMediaUrl(exercises, exerciseName, mediaOverrides);

  const formatSessionDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short", 
      day: "numeric",
    });
  };

  if (!router.isReady || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div
            className={`w-8 h-8 border-2 rounded-full animate-spin ${
              isDarkMode ? "border-lift-primary border-t-transparent" : "border-workout-primary border-t-transparent"
            }`}
          />
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <p className={`text-center ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
            Workout session not found
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className={`mt-4 px-6 py-2 rounded-card font-medium inline-flex items-center justify-center gap-2 ${
              isDarkMode ? "bg-iron-800 text-iron-200" : "bg-slate-100 text-slate-700"
            }`}
          >
            <House className="w-4 h-4 shrink-0" aria-hidden />
            Go Home
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SpringIn
        className={`py-4 ${narrowMobileWideDesktopClass} lg:max-w-[90rem] lg:mx-auto lg:px-8 xl:px-10`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className={`w-10 h-10 rounded-card flex items-center justify-center transition-colors ${
              isDarkMode
                ? "bg-iron-800 text-iron-400 active:bg-iron-700"
                : "bg-slate-100 text-slate-500 active:bg-slate-200"
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
            <div className="min-w-0">
              {!isSessionToday(session) && (
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-iron-500" />
                  <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    {formatSessionDate(session.date)}
                  </p>
                </div>
              )}
              <h1 className="text-screen-title">
                {session.routine_name || "Workout"}
              </h1>
            </div>
            {session.status === "active" ? (
              <button
                type="button"
                onClick={handleResetInProgress}
                disabled={resetting}
                aria-label="Reset in-progress workout"
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  isDarkMode
                    ? "text-iron-400 hover:text-red-400 hover:bg-iron-800/80"
                    : "text-slate-500 hover:text-red-600 hover:bg-slate-100"
                }`}
              >
                <RotateCw className={`w-3.5 h-3.5 shrink-0 ${resetting ? "animate-spin" : ""}`} aria-hidden />
                {resetting ? "Resetting…" : "Reset"}
              </button>
            ) : null}
          </div>
        </div>

        {/* Progress Stats */}
        <p
          className={`mb-6 text-sm leading-relaxed ${
            isDarkMode ? "text-iron-500" : "text-slate-500"
          }`}
        >
          {stats.planned} planned · {stats.completed} done · {stats.addedToday} added
        </p>

        {/* Exercise List */}
        {plannedExercises.length > 0 ? (
          <div
            className={`mb-6 max-h-[min(52vh,28rem)] overflow-y-auto overscroll-contain rounded-card pr-1 -mr-0.5 lg:max-h-none lg:overflow-visible ${
              isDarkMode ? "scrollbar-thin scrollbar-thumb-iron-700" : ""
            }`}
          >
            <ReorderableExerciseTileGrid
              exercises={plannedExercises}
              isDarkMode={isDarkMode}
              onReorder={next => {
                if (typeof sessionId === "string") {
                  persistExerciseOrder(sessionId, next);
                  bumpExtras();
                }
              }}
              sessionId={typeof sessionId === "string" ? sessionId : null}
              inlineLog
              exerciseOrderVersion={extrasVersion}
              onMoveExerciseToTop={handleMoveExerciseToTop}
              resolveMedia={resolveExerciseMedia}
              thumbFailed={thumbFailed}
              onThumbFailed={name => setThumbFailed(prev => ({ ...prev, [name]: true }))}
              completedSetCountFor={name => completedSetCountForExercise(name, setLogs)}
              showResetFor={name =>
                exerciseHasLoggedSets(name, setLogs) && session?.status === "active"
              }
              onResetExercise={handleResetExercise}
              resettingExercise={resettingExercise}
              onRemoveAdded={handleRemoveAddedToday}
              exercisesCatalog={exercises}
            />
          </div>
        ) : (
          <div className={`text-center py-12 mb-6 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            <p className="text-sm">No exercises planned</p>
            <p className="text-xs mt-1">Add exercises to get started</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleAddExercise}
            className={`w-full py-3.5 rounded-card font-semibold border border-dashed flex items-center justify-center gap-2 ${
              isDarkMode
                ? "border-iron-700 text-iron-100"
                : "border-slate-300 text-slate-800"
            }`}
          >
            <Plus className="w-5 h-5" />
            Add exercise
          </button>

          {plannedExercises.length > 0 && (
            <button
              type="button"
              onClick={handleComplete}
              disabled={completing}
              className={`w-full py-3.5 rounded-card font-bold text-sm inline-flex items-center justify-center gap-2 ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              } disabled:opacity-50`}
            >
              {completing ? (
                <Loader2 className="w-5 h-5 shrink-0 animate-spin" aria-hidden />
              ) : (
                <CircleCheck className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden />
              )}
              {completing ? "Completing..." : "Complete workout"}
            </button>
          )}
        </div>
      </SpringIn>

      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Discard workout?
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : "text-slate-500"}>
              Discard this in-progress workout? All logged sets and today-only extras will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDarkMode ? "bg-iron-800 text-iron-300 hover:bg-iron-700 border-0" : ""}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDiscardWorkout}
              className="bg-red-600 text-white hover:bg-red-700 border-0"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

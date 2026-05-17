import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import { getSessionExtras, getExerciseDoneMap, removeSessionExtra } from "@/lib/workoutSessionClient";
import { exerciseMediaUrl, exerciseImageUnoptimized } from "@/lib/exerciseMedia";
import { getPostWorkoutReturnPath, isSessionToday } from "@/lib/workoutNavigation";
import ExerciseIcon from "@/components/ExerciseIcon";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Plus,
  ArrowLeft,
  Calendar,
  Target,
  Flame,
  Dumbbell,
  Trash2,
  RotateCw,
  CircleCheck,
  House,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { SpringIn, StaggerContainer, StaggerItem, PressableScale } from "@/components/ui/fade-in";

// Helper functions from TodayWorkoutSection
function mergePlannedExercises(routine, extras) {
  const map = new Map();
  for (const ex of routine?.routine_exercises || []) {
    map.set(ex.exercise_name, {
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      category: ex.category || "other",
      equipment: "",
      added_today: false,
    });
  }
  for (const ex of extras) {
    if (!map.has(ex.exercise_name)) {
      map.set(ex.exercise_name, { ...ex, added_today: true });
    }
  }
  return [...map.values()];
}

function exerciseStatus(name, doneMap, setLogs) {
  if (doneMap[name]) return "completed";
  const completed = (setLogs || []).filter(l => l.exercise_name === name && l.is_completed);
  if (completed.length > 0) return "in_progress";
  return "not_started";
}

function statusLabel(s) {
  if (s === "completed") return "Completed";
  if (s === "in_progress") return "In Progress";
  return "Not Started";
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
    loadActiveSession,
  } = useWorkout();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extrasVersion, setExtrasVersion] = useState(0);
  const [thumbFailed, setThumbFailed] = useState({});
  const [completing, setCompleting] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  // Get extras and done status
  const extras = useMemo(() => {
    if (!sessionId || typeof sessionId !== "string") return [];
    return getSessionExtras(sessionId);
  }, [sessionId, extrasVersion]);

  const doneMap = useMemo(() => {
    if (!sessionId || typeof sessionId !== "string") return {};
    return getExerciseDoneMap(sessionId);
  }, [sessionId, extrasVersion]);

  // Merge planned exercises
  const plannedExercises = useMemo(
    () => mergePlannedExercises(sessionRoutine, extras),
    [sessionRoutine, extras]
  );

  useEffect(() => {
    setThumbFailed({});
  }, [sessionId, plannedExercises.length]);

  const setLogs = session?.set_logs || [];

  // Calculate stats
  const stats = useMemo(() => {
    let completed = 0;
    let added = 0;
    for (const ex of plannedExercises) {
      const st = exerciseStatus(ex.exercise_name, doneMap, setLogs);
      if (st === "completed") completed += 1;
      if (ex.added_today) added += 1;
    }
    return {
      planned: plannedExercises.length,
      completed,
      addedToday: added,
    };
  }, [plannedExercises, doneMap, setLogs]);

  // Focus refresh for extras
  useEffect(() => {
    const onFocus = () => bumpExtras();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [bumpExtras]);

  // Navigation handlers
  const openExercise = (name, category) => {
    if (!sessionId) return;
    const q = new URLSearchParams({ category: category || "other" });
    router.push(
      `/workout/${sessionId}/exercise/${encodeURIComponent(name)}?${q.toString()}`
    );
  };

  const handleRemoveAddedToday = useCallback(
    exerciseName => {
      if (!sessionId || typeof sessionId !== "string") return;
      removeSessionExtra(sessionId, exerciseName);
      bumpExtras();
      toast.success("Removed from today");
    },
    [sessionId, bumpExtras]
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

  const handleResetInProgress = async () => {
    if (!sessionId || typeof sessionId !== "string" || session?.status !== "active") return;
    const ok =
      typeof window !== "undefined" &&
      window.confirm(
        "Discard this in-progress workout? All logged sets and today-only extras will be permanently removed.",
      );
    if (!ok) return;
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
    }
  };

  const resolveExerciseMedia = exerciseName => {
    const cat =
      exercises.find(e => e.name === exerciseName) ||
      exercises.find(e => e.name?.toLowerCase() === exerciseName?.toLowerCase());
    return cat ? exerciseMediaUrl(cat) : null;
  };

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
            className={`mt-4 px-6 py-2 rounded-xl font-medium inline-flex items-center justify-center gap-2 ${
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
      <SpringIn className="px-4 py-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
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
            className={`max-h-[min(52vh,28rem)] overflow-y-auto overscroll-contain rounded-2xl pr-1 -mr-0.5 mb-6 ${
              isDarkMode ? "scrollbar-thin scrollbar-thumb-iron-700" : ""
            }`}
          >
            <StaggerContainer className="space-y-3 pb-1">
              {plannedExercises.map(ex => {
                const st = exerciseStatus(ex.exercise_name, doneMap, setLogs);
                const media = resolveExerciseMedia(ex.exercise_name);
                const showPlaceholder = !media || thumbFailed[ex.exercise_name];
                return (
                  <StaggerItem key={ex.exercise_name}>
                    <div
                      className={`relative w-full rounded-2xl transition-colors ${
                        isDarkMode
                          ? "bg-iron-900/50 border border-iron-800 hover:border-iron-700"
                          : "bg-white border border-slate-200 shadow-sm hover:border-slate-300"
                      }`}
                    >
                      <PressableScale className="w-full block">
                        <button
                          type="button"
                          onClick={() => openExercise(ex.exercise_name, ex.category)}
                          className={`w-full text-left rounded-2xl p-4 flex gap-4 ${
                            ex.added_today ? "pr-14" : ""
                          }`}
                        >
                        <div
                          className={`relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 flex flex-col items-center justify-center ${
                            isDarkMode ? "bg-iron-800" : "bg-slate-100"
                          }`}
                        >
                          {!showPlaceholder ? (
                            <Image
                              src={media}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="64px"
                              unoptimized={exerciseImageUnoptimized(media)}
                              onError={() =>
                                setThumbFailed(prev => ({
                                  ...prev,
                                  [ex.exercise_name]: true,
                                }))
                              }
                            />
                          ) : (
                            <>
                              <ExerciseIcon
                                name={ex.exercise_name}
                                className="w-7 h-7"
                                color={isDarkMode ? "#71717a" : "#94a3b8"}
                              />
                              <span
                                className={`mt-0.5 text-[9px] font-medium leading-none ${
                                  isDarkMode ? "text-iron-500" : "text-slate-400"
                                }`}
                              >
                                No image
                              </span>
                            </>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-semibold leading-snug ${
                              isDarkMode ? "text-iron-100" : "text-slate-900"
                            }`}
                          >
                            {ex.exercise_name}
                          </p>
                          <p
                            className={`text-xs mt-0.5 capitalize ${
                              isDarkMode ? "text-iron-500" : "text-slate-500"
                            }`}
                          >
                            {ex.category && ex.category !== "other"
                              ? ex.category
                              : "General"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-medium ${
                                st === "completed"
                                  ? isDarkMode
                                    ? "text-emerald-400"
                                    : "text-emerald-600"
                                  : st === "in_progress"
                                    ? isDarkMode
                                      ? "text-lift-primary"
                                      : "text-workout-primary"
                                    : isDarkMode
                                      ? "text-iron-500"
                                      : "text-slate-500"
                              }`}
                            >
                              {st === "completed" ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Circle className="w-3.5 h-3.5" />
                              )}
                              {statusLabel(st)}
                            </span>
                            {ex.added_today && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  isDarkMode
                                    ? "bg-violet-500/15 text-violet-300"
                                    : "bg-violet-100 text-violet-700"
                                }`}
                              >
                                Added today
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                      </PressableScale>
                      {ex.added_today ? (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleRemoveAddedToday(ex.exercise_name);
                          }}
                          className={`pointer-events-auto absolute top-3 right-3 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-colors touch-manipulation ${
                            isDarkMode
                              ? "border-iron-700/80 bg-iron-900/70 text-iron-400 hover:bg-iron-800 hover:text-red-400"
                              : "border-slate-200/90 bg-white/90 text-slate-400 hover:bg-slate-50 hover:text-red-600"
                          }`}
                          aria-label={`Remove ${ex.exercise_name} from today`}
                        >
                          <Trash2 className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                        </button>
                      ) : null}
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
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
            className={`w-full py-3.5 rounded-xl font-semibold border border-dashed flex items-center justify-center gap-2 ${
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
              className={`w-full py-3.5 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 ${
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
    </Layout>
  );
}

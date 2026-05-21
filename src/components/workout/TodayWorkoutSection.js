import { useMemo, useCallback, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import ExerciseIcon from "@/components/ExerciseIcon";
import { exerciseMediaUrl, exerciseImageUnoptimized } from "@/lib/exerciseMedia";
import { getSessionExtras, getExerciseDoneMap, removeSessionExtra } from "@/lib/workoutSessionClient";
import { mergePlannedExercises } from "@/lib/mergePlannedExercises";
import {
  Plus,
  CheckCircle2,
  Circle,
  Play,
  Calendar,
  Dumbbell,
  ChevronRight,
  Edit3,
  ClipboardList,
  RefreshCw,
  RotateCw,
  Trash2,
  CircleCheck,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { SpringIn, StaggerContainer, StaggerItem, PressableScale } from "@/components/ui/fade-in";
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
import PlannedExerciseMetaLine from "@/components/workout/PlannedExerciseMetaLine";

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

/**
 * New workout board + start/finish flow (embedded on the home Today page).
 * @param {{ completedTodaySession?: object | null, onChooseRoutine?: () => void }} props
 */
export default function TodayWorkoutSection({ completedTodaySession = null, onChooseRoutine }) {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const {
    user,
    routines,
    activeSession,
    getTodayRoutine,
    startWorkoutSession,
    exercises,
    loadActiveSession,
    deleteWorkoutSession,
  } = useWorkout();

  const [starting, setStarting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [extrasVersion, setExtrasVersion] = useState(0);
  const [thumbFailed, setThumbFailed] = useState({});

  const bumpExtras = useCallback(() => setExtrasVersion(v => v + 1), []);

  useEffect(() => {
    if (user) loadActiveSession?.();
  }, [user, loadActiveSession]);

  useEffect(() => {
    bumpExtras();
  }, [router.asPath, bumpExtras]);

  const todayRoutine = useMemo(() => getTodayRoutine(), [getTodayRoutine, routines]);

  /** When user starts a session from "Choose routine" on a day with no template, exercises come from the session's routine_id. */
  const templateRoutine = useMemo(() => {
    if (activeSession?.routine_id) {
      const r = routines.find(x => x.id === activeSession.routine_id);
      if (r) return r;
    }
    return getTodayRoutine();
  }, [activeSession?.routine_id, routines, getTodayRoutine]);

  const extras = useMemo(() => {
    if (!activeSession?.id) return [];
    return getSessionExtras(activeSession.id);
  }, [activeSession?.id, extrasVersion]);

  const doneMap = useMemo(() => {
    if (!activeSession?.id) return {};
    return getExerciseDoneMap(activeSession.id);
  }, [activeSession?.id, extrasVersion]);

  const plannedExercises = useMemo(
    () => mergePlannedExercises(templateRoutine, extras),
    [templateRoutine, extras]
  );

  useEffect(() => {
    setThumbFailed({});
  }, [activeSession?.id, plannedExercises.length]);

  const setLogs = activeSession?.set_logs || [];

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

  useEffect(() => {
    const onFocus = () => bumpExtras();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [bumpExtras]);

  const handleStartOrResume = async () => {
    if (!todayRoutine) return;
    setStarting(true);
    try {
      await startWorkoutSession(todayRoutine);
      await loadActiveSession();
    } finally {
      setStarting(false);
    }
  };

  const openExercise = (name, category) => {
    if (!activeSession?.id) return;
    const q = new URLSearchParams({ category: category || "other" });
    router.push(
      `/workout/${activeSession.id}/exercise/${encodeURIComponent(name)}?${q.toString()}`
    );
  };

  const handleFinish = () => {
    if (!activeSession?.id) return;
    router.push(`/workout/${activeSession.id}/summary`);
  };

  const handleResetInProgress = async () => {
    const id = activeSession?.id;
    if (!id || activeSession.status !== "active") return;
    setShowDiscardConfirm(true);
  };

  const confirmDiscardWorkout = async () => {
    const id = activeSession?.id;
    if (!id) return;
    setResetting(true);
    try {
      const success = await deleteWorkoutSession(id);
      if (success) {
        bumpExtras();
        await loadActiveSession();
        toast.success("Workout reset");
      } else {
        toast.error("Could not reset workout");
      }
    } finally {
      setResetting(false);
      setShowDiscardConfirm(false);
    }
  };

  const handleRemoveAddedToday = exerciseName => {
    if (!activeSession?.id) return;
    removeSessionExtra(activeSession.id, exerciseName);
    bumpExtras();
    toast.success("Removed from today");
  };

  const resolveExerciseMedia = exerciseName => {
    const cat =
      exercises.find(e => e.name === exerciseName) ||
      exercises.find(e => e.name?.toLowerCase() === exerciseName?.toLowerCase());
    return cat ? exerciseMediaUrl(cat) : null;
  };

  if (!user) return null;

  const hasSession = activeSession && activeSession.status === "active";
  const routineTitle =
    templateRoutine?.name || activeSession?.routine_name || todayRoutine?.name || "Workout";

  const getDayName = () => new Date().toLocaleDateString("en-US", { weekday: "long" });

  if (completedTodaySession && !hasSession) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card-hero overflow-hidden">
          <div
            className={`px-4 py-2.5 border-b ${
              isDarkMode ? "border-iron-800" : "border-slate-100"
            }`}
          >
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                isDarkMode ? "text-lift-primary" : "text-green-600"
              }`}
            >
              Completed today
            </span>
          </div>
          <div className="p-4">
            <h3
              className={`text-lg font-bold mb-1 ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}
            >
              {completedTodaySession.routine_name}
            </h3>
            <p className={`text-sm mb-4 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              {(completedTodaySession.set_logs || []).filter(s => s.is_completed).length} sets
              logged
            </p>
            <button
              type="button"
              onClick={() => router.push("/history")}
              className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border ${
                isDarkMode
                  ? "border-iron-700 text-iron-200 active:bg-iron-800"
                  : "border-slate-200 text-slate-700 active:bg-slate-50"
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Review session
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSession && !todayRoutine && routines.length > 0) {
    const todayDow = new Date().getDay();
    return (
      <div className="max-w-lg mx-auto">
        <div className="card-hero">
          <div
            className={`flex items-center gap-2 text-sm mb-2 ${
              isDarkMode ? "text-iron-500" : "text-slate-500"
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            No workout assigned for {getDayName()}
          </div>
          <h3
            className={`text-xl font-bold mb-2 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
          >
            Start a workout?
          </h3>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onChooseRoutine?.()}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              <Dumbbell className="w-5 h-5" />
              Choose routine
            </button>
            <button
              type="button"
              onClick={() => router.push(`/plan?day=${todayDow}`)}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 border ${
                isDarkMode
                  ? "border-iron-700 text-iron-200 hover:bg-iron-800/80"
                  : "border-slate-200 text-slate-800 hover:bg-slate-50"
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              Plan this day
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSession && !todayRoutine && routines.length === 0) {
    return (
      <div className="max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => router.push("/plan")}
          className={`
                w-full p-6 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3
                ${
                  isDarkMode
                    ? "border-iron-800 hover:border-iron-700"
                    : "border-slate-300 hover:border-slate-400"
                }
              `}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: isDarkMode
                ? "linear-gradient(135deg, #22c55e20 0%, #16a34a20 100%)"
                : "linear-gradient(135deg, #4F8CFF20 0%, #6366f120 100%)",
            }}
          >
            <Plus
              className={`w-8 h-8 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
            />
          </div>
          <div className="text-center">
            <p className={`font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
              Create your first routine
            </p>
            <p className={`text-sm mt-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Plan your workouts for each day
            </p>
          </div>
          <span
            className={`text-sm flex items-center gap-1 ${
              isDarkMode ? "text-lift-primary" : "text-workout-primary"
            }`}
          >
            Get started <ChevronRight className="w-4 h-4" />
          </span>
        </button>
      </div>
    );
  }

  const routineActionButton =
    routines.length > 0 ? (
      <button
        type="button"
        onClick={() => onChooseRoutine?.()}
        className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
          isDarkMode
            ? "text-iron-300 hover:text-iron-200 hover:bg-iron-800/80"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`}
        aria-label={hasSession ? "Switch routine" : "Choose another routine"}
      >
        <RefreshCw className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {hasSession ? "Switch" : "Choose"}
      </button>
    ) : null;

  const resetInProgressButton =
    hasSession ? (
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
    ) : null;

  return (
    <SpringIn className="max-w-lg mx-auto">
      <div className="card-hero overflow-hidden">
        <div className="p-4 sm:p-5">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-section-header ${isDarkMode ? "text-iron-200" : ""}`}
          >
            Today&apos;s Workout
          </motion.p>

          <div className="mt-2 flex items-start justify-between gap-3">
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-screen-title min-w-0 flex-1 leading-tight"
            >
              {routineTitle}
            </motion.h2>
            <div className="shrink-0 flex flex-wrap items-center gap-1 justify-end">
              {resetInProgressButton}
              {routineActionButton}
            </div>
          </div>

          <p
            className={`mt-3 text-sm leading-relaxed ${
              isDarkMode ? "text-iron-500" : "text-slate-500"
            }`}
          >
            {stats.planned} planned · {stats.completed} done · {stats.addedToday} added today
          </p>

          {!hasSession ? (
            <div className="mt-6">
              <button
                type="button"
                onClick={handleStartOrResume}
                disabled={starting || !todayRoutine}
                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                  isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
                } disabled:opacity-50 disabled:pointer-events-none`}
              >
                {starting ? (
                  <span className="animate-pulse">Starting…</span>
                ) : (
                  <>
                    <Play className="w-4 h-4" fill="currentColor" />
                    Start workout
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <div
                className={`mt-5 pt-5 border-t ${
                  isDarkMode ? "border-iron-800/80" : "border-slate-100"
                }`}
              >
                <div
                  className={`max-h-[min(52vh,28rem)] overflow-y-auto overscroll-contain rounded-2xl pr-1 -mr-0.5 ${
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
                                <PlannedExerciseMetaLine
                                  category={ex.category}
                                  notes={ex.notes}
                                  isDarkMode={isDarkMode}
                                />
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
              </div>

              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/exercises?return=today&sessionId=${encodeURIComponent(activeSession.id)}`
                    )
                  }
                  className={`w-full py-3.5 rounded-xl font-semibold border border-dashed flex items-center justify-center gap-2 ${
                    isDarkMode
                      ? "border-iron-700 text-iron-100"
                      : "border-slate-300 text-slate-800"
                  }`}
                >
                  <Plus className="w-5 h-5" />
                  Add exercise for today
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 ${
                    isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
                  }`}
                >
                  <CircleCheck className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden />
                  Finish workout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

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
    </SpringIn>
  );
}

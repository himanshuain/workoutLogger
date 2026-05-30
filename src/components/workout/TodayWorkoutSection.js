import { useMemo, useCallback, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import ExerciseIcon from "@/components/ExerciseIcon";
import { exerciseImageUnoptimized, resolveExerciseMediaUrl } from "@/lib/exerciseMedia";
import { useExerciseMediaOverrides } from "@/hooks/useExerciseMediaOverrides";
import { getSessionExtras, removeSessionExtra } from "@/lib/workoutSessionClient";
import { mergePlannedExercises } from "@/lib/mergePlannedExercises";
import {
  Plus,
  CheckCircle2,
  Circle,
  Dumbbell,
  ChevronRight,
  Edit3,
  RefreshCw,
  RotateCw,
  Trash2,
  CircleCheck,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { SpringIn, StaggerContainer, StaggerItem, PressableScale } from "@/components/ui/fade-in";
import GroupedExerciseSections from "@/components/workout/GroupedExerciseSections";
import { areaCollapseStorageKey } from "@/lib/exerciseAreaCollapseStorage";
import ExerciseSessionResetButton, {
  exerciseHasLoggedSets,
} from "@/components/workout/ExerciseSessionResetButton";
import ExercisePreviewButton, {
  libraryEyeOverlayClass,
} from "@/components/planner/ExercisePreviewButton";
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
import SectionHeader from "@/components/SectionHeader";
import {
  actionPrimary,
  actionSecondary,
  actionMarkDone,
  actionDestructive,
  actionDestructiveGhost,
  actionGhost,
} from "@/lib/actionButtonStyles";

function exerciseStatus(name, setLogs) {
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
 * @param {{ completedTodaySession?: object | null, onChooseRoutine?: () => void, onMarkDonePickRoutine?: () => void }} props
 */
export default function TodayWorkoutSection({
  completedTodaySession = null,
  onChooseRoutine,
  onMarkDonePickRoutine,
}) {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const {
    user,
    routines,
    activeSession,
    startWorkoutSession,
    markTodayWorkoutDone,
    undoTodayWorkoutDone,
    exercises,
    loadActiveSession,
    deleteWorkoutSession,
    resetSessionExerciseLogs,
  } = useWorkout();
  const mediaOverrides = useExerciseMediaOverrides();

  const [markingDone, setMarkingDone] = useState(false);
  const [undoingDone, setUndoingDone] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resettingExercise, setResettingExercise] = useState(null);
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

  const templateRoutine = useMemo(() => {
    if (!activeSession?.routine_id) return null;
    return routines.find(x => x.id === activeSession.routine_id) ?? null;
  }, [activeSession?.routine_id, routines]);

  const extras = useMemo(() => {
    if (!activeSession?.id) return [];
    return getSessionExtras(activeSession.id);
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

  const completedSetCount = useMemo(
    () => (setLogs || []).filter(l => l.is_completed).length,
    [setLogs],
  );

  useEffect(() => {
    const onFocus = () => bumpExtras();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [bumpExtras]);

  const handleUndoMarkDone = async (sessionId = completedTodaySession?.id) => {
    if (!sessionId) return;
    setUndoingDone(true);
    try {
      const result = await undoTodayWorkoutDone(sessionId);
      if (!result) {
        toast.error("Could not undo");
        return;
      }
      await loadActiveSession();
      toast.success(result.deleted ? "Mark done undone" : "Workout reopened");
    } catch {
      toast.error("Could not undo");
    } finally {
      setUndoingDone(false);
    }
  };

  const handleMarkDone = async () => {
    const routine = templateRoutine;
    if (!routine && !activeSession?.id) return;
    setMarkingDone(true);
    try {
      const session = await markTodayWorkoutDone(routine);
      if (!session) {
        toast.error("Could not mark workout done");
        return;
      }
      await loadActiveSession();
      toast.success("Workout marked done", {
        action: {
          label: "Undo",
          onClick: () => handleUndoMarkDone(session.id),
        },
      });
    } catch {
      toast.error("Could not mark workout done");
    } finally {
      setMarkingDone(false);
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

  const handleResetExercise = async exerciseName => {
    if (!activeSession?.id || activeSession.status !== "active") return;
    setResettingExercise(exerciseName);
    try {
      const ok = await resetSessionExerciseLogs(activeSession.id, exerciseName);
      if (ok) {
        await loadActiveSession?.();
        toast.success("Exercise reset");
      } else {
        toast.error("Could not reset exercise");
      }
    } finally {
      setResettingExercise(null);
    }
  };

  const resolveExerciseMedia = exerciseName =>
    resolveExerciseMediaUrl(exercises, exerciseName, mediaOverrides);

  if (!user) return null;

  const hasSession = activeSession && activeSession.status === "active";
  const routineTitle =
    templateRoutine?.name || activeSession?.routine_name || "Workout";

  if (completedTodaySession && !hasSession) {
    const doneSets = (completedTodaySession.set_logs || []).filter(s => s.is_completed).length;
    return (
      <div className="max-w-lg mx-auto">
        <div className="card-hero overflow-hidden !p-3 sm:!p-4">
          <SectionHeader
              icon={Dumbbell}
              label="Workout"
              meta={doneSets > 0 ? `${doneSets} set${doneSets !== 1 ? "s" : ""}` : "Done"}
              isDarkMode={isDarkMode}
            />
            <h3
              className={`text-lg font-bold mb-1 ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}
            >
              {completedTodaySession.routine_name}
            </h3>
            <p className={`text-sm mb-3 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              {doneSets > 0 ? `${doneSets} set${doneSets !== 1 ? "s" : ""} logged` : "Done — log details anytime"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    doneSets > 0
                      ? `/workout/${completedTodaySession.id}/summary`
                      : `/workout/${completedTodaySession.id}`,
                  )
                }
                className={`py-2.5 rounded-card font-semibold text-sm flex items-center justify-center gap-2 border ${
                  isDarkMode
                    ? "border-iron-700 text-iron-200 active:bg-iron-800"
                    : "border-slate-200 text-slate-700 active:bg-slate-50"
                }`}
              >
                <Edit3 className="w-4 h-4" />
                {doneSets > 0 ? "Review" : "Log details"}
              </button>
              <button
                type="button"
                onClick={() => handleUndoMarkDone(completedTodaySession.id)}
                disabled={undoingDone}
                className={`py-2.5 rounded-card font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${actionSecondary(isDarkMode)}`}
              >
                <Undo2 className="w-4 h-4" aria-hidden />
                {undoingDone ? "…" : "Undo"}
              </button>
            </div>
        </div>
      </div>
    );
  }

  if (!hasSession && routines.length > 0) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card-hero !p-3 sm:!p-4">
          <p
            className={`text-sm mb-3 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
          >
            Choose which split you&apos;re training today.
          </p>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={() => onChooseRoutine?.()}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-card py-3 font-bold ${actionPrimary(isDarkMode)}`}
              >
                <Dumbbell className="w-5 h-5" />
                Log workout
              </button>
              <button
                type="button"
                onClick={() => onMarkDonePickRoutine?.()}
                disabled={markingDone}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-card px-3 py-3 text-xs font-semibold disabled:opacity-50 ${actionMarkDone(isDarkMode)}`}
              >
                <CircleCheck className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                {markingDone ? "…" : "Mark done"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSession && routines.length === 0) {
    return (
      <div className="max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => router.push("/plan")}
          className={`
                w-full p-6 rounded-card border-2 border-dashed flex flex-col items-center justify-center gap-3
                ${
                  isDarkMode
                    ? "border-iron-800 hover:border-iron-700"
                    : "border-slate-300 hover:border-slate-400"
                }
              `}
        >
          <div
            className="w-16 h-16 rounded-card flex items-center justify-center"
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
              Create splits like Push, Pull, or Legs
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
        className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${actionGhost(isDarkMode)}`}
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
        className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${actionDestructiveGhost(isDarkMode)}`}
      >
        <RotateCw className={`w-3.5 h-3.5 shrink-0 ${resetting ? "animate-spin" : ""}`} aria-hidden />
        {resetting ? "Resetting…" : "Reset"}
      </button>
    ) : null;

  const workoutMeta = hasSession
    ? `${completedSetCount} set${completedSetCount !== 1 ? "s" : ""}`
    : stats.planned > 0
      ? `${stats.planned} planned`
      : null;

  return (
    <SpringIn className="max-w-lg mx-auto">
      <div className="card-hero overflow-hidden !p-3 sm:!p-4">
          <SectionHeader
            icon={Dumbbell}
            label="Workout"
            meta={workoutMeta}
            isDarkMode={isDarkMode}
            className="mb-2"
          >
            {resetInProgressButton}
            {routineActionButton}
          </SectionHeader>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-screen-title min-w-0 leading-tight"
          >
            {routineTitle}
          </motion.h2>

          {hasSession ? (
            <p
              className={`mt-1 text-xs leading-snug ${
                isDarkMode ? "text-iron-500" : "text-slate-500"
              }`}
            >
              {stats.completed} exercise{stats.completed !== 1 ? "s" : ""} done
              {stats.addedToday > 0
                ? ` · ${stats.addedToday} added today`
                : ""}
            </p>
          ) : null}

          {hasSession ? (
            <>
              <div
                className={`mt-3 pt-3 border-t ${
                  isDarkMode ? "border-iron-800/80" : "border-slate-100"
                }`}
              >
                <StaggerContainer>
                  <GroupedExerciseSections
                    exercises={plannedExercises}
                    isDarkMode={isDarkMode}
                    collapseStorageKey={areaCollapseStorageKey(activeSession?.id)}
                    listClassName="space-y-2"
                    renderExercise={ex => {
                      const st = exerciseStatus(ex.exercise_name, setLogs);
                      const hasLogs = exerciseHasLoggedSets(ex.exercise_name, setLogs);
                      const showReset = hasLogs && hasSession;
                      const media = resolveExerciseMedia(ex.exercise_name);
                      const showPlaceholder = !media || thumbFailed[ex.exercise_name];
                      const hasTrash = ex.added_today;
                      const cardPadRight =
                        hasTrash && showReset
                          ? "pr-[6.75rem]"
                          : hasTrash || showReset
                            ? "pr-12"
                            : "pr-10";
                      return (
                        <StaggerItem key={ex.exercise_name}>
                          <div
                            className={`relative w-full rounded-card transition-colors ${
                              isDarkMode
                                ? "bg-iron-900/50 border border-iron-800 hover:border-iron-700"
                                : "bg-white border border-slate-200 shadow-sm hover:border-slate-300"
                            }`}
                          >
                            <PressableScale className="w-full block">
                              <button
                                type="button"
                                onClick={() => openExercise(ex.exercise_name, ex.category)}
                                className={`w-full text-left rounded-card p-2.5 flex gap-2.5 ${cardPadRight}`}
                              >
                                <div
                                  className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 flex flex-col items-center justify-center ${
                                    isDarkMode ? "bg-iron-800" : "bg-slate-100"
                                  }`}
                                >
                                  {!showPlaceholder ? (
                                    <Image
                                      src={media}
                                      alt=""
                                      fill
                                      className="object-cover"
                                      sizes="48px"
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
                                        className="w-6 h-6"
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
                                    className={`font-semibold text-sm leading-snug ${
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
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                                        st === "in_progress"
                                          ? isDarkMode
                                            ? "text-emerald-400"
                                            : "text-emerald-600"
                                          : isDarkMode
                                            ? "text-iron-500"
                                            : "text-slate-500"
                                      }`}
                                    >
                                      {st === "in_progress" ? (
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
                            <ExercisePreviewButton
                              exerciseName={ex.exercise_name}
                              exerciseId={ex.exercise_id}
                              exercises={exercises}
                              isDarkMode={isDarkMode}
                              variant="overlay"
                              overlayOffset={libraryEyeOverlayClass({
                                hasTrash,
                                hasReset: showReset,
                              })}
                            />
                            {showReset ? (
                              <ExerciseSessionResetButton
                                exerciseName={ex.exercise_name}
                                isDarkMode={isDarkMode}
                                compact
                                disabled={resettingExercise === ex.exercise_name}
                                onClick={handleResetExercise}
                                className={hasTrash ? "right-10" : undefined}
                              />
                            ) : null}
                            {hasTrash ? (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleRemoveAddedToday(ex.exercise_name);
                                }}
                                className={`pointer-events-auto absolute top-2 right-2 z-10 w-8 h-8 rounded-lg flex items-center justify-center border transition-colors touch-manipulation ${
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
                    }}
                  />
                </StaggerContainer>
              </div>

              <div className="mt-2.5 space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/exercises?return=today&sessionId=${encodeURIComponent(activeSession.id)}`
                    )
                  }
                  className={`w-full rounded-card py-2.5 text-sm font-semibold border border-dashed flex items-center justify-center gap-2 ${actionSecondary(isDarkMode)}`}
                >
                  <Plus className="w-4 h-4" />
                  Add exercise for today
                </button>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <button
                    type="button"
                    onClick={handleFinish}
                    className={`flex min-h-[40px] items-center justify-center gap-2 rounded-card py-2.5 text-sm font-bold ${actionPrimary(isDarkMode)}`}
                  >
                    <CircleCheck className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                    Finish workout
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkDone}
                    disabled={markingDone}
                    className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-card px-3 py-2.5 text-xs font-semibold disabled:opacity-50 ${actionMarkDone(isDarkMode)}`}
                  >
                    <CircleCheck className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                    {markingDone ? "…" : "Mark done"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
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
              className={actionDestructive(isDarkMode, "border-0")}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SpringIn>
  );
}

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import SetCard from "@/components/SetCard";
import { exerciseMediaUrl } from "@/lib/exerciseMedia";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  Dumbbell,
  Trophy,
  Flame,
  Target,
  Award,
} from "lucide-react";

export default function WorkoutSession() {
  const router = useRouter();
  const { sessionId } = router.query;
  const { isDarkMode } = useTheme();
  const {
    user,
    activeSession,
    getWorkoutSession,
    updateSetLog,
    completeWorkoutSession,
    updateSessionExerciseIndex,
    settings,
    routines,
    exerciseHistory,
    exercises: exerciseCatalog,
  } = useWorkout();

  const [showExerciseInfo, setShowExerciseInfo] = useState(false);

  const [session, setSession] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  // Load session data
  useEffect(() => {
    async function loadSession() {
      if (!sessionId || !user) return;

      setIsLoading(true);
      const data = await getWorkoutSession(sessionId);
      if (data) {
        setSession(data);
        setCurrentExerciseIndex(data.current_exercise_index || 0);
      }
      setIsLoading(false);
    }

    loadSession();
  }, [sessionId, user, getWorkoutSession]);

  // Get routine for this session
  const routine = useMemo(() => {
    if (!session) return null;
    return routines.find((r) => r.id === session.routine_id);
  }, [session, routines]);

  // Group set logs by exercise
  const exercisesWithSets = useMemo(() => {
    if (!session || !routine) return [];

    const exercises = routine.routine_exercises || [];

    return exercises.map((exercise) => {
      const sets = (session.set_logs || [])
        .filter((log) => log.exercise_name === exercise.exercise_name)
        .sort((a, b) => a.set_number - b.set_number);

      const completedSets = sets.filter((s) => s.is_completed).length;

      return {
        ...exercise,
        sets,
        completedSets,
        totalSets: sets.length,
      };
    });
  }, [session, routine]);

  // Current exercise data
  const currentExercise = exercisesWithSets[currentExerciseIndex];
  const totalExercises = exercisesWithSets.length;

  useEffect(() => {
    setShowExerciseInfo(false);
  }, [currentExerciseIndex]);

  // Overall progress
  const overallProgress = useMemo(() => {
    const total = exercisesWithSets.reduce((sum, ex) => sum + ex.totalSets, 0);
    const completed = exercisesWithSets.reduce(
      (sum, ex) => sum + ex.completedSets,
      0,
    );
    return {
      total,
      completed,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    };
  }, [exercisesWithSets]);

  // Handle set update
  const handleSetUpdate = useCallback(
    async (setLogId, updates) => {
      await updateSetLog(setLogId, updates);

      // Update local state
      setSession((prev) => ({
        ...prev,
        set_logs: prev.set_logs.map((log) =>
          log.id === setLogId ? { ...log, ...updates } : log,
        ),
      }));
    },
    [updateSetLog],
  );

  // Navigate between exercises
  const handlePrevious = useCallback(async () => {
    if (currentExerciseIndex > 0) {
      const newIndex = currentExerciseIndex - 1;
      setCurrentExerciseIndex(newIndex);
      await updateSessionExerciseIndex(sessionId, newIndex);
    }
  }, [currentExerciseIndex, sessionId, updateSessionExerciseIndex]);

  const handleNext = useCallback(async () => {
    if (currentExerciseIndex < totalExercises - 1) {
      const newIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(newIndex);
      await updateSessionExerciseIndex(sessionId, newIndex);
    }
  }, [
    currentExerciseIndex,
    totalExercises,
    sessionId,
    updateSessionExerciseIndex,
  ]);

  // Complete workout
  const handleCompleteWorkout = useCallback(async () => {
    setIsCompleting(true);

    const completedSets = (session?.set_logs || []).filter(s => s.is_completed);
    const exerciseMap = {};
    const prs = [];
    const muscleSet = new Set();

    completedSets.forEach(log => {
      if (log.category) muscleSet.add(log.category);
      if (!exerciseMap[log.exercise_name]) {
        exerciseMap[log.exercise_name] = { name: log.exercise_name, category: log.category, sets: [] };
      }
      exerciseMap[log.exercise_name].sets.push(log);

      const prevPR = exerciseHistory[log.exercise_name]?.personal_record_weight || 0;
      if (log.weight > prevPR && log.weight > 0) {
        if (!prs.find(p => p.exercise === log.exercise_name)) {
          prs.push({ exercise: log.exercise_name, weight: log.weight, prevPR });
        }
      }
    });

    const totalVolume = completedSets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
    const totalSets = completedSets.length;
    const startedAt = session?.started_at ? new Date(session.started_at) : null;
    const completedAt = new Date();
    const durationMs = startedAt ? completedAt - startedAt : 0;

    setSummaryData({
      routineName: session?.routine_name || "Workout",
      durationMs,
      totalSets,
      totalVolume,
      muscles: [...muscleSet],
      prs,
      exercises: Object.values(exerciseMap),
    });

    await completeWorkoutSession(sessionId);
    setIsCompleting(false);
    setShowSummary(true);
  }, [sessionId, session, exerciseHistory, completeWorkoutSession]);

  // Close without completing
  const handleClose = useCallback(() => {
    router.push("/");
  }, [router]);

  // Swipe handling
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }
  };

  if (isLoading || !session || !currentExercise) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDarkMode ? "bg-iron-950" : "bg-slate-50"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className={`animate-spin w-8 h-8 border-2 rounded-full ${
              isDarkMode
                ? "border-lift-primary border-t-transparent"
                : "border-workout-primary border-t-transparent"
            }`}
          />
          <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
            Loading workout...
          </p>
        </div>
      </div>
    );
  }

  const isLastExercise = currentExerciseIndex === totalExercises - 1;
  const allSetsCompleted = overallProgress.completed === overallProgress.total;

  const unit = settings.unit || "kg";

  const formatDuration = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatVolume = (v) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return Math.round(v).toString();
  };

  // ============ SUMMARY SCREEN ============
  if (showSummary && summaryData) {
    return (
      <div className={`min-h-screen flex flex-col ${isDarkMode ? "bg-iron-950" : "bg-slate-50"}`}>
        <div className="flex-1 overflow-y-auto pb-32">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="px-6 pt-12 pb-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 ${
                isDarkMode ? "bg-green-500/20" : "bg-green-100"
              }`}
            >
              <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
            </motion.div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
              Workout Complete!
            </h1>
            <p className={`text-sm mt-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              {summaryData.routineName}
            </p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-3 px-4 mb-6"
          >
            {[
              { label: "Duration", value: formatDuration(summaryData.durationMs), icon: <Flame className="w-4 h-4" /> },
              { label: "Sets", value: summaryData.totalSets, icon: <Target className="w-4 h-4" /> },
              { label: `Volume (${unit})`, value: formatVolume(summaryData.totalVolume), icon: <Dumbbell className="w-4 h-4" /> },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`rounded-2xl p-3 text-center ${isDarkMode ? "bg-iron-900" : "bg-white shadow-sm"}`}
              >
                <div className={`flex items-center justify-center gap-1 mb-1 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>
                  {stat.icon}
                  <span className="text-[10px] font-medium uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className={`text-xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>{stat.value}</p>
              </div>
            ))}
          </motion.div>

          {/* PRs */}
          <AnimatePresence>
            {summaryData.prs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="px-4 mb-6"
              >
                <div className={`rounded-2xl overflow-hidden border ${
                  isDarkMode ? "bg-yellow-500/5 border-yellow-500/20" : "bg-amber-50 border-amber-200"
                }`}>
                  <div className="px-4 py-3 flex items-center gap-2">
                    <Trophy className={`w-5 h-5 ${isDarkMode ? "text-yellow-400" : "text-amber-500"}`} />
                    <h3 className={`font-bold text-sm ${isDarkMode ? "text-yellow-400" : "text-amber-700"}`}>
                      Personal Records!
                    </h3>
                  </div>
                  <div className={`border-t ${isDarkMode ? "border-yellow-500/10" : "border-amber-200/50"}`}>
                    {summaryData.prs.map((pr, i) => (
                      <div
                        key={pr.exercise}
                        className={`px-4 py-2.5 flex items-center justify-between ${
                          i > 0 ? `border-t ${isDarkMode ? "border-yellow-500/10" : "border-amber-100"}` : ""
                        }`}
                      >
                        <span className={`text-sm font-medium ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                          {pr.exercise}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {pr.prevPR > 0 && (
                            <span className={`text-xs line-through ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                              {pr.prevPR}{unit}
                            </span>
                          )}
                          <span className={`text-sm font-bold ${isDarkMode ? "text-yellow-400" : "text-amber-600"}`}>
                            {pr.weight}{unit}
                          </span>
                          <Award className={`w-4 h-4 ${isDarkMode ? "text-yellow-400" : "text-amber-500"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Muscles Trained */}
          {summaryData.muscles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="px-4 mb-6"
            >
              <h3 className={`text-xs font-medium uppercase tracking-wider mb-2 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                Muscles Trained
              </h3>
              <div className="flex flex-wrap gap-2">
                {summaryData.muscles.map((muscle) => (
                  <span
                    key={muscle}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                      isDarkMode ? "bg-iron-800 text-iron-300" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {muscle}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Exercise Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="px-4"
          >
            <h3 className={`text-xs font-medium uppercase tracking-wider mb-2 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Exercise Breakdown
            </h3>
            <div className="space-y-2">
              {summaryData.exercises.map((ex) => {
                const exVolume = ex.sets.reduce((s, set) => s + (set.weight * set.reps), 0);
                return (
                  <div
                    key={ex.name}
                    className={`rounded-xl p-3 ${isDarkMode ? "bg-iron-900" : "bg-white shadow-sm"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className={`font-semibold text-sm ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                          {ex.name}
                        </p>
                        {ex.category && (
                          <p className={`text-xs capitalize ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>{ex.category}</p>
                        )}
                      </div>
                      <span className={`text-xs font-medium ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>
                        {formatVolume(exVolume)} {unit}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ex.sets.map((set, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2 py-1 rounded-md font-medium ${
                            isDarkMode ? "bg-iron-800 text-iron-300" : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {set.weight}{unit} x {set.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Done Button */}
        <div
          className={`fixed bottom-0 left-0 right-0 p-4 border-t ${isDarkMode ? "bg-iron-950 border-iron-800" : "bg-slate-50 border-slate-200"}`}
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={() => router.push("/")}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 ${
              isDarkMode ? "bg-lift-primary text-iron-950" : "bg-green-500 text-white"
            }`}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const historyForExercise =
    currentExercise?.exercise_name &&
    exerciseHistory?.[currentExercise.exercise_name];

  const catalogExercise = useMemo(() => {
    if (!currentExercise) return null;
    if (currentExercise.exercise_id) {
      const byId = exerciseCatalog.find((e) => e.id === currentExercise.exercise_id);
      if (byId) return byId;
    }
    return exerciseCatalog.find((e) => e.name === currentExercise.exercise_name) || null;
  }, [currentExercise, exerciseCatalog]);

  const guideMediaUrl = catalogExercise ? exerciseMediaUrl(catalogExercise) : null;
  const guideDescription = catalogExercise?.description?.trim() || "";
  const wgerMeta = catalogExercise?.external_source === "wger" ? catalogExercise.metadata : null;

  // ============ ACTIVE WORKOUT SCREEN ============
  // Full viewport column: workout route is not inside Layout, so h-full had no bounded parent
  // and flex-1 overflow-y-auto never scrolled. Lock to 100dvh + in-flow footer.
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col overflow-hidden touch-pan-y ${
        isDarkMode ? "bg-iron-950" : "bg-slate-50"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* —— 1. Toolbar —— */}
      <header
        className={`shrink-0 flex items-center gap-3 px-4 py-3 border-b ${
          isDarkMode ? "border-iron-800/90 bg-iron-950" : "border-slate-200 bg-slate-50"
        }`}
      >
        <button
          type="button"
          onClick={handleClose}
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            isDarkMode
              ? "bg-iron-900 text-iron-400 active:bg-iron-800"
              : "bg-white border border-slate-200 text-slate-600 active:bg-slate-100"
          }`}
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={`text-[10px] font-semibold uppercase tracking-widest ${
              isDarkMode ? "text-iron-500" : "text-slate-400"
            }`}
          >
            Session
          </p>
          <h1
            className={`font-semibold text-sm leading-tight truncate ${
              isDarkMode ? "text-iron-100" : "text-slate-800"
            }`}
          >
            {session.routine_name}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowExerciseInfo(true)}
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            isDarkMode
              ? "bg-iron-900 text-iron-400 active:bg-iron-800"
              : "bg-white border border-slate-200 text-slate-600 active:bg-slate-100"
          }`}
          aria-label="Exercise history and tips"
        >
          <Info className="w-5 h-5" />
        </button>
      </header>

      {/* —— 2. Exercise context (fixed) —— */}
      <div
        className={`shrink-0 px-4 py-3 border-b ${
          isDarkMode ? "border-iron-800/90 bg-iron-900/40" : "border-slate-200 bg-white"
        }`}
      >
        <div
          className={`h-1 rounded-full overflow-hidden mb-3 ${
            isDarkMode ? "bg-iron-800" : "bg-slate-200"
          }`}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isDarkMode ? "bg-lift-primary" : "bg-workout-primary"
            }`}
            style={{
              width: `${((currentExerciseIndex + 1) / totalExercises) * 100}%`,
            }}
          />
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span
              className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md mb-1.5 ${
                isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-500"
              }`}
            >
              {currentExercise.category}
            </span>
            <h2
              className={`text-lg font-bold leading-snug ${
                isDarkMode ? "text-iron-50" : "text-slate-900"
              }`}
            >
              {currentExercise.exercise_name}
            </h2>
            <p className={`text-xs mt-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Exercise {currentExerciseIndex + 1} of {totalExercises} ·{" "}
              {currentExercise.completedSets}/{currentExercise.totalSets} sets logged
            </p>
          </div>
        </div>

        <div
          className={`flex items-center justify-between gap-2 mt-4 pt-3 border-t ${
            isDarkMode ? "border-iron-800/80" : "border-slate-100"
          }`}
        >
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentExerciseIndex === 0}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1 ${
              currentExerciseIndex === 0
                ? isDarkMode
                  ? "text-iron-600 cursor-not-allowed"
                  : "text-slate-300 cursor-not-allowed"
                : isDarkMode
                  ? "bg-iron-800 text-iron-200 active:bg-iron-700"
                  : "bg-slate-100 text-slate-700 active:bg-slate-200"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isLastExercise}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1 ${
              isLastExercise
                ? isDarkMode
                  ? "text-iron-600 cursor-not-allowed"
                  : "text-slate-300 cursor-not-allowed"
                : isDarkMode
                  ? "bg-iron-800 text-iron-200 active:bg-iron-700"
                  : "bg-slate-100 text-slate-700 active:bg-slate-200"
            }`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* —— 3. Sets (scroll) —— */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 py-4 [scrollbar-gutter:stable] ${
          isDarkMode ? "bg-iron-950" : "bg-slate-100"
        }`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex items-end justify-between gap-2 mb-3">
          <div>
            <h3
              className={`text-sm font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
            >
              Sets
            </h3>
            <p className={`text-xs mt-0.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Adjust reps & weight, then tap the check when done
            </p>
          </div>
          <span
            className={`shrink-0 text-xs font-bold tabular-nums px-2.5 py-1 rounded-lg ${
              isDarkMode ? "bg-iron-800 text-iron-300" : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {currentExercise.totalSets}
          </span>
        </div>

        <div className="space-y-4">
          {currentExercise.sets.map((setLog) => (
            <SetCard
              key={setLog.id}
              setNumber={setLog.set_number}
              weight={setLog.weight}
              reps={setLog.reps}
              previousWeight={setLog.previous_weight}
              previousReps={setLog.previous_reps}
              isCompleted={setLog.is_completed}
              unit={unit}
              onWeightChange={(weight) => handleSetUpdate(setLog.id, { weight })}
              onRepsChange={(reps) => handleSetUpdate(setLog.id, { reps })}
              onToggleComplete={(isCompleted) =>
                handleSetUpdate(setLog.id, { is_completed: isCompleted })
              }
            />
          ))}
        </div>

        <p
          className={`text-center text-[11px] pt-6 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}
        >
          Tip: swipe horizontally to change exercise
        </p>
      </div>

      {/* —— 4. Primary action —— */}
      <div
        className={`shrink-0 px-4 pt-3 border-t ${
          isDarkMode ? "bg-iron-950 border-iron-800" : "bg-slate-50 border-slate-200"
        }`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {isLastExercise ? (
          <button
            type="button"
            onClick={handleCompleteWorkout}
            disabled={isCompleting}
            className={`
              w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2
              ${
                allSetsCompleted
                  ? isDarkMode
                    ? "bg-lift-primary text-iron-950 shadow-lg"
                    : "bg-green-500 text-white shadow-lg"
                  : isDarkMode
                    ? "bg-iron-800 text-iron-500"
                    : "bg-slate-200 text-slate-500"
              }
            `}
          >
            {isCompleting ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Complete workout
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className={`
              w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg
              ${
                isDarkMode
                  ? "bg-lift-primary text-iron-950"
                  : "bg-workout-primary text-white"
              }
            `}
          >
            Next exercise
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showExerciseInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50"
            onClick={() => setShowExerciseInfo(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl p-5 shadow-xl ${
                isDarkMode ? "bg-iron-900 border border-iron-800" : "bg-white border border-slate-200"
              }`}
            >
              <h3
                className={`text-lg font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
              >
                {currentExercise.exercise_name}
              </h3>
              <p className={`text-sm capitalize mt-0.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                {currentExercise.category}
              </p>

              {guideMediaUrl ? (
                <div
                  className={`relative mt-4 aspect-video w-full max-h-48 overflow-hidden rounded-xl ${
                    isDarkMode ? "bg-iron-800" : "bg-slate-100"
                  }`}
                >
                  <Image
                    src={guideMediaUrl}
                    alt=""
                    fill
                    unoptimized
                    className="object-contain"
                    sizes="(max-width: 448px) 100vw, 448px"
                  />
                </div>
              ) : null}

              {guideDescription ? (
                <p
                  className={`mt-3 text-sm leading-relaxed ${isDarkMode ? "text-iron-300" : "text-slate-600"}`}
                >
                  {guideDescription}
                </p>
              ) : null}

              {wgerMeta ? (
                <p className={`text-[11px] leading-snug ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                  Exercise data and media from{" "}
                  <a
                    href="https://wger.de"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    wger
                  </a>
                  {wgerMeta.license_short ? ` (${wgerMeta.license_short})` : ""}
                  {wgerMeta.license_author ? ` · ${wgerMeta.license_author}` : ""}.
                </p>
              ) : null}

              <div className={`mt-4 space-y-3 text-sm ${isDarkMode ? "text-iron-300" : "text-slate-600"}`}>
                {historyForExercise ? (
                  <>
                    <p>
                      <span className={isDarkMode ? "text-iron-500" : "text-slate-400"}>Last session: </span>
                      <span className="font-semibold tabular-nums">
                        {historyForExercise.last_weight ?? 0}
                        {unit} × {historyForExercise.last_reps ?? "—"} reps
                      </span>
                    </p>
                    {(historyForExercise.personal_record_weight ?? 0) > 0 && (
                      <p>
                        <span className={isDarkMode ? "text-iron-500" : "text-slate-400"}>Personal best: </span>
                        <span className="font-semibold tabular-nums text-amber-500">
                          {historyForExercise.personal_record_weight}
                          {unit}
                        </span>
                      </p>
                    )}
                    <p>
                      <span className={isDarkMode ? "text-iron-500" : "text-slate-400"}>Logged sessions: </span>
                      {historyForExercise.times_performed ?? 0}
                    </p>
                  </>
                ) : (
                  <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
                    No history for this exercise yet. Pre-filled values use your routine defaults or last known
                    numbers once you complete workouts.
                  </p>
                )}
                <p className={`text-xs leading-relaxed pt-2 border-t ${isDarkMode ? "text-iron-500 border-iron-800" : "text-slate-500 border-slate-100"}`}>
                  Mark each set complete when you finish it. Swipe left or right on this screen to move between
                  exercises.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExerciseInfo(false)}
                className={`mt-5 w-full py-3 rounded-xl font-semibold ${
                  isDarkMode ? "bg-iron-800 text-iron-100" : "bg-slate-100 text-slate-800"
                }`}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

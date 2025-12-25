import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import SetCard from "@/components/SetCard";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  Dumbbell,
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
  } = useWorkout();

  const [session, setSession] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

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
    await completeWorkoutSession(sessionId);
    router.push("/");
  }, [sessionId, completeWorkoutSession, router]);

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

  return (
    <div
      className={`min-h-screen flex flex-col ${isDarkMode ? "bg-iron-950" : "bg-slate-50"}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div
        className={`sticky top-0 z-50 ${isDarkMode ? "bg-iron-950" : "bg-slate-50"}`}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleClose}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isDarkMode
                ? "bg-iron-800 text-iron-400"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1
              className={`font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
            >
              {session.routine_name}
            </h1>
            <p
              className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
            >
              Exercise {currentExerciseIndex + 1} of {totalExercises}
            </p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Progress Bar */}
        <div
          className={`h-1.5 mx-4 rounded-full overflow-hidden ${
            isDarkMode ? "bg-iron-800" : "bg-slate-200"
          }`}
        >
          <div
            className={`h-full transition-all duration-300 ${
              isDarkMode ? "bg-lift-primary" : "bg-workout-primary"
            }`}
            style={{
              width: `${((currentExerciseIndex + 1) / totalExercises) * 100}%`,
            }}
          />
        </div>

        {/* Exercise Info Header */}
        <div
          className="px-4 py-4 mt-2 rounded-t-3xl text-white"
          style={{
            background: isDarkMode
              ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
              : "linear-gradient(135deg, #4F8CFF 0%, #6366f1 100%)",
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-sm capitalize">
                {currentExercise.category}
              </p>
              <h2 className="text-2xl font-bold mt-1">
                {currentExercise.exercise_name}
              </h2>
              <p className="text-white/80 mt-1">
                {currentExercise.completedSets} of {currentExercise.totalSets}{" "}
                sets completed
              </p>
            </div>
            <button className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Info className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handlePrevious}
              disabled={currentExerciseIndex === 0}
              className={`flex items-center gap-1 text-sm font-medium ${
                currentExerciseIndex === 0 ? "opacity-40" : ""
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={isLastExercise}
              className={`flex items-center gap-1 text-sm font-medium ${
                isLastExercise ? "opacity-40" : ""
              }`}
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sets List */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto pb-32">
        {currentExercise.sets.map((setLog) => (
          <SetCard
            key={setLog.id}
            setNumber={setLog.set_number}
            weight={setLog.weight}
            reps={setLog.reps}
            previousWeight={setLog.previous_weight}
            previousReps={setLog.previous_reps}
            isCompleted={setLog.is_completed}
            unit={settings.unit || "kg"}
            onWeightChange={(weight) => handleSetUpdate(setLog.id, { weight })}
            onRepsChange={(reps) => handleSetUpdate(setLog.id, { reps })}
            onToggleComplete={(isCompleted) =>
              handleSetUpdate(setLog.id, { is_completed: isCompleted })
            }
          />
        ))}

        {/* Swipe hint */}
        <p
          className={`text-center text-sm pt-4 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}
        >
          Swipe left or right to change exercises
        </p>
      </div>

      {/* Bottom Action */}
      <div
        className={`
        fixed bottom-0 left-0 right-0 p-4 border-t
        ${isDarkMode ? "bg-iron-950 border-iron-800" : "bg-slate-50 border-slate-200"}
      `}
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {isLastExercise ? (
          <button
            onClick={handleCompleteWorkout}
            disabled={isCompleting}
            className={`
              w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2
              ${
                allSetsCompleted
                  ? isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-green-500 text-white"
                  : isDarkMode
                    ? "bg-iron-800 text-iron-400"
                    : "bg-slate-200 text-slate-600"
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
                Complete Workout
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className={`
              w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2
              ${
                isDarkMode
                  ? "bg-lift-primary text-iron-950"
                  : "bg-workout-primary text-white"
              }
            `}
          >
            Next Exercise
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

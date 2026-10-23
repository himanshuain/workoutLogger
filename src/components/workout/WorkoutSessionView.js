import { useMemo, useState, useEffect, useCallback } from "react";
import { useWorkout } from "@/context/WorkoutContext";
import { getSessionExtras } from "@/lib/workoutSessionClient";
import { mergePlannedExercises } from "@/lib/mergePlannedExercises";
import { resolveExerciseMediaUrl } from "@/lib/exerciseMedia";
import { useExerciseMediaOverrides } from "@/hooks/useExerciseMediaOverrides";
import ReorderableExerciseTileGrid from "@/components/workout/ReorderableExerciseTileGrid";
import { completedSetCountForExercise } from "@/components/workout/ExerciseSessionResetButton";
import {
  orderPlannedExercises,
  persistExerciseOrder,
  moveSessionExerciseToTop,
} from "@/lib/sessionExerciseOrder";

// Helper functions for exercise management
function exerciseStatus(name, setLogs) {
  const completed = (setLogs || []).filter(l => l.exercise_name === name && l.is_completed);
  if (completed.length > 0) return "in_progress";
  return "not_started";
}

export function statusLabel(s) {
  if (s === "completed") return "Completed";
  if (s === "in_progress") return "In Progress";
  return "Not Started";
}

/**
 * Reusable workout session view component
 * @param {Object} props
 * @param {Object} props.session - Workout session data
 * @param {Function} props.onExerciseClick - Handler for exercise clicks
 * @param {boolean} props.isDarkMode - Dark mode flag
 * @param {boolean} props.showDateHeader - Whether to show date in header
 */
export default function WorkoutSessionView({
  session,
  onExerciseClick,
  isDarkMode,
  showDateHeader = false,
}) {
  const { routines, exercises } = useWorkout();
  const mediaOverrides = useExerciseMediaOverrides();
  const [thumbFailed, setThumbFailed] = useState({});
  const [extrasVersion, setExtrasVersion] = useState(0);
  const bumpExtras = useCallback(() => setExtrasVersion(v => v + 1), []);

  // Get routine for this session
  const sessionRoutine = useMemo(() => {
    if (!session?.routine_id) return null;
    return routines.find(r => r.id === session.routine_id) || null;
  }, [session?.routine_id, routines]);

  const extras = useMemo(() => {
    if (!session?.id || typeof session.id !== "string") return [];
    return getSessionExtras(session.id);
  }, [session?.id, extrasVersion]);

  // Merge planned exercises
  const plannedExercises = useMemo(() => {
    const merged = mergePlannedExercises(sessionRoutine, extras);
    return orderPlannedExercises(merged, session?.id);
  }, [sessionRoutine, extras, session?.id, extrasVersion]);

  const handleMoveExerciseToTop = useCallback(
    exerciseName => {
      if (!session?.id) return;
      moveSessionExerciseToTop(
        session.id,
        exerciseName,
        plannedExercises.map(e => e.exercise_name),
      );
      bumpExtras();
    },
    [session?.id, plannedExercises, bumpExtras],
  );

  useEffect(() => {
    setThumbFailed({});
  }, [session?.id, plannedExercises.length]);

  const setLogs = session?.set_logs || [];

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

  return (
    <div>
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
          className={`max-h-[min(52vh,28rem)] overflow-y-auto overscroll-contain rounded-card pr-1 -mr-0.5 ${
            isDarkMode ? "scrollbar-thin scrollbar-thumb-iron-700" : ""
          }`}
        >
          <ReorderableExerciseTileGrid
            exercises={plannedExercises}
            isDarkMode={isDarkMode}
            onReorder={next => {
              if (session?.id) {
                persistExerciseOrder(session.id, next);
                bumpExtras();
              }
            }}
            sessionId={session?.id ?? null}
            inlineLog={Boolean(session?.id)}
            exerciseOrderVersion={extrasVersion}
            onMoveExerciseToTop={handleMoveExerciseToTop}
            onOpen={(name, category) => onExerciseClick?.(name, category)}
            resolveMedia={resolveExerciseMedia}
            thumbFailed={thumbFailed}
            onThumbFailed={name => setThumbFailed(prev => ({ ...prev, [name]: true }))}
            completedSetCountFor={name => completedSetCountForExercise(name, setLogs)}
            exercisesCatalog={exercises}
          />
        </div>
      ) : (
        <div className={`text-center py-12 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
          <p className="text-sm">No exercises planned</p>
          <p className="text-xs mt-1">Add exercises to get started</p>
        </div>
      )}
    </div>
  );
}

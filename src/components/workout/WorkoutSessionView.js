import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useWorkout } from "@/context/WorkoutContext";
import { getSessionExtras, getExerciseDoneMap } from "@/lib/workoutSessionClient";
import { mergePlannedExercises } from "@/lib/mergePlannedExercises";
import PlannedExerciseMetaLine from "@/components/workout/PlannedExerciseMetaLine";
import { exerciseMediaUrl, exerciseImageUnoptimized } from "@/lib/exerciseMedia";
import ExerciseIcon from "@/components/ExerciseIcon";
import {
  CheckCircle2,
  Circle,
} from "lucide-react";
import { StaggerContainer, StaggerItem, PressableScale } from "@/components/ui/fade-in";

// Helper functions for exercise management
function exerciseStatus(name, doneMap, setLogs) {
  if (doneMap[name]) return "completed";
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
  const [thumbFailed, setThumbFailed] = useState({});
  const [extrasVersion, setExtrasVersion] = useState(0);

  // Get routine for this session
  const sessionRoutine = useMemo(() => {
    if (!session?.routine_id) return null;
    return routines.find(r => r.id === session.routine_id) || null;
  }, [session?.routine_id, routines]);

  // Get extras and done status
  const extras = useMemo(() => {
    if (!session?.id || typeof session.id !== "string") return [];
    return getSessionExtras(session.id);
  }, [session?.id, extrasVersion]);

  const doneMap = useMemo(() => {
    if (!session?.id || typeof session.id !== "string") return {};
    return getExerciseDoneMap(session.id);
  }, [session?.id, extrasVersion]);

  // Merge planned exercises
  const plannedExercises = useMemo(
    () => mergePlannedExercises(sessionRoutine, extras),
    [sessionRoutine, extras]
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
          <StaggerContainer className="space-y-3 pb-1">
            {plannedExercises.map(ex => {
              const st = exerciseStatus(ex.exercise_name, doneMap, setLogs);
              const media = resolveExerciseMedia(ex.exercise_name);
              const showPlaceholder = !media || thumbFailed[ex.exercise_name];
              return (
                <StaggerItem key={ex.exercise_name}>
                  <PressableScale>
                    <button
                      type="button"
                      onClick={() => onExerciseClick?.(ex.exercise_name, ex.category)}
                      className={`w-full text-left rounded-card p-4 flex gap-4 transition-colors ${
                        isDarkMode
                          ? "bg-iron-900/50 border border-iron-800 hover:border-iron-700"
                          : "bg-white border border-slate-200 shadow-sm hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`relative w-16 h-16 rounded-card overflow-hidden shrink-0 flex flex-col items-center justify-center ${
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
                </StaggerItem>
              );
            })}
          </StaggerContainer>
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

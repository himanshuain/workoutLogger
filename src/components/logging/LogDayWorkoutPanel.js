import { Dumbbell, Play } from "lucide-react";
import { formatChipLabel } from "@/lib/dateLogUtils";

export default function LogDayWorkoutPanel({
  isDarkMode,
  pastLogDate,
  todayStr,
  workoutSessions,
  routines,
  routineForSelectedDay,
  startingRoutine,
  onPickRoutine,
  onStartWorkout,
  onNavigateSession,
}) {
  if (!pastLogDate) return null;

  return (
    <div
      className={`rounded-2xl border p-3 mb-6 ${
        isDarkMode ? "border-iron-800 bg-iron-950/40" : "border-slate-200 bg-slate-50/90"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Dumbbell className={`h-4 w-4 shrink-0 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`} />
          <p className="text-section-header truncate">Workout · {formatChipLabel(pastLogDate, todayStr)}</p>
        </div>
        {routines.length > 0 ? (
          <button
            type="button"
            onClick={onPickRoutine}
            disabled={startingRoutine}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg ${
              isDarkMode ? "bg-iron-800 text-lift-primary hover:bg-iron-700" : "bg-slate-200 text-workout-primary hover:bg-slate-300"
            } disabled:opacity-50`}
          >
            Pick routine
          </button>
        ) : null}
      </div>

      {workoutSessions.length > 0 ? (
        <div className="space-y-2">
          {workoutSessions.map(session => {
            const logs = session?.set_logs || [];
            const completedLogs = logs.filter(l => l.is_completed);
            const exerciseNames = new Set(completedLogs.map(l => l.exercise_name));
            const meta =
              session.status === "completed"
                ? `Completed · ${exerciseNames.size} exercise${exerciseNames.size !== 1 ? "s" : ""} · ${completedLogs.length} set${completedLogs.length !== 1 ? "s" : ""}`
                : exerciseNames.size > 0 || completedLogs.length > 0
                  ? `In progress · ${exerciseNames.size} exercise${exerciseNames.size !== 1 ? "s" : ""} · ${completedLogs.length} set${completedLogs.length !== 1 ? "s" : ""}`
                  : "Started — tap to log sets";
            return (
              <div
                key={session.id}
                className={`flex items-center gap-3 rounded-xl p-3 ${
                  isDarkMode ? "bg-iron-900/60" : "bg-white ring-1 ring-slate-100"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isDarkMode ? "bg-lift-primary/20 text-lift-primary" : "bg-workout-primary/20 text-workout-primary"
                  }`}
                >
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-card-subtitle">{session.routine_name || "Custom workout"}</p>
                  <p className="text-metadata">{meta}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateSession(session)}
                  className={`flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                    session.status === "completed"
                      ? isDarkMode
                        ? "border border-iron-600 bg-iron-800/80 text-iron-200 hover:bg-iron-800"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      : isDarkMode
                        ? "bg-lift-primary/20 text-lift-primary hover:bg-lift-primary/30"
                        : "bg-workout-primary/20 text-workout-primary hover:bg-workout-primary/30"
                  }`}
                >
                  {session.status === "completed" ? "Review" : "Continue"}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-body mb-3">No workout logged for this day</p>
          {routineForSelectedDay ? (
            <div className="mb-3">
              <p className="text-metadata mb-2">Planned: {routineForSelectedDay.name}</p>
              <p className="text-metadata">{routineForSelectedDay.routine_exercises?.length || 0} exercises</p>
            </div>
          ) : (
            <p className="text-metadata mb-3">No routine planned for this day</p>
          )}
          <div className="flex flex-col gap-2 max-w-xs mx-auto">
            <button
              type="button"
              onClick={onStartWorkout}
              disabled={startingRoutine}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                isDarkMode ? "bg-lift-primary/20 text-lift-primary hover:bg-lift-primary/30" : "bg-workout-primary/20 text-workout-primary hover:bg-workout-primary/30"
              } disabled:opacity-50`}
            >
              <Play className="h-4 w-4" />
              {routineForSelectedDay ? "Start with planned day" : "Start workout"}
            </button>
            {routines.length > 0 && (
              <button
                type="button"
                onClick={onPickRoutine}
                disabled={startingRoutine}
                className={`py-2.5 rounded-xl text-sm font-semibold border ${
                  isDarkMode ? "border-iron-600 text-iron-200 hover:bg-iron-800/80" : "border-slate-300 text-slate-800 hover:bg-slate-50"
                } disabled:opacity-50`}
              >
                Choose another routine
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

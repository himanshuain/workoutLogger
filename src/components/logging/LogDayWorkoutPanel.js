import { Dumbbell, Play } from "lucide-react";
import { formatChipLabel } from "@/lib/dateLogUtils";
import SectionHeader from "@/components/SectionHeader";
import {
  actionPrimary,
  actionSecondary,
  actionSecondaryCompact,
} from "@/lib/actionButtonStyles";
import { surfaceSection, surfaceInteractive } from "@/lib/surfaceStyles";

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

  const completedSets = workoutSessions.reduce(
    (sum, session) => sum + (session.set_logs || []).filter(l => l.is_completed).length,
    0,
  );
  const workoutMeta =
    workoutSessions.length > 0
      ? `${completedSets} set${completedSets !== 1 ? "s" : ""}`
      : formatChipLabel(pastLogDate, todayStr);

  return (
    <div className={`rounded-card border p-4 mb-section ${surfaceSection(isDarkMode)}`}>
      <SectionHeader
        icon={Dumbbell}
        label="Workout"
        meta={workoutMeta}
        isDarkMode={isDarkMode}
      >
        {routines.length > 0 ? (
          <button
            type="button"
            onClick={onPickRoutine}
            disabled={startingRoutine}
            className={`shrink-0 rounded-card px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${actionSecondaryCompact(isDarkMode)}`}
          >
            Pick routine
          </button>
        ) : null}
      </SectionHeader>

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
                className={`flex items-center gap-3 rounded-card p-3 ${surfaceInteractive(isDarkMode)}`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-card ${
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
                  className={`flex shrink-0 items-center gap-1 rounded-card px-3 py-2 text-xs font-semibold transition-colors ${
                    session.status === "completed"
                      ? actionSecondary(isDarkMode)
                      : actionPrimary(isDarkMode)
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
              className={`flex items-center justify-center gap-2 rounded-card px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${actionPrimary(isDarkMode)}`}
            >
              <Play className="h-4 w-4" />
              {routineForSelectedDay ? "Start with planned day" : "Start workout"}
            </button>
            {routines.length > 0 && (
              <button
                type="button"
                onClick={onPickRoutine}
                disabled={startingRoutine}
                className={`rounded-card py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${actionSecondary(isDarkMode)}`}
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

import { Dumbbell, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import SectionHeader from "@/components/SectionHeader";
import {
  actionPrimary,
  actionSecondary,
} from "@/lib/actionButtonStyles";
import { surfaceSection, surfaceInteractive } from "@/lib/surfaceStyles";

export default function LogDayWorkoutPanel({
  isDarkMode,
  pastLogDate,
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
      : null;

  const exerciseCount = routineForSelectedDay?.routine_exercises?.length || 0;
  const hasSessions = workoutSessions.length > 0;
  const canPickRoutine = routines.length > 0;

  return (
    <div className={cn("mb-section rounded-card border p-2.5", surfaceSection(isDarkMode))}>
      <SectionHeader
        icon={Dumbbell}
        label="Workout"
        meta={workoutMeta}
        isDarkMode={isDarkMode}
        className={hasSessions ? "mb-2" : "mb-2.5"}
      />

      {hasSessions ? (
        <div className="space-y-1.5">
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
                className={cn("flex items-center gap-2.5 rounded-card p-2", surfaceInteractive(isDarkMode))}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-card",
                    isDarkMode ? "bg-lift-primary/20 text-lift-primary" : "bg-workout-primary/20 text-workout-primary",
                  )}
                >
                  <Dumbbell className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-card-subtitle leading-snug line-clamp-2 break-words">{session.routine_name || "Custom workout"}</p>
                  <p className="text-metadata">{meta}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateSession(session)}
                  className={cn(
                    "flex shrink-0 items-center rounded-pill px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    session.status === "completed"
                      ? actionSecondary(isDarkMode)
                      : actionPrimary(isDarkMode),
                  )}
                >
                  {session.status === "completed" ? "Review" : "Continue"}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {routineForSelectedDay ? (
            <div
              className={cn(
                "border-l-2 pl-2.5",
                isDarkMode ? "border-sky-500/60" : "border-sky-400",
              )}
            >
              <p
                className={cn(
                  "inline-flex max-w-full rounded-pill px-2.5 py-1 text-sm tracking-wide",
                  isDarkMode
                    ? "border border-sky-700/50 bg-sky-950/60 text-sky-50"
                    : "border border-sky-200 bg-sky-50 text-sky-950",
                )}
              >
                <span>{routineForSelectedDay.name}</span>
              </p>
              {exerciseCount > 0 ? (
                <p className="text-metadata mt-1.5">
                  {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} planned
                </p>
              ) : null}
            </div>
          ) : null}

          {routineForSelectedDay || !canPickRoutine ? (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={onStartWorkout}
                disabled={startingRoutine}
                className={cn(
                  "flex min-h-[38px] items-center justify-center gap-1.5 rounded-pill px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
                  actionPrimary(isDarkMode),
                )}
              >
                <Play className="h-3.5 w-3.5 shrink-0" />
                {routineForSelectedDay ? "Start" : "Start workout"}
              </button>
              {canPickRoutine && routineForSelectedDay ? (
                <button
                  type="button"
                  onClick={onPickRoutine}
                  disabled={startingRoutine}
                  className={cn(
                    "min-h-[38px] rounded-pill px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50",
                    actionSecondary(isDarkMode),
                  )}
                >
                  Other
                </button>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={onPickRoutine}
              disabled={startingRoutine}
              className={cn(
                "flex min-h-[38px] w-full items-center justify-center rounded-pill px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
                actionPrimary(isDarkMode),
              )}
            >
              Pick routine
            </button>
          )}
        </div>
      )}
    </div>
  );
}

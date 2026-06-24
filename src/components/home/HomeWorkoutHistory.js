import { forwardRef, useState } from "react";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";
import { surfaceInteractive } from "@/lib/surfaceStyles";
import ExerciseIcon from "@/components/ExerciseIcon";
import SectionSurface from "@/components/SectionSurface";
import SectionHeader, { SectionHeaderLink } from "@/components/SectionHeader";
import GroupedSetLines from "@/components/workout/GroupedSetLines";
import SessionOverflowMenu from "@/components/workout/SessionOverflowMenu";
import { StaggerContainer, StaggerItem, PressableScale } from "@/components/ui/fade-in";
import {
  History,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Target,
  Flame,
  Dumbbell,
} from "lucide-react";

function HomeWorkoutHistory(
  {
    isDarkMode,
    historySessions,
    todaySession,
    isViewingToday,
    today,
    expandedSession,
    setExpandedSession,
    setDeleteConfirm,
    handleUndoTodayWorkout,
  },
  ref,
) {
  const router = useRouter();
  const [openMenuSessionId, setOpenMenuSessionId] = useState(null);

  if (historySessions.length === 0) return null;

  return (
    <section ref={ref} className="section-spacing scroll-mt-20">
      <SectionSurface isDarkMode={isDarkMode}>
        <SectionHeader
          icon={History}
          label="Workout history"
          meta={`${historySessions.length} workout${historySessions.length !== 1 ? "s" : ""}`}
          isDarkMode={isDarkMode}
          className="mb-3"
        >
          <SectionHeaderLink isDarkMode={isDarkMode} onClick={() => router.push("/history")}>
            View all <ChevronRight className="w-3 h-3" aria-hidden />
          </SectionHeaderLink>
        </SectionHeader>

        {!todaySession && isViewingToday ? (
          <p className={`text-metadata mb-3 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            No workout logged today — recent sessions below.
          </p>
        ) : null}

        <StaggerContainer className="space-y-2">
          {historySessions.map(session => {
            const completedSets = (session.set_logs || []).filter(s => s.is_completed);
            const totalVolume = completedSets.reduce(
              (sum, s) => sum + (s.weight || 0) * (s.reps || 0),
              0,
            );
            const exerciseNames = [...new Set(completedSets.map(s => s.exercise_name))];
            const isExpanded = expandedSession === session.id;
            const dateObj = new Date(session.date + "T00:00:00");
            const todayObj = new Date();
            todayObj.setHours(0, 0, 0, 0);
            const yesterday = new Date(todayObj);
            yesterday.setDate(yesterday.getDate() - 1);
            const dateLabel =
              dateObj.toDateString() === todayObj.toDateString()
                ? "Today"
                : dateObj.toDateString() === yesterday.toDateString()
                  ? "Yesterday"
                  : dateObj.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });

            const byExercise = {};
            completedSets.forEach(s => {
              const name = s.exercise_name || "Exercise";
              if (!byExercise[name]) byExercise[name] = { sets: [], volume: 0 };
              byExercise[name].sets.push(s);
              byExercise[name].volume += (s.weight || 0) * (s.reps || 0);
            });

            const openEdit = () => {
              router.push(
                completedSets.length > 0
                  ? `/workout/${session.id}/summary`
                  : `/workout/${session.id}`,
              );
            };

            const openDelete = () => {
              setDeleteConfirm({
                type: "session",
                id: session.id,
                label: `${session.routine_name || "Workout"} on ${dateLabel}`,
              });
            };

            return (
              <StaggerItem key={session.id}>
                <PressableScale>
                  <div className={cn("overflow-hidden rounded-card border", surfaceInteractive(isDarkMode))}>
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuSessionId(null);
                          setExpandedSession(isExpanded ? null : session.id);
                        }}
                        className={cn(
                          "min-w-0 flex-1 p-3 text-left transition-colors",
                          isDarkMode ? "hover:bg-surface-pressed" : "hover:bg-surface-pressed",
                        )}
                      >
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-sm font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                              >
                                {dateLabel}
                              </span>
                              {session.routine_name ? (
                                <span
                                  className={`rounded-pill px-2 py-0.5 text-[10px] ${
                                    isDarkMode
                                      ? "bg-lift-primary/15 text-lift-primary"
                                      : "bg-workout-primary/10 text-workout-primary"
                                  }`}
                                >
                                  {session.routine_name}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 flex items-center gap-3">
                              <span
                                className={`flex items-center gap-1 text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                              >
                                <Target className="h-3 w-3" aria-hidden />
                                {exerciseNames.length} exercise{exerciseNames.length !== 1 ? "s" : ""}
                              </span>
                              <span
                                className={`flex items-center gap-1 text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                              >
                                <Flame className="h-3 w-3" aria-hidden />
                                {completedSets.length} sets
                              </span>
                              {totalVolume > 0 ? (
                                <span
                                  className={`flex items-center gap-1 text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                                >
                                  <Dumbbell className="h-3 w-3" aria-hidden />
                                  {Math.round(totalVolume).toLocaleString()} kg
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-0.5 pr-2">
                        <SessionOverflowMenu
                          isOpen={openMenuSessionId === session.id}
                          onOpenChange={open =>
                            setOpenMenuSessionId(open ? session.id : null)
                          }
                          isDarkMode={isDarkMode}
                          onEdit={openEdit}
                          onDelete={openDelete}
                          onUndo={() => handleUndoTodayWorkout(session.id)}
                          showUndo={isViewingToday && session.date === today}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuSessionId(null);
                            setExpandedSession(isExpanded ? null : session.id);
                          }}
                          aria-label={isExpanded ? "Collapse workout" : "Expand workout"}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                            isDarkMode
                              ? "text-iron-500 hover:bg-iron-800/80 hover:text-iron-300"
                              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                          )}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div
                        className={cn(
                          "border-t",
                          isDarkMode
                            ? "border-iron-800/50 bg-iron-900/20"
                            : "border-slate-100 bg-slate-50/60",
                        )}
                      >
                        {completedSets.length === 0 ? (
                          <p
                            className={`px-3.5 py-4 text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                          >
                            No sets logged for this workout.
                          </p>
                        ) : (
                          Object.entries(byExercise).map(([name, { sets, volume }], idx, arr) => (
                            <div
                              key={name}
                              className={cn(
                                "px-3.5 py-3",
                                idx < arr.length - 1 &&
                                  (isDarkMode ? "border-b border-iron-800/40" : "border-b border-slate-200/70"),
                              )}
                            >
                              <div className="flex items-start gap-2.5">
                                <div
                                  className={cn(
                                    "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                                    isDarkMode ? "bg-iron-800/80" : "bg-white shadow-sm",
                                  )}
                                >
                                  <ExerciseIcon
                                    name={name}
                                    className="h-5 w-5"
                                    color={isDarkMode ? "#a1a1aa" : "#64748b"}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p
                                      className={cn(
                                        "min-w-0 text-sm font-semibold leading-snug",
                                        isDarkMode ? "text-iron-100" : "text-slate-800",
                                      )}
                                    >
                                      {name}
                                    </p>
                                    <span
                                      className={cn(
                                        "shrink-0 text-[11px] tabular-nums",
                                        isDarkMode ? "text-iron-500" : "text-slate-400",
                                      )}
                                    >
                                      {sets.length} set{sets.length !== 1 ? "s" : ""}
                                      {volume > 0 ? ` · ${Math.round(volume).toLocaleString()} kg` : ""}
                                    </span>
                                  </div>
                                  <GroupedSetLines
                                    sets={sets}
                                    isDarkMode={isDarkMode}
                                    className="mt-2"
                                  />
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </PressableScale>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </SectionSurface>
    </section>
  );
}

export default forwardRef(HomeWorkoutHistory);

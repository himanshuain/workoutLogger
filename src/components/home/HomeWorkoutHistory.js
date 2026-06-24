import { forwardRef } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { surfaceInteractive } from "@/lib/surfaceStyles";
import ExerciseIcon from "@/components/ExerciseIcon";
import SectionSurface from "@/components/SectionSurface";
import SectionHeader, { SectionHeaderLink } from "@/components/SectionHeader";
import { StaggerContainer, StaggerItem, PressableScale } from "@/components/ui/fade-in";
import { actionSecondary } from "@/lib/actionButtonStyles";
import {
  History,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Target,
  Flame,
  Dumbbell,
  Pencil,
  Trash2,
  Save,
  X,
  Undo2,
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
    editingSet,
    setEditingSet,
    setDeleteConfirm,
    updateSetLogData,
    handleUndoTodayWorkout,
  },
  ref,
) {
  const router = useRouter();

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

            return (
              <StaggerItem key={session.id}>
                <PressableScale>
                  <div className={cn("overflow-hidden rounded-card border", surfaceInteractive(isDarkMode))}>
                    <button
                      type="button"
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      className={cn(
                        "w-full p-3 text-left transition-colors",
                        isDarkMode ? "hover:bg-surface-pressed" : "hover:bg-surface-pressed",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-sm font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                            >
                              {dateLabel}
                            </span>
                            {session.routine_name && (
                              <span
                                className={`rounded-pill px-2 py-0.5 text-[10px] ${
                                  isDarkMode
                                    ? "bg-lift-primary/15 text-lift-primary"
                                    : "bg-workout-primary/10 text-workout-primary"
                                }`}
                              >
                                {session.routine_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span
                              className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                            >
                              <Target className="w-3 h-3" />
                              {exerciseNames.length} exercise{exerciseNames.length !== 1 ? "s" : ""}
                            </span>
                            <span
                              className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                            >
                              <Flame className="w-3 h-3" />
                              {completedSets.length} sets
                            </span>
                            {totalVolume > 0 && (
                              <span
                                className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                              >
                                <Dumbbell className="w-3 h-3" />
                                {Math.round(totalVolume).toLocaleString()} kg
                              </span>
                            )}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp
                            className={`w-4 h-4 flex-shrink-0 ml-2 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                          />
                        ) : (
                          <ChevronDown
                            className={`w-4 h-4 flex-shrink-0 ml-2 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                          />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div
                        className={`px-3.5 pb-3 space-y-2 border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}
                      >
                        <div className="pt-2.5">
                          {completedSets.length === 0 ? (
                            <p className={`text-sm mb-3 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                              No sets logged for this workout.
                            </p>
                          ) : (
                            (() => {
                              const byExercise = {};
                              completedSets.forEach(s => {
                                const name = s.exercise_name || "Exercise";
                                if (!byExercise[name]) byExercise[name] = { sets: [], volume: 0 };
                                byExercise[name].sets.push(s);
                                byExercise[name].volume += (s.weight || 0) * (s.reps || 0);
                              });
                              return Object.entries(byExercise).map(([name, { sets, volume }]) => (
                                <div
                                  key={name}
                                  className={`rounded-card p-3 mb-2 last:mb-0 ${isDarkMode ? "bg-iron-800/40" : "bg-slate-50"}`}
                                >
                                  <div className="flex items-center gap-2.5 mb-2">
                                    <div
                                      className={`w-8 h-8 rounded-card flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-iron-700/70" : "bg-slate-100"}`}
                                    >
                                      <ExerciseIcon
                                        name={name}
                                        className="w-5 h-5"
                                        color={isDarkMode ? "#a1a1aa" : "#64748b"}
                                      />
                                    </div>
                                    <p
                                      className={`min-w-0 flex-1 text-sm font-semibold leading-snug line-clamp-2 break-words ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                                    >
                                      {name}
                                    </p>
                                    <span
                                      className={`text-[11px] flex-shrink-0 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                                    >
                                      {sets.length} set{sets.length !== 1 ? "s" : ""}
                                      {volume > 0 ? ` · ${Math.round(volume).toLocaleString()} kg` : ""}
                                    </span>
                                  </div>
                                  <div className="ml-[2.625rem] space-y-0.5">
                                    {sets.map((s, idx) => (
                                      <div
                                        key={s.id}
                                        className={`flex items-center gap-2 py-1.5 ${idx > 0 ? `border-t ${isDarkMode ? "border-iron-700/30" : "border-slate-100"}` : ""}`}
                                      >
                                        <span
                                          className={`w-5 text-center text-[10px] font-bold rounded-md py-0.5 flex-shrink-0 ${isDarkMode ? "bg-iron-700 text-iron-500" : "bg-slate-100 text-slate-400"}`}
                                        >
                                          {idx + 1}
                                        </span>

                                        {editingSet?.id === s.id ? (
                                          <div className="flex items-center gap-1.5 flex-1">
                                            <input
                                              type="number"
                                              step="0.5"
                                              value={editingSet.weight}
                                              onChange={e =>
                                                setEditingSet({ ...editingSet, weight: e.target.value })
                                              }
                                              className={`w-16 px-2 py-1 rounded-lg text-xs text-center ${isDarkMode ? "bg-iron-700 text-iron-100 border border-iron-600" : "bg-white text-slate-800 border border-slate-200"}`}
                                            />
                                            <span
                                              className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                                            >
                                              kg ×
                                            </span>
                                            <input
                                              type="number"
                                              value={editingSet.reps}
                                              onChange={e =>
                                                setEditingSet({ ...editingSet, reps: e.target.value })
                                              }
                                              className={`w-14 px-2 py-1 rounded-lg text-xs text-center ${isDarkMode ? "bg-iron-700 text-iron-100 border border-iron-600" : "bg-white text-slate-800 border border-slate-200"}`}
                                            />
                                            <span
                                              className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                                            >
                                              reps
                                            </span>
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                const ok = await updateSetLogData(editingSet.id, {
                                                  weight: parseFloat(editingSet.weight) || 0,
                                                  reps: parseInt(editingSet.reps, 10) || 0,
                                                });
                                                if (ok) toast.success("Set updated");
                                                setEditingSet(null);
                                              }}
                                              className={`p-1 rounded-lg ${isDarkMode ? "text-green-400 active:bg-iron-700" : "text-green-600 active:bg-slate-200"}`}
                                            >
                                              <Save className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingSet(null)}
                                              className={`p-1 rounded-lg ${isDarkMode ? "text-iron-500 active:bg-iron-700" : "text-slate-400 active:bg-slate-200"}`}
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                              {s.weight ? (
                                                <>
                                                  <span
                                                    className={`text-sm font-semibold tabular-nums ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                                                  >
                                                    {s.weight}{" "}
                                                    <span
                                                      className={`text-xs font-normal ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                                                    >
                                                      kg
                                                    </span>
                                                  </span>
                                                  <span
                                                    className={`text-xs ${isDarkMode ? "text-iron-600" : "text-slate-300"}`}
                                                  >
                                                    ×
                                                  </span>
                                                  <span
                                                    className={`text-sm font-semibold tabular-nums ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                                                  >
                                                    {s.reps}{" "}
                                                    <span
                                                      className={`text-xs font-normal ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                                                    >
                                                      reps
                                                    </span>
                                                  </span>
                                                </>
                                              ) : (
                                                <span
                                                  className={`text-sm font-semibold tabular-nums ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                                                >
                                                  {s.reps}{" "}
                                                  <span
                                                    className={`text-xs font-normal ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                                                  >
                                                    reps
                                                  </span>
                                                </span>
                                              )}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setEditingSet({
                                                  id: s.id,
                                                  weight: s.weight || "",
                                                  reps: s.reps || "",
                                                })
                                              }
                                              aria-label={`Edit set ${idx + 1}`}
                                              className={`p-1.5 rounded-lg flex-shrink-0 ${isDarkMode ? "text-iron-600 active:text-iron-300 active:bg-iron-700" : "text-slate-300 active:text-slate-600 active:bg-slate-200"}`}
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setDeleteConfirm({
                                                  type: "set",
                                                  id: s.id,
                                                  label: `${name} — Set ${idx + 1}`,
                                                })
                                              }
                                              aria-label={`Delete set ${idx + 1}`}
                                              className={`p-1.5 rounded-lg flex-shrink-0 ${isDarkMode ? "text-iron-600 active:text-red-400 active:bg-iron-700" : "text-slate-300 active:text-red-500 active:bg-slate-200"}`}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ));
                            })()
                          )}
                        </div>

                        <div
                          className={`flex gap-2 pt-1 ${isViewingToday && session.date === today ? "flex-wrap" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                completedSets.length > 0
                                  ? `/workout/${session.id}/summary`
                                  : `/workout/${session.id}`,
                              )
                            }
                            className={`flex-1 py-2 rounded-card text-xs font-semibold flex items-center justify-center gap-1.5 border ${
                              isDarkMode
                                ? "border-iron-700 text-iron-200 active:bg-iron-800"
                                : "border-slate-200 text-slate-700 active:bg-slate-50"
                            }`}
                          >
                            <Pencil className="w-3 h-3" />
                            Edit workout
                          </button>
                          {isViewingToday && session.date === today ? (
                            <button
                              type="button"
                              onClick={() => handleUndoTodayWorkout(session.id)}
                              className={`flex-1 py-2 rounded-card text-xs font-semibold flex items-center justify-center gap-1.5 ${actionSecondary(isDarkMode)}`}
                            >
                              <Undo2 className="w-3 h-3" aria-hidden />
                              Undo
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm({
                                type: "session",
                                id: session.id,
                                label: `${session.routine_name || "Workout"} on ${dateLabel}`,
                              })
                            }
                            className={`flex-1 py-2 rounded-card text-xs font-semibold flex items-center justify-center gap-1.5 ${
                              isDarkMode
                                ? "text-red-400/90 active:text-red-400 active:bg-red-500/10"
                                : "text-red-500 active:bg-red-50"
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
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

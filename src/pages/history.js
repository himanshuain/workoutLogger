import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ExerciseIcon from "@/components/ExerciseIcon";
import EmptyState from "@/components/EmptyState";
import { SkeletonList } from "@/components/SkeletonLoader";
import GroupedSetLines from "@/components/workout/GroupedSetLines";
import SessionOverflowMenu from "@/components/workout/SessionOverflowMenu";
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Flame,
  Target,
} from "lucide-react";

function getLocalDateStr(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function History() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const {
    user,
    getWorkoutSessions,
    getExerciseLogs,
    today,
    deleteWorkoutSession,
  } = useWorkout();
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [openMenuSessionId, setOpenMenuSessionId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const startDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return getLocalDateStr(d);
  }, []);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["historySessions", user?.id, startDate, today],
    queryFn: () => getWorkoutSessions(startDate, today),
    enabled: !!user,
  });

  const { data: legacyLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["historyLogs", user?.id, startDate, today],
    queryFn: () => getExerciseLogs(startDate, today),
    enabled: !!user,
  });

  const isLoading = sessionsLoading || logsLoading;

  const timelineByDate = useMemo(() => {
    const map = {};

    sessions.forEach((session) => {
      if (session.status !== "completed") return;
      const date = session.date;
      if (!map[date]) map[date] = { sessions: [], legacyLogs: [] };
      const completedSets = (session.set_logs || []).filter((s) => s.is_completed);
      map[date].sessions.push({ ...session, completedSets });
    });

    legacyLogs.forEach((log) => {
      const date = log.date;
      if (!map[date]) map[date] = { sessions: [], legacyLogs: [] };
      map[date].legacyLogs.push(log);
    });

    return Object.entries(map)
      .sort(([a], [b]) => new Date(b) - new Date(a))
      .map(([date, data]) => ({ date, ...data }));
  }, [sessions, legacyLogs]);

  const getDateStats = (dateData) => {
    let volume = 0;
    let totalSets = 0;
    let exercises = new Set();

    dateData.sessions.forEach(({ completedSets }) => {
      completedSets.forEach((s) => {
        volume += (s.weight || 0) * (s.reps || 0);
        totalSets++;
        exercises.add(s.exercise_name);
      });
    });
    dateData.legacyLogs.forEach((log) => {
      volume += (log.weight || 0) * (log.reps || 0) * (log.sets || 1);
      totalSets += log.sets || 1;
      exercises.add(log.exercise_name);
    });
    return { volume: Math.round(volume), totalSets, exerciseCount: exercises.size };
  };

  const toggleDate = (date) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  const formatDate = (date) => {
    const d = new Date(date + "T00:00:00");
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    const yesterday = new Date(todayObj);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === todayObj.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatFullDate = (date) =>
    new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    const ok = await deleteWorkoutSession(deleteConfirm.id);
    if (ok) toast.success("Workout deleted");
    setDeleteConfirm(null);
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
          <p className={`mb-4 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            Sign in to view your history
          </p>
          <button
            onClick={() => router.push("/auth")}
            className={`px-6 py-2.5 rounded-card font-bold ${isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"}`}
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-4 w-full max-w-full">
        <div
          className={`sticky top-0 z-30 -mx-4 px-4 pb-3 pt-1 backdrop-blur-sm ${isDarkMode ? "bg-iron-950/95" : "bg-slate-50/95"}`}
        >
          <h2 className={`text-xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
            History
          </h2>
          <p className={`text-sm mt-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            {timelineByDate.length} day{timelineByDate.length !== 1 ? "s" : ""} logged
          </p>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <SkeletonList isDarkMode={isDarkMode} count={6} />
          ) : timelineByDate.length === 0 ? (
            <EmptyState
              isDarkMode={isDarkMode}
              message="No workouts logged yet"
              hint="Complete a session on Today to build your history."
              actionLabel="Go to Today"
              onAction={() => router.push("/")}
            />
          ) : (
            <div className="space-y-3">
              {timelineByDate.map(({ date, sessions: daySessions, legacyLogs: dayLegacy }) => {
                const stats = getDateStats({ sessions: daySessions, legacyLogs: dayLegacy });
                const isExpanded = expandedDates.has(date);
                const routineNames = daySessions.filter(s => s.routine_name).map(s => s.routine_name);

                return (
                  <div
                    key={date}
                    className="card overflow-hidden transition-all"
                  >
                    {/* Collapsed header */}
                    <button
                      onClick={() => toggleDate(date)}
                      className="card-interactive w-full p-4 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                              {formatDate(date)}
                            </h3>
                            {routineNames.length > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isDarkMode ? "bg-lift-primary/15 text-lift-primary" : "bg-workout-primary/10 text-workout-primary"
                              }`}>
                                {routineNames.join(", ")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                              <Target className="w-3 h-3" />
                              {stats.exerciseCount} exercise{stats.exerciseCount !== 1 ? "s" : ""}
                            </span>
                            <span className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                              <Flame className="w-3 h-3" />
                              {stats.totalSets} sets
                            </span>
                            {stats.volume > 0 && (
                              <span className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                                <Dumbbell className="w-3 h-3" />
                                {stats.volume.toLocaleString()} kg
                              </span>
                            )}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className={`w-4 h-4 flex-shrink-0 ml-2 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
                        ) : (
                          <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-2 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
                        )}
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className={`px-4 pb-4 space-y-2.5 border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>
                        <p className={`text-[11px] pt-3 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                          {formatFullDate(date)}
                        </p>

                        {daySessions.map((session) => {
                          const byExercise = {};
                          session.completedSets.forEach((s) => {
                            const name = s.exercise_name || "Exercise";
                            if (!byExercise[name]) byExercise[name] = { sets: [], volume: 0 };
                            byExercise[name].sets.push(s);
                            byExercise[name].volume += (s.weight || 0) * (s.reps || 0);
                          });

                          const openEdit = () => {
                            router.push(
                              session.completedSets.length > 0
                                ? `/workout/${session.id}/summary`
                                : `/workout/${session.id}`,
                            );
                          };

                          const openDelete = () => {
                            setDeleteConfirm({
                              id: session.id,
                              label: `${session.routine_name || "Workout"} on ${formatDate(date)}`,
                            });
                          };

                          return (
                            <div key={session.id} className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                {session.routine_name || daySessions.length > 1 ? (
                                  <p
                                    className={`text-xs font-semibold ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
                                  >
                                    {session.routine_name || "Workout"}
                                  </p>
                                ) : (
                                  <span />
                                )}
                                <SessionOverflowMenu
                                  isOpen={openMenuSessionId === session.id}
                                  onOpenChange={(open) =>
                                    setOpenMenuSessionId(open ? session.id : null)
                                  }
                                  isDarkMode={isDarkMode}
                                  onEdit={openEdit}
                                  onDelete={openDelete}
                                />
                              </div>

                              {session.completedSets.length === 0 ? (
                                <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                                  No sets logged for this workout.
                                </p>
                              ) : (
                                <div
                                  className={cn(
                                    "overflow-hidden rounded-card border",
                                    isDarkMode
                                      ? "border-iron-800/50 bg-iron-900/20"
                                      : "border-slate-200/70 bg-slate-50/60",
                                  )}
                                >
                                  {Object.entries(byExercise).map(
                                    ([exerciseName, { sets, volume }], idx, arr) => (
                                      <div
                                        key={exerciseName}
                                        className={cn(
                                          "px-3 py-3",
                                          idx < arr.length - 1 &&
                                            (isDarkMode
                                              ? "border-b border-iron-800/40"
                                              : "border-b border-slate-200/70"),
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
                                              name={exerciseName}
                                              className="w-5 h-5"
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
                                                {exerciseName}
                                              </p>
                                              <span
                                                className={cn(
                                                  "shrink-0 text-[11px] tabular-nums",
                                                  isDarkMode ? "text-iron-500" : "text-slate-400",
                                                )}
                                              >
                                                {sets.length} set{sets.length !== 1 ? "s" : ""}
                                                {volume > 0
                                                  ? ` · ${Math.round(volume).toLocaleString()} kg`
                                                  : ""}
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
                                    ),
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Legacy logs (read-only, no edit/delete) */}
                        {dayLegacy.map((log) => {
                          const volume = (log.weight || 0) * (log.reps || 0) * (log.sets || 1);
                          const fakeSets = Array.from({ length: log.sets || 1 }, (_, i) => ({
                            id: `legacy-${log.id}-${i}`,
                            weight: log.weight,
                            reps: log.reps,
                          }));
                          return (
                            <div
                              key={log.id}
                              className={cn(
                                "rounded-card border px-3 py-3",
                                isDarkMode
                                  ? "border-iron-800/50 bg-iron-900/20"
                                  : "border-slate-200/70 bg-slate-50/60",
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
                                    name={log.exercise_name}
                                    className="w-5 h-5"
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
                                      {log.exercise_name}
                                    </p>
                                    <span
                                      className={cn(
                                        "shrink-0 text-[11px] tabular-nums",
                                        isDarkMode ? "text-iron-500" : "text-slate-400",
                                      )}
                                    >
                                      {fakeSets.length} set{fakeSets.length !== 1 ? "s" : ""}
                                      {volume > 0 ? ` · ${Math.round(volume).toLocaleString()} kg` : ""}
                                    </span>
                                  </div>
                                  <GroupedSetLines
                                    sets={fakeSets}
                                    isDarkMode={isDarkMode}
                                    className="mt-2"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-iron-100" : ""}>
              Delete workout?
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : ""}>
              {deleteConfirm?.label
                ? `"${deleteConfirm.label}" will be permanently deleted.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDarkMode ? "bg-iron-800 text-iron-300 border-iron-700" : ""}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

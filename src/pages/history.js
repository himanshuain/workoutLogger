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
import ExerciseIcon from "@/components/ExerciseIcon";
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Clock,
  Flame,
  Target,
  Pencil,
  Trash2,
  Save,
  X,
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
    deleteSetLog,
    deleteWorkoutSession,
    updateSetLogData,
  } = useWorkout();
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [editingSet, setEditingSet] = useState(null);
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
      if (completedSets.length > 0) {
        map[date].sessions.push({ ...session, completedSets });
      }
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
    if (deleteConfirm.type === "set") {
      const ok = await deleteSetLog(deleteConfirm.id);
      if (ok) toast.success("Set deleted");
    } else if (deleteConfirm.type === "session") {
      const ok = await deleteWorkoutSession(deleteConfirm.id);
      if (ok) toast.success("Workout deleted");
    }
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
            className={`px-6 py-2.5 rounded-xl font-bold ${isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"}`}
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
            <div className="flex items-center justify-center py-12">
              <div className={`animate-spin w-8 h-8 border-2 rounded-full ${isDarkMode ? "border-lift-primary border-t-transparent" : "border-workout-primary border-t-transparent"}`} />
            </div>
          ) : timelineByDate.length === 0 ? (
            <div className="text-center py-12">
              <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-iron-900" : "bg-slate-100"}`}>
                <Clock className={`w-10 h-10 ${isDarkMode ? "text-iron-700" : "text-slate-400"}`} />
              </div>
              <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>No exercises logged yet</p>
              <p className={`text-sm mt-1 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>Start logging to see your history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timelineByDate.map(({ date, sessions: daySessions, legacyLogs: dayLegacy }) => {
                const stats = getDateStats({ sessions: daySessions, legacyLogs: dayLegacy });
                const isExpanded = expandedDates.has(date);
                const routineNames = daySessions.filter(s => s.routine_name).map(s => s.routine_name);

                return (
                  <div
                    key={date}
                    className={`rounded-2xl overflow-hidden transition-all ${isDarkMode ? "bg-iron-900" : "bg-white border border-slate-200 shadow-sm"}`}
                  >
                    {/* Collapsed header */}
                    <button
                      onClick={() => toggleDate(date)}
                      className="w-full p-4 text-left active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                              {formatDate(date)}
                            </h3>
                            {routineNames.length > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded-full truncate max-w-[140px] ${
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

                          return (
                            <div key={session.id} className="space-y-2">
                              {Object.entries(byExercise).map(([exerciseName, { sets, volume }]) => (
                                <div key={exerciseName} className={`rounded-2xl p-3 ${isDarkMode ? "bg-iron-800/40" : "bg-slate-50"}`}>
                                  {/* Exercise header */}
                                  <div className="flex items-center gap-2.5 mb-2">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-iron-700/70" : "bg-slate-100"}`}>
                                      <ExerciseIcon name={exerciseName} className="w-5 h-5" color={isDarkMode ? "#a1a1aa" : "#64748b"} />
                                    </div>
                                    <p className={`text-sm font-semibold truncate flex-1 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                                      {exerciseName}
                                    </p>
                                    <span className={`text-[11px] flex-shrink-0 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>
                                      {sets.length} set{sets.length !== 1 ? "s" : ""}
                                      {volume > 0 ? ` · ${Math.round(volume).toLocaleString()} kg` : ""}
                                    </span>
                                  </div>
                                  {/* Individual sets with edit/delete */}
                                  <div className="ml-[2.625rem] space-y-0.5">
                                    {sets.map((s, idx) => (
                                      <div
                                        key={s.id}
                                        className={`flex items-center gap-2 py-1.5 ${idx > 0 ? `border-t ${isDarkMode ? "border-iron-700/30" : "border-slate-100"}` : ""}`}
                                      >
                                        <span className={`w-5 text-center text-[10px] font-bold rounded-md py-0.5 flex-shrink-0 ${isDarkMode ? "bg-iron-700 text-iron-500" : "bg-slate-100 text-slate-400"}`}>
                                          {idx + 1}
                                        </span>

                                        {editingSet?.id === s.id ? (
                                          <div className="flex items-center gap-1.5 flex-1">
                                            <input
                                              type="number"
                                              step="0.5"
                                              value={editingSet.weight}
                                              onChange={(e) => setEditingSet({ ...editingSet, weight: e.target.value })}
                                              className={`w-16 px-2 py-1 rounded-lg text-xs text-center ${isDarkMode ? "bg-iron-700 text-iron-100 border border-iron-600" : "bg-white text-slate-800 border border-slate-200"}`}
                                            />
                                            <span className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>kg ×</span>
                                            <input
                                              type="number"
                                              value={editingSet.reps}
                                              onChange={(e) => setEditingSet({ ...editingSet, reps: e.target.value })}
                                              className={`w-14 px-2 py-1 rounded-lg text-xs text-center ${isDarkMode ? "bg-iron-700 text-iron-100 border border-iron-600" : "bg-white text-slate-800 border border-slate-200"}`}
                                            />
                                            <span className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>reps</span>
                                            <button
                                              onClick={async () => {
                                                const ok = await updateSetLogData(editingSet.id, {
                                                  weight: parseFloat(editingSet.weight) || 0,
                                                  reps: parseInt(editingSet.reps) || 0,
                                                });
                                                if (ok) toast.success("Set updated");
                                                setEditingSet(null);
                                              }}
                                              className={`p-1 rounded-lg ${isDarkMode ? "text-green-400 active:bg-iron-700" : "text-green-600 active:bg-slate-200"}`}
                                            >
                                              <Save className="w-3.5 h-3.5" />
                                            </button>
                                            <button
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
                                                  <span className={`text-sm font-semibold tabular-nums ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                                                    {s.weight} <span className={`text-xs font-normal ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>kg</span>
                                                  </span>
                                                  <span className={`text-xs ${isDarkMode ? "text-iron-600" : "text-slate-300"}`}>×</span>
                                                  <span className={`text-sm font-semibold tabular-nums ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                                                    {s.reps} <span className={`text-xs font-normal ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>reps</span>
                                                  </span>
                                                </>
                                              ) : (
                                                <span className={`text-sm font-semibold tabular-nums ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                                                  {s.reps} <span className={`text-xs font-normal ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>reps</span>
                                                </span>
                                              )}
                                            </div>
                                            <button
                                              onClick={() => setEditingSet({ id: s.id, weight: s.weight || "", reps: s.reps || "" })}
                                              className={`p-1.5 rounded-lg flex-shrink-0 ${isDarkMode ? "text-iron-600 active:text-iron-300 active:bg-iron-700" : "text-slate-300 active:text-slate-600 active:bg-slate-200"}`}
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => setDeleteConfirm({ type: "set", id: s.id, label: `${exerciseName} — Set ${idx + 1}` })}
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
                              ))}

                              {/* Delete entire session */}
                              <button
                                onClick={() => setDeleteConfirm({
                                  type: "session",
                                  id: session.id,
                                  label: `${session.routine_name || "Workout"} on ${formatDate(date)}`,
                                })}
                                className={`w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 ${
                                  isDarkMode
                                    ? "text-red-400/70 active:text-red-400 active:bg-red-500/10"
                                    : "text-red-400 active:text-red-500 active:bg-red-50"
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete Workout
                              </button>
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
                            <div key={log.id} className={`rounded-2xl p-3 ${isDarkMode ? "bg-iron-800/40" : "bg-slate-50"}`}>
                              <div className="flex items-center gap-2.5 mb-2">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-iron-700/70" : "bg-slate-100"}`}>
                                  <ExerciseIcon name={log.exercise_name} className="w-5 h-5" color={isDarkMode ? "#a1a1aa" : "#64748b"} />
                                </div>
                                <p className={`text-sm font-semibold truncate flex-1 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                                  {log.exercise_name}
                                </p>
                                <span className={`text-[11px] flex-shrink-0 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>
                                  {fakeSets.length} set{fakeSets.length !== 1 ? "s" : ""}
                                  {volume > 0 ? ` · ${Math.round(volume).toLocaleString()} kg` : ""}
                                </span>
                              </div>
                              <div className="ml-[2.625rem]">
                                {fakeSets.map((s, idx) => (
                                  <div key={s.id} className={`flex items-center gap-3 py-1.5 ${idx > 0 ? `border-t ${isDarkMode ? "border-iron-700/30" : "border-slate-100"}` : ""}`}>
                                    <span className={`w-5 text-center text-[10px] font-bold rounded-md py-0.5 ${isDarkMode ? "bg-iron-700 text-iron-500" : "bg-slate-100 text-slate-400"}`}>
                                      {idx + 1}
                                    </span>
                                    <div className="flex items-center gap-3 flex-1">
                                      {s.weight ? (
                                        <>
                                          <span className={`text-sm font-semibold tabular-nums ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                                            {s.weight} <span className={`text-xs font-normal ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>kg</span>
                                          </span>
                                          <span className={`text-xs ${isDarkMode ? "text-iron-600" : "text-slate-300"}`}>×</span>
                                          <span className={`text-sm font-semibold tabular-nums ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                                            {s.reps} <span className={`text-xs font-normal ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>reps</span>
                                          </span>
                                        </>
                                      ) : (
                                        <span className={`text-sm font-semibold tabular-nums ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                                          {s.reps} <span className={`text-xs font-normal ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>reps</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
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
              Delete {deleteConfirm?.type === "session" ? "Workout" : "Set"}?
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : ""}>
              {deleteConfirm?.label ? `"${deleteConfirm.label}" will be permanently deleted.` : "This action cannot be undone."}
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

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import HabitPills from "@/components/HabitPills";
import GoalsWidget from "@/components/GoalsWidget";
import DayPicker from "@/components/DayPicker";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
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
import {
  Plus,
  Dumbbell,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  Check,
  Play,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit3,
  History,
  Trash2,
  Pencil,
  Save,
  X,
  Target,
  Flame,
  CalendarClock,
} from "lucide-react";
import ExerciseIcon from "@/components/ExerciseIcon";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { FadeIn } from "@/components/ui/fade-in";
import TodayFoodLogSection from "@/components/TodayFoodLogSection";
import PastDayLogModal from "@/components/PastDayLogModal";

const PILL_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#f59e0b",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
];

const PILL_ICONS = [
  "💧",
  "💊",
  "🥩",
  "😴",
  "🧘",
  "🏃",
  "💪",
  "🍎",
  "☀️",
  "🧠",
  "❤️",
  "⚡",
];

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDarkMode } = useTheme();
  const {
    user,
    routines,
    activeSession,
    trackables,
    todayEntries,
    today,
    toggleTrackingEntry,
    createTrackable,
    startWorkoutSession,
    getTodayRoutine,
    getWorkoutSessions,
    deleteSetLog,
    deleteWorkoutSession,
    updateSetLogData,
    getTrackingEntries,
    foodItems,
    todayFoodEntries,
    toggleFoodEntry,
    updateFoodEntryQuantity,
  } = useWorkout();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pastLogOpen, setPastLogOpen] = useState(false);
  const [showAddHabitDrawer, setShowAddHabitDrawer] = useState(false);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [showRoutineSelector, setShowRoutineSelector] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: "",
    type: "habit",
    icon: "💧",
    color: "#22c55e",
    has_value: false,
    value_unit: "",
    active_days: null,
  });

  // Get today's routine
  const todayRoutine = useMemo(() => getTodayRoutine(), [getTodayRoutine]);

  // Recent workout sessions (last 30 days)
  const recentStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const { data: allRecentSessions = [] } = useQuery({
    queryKey: ["recentSessions", user?.id, recentStart, today],
    queryFn: () => getWorkoutSessions(recentStart, today),
    enabled: !!user,
  });

  const todaySession = useMemo(() =>
    allRecentSessions.find((s) => s.date === today && s.status === "completed") || null,
    [allRecentSessions, today],
  );

  const recentSessions = useMemo(() =>
    allRecentSessions
      .filter((s) => s.status === "completed")
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
    [allRecentSessions],
  );

  const goalsWorkoutData = useMemo(() => {
    const byDate = {};
    allRecentSessions.filter((s) => s.status === "completed").forEach((s) => {
      byDate[s.date] = (byDate[s.date] || 0) + 1;
    });
    return Object.entries(byDate).map(([date, count]) => ({ date, count }));
  }, [allRecentSessions]);

  const { data: goalsHabitData = [] } = useQuery({
    queryKey: ["goalsHabitData", user?.id, recentStart, today],
    queryFn: async () => {
      const entries = await getTrackingEntries(recentStart, today);
      const byDate = {};
      entries.forEach((e) => {
        if (e.is_completed) {
          byDate[e.date] = (byDate[e.date] || 0) + 1;
        }
      });
      return Object.entries(byDate).map(([date, count]) => ({ date, count }));
    },
    enabled: !!user,
  });

  const habitTrackables = useMemo(
    () => trackables.filter((t) => t.name !== "Body Weight"),
    [trackables],
  );

  const hasGoals = useMemo(() => {
    if (typeof window === "undefined" || !user?.id) return false;
    try {
      const stored = localStorage.getItem(`logbook_goals_${user.id}`);
      const goals = stored ? JSON.parse(stored) : [];
      return goals.length > 0;
    } catch { return false; }
  }, [user?.id]);

  const [expandedSession, setExpandedSession] = useState(null);
  const [editingSet, setEditingSet] = useState(null); // { id, weight, reps }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: "set"|"session", id, label }

  // Sticky note
  const NOTE_KEY = "workout-logger-note";
  const [note, setNote] = useState("");
  const [noteLoaded, setNoteLoaded] = useState(false);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    try {
      setNote(localStorage.getItem(NOTE_KEY) || "");
    } catch {}
    setNoteLoaded(true);
  }, []);

  const handleNoteChange = useCallback((e) => {
    const val = e.target.value;
    setNote(val);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try { localStorage.setItem(NOTE_KEY, val); } catch {}
    }, 300);
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const getDayName = () => {
    return new Date().toLocaleDateString("en-US", { weekday: "long" });
  };

  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries(["recentSessions"]);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Start workout
  const handleStartWorkout = async (routine) => {
    setIsStartingWorkout(true);
    setShowRoutineSelector(false);

    try {
      const session = await startWorkoutSession(routine);
      if (session) {
        router.push(`/workout/${session.id}`);
      }
    } catch (err) {
      console.error("Error starting workout:", err);
    } finally {
      setIsStartingWorkout(false);
    }
  };

  // Continue existing session
  const handleContinueWorkout = () => {
    if (activeSession) {
      router.push(`/workout/${activeSession.id}`);
    }
  };

  // Edit completed session
  const handleEditSession = () => {
    if (todaySession) {
      router.push(`/workout/${todaySession.id}`);
    }
  };

  const handleToggleHabit = async (trackableId, isCompleted, value) => {
    await toggleTrackingEntry(trackableId, isCompleted, value);
  };

  const handleSaveHabit = async () => {
    if (!newHabit.name.trim()) return;

    await createTrackable(newHabit);
    setShowAddHabitDrawer(false);
    setNewHabit({
      name: "",
      type: "habit",
      icon: "💧",
      color: "#22c55e",
      has_value: false,
      value_unit: "",
      active_days: null,
    });

    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const activeSetProgress = useMemo(() => {
    const logs = activeSession?.set_logs || [];
    const total = logs.length;
    const done = logs.filter((s) => s.is_completed).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, pct };
  }, [activeSession]);

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <div
            className="w-20 h-20 mb-6 rounded-2xl flex items-center justify-center"
            style={{
              background: isDarkMode
                ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                : "linear-gradient(135deg, #4F8CFF 0%, #6366f1 100%)",
            }}
          >
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <h1
            className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
          >
            Welcome to Logbook
          </h1>
          <p
            className={`text-center mb-8 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
          >
            Sign in to start tracking
          </p>
          <button
            onClick={() => router.push("/auth")}
            className={`px-8 py-3 rounded-xl font-bold ${
              isDarkMode
                ? "bg-lift-primary text-iron-950"
                : "bg-workout-primary text-white"
            }`}
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  const hasActiveSession = activeSession && activeSession.status === "active";
  const hasCompletedSession =
    todaySession && todaySession.status === "completed";

  return (
    <Layout>
      <FadeIn duration={0.5}>
      <div className="px-4 py-4">
        {/* Date Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p
              className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
            >
              Today
            </p>
            <h2
              className={`text-xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
            >
              {formatDate(new Date())}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPastLogOpen(true)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isDarkMode
                  ? "bg-iron-800 active:bg-iron-700 text-iron-400"
                  : "bg-slate-100 active:bg-slate-200 text-slate-500"
              }`}
              aria-label="Log for another day"
            >
              <CalendarClock className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isDarkMode
                  ? "bg-iron-800 active:bg-iron-700"
                  : "bg-slate-100 active:bg-slate-200"
              } ${isRefreshing ? "animate-spin" : ""}`}
            >
              <RefreshCw
                className={`w-5 h-5 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
              />
            </button>
          </div>
        </div>

        {/* Today's Workout — structured card, minimal decoration */}
        <section className="mb-6">
          {hasActiveSession ? (
            <div
              className={`rounded-2xl border overflow-hidden ${
                isDarkMode
                  ? "border-iron-800 bg-iron-900/50"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <div
                className={`px-4 py-2.5 flex items-center gap-2 border-b ${
                  isDarkMode ? "border-iron-800 bg-lift-primary/10" : "border-slate-100 bg-amber-50/80"
                }`}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lift-primary opacity-50" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-lift-primary" />
                </span>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isDarkMode ? "text-lift-primary" : "text-amber-800"
                  }`}
                >
                  In progress
                </span>
              </div>
              <div className="p-4">
                <h3
                  className={`text-lg font-bold leading-tight mb-1 ${
                    isDarkMode ? "text-iron-100" : "text-slate-900"
                  }`}
                >
                  {activeSession.routine_name}
                </h3>
                <p className={`text-sm mb-3 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                  {activeSetProgress.done} / {activeSetProgress.total} sets
                </p>
                <div
                  className={`h-1.5 rounded-full overflow-hidden mb-4 ${
                    isDarkMode ? "bg-iron-800" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isDarkMode ? "bg-lift-primary" : "bg-workout-primary"
                    }`}
                    style={{ width: `${activeSetProgress.pct}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleContinueWorkout}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                    isDarkMode
                      ? "bg-lift-primary text-iron-950 active:opacity-90"
                      : "bg-workout-primary text-white active:opacity-90"
                  }`}
                >
                  <Play className="w-4 h-4" fill="currentColor" />
                  Continue workout
                </button>
              </div>
            </div>
          ) : hasCompletedSession ? (
            <div
              className={`rounded-2xl border overflow-hidden ${
                isDarkMode ? "border-iron-800 bg-iron-900/50" : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <div
                className={`px-4 py-2.5 border-b ${
                  isDarkMode ? "border-iron-800" : "border-slate-100"
                }`}
              >
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isDarkMode ? "text-lift-primary" : "text-green-600"
                  }`}
                >
                  Completed today
                </span>
              </div>
              <div className="p-4">
                <h3
                  className={`text-lg font-bold mb-1 ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}
                >
                  {todaySession.routine_name}
                </h3>
                <p className={`text-sm mb-4 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                  {(todaySession.set_logs || []).filter((s) => s.is_completed).length} sets logged
                </p>
                <button
                  type="button"
                  onClick={handleEditSession}
                  className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border ${
                    isDarkMode
                      ? "border-iron-700 text-iron-200 active:bg-iron-800"
                      : "border-slate-200 text-slate-700 active:bg-slate-50"
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  Review session
                </button>
              </div>
            </div>
          ) : todayRoutine ? (
            <div
              className={`rounded-2xl border overflow-hidden ${
                isDarkMode ? "border-iron-800 bg-iron-900/50" : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <div
                className={`px-4 py-2.5 border-b ${
                  isDarkMode ? "border-iron-800 bg-iron-800/30" : "border-slate-100 bg-slate-50"
                }`}
              >
                <p className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
                  Today · {getDayName()}
                </p>
                <h3
                  className={`text-base font-bold mt-0.5 ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}
                >
                  {todayRoutine.name}
                </h3>
              </div>
              <div className="p-4">
                <p className={`text-xs font-medium mb-2 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                  Exercises ({todayRoutine.routine_exercises?.length || 0})
                </p>
                <ol
                  className={`rounded-xl border max-h-[220px] overflow-y-auto divide-y mb-4 [scrollbar-width:thin] ${
                    isDarkMode ? "border-iron-800 divide-iron-800" : "border-slate-200 divide-slate-100"
                  }`}
                >
                  {todayRoutine.routine_exercises?.map((ex, i) => (
                    <li
                      key={ex.id}
                      className={`flex items-start gap-3 px-3 py-2.5 text-sm ${
                        isDarkMode ? "bg-iron-950/40" : "bg-slate-50/50"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                          isDarkMode ? "bg-iron-800 text-iron-400" : "bg-white border border-slate-200 text-slate-600"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`font-medium leading-snug ${isDarkMode ? "text-iron-200" : "text-slate-800"}`}
                        >
                          {ex.exercise_name}
                        </p>
                        <p className={`text-xs mt-0.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                          {ex.target_sets} sets · {ex.category}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => handleStartWorkout(todayRoutine)}
                  disabled={isStartingWorkout}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 ${
                    isDarkMode
                      ? "bg-lift-primary text-iron-950 active:opacity-90"
                      : "bg-workout-primary text-white active:opacity-90"
                  }`}
                >
                  {isStartingWorkout ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Starting…
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" fill="currentColor" />
                      Start workout
                    </>
                  )}
                </button>
                <p className={`text-center text-[11px] mt-2.5 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                  Swipe between exercises during the workout
                </p>
              </div>
            </div>
          ) : routines.length > 0 ? (
            // No routine for today, but has other routines
            <div
              className={`rounded-3xl p-6 ${
                isDarkMode
                  ? "bg-iron-900"
                  : "bg-white border border-slate-200 shadow-sm"
              }`}
            >
              <div
                className={`flex items-center gap-2 text-sm mb-2 ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                <Calendar className="w-4 h-4" />
                No workout assigned for {getDayName()}
              </div>
              <h3
                className={`text-xl font-bold mb-4 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
              >
                Start a workout?
              </h3>
              <button
                onClick={() => setShowRoutineSelector(true)}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                  isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-workout-primary text-white"
                }`}
              >
                <Dumbbell className="w-5 h-5" />
                Choose Routine
              </button>
            </div>
          ) : (
            // No routines at all
            <button
              onClick={() => router.push("/routines")}
              className={`
                w-full p-6 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3
                ${
                  isDarkMode
                    ? "border-iron-800 hover:border-iron-700"
                    : "border-slate-300 hover:border-slate-400"
                }
              `}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: isDarkMode
                    ? "linear-gradient(135deg, #22c55e20 0%, #16a34a20 100%)"
                    : "linear-gradient(135deg, #4F8CFF20 0%, #6366f120 100%)",
                }}
              >
                <Plus
                  className={`w-8 h-8 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
                />
              </div>
              <div className="text-center">
                <p
                  className={`font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                >
                  Create Your First Routine
                </p>
                <p
                  className={`text-sm mt-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                >
                  Plan your workouts for each day
                </p>
              </div>
              <span
                className={`text-sm flex items-center gap-1 ${
                  isDarkMode ? "text-lift-primary" : "text-workout-primary"
                }`}
              >
                Get started <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          )}
        </section>

        {/* Note Billboard */}
        {noteLoaded && (
          <section className="mb-6">
            <div
              className={`rounded-2xl p-3 ${
                isDarkMode
                  ? "bg-iron-900/50"
                  : "bg-amber-50 border border-amber-200/50"
              }`}
            >
              <textarea
                value={note}
                onChange={handleNoteChange}
                placeholder="Jot something down..."
                rows={2}
                className={`w-full bg-transparent resize-none text-sm leading-relaxed outline-none placeholder-opacity-40 ${
                  isDarkMode
                    ? "text-iron-200 placeholder-iron-600"
                    : "text-slate-700 placeholder-slate-400"
                }`}
              />
            </div>
          </section>
        )}

        {/* Goals */}
        {hasGoals && (
          <section className="mb-6">
            <GoalsWidget
              isDarkMode={isDarkMode}
              workoutHeatmapData={goalsWorkoutData}
              habitHeatmapData={goalsHabitData}
              trackables={habitTrackables}
              todayEntries={todayEntries}
            />
          </section>
        )}

        {/* Today's Habits */}
        <section className="mt-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3
              className={`text-xs font-medium uppercase tracking-wider flex items-center gap-2 ${
                isDarkMode ? "text-iron-400" : "text-slate-500"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              Habits
            </h3>
            <button
              type="button"
              onClick={() => router.push("/lifelog?tab=habits")}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                isDarkMode
                  ? "text-iron-400 bg-iron-900/80 hover:bg-iron-800 active:text-iron-200"
                  : "text-slate-600 bg-slate-100 hover:bg-slate-200 active:text-slate-800"
              }`}
              aria-label="Manage habits"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Manage
            </button>
          </div>
          <HabitPills
            trackables={trackables.filter(t => t.name !== "Body Weight" && (!t.active_days || t.active_days.includes(new Date().getDay())))}
            entries={todayEntries}
            onToggle={handleToggleHabit}
            onAddNew={() => setShowAddHabitDrawer(true)}
          />
        </section>

        <TodayFoodLogSection
          isDarkMode={isDarkMode}
          foodItems={foodItems}
          todayFoodEntries={todayFoodEntries}
          toggleFoodEntry={toggleFoodEntry}
          updateFoodEntryQuantity={updateFoodEntryQuantity}
          queryClient={queryClient}
        />

        <PastDayLogModal open={pastLogOpen} onOpenChange={setPastLogOpen} isDarkMode={isDarkMode} />

        {/* Recent Workouts */}
        {recentSessions.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3
              className={`text-xs font-medium uppercase tracking-wider flex items-center gap-2 ${
                isDarkMode ? "text-iron-400" : "text-slate-500"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Workout History
            </h3>
            <button
              onClick={() => router.push("/history")}
              className={`text-xs flex items-center gap-0.5 ${
                isDarkMode ? "text-iron-500 active:text-iron-300" : "text-slate-400 active:text-slate-600"
              }`}
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {(
            <div className="space-y-2">
              {recentSessions.map((session) => {
                const completedSets = (session.set_logs || []).filter((s) => s.is_completed);
                const totalVolume = completedSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
                const exerciseNames = [...new Set(completedSets.map((s) => s.exercise_name))];
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
                    : dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

                return (
                  <ContextMenu key={session.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        className={`rounded-2xl overflow-hidden ${
                          isDarkMode ? "bg-iron-900" : "bg-white border border-slate-200 shadow-sm"
                        }`}
                      >
                    {/* Session header */}
                    <button
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      className="w-full p-3.5 text-left active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                              {dateLabel}
                            </span>
                            {session.routine_name && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full truncate max-w-[120px] ${
                                isDarkMode ? "bg-lift-primary/15 text-lift-primary" : "bg-workout-primary/10 text-workout-primary"
                              }`}>
                                {session.routine_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                              <Target className="w-3 h-3" />
                              {exerciseNames.length} exercise{exerciseNames.length !== 1 ? "s" : ""}
                            </span>
                            <span className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                              <Flame className="w-3 h-3" />
                              {completedSets.length} sets
                            </span>
                            {totalVolume > 0 && (
                              <span className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                                <Dumbbell className="w-3 h-3" />
                                {Math.round(totalVolume).toLocaleString()} kg
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

                    {/* Expanded exercise details */}
                    {isExpanded && (
                      <div className={`px-3.5 pb-3 space-y-2 border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>
                        <div className="pt-2.5">
                          {(() => {
                            const byExercise = {};
                            completedSets.forEach((s) => {
                              const name = s.exercise_name || "Exercise";
                              if (!byExercise[name]) byExercise[name] = { sets: [], volume: 0 };
                              byExercise[name].sets.push(s);
                              byExercise[name].volume += (s.weight || 0) * (s.reps || 0);
                            });
                            return Object.entries(byExercise).map(([name, { sets, volume }]) => (
                              <div key={name} className={`rounded-2xl p-3 mb-2 last:mb-0 ${isDarkMode ? "bg-iron-800/40" : "bg-slate-50"}`}>
                                {/* Exercise header */}
                                <div className="flex items-center gap-2.5 mb-2">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-iron-700/70" : "bg-slate-100"}`}>
                                    <ExerciseIcon name={name} className="w-5 h-5" color={isDarkMode ? "#a1a1aa" : "#64748b"} />
                                  </div>
                                  <p className={`text-sm font-semibold truncate flex-1 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                                    {name}
                                  </p>
                                  <span className={`text-[11px] flex-shrink-0 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>
                                    {sets.length} set{sets.length !== 1 ? "s" : ""}
                                    {volume > 0 ? ` · ${Math.round(volume).toLocaleString()} kg` : ""}
                                  </span>
                                </div>
                                {/* Individual sets */}
                                <div className="ml-[2.625rem] space-y-0.5">
                                  {sets.map((s, idx) => (
                                    <ContextMenu key={s.id}>
                                      <ContextMenuTrigger asChild>
                                        <div
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
                                          )}
                                        </div>
                                      </ContextMenuTrigger>
                                      <ContextMenuContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
                                        <ContextMenuItem
                                          onClick={() => setEditingSet({ id: s.id, weight: s.weight || "", reps: s.reps || "" })}
                                          className={isDarkMode ? "text-iron-200" : "text-slate-700"}
                                        >
                                          <Pencil className="w-4 h-4" />
                                          Edit Set
                                        </ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem
                                          destructive
                                          onClick={() => setDeleteConfirm({ type: "set", id: s.id, label: `${name} — Set ${idx + 1}` })}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          Delete Set
                                        </ContextMenuItem>
                                      </ContextMenuContent>
                                    </ContextMenu>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>

                      </div>
                    )}
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
                      <ContextMenuItem
                        destructive
                        onClick={() => setDeleteConfirm({
                          type: "session",
                          id: session.id,
                          label: `${session.routine_name || "Workout"} on ${dateLabel}`,
                        })}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Workout
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>
          )}
        </section>
        )}
      </div>
      </FadeIn>

      {/* Routine Selector Modal */}
      <Modal open={showRoutineSelector} onOpenChange={setShowRoutineSelector}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>Choose a Routine</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-2">
            {routines.map((routine) => (
              <button
                key={routine.id}
                onClick={() => handleStartWorkout(routine)}
                className={`w-full p-4 rounded-2xl text-left transition-all ${
                  isDarkMode ? "bg-iron-800 hover:bg-iron-700" : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${routine.color}20` }}
                  >
                    <Dumbbell className="w-6 h-6" style={{ color: routine.color }} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                      {routine.name}
                    </p>
                    <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                      {routine.routine_exercises?.length || 0} exercises
                    </p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
                </div>
              </button>
            ))}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Add Habit Modal */}
      <Modal open={showAddHabitDrawer} onOpenChange={setShowAddHabitDrawer}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>Add New Habit</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {/* Name */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Name
              </label>
              <input
                type="text"
                value={newHabit.name}
                onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                placeholder="e.g., Water, Sleep, Creatine"
                className={`input-field ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400"
                }`}
              />
            </div>

            {/* Type */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewHabit({ ...newHabit, type: "habit", has_value: false })}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
                    newHabit.type === "habit"
                      ? isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
                      : isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {newHabit.type === "habit" && <Check className="w-4 h-4" />}
                  Habit (Yes/No)
                </button>
                <button
                  onClick={() => setNewHabit({ ...newHabit, type: "health", has_value: true })}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
                    newHabit.type === "health"
                      ? isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
                      : isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {newHabit.type === "health" && <Check className="w-4 h-4" />}
                  Health (Value)
                </button>
              </div>
            </div>

            {/* Value Unit (for health type) */}
            {newHabit.type === "health" && (
              <div>
                <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                  Unit
                </label>
                <input
                  type="text"
                  value={newHabit.value_unit}
                  onChange={(e) => setNewHabit({ ...newHabit, value_unit: e.target.value })}
                  placeholder="e.g., hours, liters, 1-10"
                  className={`input-field ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                      : "bg-slate-100 text-slate-800 placeholder-slate-400"
                  }`}
                />
              </div>
            )}

            {/* Icon */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Icon
              </label>
              <EmojiPicker
                value={newHabit.icon}
                onChange={(icon) => setNewHabit({ ...newHabit, icon })}
                presets={PILL_ICONS}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Color */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Color
              </label>
              <ColorPicker
                value={newHabit.color}
                onChange={(color) => setNewHabit({ ...newHabit, color })}
                presets={PILL_COLORS}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Active Days */}
            <DayPicker
              value={newHabit.active_days}
              onChange={(days) => setNewHabit({ ...newHabit, active_days: days })}
              isDarkMode={isDarkMode}
            />
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setShowAddHabitDrawer(false)}
              className={`flex-1 py-3 rounded-xl font-medium ${
                isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveHabit}
              disabled={!newHabit.name.trim()}
              className={`flex-1 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              <Check className="w-4 h-4" />
              Add Habit
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Delete {deleteConfirm?.type === "session" ? "Workout" : "Set"}
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : "text-slate-500"}>
              {deleteConfirm?.type === "session"
                ? `This will permanently delete "${deleteConfirm?.label}" and all its sets.`
                : `Delete ${deleteConfirm?.label}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDarkMode ? "bg-iron-800 text-iron-300 hover:bg-iron-700 border-0" : ""}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteConfirm) return;
                if (deleteConfirm.type === "session") {
                  const ok = await deleteWorkoutSession(deleteConfirm.id);
                  if (ok) toast.success("Workout deleted");
                } else {
                  const ok = await deleteSetLog(deleteConfirm.id);
                  if (ok) toast.success("Set deleted");
                }
                setDeleteConfirm(null);
              }}
              className="bg-red-600 text-white hover:bg-red-700 border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

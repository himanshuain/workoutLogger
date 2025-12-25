import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import HabitPills from "@/components/HabitPills";
import QuickStats from "@/components/QuickStats";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Plus,
  Dumbbell,
  Sparkles,
  RefreshCw,
  Check,
  Play,
  Calendar,
  ChevronRight,
  Edit3,
  Clock,
} from "lucide-react";

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
    isLoading,
    today,
    toggleTrackingEntry,
    createTrackable,
    startWorkoutSession,
    getTodaySession,
    getTodayRoutine,
  } = useWorkout();

  const [isRefreshing, setIsRefreshing] = useState(false);
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
  });

  // Get today's routine
  const todayRoutine = useMemo(() => getTodayRoutine(), [getTodayRoutine]);

  // Check for completed session today
  const { data: todaySession } = useQuery({
    queryKey: ["todaySession", user?.id, today],
    queryFn: () => getTodaySession(),
    enabled: !!user,
  });

  // Stats
  const habitsCompletedToday = useMemo(() => {
    return Object.values(todayEntries).filter((e) => e.is_completed).length;
  }, [todayEntries]);

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
    await queryClient.invalidateQueries(["todaySession"]);
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
    });

    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div
              className={`animate-spin w-8 h-8 border-2 rounded-full ${
                isDarkMode
                  ? "border-lift-primary border-t-transparent"
                  : "border-workout-primary border-t-transparent"
              }`}
            />
            <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
              Loading...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

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
      <div className="px-4 py-4 pb-24">
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
          <button
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

        {/* Today's Workout Card */}
        <section className="mb-6">
          {hasActiveSession ? (
            // Continue active session
            <div
              className="rounded-3xl p-6 text-white overflow-hidden relative"
              style={{
                background: isDarkMode
                  ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                  : "linear-gradient(135deg, #4F8CFF 0%, #6366f1 100%)",
              }}
            >
              <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                <Clock className="w-4 h-4" />
                Workout in progress
              </div>
              <h3 className="text-2xl font-bold mb-1">
                {activeSession.routine_name}
              </h3>
              <p className="text-white/80 mb-4">
                {activeSession.set_logs?.filter((s) => s.is_completed).length ||
                  0}{" "}
                sets completed
              </p>
              <button
                onClick={handleContinueWorkout}
                className="w-full py-3 rounded-xl bg-white text-slate-800 font-bold flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Continue Workout
              </button>
            </div>
          ) : hasCompletedSession ? (
            // Show completed session
            <div
              className={`rounded-3xl p-6 ${
                isDarkMode
                  ? "bg-iron-900"
                  : "bg-white border border-slate-200 shadow-sm"
              }`}
            >
              <div
                className={`flex items-center gap-2 text-sm mb-2 ${
                  isDarkMode ? "text-lift-primary" : "text-green-600"
                }`}
              >
                <Check className="w-4 h-4" />
                Completed today
              </div>
              <h3
                className={`text-xl font-bold mb-1 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
              >
                {todaySession.routine_name}
              </h3>
              <p
                className={`mb-4 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
              >
                {todaySession.set_logs?.filter((s) => s.is_completed).length ||
                  0}{" "}
                sets completed
              </p>
              <button
                onClick={handleEditSession}
                className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-300"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <Edit3 className="w-4 h-4" />
                Edit Session
              </button>
            </div>
          ) : todayRoutine ? (
            // Today's assigned routine
            <div
              className="rounded-3xl p-6 text-white overflow-hidden relative"
              style={{
                background: isDarkMode
                  ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                  : "linear-gradient(135deg, #4F8CFF 0%, #6366f1 100%)",
              }}
            >
              {/* Decorative icon */}
              <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-white/10 flex items-center justify-center">
                <Dumbbell className="w-12 h-12 text-white/30" />
              </div>

              <div className="relative z-10">
                <p className="text-white/70 text-sm mb-1">
                  {getDayName()}'s Workout
                </p>
                <h3 className="text-2xl font-bold mb-2">{todayRoutine.name}</h3>
                <p className="text-white/80 mb-1">
                  {todayRoutine.routine_exercises?.length || 0} exercises ·
                  Progressive overload tracking
                </p>

                {/* Exercise list preview */}
                <div className="mt-4 mb-4 p-3 rounded-xl bg-white/10 space-y-2">
                  {todayRoutine.routine_exercises?.slice(0, 4).map((ex, i) => (
                    <div key={ex.id} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {ex.exercise_name}
                        </p>
                        <p className="text-white/60 text-xs">
                          {ex.target_sets} sets · {ex.category}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(todayRoutine.routine_exercises?.length || 0) > 4 && (
                    <p className="text-white/60 text-xs text-center">
                      +{todayRoutine.routine_exercises.length - 4} more
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleStartWorkout(todayRoutine)}
                  disabled={isStartingWorkout}
                  className="w-full py-3.5 rounded-xl bg-white text-slate-800 font-bold flex items-center justify-center gap-2"
                >
                  {isStartingWorkout ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Start Workout
                    </>
                  )}
                </button>

                <p className="text-center text-white/60 text-xs mt-2">
                  💡 Swipe left/right between exercises
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

        {/* Quick Stats */}
        <QuickStats
          exerciseCount={
            hasCompletedSession
              ? todaySession?.set_logs?.filter((s) => s.is_completed).length ||
                0
              : 0
          }
          habitsCompleted={habitsCompletedToday}
          habitsTotal={trackables.length}
        />

        {/* Today's Habits */}
        <section className="mt-6">
          <h3
            className={`text-xs font-medium mb-3 uppercase tracking-wider flex items-center gap-2 ${
              isDarkMode ? "text-iron-400" : "text-slate-500"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Habits
          </h3>
          <HabitPills
            trackables={trackables}
            entries={todayEntries}
            onToggle={handleToggleHabit}
            onAddNew={() => setShowAddHabitDrawer(true)}
          />
        </section>
      </div>

      {/* Routine Selector Drawer */}
      <Drawer open={showRoutineSelector} onOpenChange={setShowRoutineSelector}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Choose a Routine</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {routines.map((routine) => (
              <button
                key={routine.id}
                onClick={() => handleStartWorkout(routine)}
                className={`
                  w-full p-4 rounded-2xl text-left transition-all
                  ${
                    isDarkMode
                      ? "bg-iron-800 hover:bg-iron-700"
                      : "bg-slate-100 hover:bg-slate-200"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${routine.color}20` }}
                  >
                    <Dumbbell
                      className="w-6 h-6"
                      style={{ color: routine.color }}
                    />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                    >
                      {routine.name}
                    </p>
                    <p
                      className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                    >
                      {routine.routine_exercises?.length || 0} exercises
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                  />
                </div>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Add Habit Drawer */}
      <Drawer open={showAddHabitDrawer} onOpenChange={setShowAddHabitDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add New Habit</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4 overflow-y-auto max-h-[60vh]">
            {/* Name */}
            <div>
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Name
              </label>
              <input
                type="text"
                value={newHabit.name}
                onChange={(e) =>
                  setNewHabit({ ...newHabit, name: e.target.value })
                }
                placeholder="e.g., Water, Sleep, Creatine"
                className={`input-field ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400"
                }`}
                autoFocus
              />
            </div>

            {/* Type */}
            <div>
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setNewHabit({
                      ...newHabit,
                      type: "habit",
                      has_value: false,
                    })
                  }
                  className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
                    newHabit.type === "habit"
                      ? isDarkMode
                        ? "bg-lift-primary text-iron-950"
                        : "bg-workout-primary text-white"
                      : isDarkMode
                        ? "bg-iron-800 text-iron-400"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {newHabit.type === "habit" && <Check className="w-4 h-4" />}
                  Habit (Yes/No)
                </button>
                <button
                  onClick={() =>
                    setNewHabit({
                      ...newHabit,
                      type: "health",
                      has_value: true,
                    })
                  }
                  className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
                    newHabit.type === "health"
                      ? isDarkMode
                        ? "bg-lift-primary text-iron-950"
                        : "bg-workout-primary text-white"
                      : isDarkMode
                        ? "bg-iron-800 text-iron-400"
                        : "bg-slate-100 text-slate-600"
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
                <label
                  className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                >
                  Unit
                </label>
                <input
                  type="text"
                  value={newHabit.value_unit}
                  onChange={(e) =>
                    setNewHabit({ ...newHabit, value_unit: e.target.value })
                  }
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
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {PILL_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewHabit({ ...newHabit, icon })}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center ${
                      newHabit.icon === icon
                        ? isDarkMode
                          ? "bg-iron-700 ring-2 ring-lift-primary"
                          : "bg-slate-200 ring-2 ring-workout-primary"
                        : isDarkMode
                          ? "bg-iron-800"
                          : "bg-slate-100"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {PILL_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewHabit({ ...newHabit, color })}
                    className={`w-10 h-10 rounded-xl transition-transform ${
                      newHabit.color === color
                        ? "ring-2 ring-white ring-offset-2 scale-110"
                        : ""
                    }`}
                    style={{
                      backgroundColor: color,
                      ringOffsetColor: isDarkMode ? "#18181b" : "#f8fafc",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div
              className={`p-4 rounded-xl ${isDarkMode ? "bg-iron-800/50" : "bg-slate-100"}`}
            >
              <p
                className={`text-xs mb-2 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
              >
                Preview
              </p>
              <div
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-iron-950 font-medium"
                style={{ backgroundColor: newHabit.color }}
              >
                <span>{newHabit.icon}</span>
                <Check className="w-4 h-4" />
                <span>{newHabit.name || "Name"}</span>
                {newHabit.has_value && (
                  <span className="text-xs bg-black/20 px-1.5 py-0.5 rounded-full">
                    8 {newHabit.value_unit}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 pb-safe">
              <button
                onClick={() => setShowAddHabitDrawer(false)}
                className={`flex-1 py-3.5 rounded-xl font-medium ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-400"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHabit}
                disabled={!newHabit.name.trim()}
                className={`flex-1 py-3.5 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-workout-primary text-white"
                }`}
              >
                <Check className="w-4 h-4" />
                Add Habit
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}

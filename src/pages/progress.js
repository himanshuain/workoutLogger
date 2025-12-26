import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import ProgressGraph from "@/components/ProgressGraph";
import CollapsibleSection from "@/components/CollapsibleSection";
import TrackingOverview from "@/components/TrackingOverview";
import {
  TrendingUp,
  Calendar,
  Flame,
  Target,
  ChevronDown,
  Dumbbell,
  BarChart3,
} from "lucide-react";

export default function Progress() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const {
    user,
    trackables,
    todayEntries,
    foodItems,
    todayFoodEntries,
    isLoading,
    today,
    getExerciseLogs,
    getTrackingEntries,
    getTodayExerciseLogs,
    getWorkoutSessions,
    getTodaySetLogs,
    getFoodEntries,
  } = useWorkout();

  const [expandedHabit, setExpandedHabit] = useState(null);

  // Helper function for local date formatting
  const getLocalDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get date range for queries
  const startDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return getLocalDateStr(d);
  }, []);

  // TanStack Query for workout sessions (new system)
  const { data: workoutSessionData } = useQuery({
    queryKey: ["workoutSessions", user?.id, startDate, today],
    queryFn: async () => {
      const sessions = await getWorkoutSessions(startDate, today);
      const workoutByDate = {};
      const exerciseLogsByName = {};

      sessions.forEach((session) => {
        if (session.status === "completed") {
          // Count completed sets per date
          const completedSets = (session.set_logs || []).filter(
            (log) => log.is_completed,
          );
          workoutByDate[session.date] =
            (workoutByDate[session.date] || 0) + completedSets.length;

          // Group by exercise name
          completedSets.forEach((log) => {
            if (!exerciseLogsByName[log.exercise_name]) {
              exerciseLogsByName[log.exercise_name] = [];
            }
            exerciseLogsByName[log.exercise_name].push({
              date: session.date,
              weight: log.weight,
              reps: log.reps,
              exercise_name: log.exercise_name,
              category: log.category,
            });
          });
        }
      });

      return {
        workoutData: Object.entries(workoutByDate).map(([date, count]) => ({
          date,
          count,
        })),
        exerciseLogsByName,
        allSessions: sessions,
      };
    },
    enabled: !!user,
  });

  // TanStack Query for legacy exercise logs (backward compatibility)
  const { data: legacyExerciseData } = useQuery({
    queryKey: ["exerciseLogs", user?.id, startDate, today],
    queryFn: async () => {
      const logs = await getExerciseLogs(startDate, today);
      const workoutByDate = {};
      const byExerciseName = {};

      logs.forEach((log) => {
        workoutByDate[log.date] = (workoutByDate[log.date] || 0) + 1;
        if (!byExerciseName[log.exercise_name]) {
          byExerciseName[log.exercise_name] = [];
        }
        byExerciseName[log.exercise_name].push(log);
      });

      return {
        workoutData: Object.entries(workoutByDate).map(([date, count]) => ({
          date,
          count,
        })),
        exerciseLogsByName: byExerciseName,
        allLogs: logs,
      };
    },
    enabled: !!user,
  });

  // TanStack Query for tracking entries
  const { data: habitData } = useQuery({
    queryKey: ["trackingEntries", user?.id, startDate, today],
    queryFn: async () => {
      const entries = await getTrackingEntries(startDate, today);
      const habitByDate = {};
      const byTrackable = {};

      entries.forEach((entry) => {
        if (entry.is_completed) {
          habitByDate[entry.date] = (habitByDate[entry.date] || 0) + 1;
        }
        if (!byTrackable[entry.trackable_id]) {
          byTrackable[entry.trackable_id] = {};
        }
        if (entry.is_completed) {
          byTrackable[entry.trackable_id][entry.date] = 1;
        }
      });

      return {
        habitByDate: Object.entries(habitByDate).map(([date, count]) => ({
          date,
          count,
        })),
        habitDataByTrackable: Object.fromEntries(
          Object.entries(byTrackable).map(([id, dates]) => [
            id,
            Object.entries(dates).map(([date, count]) => ({ date, count })),
          ]),
        ),
      };
    },
    enabled: !!user,
  });

  // TanStack Query for food entries
  const { data: foodData } = useQuery({
    queryKey: ["foodEntries", user?.id, startDate, today],
    queryFn: async () => {
      const entries = await getFoodEntries(startDate, today);
      const byItem = {};

      entries.forEach((entry) => {
        if (!byItem[entry.food_item_id]) {
          byItem[entry.food_item_id] = {};
        }
        byItem[entry.food_item_id][entry.date] = entry.quantity || 1;
      });

      return {
        foodDataByItem: Object.fromEntries(
          Object.entries(byItem).map(([id, dates]) => [
            id,
            Object.entries(dates).map(([date, count]) => ({ date, count })),
          ]),
        ),
      };
    },
    enabled: !!user,
  });

  // TanStack Query for today's set logs
  const { data: todaySetLogs = [] } = useQuery({
    queryKey: ["todaySetLogs", user?.id, today],
    queryFn: () => getTodaySetLogs(),
    enabled: !!user,
  });

  // Merge workout data from both systems
  const workoutHeatmapData = useMemo(() => {
    const dataMap = new Map();

    // Add legacy exercise logs
    (legacyExerciseData?.workoutData || []).forEach((item) => {
      if (item.date !== today) {
        dataMap.set(item.date, (dataMap.get(item.date) || 0) + item.count);
      }
    });

    // Add new workout sessions
    (workoutSessionData?.workoutData || []).forEach((item) => {
      if (item.date !== today) {
        dataMap.set(item.date, (dataMap.get(item.date) || 0) + item.count);
      }
    });

    // Add today's completed sets
    if (todaySetLogs.length > 0) {
      dataMap.set(today, todaySetLogs.length);
    }

    return Array.from(dataMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }, [
    legacyExerciseData?.workoutData,
    workoutSessionData?.workoutData,
    todaySetLogs,
    today,
  ]);

  // Merge exercise logs from both systems
  const exerciseLogsByName = useMemo(() => {
    const merged = { ...(legacyExerciseData?.exerciseLogsByName || {}) };

    // Add logs from new system
    Object.entries(workoutSessionData?.exerciseLogsByName || {}).forEach(
      ([name, logs]) => {
        if (!merged[name]) {
          merged[name] = [];
        }
        merged[name] = [...merged[name], ...logs];
      },
    );

    return merged;
  }, [
    legacyExerciseData?.exerciseLogsByName,
    workoutSessionData?.exerciseLogsByName,
  ]);

  const habitHeatmapData = useMemo(() => {
    const dataMap = new Map();
    (habitData?.habitByDate || []).forEach((item) => {
      if (item.date !== today) {
        dataMap.set(item.date, item.count);
      }
    });
    const todayCount = Object.values(todayEntries).filter(
      (e) => e.is_completed,
    ).length;
    if (todayCount > 0) {
      dataMap.set(today, todayCount);
    }
    return Array.from(dataMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }, [habitData?.habitByDate, todayEntries, today]);

  // Add today's entries to habit data by trackable
  const habitDataByTrackable = useMemo(() => {
    const data = { ...(habitData?.habitDataByTrackable || {}) };
    trackables.forEach((t) => {
      const todayEntry = todayEntries[t.id];
      if (todayEntry?.is_completed) {
        if (!data[t.id]) data[t.id] = [];
        const existing = data[t.id].find((d) => d.date === today);
        if (!existing) {
          data[t.id] = [...data[t.id], { date: today, count: 1 }];
        }
      }
    });
    return data;
  }, [habitData?.habitDataByTrackable, todayEntries, trackables, today]);

  // Add today's food entries
  const foodDataByItem = useMemo(() => {
    const data = { ...(foodData?.foodDataByItem || {}) };
    Object.entries(todayFoodEntries).forEach(([itemId, entry]) => {
      if (!data[itemId]) data[itemId] = [];
      const existing = data[itemId].find((d) => d.date === today);
      if (!existing) {
        data[itemId] = [
          ...data[itemId],
          { date: today, count: entry.quantity || 1 },
        ];
      }
    });
    return data;
  }, [foodData?.foodDataByItem, todayFoodEntries, today]);

  // Stats calculations
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

    const workoutsThisMonth = workoutHeatmapData.filter((d) =>
      d.date.startsWith(thisMonth),
    ).length;
    const workoutsLastMonth = workoutHeatmapData.filter((d) =>
      d.date.startsWith(lastMonthStr),
    ).length;

    // Current streak calculation
    let streak = 0;
    const sortedDates = [...workoutHeatmapData].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    let checkDate = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = getLocalDateStr(checkDate);
      const hasActivity = sortedDates.some((d) => d.date === dateStr);
      if (hasActivity) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i > 0) {
        break;
      } else {
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    return {
      workoutsThisMonth,
      workoutsLastMonth,
      currentStreak: streak,
      totalWorkouts: workoutHeatmapData.length,
    };
  }, [workoutHeatmapData]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div
            className={`animate-spin w-8 h-8 border-2 rounded-full ${
              isDarkMode
                ? "border-lift-primary border-t-transparent"
                : "border-workout-primary border-t-transparent"
            }`}
          />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
          <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
            Sign in to view progress
          </p>
          <button
            onClick={() => router.push("/auth")}
            className={`mt-4 px-6 py-2.5 rounded-xl font-bold ${
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

  return (
    <Layout>
      <div className="px-4 py-4 pb-24">
        {/* Header - Sticky */}
        <div
          className={`sticky top-0 z-30 -mx-4 px-4 pb-3 pt-1 backdrop-blur-sm ${
            isDarkMode ? "bg-iron-950/95" : "bg-slate-50/95"
          }`}
        >
          <h2
            className={`text-xl font-bold ${
              isDarkMode ? "text-iron-100" : "text-slate-800"
            }`}
          >
            Progress
          </h2>
          <p
            className={`text-sm mt-1 ${
              isDarkMode ? "text-iron-500" : "text-slate-500"
            }`}
          >
            Your activity over time
          </p>
        </div>

        <div className="space-y-6 mt-4">
          {/* Quick Stats */}
          <section className="grid grid-cols-2 gap-3">
            <div
              className={`rounded-2xl p-4 ${
                isDarkMode
                  ? "bg-iron-900/50"
                  : "bg-white border border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar
                  className={`w-4 h-4 ${
                    isDarkMode ? "text-iron-500" : "text-slate-500"
                  }`}
                />
                <p
                  className={`text-xs uppercase tracking-wider ${
                    isDarkMode ? "text-iron-500" : "text-slate-500"
                  }`}
                >
                  This Month
                </p>
              </div>
              <p
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-iron-100" : "text-slate-800"
                }`}
              >
                {stats.workoutsThisMonth}
              </p>
              <p
                className={`text-sm ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                workouts
              </p>
            </div>
            <div
              className={`rounded-2xl p-4 border ${
                isDarkMode
                  ? "bg-gradient-to-br from-lift-primary/20 to-transparent border-lift-primary/30"
                  : "bg-gradient-to-br from-workout-primary/10 to-transparent border-workout-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Flame
                  className={`w-4 h-4 ${
                    isDarkMode ? "text-lift-primary" : "text-workout-primary"
                  }`}
                />
                <p
                  className={`text-xs uppercase tracking-wider ${
                    isDarkMode
                      ? "text-lift-primary/80"
                      : "text-workout-primary/80"
                  }`}
                >
                  Streak
                </p>
              </div>
              <p
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-lift-primary" : "text-workout-primary"
                }`}
              >
                {stats.currentStreak}
              </p>
              <p
                className={`text-sm ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                days
              </p>
            </div>
            <div
              className={`rounded-2xl p-4 ${
                isDarkMode
                  ? "bg-iron-900/50"
                  : "bg-white border border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp
                  className={`w-4 h-4 ${
                    isDarkMode ? "text-iron-500" : "text-slate-500"
                  }`}
                />
                <p
                  className={`text-xs uppercase tracking-wider ${
                    isDarkMode ? "text-iron-500" : "text-slate-500"
                  }`}
                >
                  Last Month
                </p>
              </div>
              <p
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-iron-100" : "text-slate-800"
                }`}
              >
                {stats.workoutsLastMonth}
              </p>
              <p
                className={`text-sm ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                workouts
              </p>
            </div>
            <div
              className={`rounded-2xl p-4 ${
                isDarkMode
                  ? "bg-iron-900/50"
                  : "bg-white border border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Target
                  className={`w-4 h-4 ${
                    isDarkMode ? "text-iron-500" : "text-slate-500"
                  }`}
                />
                <p
                  className={`text-xs uppercase tracking-wider ${
                    isDarkMode ? "text-iron-500" : "text-slate-500"
                  }`}
                >
                  Total
                </p>
              </div>
              <p
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-iron-100" : "text-slate-800"
                }`}
              >
                {stats.totalWorkouts}
              </p>
              <p
                className={`text-sm ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                workout days
              </p>
            </div>
          </section>

          {/* Weekly Overview Table */}
          <TrackingOverview
            trackables={trackables}
            habitDataByTrackable={habitDataByTrackable}
            todayEntries={todayEntries}
            exerciseLogsByName={exerciseLogsByName}
            workoutData={workoutHeatmapData}
            foodItems={foodItems}
            foodDataByItem={foodDataByItem}
            todayFoodEntries={todayFoodEntries}
            today={today}
            days={7}
            isDarkMode={isDarkMode}
          />

          {/* Workout Heatmap */}
          <ActivityHeatmap
            data={workoutHeatmapData}
            type="workout"
            label="Workout Activity"
            subtitle={`${stats.workoutsThisMonth} workout${stats.workoutsThisMonth !== 1 ? "s" : ""} this month`}
            isDarkMode={isDarkMode}
          />

          {/* Habits Heatmap */}
          <ActivityHeatmap
            data={habitHeatmapData}
            type="habit"
            label="Daily Habits"
            subtitle={`${Object.values(todayEntries).filter((e) => e.is_completed).length}/${trackables.length} completed today`}
            isDarkMode={isDarkMode}
          />

          {/* Exercise Progress Graphs - Collapsible */}
          {Object.keys(exerciseLogsByName).length > 0 && (
            <CollapsibleSection
              title="Progressive Overload"
              icon={Dumbbell}
              count={Object.keys(exerciseLogsByName).length}
              defaultOpen={false}
              isDarkMode={isDarkMode}
            >
              {Object.entries(exerciseLogsByName)
                .sort((a, b) => b[1].length - a[1].length)
                .slice(0, 10)
                .map(([exerciseName, logs]) => (
                  <ProgressGraph
                    key={exerciseName}
                    exerciseName={exerciseName}
                    exerciseCategory={logs[0]?.category}
                    data={logs}
                    unit="kg"
                    compact={true}
                    isDarkMode={isDarkMode}
                  />
                ))}
            </CollapsibleSection>
          )}

          {/* Individual Habit Heatmaps - Collapsible */}
          {trackables.length > 0 && (
            <CollapsibleSection
              title="Habit Breakdown"
              icon={BarChart3}
              count={trackables.length}
              defaultOpen={false}
              isDarkMode={isDarkMode}
            >
              {trackables.map((trackable) => {
                const isExpanded = expandedHabit === trackable.id;
                const data = habitDataByTrackable[trackable.id] || [];
                const daysTracked = data.length;

                return (
                  <div
                    key={trackable.id}
                    className={`rounded-xl overflow-hidden ${
                      isDarkMode ? "bg-iron-900/30" : "bg-slate-100"
                    }`}
                  >
                    <button
                      onClick={() =>
                        setExpandedHabit(isExpanded ? null : trackable.id)
                      }
                      className="w-full p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
                          style={{ backgroundColor: `${trackable.color}30` }}
                        >
                          {trackable.icon}
                        </div>
                        <div className="text-left">
                          <p
                            className={`font-medium text-sm ${
                              isDarkMode ? "text-iron-100" : "text-slate-800"
                            }`}
                          >
                            {trackable.name}
                          </p>
                          <p
                            className={`text-xs ${
                              isDarkMode ? "text-iron-500" : "text-slate-500"
                            }`}
                          >
                            {daysTracked} days
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        } ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3">
                        <ActivityHeatmap
                          data={data}
                          type="habit"
                          label=""
                          color={trackable.color}
                          compact={true}
                          isDarkMode={isDarkMode}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </CollapsibleSection>
          )}
        </div>
      </div>
    </Layout>
  );
}

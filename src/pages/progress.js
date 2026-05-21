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
import BodyWeightTracker from "@/components/BodyWeightTracker";
import GoalsWidget from "@/components/GoalsWidget";
import VolumeChart from "@/components/VolumeChart";
import MuscleHeatmap from "@/components/MuscleHeatmap";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody } from "@/components/ui/modal";
import { FadeIn } from "@/components/ui/fade-in";
import { SkeletonHeatmap, SkeletonSection, SkeletonStats } from "@/components/SkeletonLoader";
import {
  TrendingUp,
  Calendar,
  Flame,
  Target,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Check,
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
    today,
    getExerciseLogs,
    getTrackingEntries,
    getTodayExerciseLogs,
    getWorkoutSessions,
    getTodaySetLogs,
    getFoodEntries,
  } = useWorkout();

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
  const { data: workoutSessionData, isPending: sessionsPending } = useQuery({
    queryKey: ["workoutSessions", user?.id, startDate, today],
    queryFn: async () => {
      const sessions = await getWorkoutSessions(startDate, today);
      const workoutByDate = {};
      const exerciseLogsByName = {};

      sessions.forEach(session => {
        if (session.status === "completed") {
          // Count completed sets per date
          const completedSets = (session.set_logs || []).filter(log => log.is_completed);
          workoutByDate[session.date] = (workoutByDate[session.date] || 0) + completedSets.length;

          // Group by exercise name
          completedSets.forEach(log => {
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
  const { data: legacyExerciseData, isPending: legacyPending } = useQuery({
    queryKey: ["exerciseLogs", user?.id, startDate, today],
    queryFn: async () => {
      const logs = await getExerciseLogs(startDate, today);
      const workoutByDate = {};
      const byExerciseName = {};

      logs.forEach(log => {
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
  const { data: habitData, isPending: habitsPending } = useQuery({
    queryKey: ["trackingEntries", user?.id, startDate, today],
    queryFn: async () => {
      const entries = await getTrackingEntries(startDate, today);
      const habitByDate = {};
      const byTrackable = {};

      entries.forEach(entry => {
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
          ])
        ),
      };
    },
    enabled: !!user,
  });

  // TanStack Query for food entries
  const { data: foodData, isPending: foodPending } = useQuery({
    queryKey: ["foodEntries", user?.id, startDate, today],
    queryFn: async () => {
      const entries = await getFoodEntries(startDate, today);
      const byItem = {};

      entries.forEach(entry => {
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
          ])
        ),
      };
    },
    enabled: !!user,
  });

  const isProgressLoading =
    sessionsPending || legacyPending || habitsPending || foodPending || todaySetsPending;

  // TanStack Query for today's set logs
  const { data: todaySetLogs = [], isPending: todaySetsPending } = useQuery({
    queryKey: ["todaySetLogs", user?.id, today],
    queryFn: () => getTodaySetLogs(),
    enabled: !!user,
  });

  // Merge workout data from both systems
  const workoutHeatmapData = useMemo(() => {
    const dataMap = new Map();

    // Add legacy exercise logs
    (legacyExerciseData?.workoutData || []).forEach(item => {
      if (item.date !== today) {
        dataMap.set(item.date, (dataMap.get(item.date) || 0) + item.count);
      }
    });

    // Add new workout sessions
    (workoutSessionData?.workoutData || []).forEach(item => {
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
  }, [legacyExerciseData?.workoutData, workoutSessionData?.workoutData, todaySetLogs, today]);

  // Merge exercise logs from both systems
  const exerciseLogsByName = useMemo(() => {
    const merged = { ...(legacyExerciseData?.exerciseLogsByName || {}) };

    // Add logs from new system
    Object.entries(workoutSessionData?.exerciseLogsByName || {}).forEach(([name, logs]) => {
      if (!merged[name]) {
        merged[name] = [];
      }
      merged[name] = [...merged[name], ...logs];
    });

    return merged;
  }, [legacyExerciseData?.exerciseLogsByName, workoutSessionData?.exerciseLogsByName]);

  const habitHeatmapData = useMemo(() => {
    const dataMap = new Map();
    (habitData?.habitByDate || []).forEach(item => {
      if (item.date !== today) {
        dataMap.set(item.date, item.count);
      }
    });
    const todayCount = Object.values(todayEntries).filter(e => e.is_completed).length;
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
    trackables.forEach(t => {
      const todayEntry = todayEntries[t.id];
      if (todayEntry?.is_completed) {
        if (!data[t.id]) data[t.id] = [];
        const existing = data[t.id].find(d => d.date === today);
        if (!existing) {
          data[t.id] = [...data[t.id], { date: today, count: 1 }];
        }
      }
    });
    return data;
  }, [habitData?.habitDataByTrackable, todayEntries, trackables, today]);

  const habitTrackables = useMemo(
    () => trackables.filter(t => t.name !== "Body Weight"),
    [trackables]
  );

  // Add today's food entries
  const foodDataByItem = useMemo(() => {
    const data = { ...(foodData?.foodDataByItem || {}) };
    Object.entries(todayFoodEntries).forEach(([itemId, entry]) => {
      if (!data[itemId]) data[itemId] = [];
      const existing = data[itemId].find(d => d.date === today);
      if (!existing) {
        data[itemId] = [...data[itemId], { date: today, count: entry.quantity || 1 }];
      }
    });
    return data;
  }, [foodData?.foodDataByItem, todayFoodEntries, today]);

  // State for monthly history modal
  const [showMonthlyHistory, setShowMonthlyHistory] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState("monthly"); // "monthly" or "daily"
  const [selectedMonth, setSelectedMonth] = useState(null); // For daily view - which month to show

  // Stats calculations
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

    const workoutsThisMonth = workoutHeatmapData.filter(d => d.date.startsWith(thisMonth)).length;
    const workoutsLastMonth = workoutHeatmapData.filter(d =>
      d.date.startsWith(lastMonthStr)
    ).length;

    // Current streak calculation
    let streak = 0;
    const sortedDates = [...workoutHeatmapData].sort((a, b) => b.date.localeCompare(a.date));
    let checkDate = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = getLocalDateStr(checkDate);
      const hasActivity = sortedDates.some(d => d.date === dateStr);
      if (hasActivity) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i > 0) {
        break;
      } else {
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Calculate habits completed today
    const habitsCompletedToday = Object.values(todayEntries).filter(e => e.is_completed).length;
    const habitsTotal = habitTrackables.length;

    // Calculate food logged today
    const foodLoggedToday = Object.keys(todayFoodEntries).length;
    const foodTotal = foodItems.length;

    return {
      workoutsThisMonth,
      workoutsLastMonth,
      currentStreak: streak,
      totalWorkouts: workoutHeatmapData.length,
      habitsCompletedToday,
      habitsTotal,
      foodLoggedToday,
      foodTotal,
    };
  }, [workoutHeatmapData, todayEntries, habitTrackables, todayFoodEntries, foodItems]);

  // Calculate monthly history data for all metrics (table structure)
  const monthlyHistoryData = useMemo(() => {
    // Get all unique months from all data sources
    const allDates = [...workoutHeatmapData.map(d => d.date), ...habitHeatmapData.map(d => d.date)];

    if (allDates.length === 0)
      return { months: [], habitsByMonth: {}, foodByMonth: {}, workoutsByMonth: {} };

    // Find the earliest date
    const sortedDates = allDates.sort();
    const earliestDate = new Date(sortedDates[0]);
    const now = new Date();

    const months = [];
    let currentDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);

    while (currentDate <= now) {
      const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
      const monthShort = currentDate.toLocaleDateString("en-US", { month: "short" });
      const monthYear = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const monthYearShort = `${monthShort} '${String(currentDate.getFullYear()).slice(-2)}`;
      const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate();
      const isCurrent =
        monthStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      months.push({
        month: monthStr,
        monthShort,
        monthYear,
        monthYearShort,
        daysInMonth,
        isCurrent,
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Reverse to show most recent first
    const reversedMonths = months.reverse();

    // Calculate workouts by month
    const workoutsByMonth = {};
    reversedMonths.forEach(({ month, daysInMonth }) => {
      const workoutDays = workoutHeatmapData.filter(d => d.date.startsWith(month)).length;
      const totalSets = workoutHeatmapData
        .filter(d => d.date.startsWith(month))
        .reduce((sum, d) => sum + d.count, 0);
      workoutsByMonth[month] = {
        days: workoutDays,
        sets: totalSets,
        rate: Math.round((workoutDays / daysInMonth) * 100),
      };
    });

    // Calculate habits by month for each trackable
    const habitsByMonth = {};
    habitTrackables.forEach(t => {
      habitsByMonth[t.id] = {};
      const habitDates = habitDataByTrackable[t.id] || [];
      reversedMonths.forEach(({ month, daysInMonth }) => {
        const completedDays = habitDates.filter(d => d.date.startsWith(month)).length;
        habitsByMonth[t.id][month] = {
          days: completedDays,
          rate: Math.round((completedDays / daysInMonth) * 100),
        };
      });
    });

    // Calculate food by month for each food item
    const foodByMonth = {};
    foodItems.forEach(item => {
      foodByMonth[item.id] = {};
      const itemDates = foodDataByItem[item.id] || [];
      reversedMonths.forEach(({ month, daysInMonth }) => {
        const loggedDays = itemDates.filter(d => d.date.startsWith(month)).length;
        foodByMonth[item.id][month] = {
          days: loggedDays,
          rate: Math.round((loggedDays / daysInMonth) * 100),
        };
      });
    });

    return { months: reversedMonths, habitsByMonth, foodByMonth, workoutsByMonth };
  }, [
    workoutHeatmapData,
    habitHeatmapData,
    habitTrackables,
    habitDataByTrackable,
    foodItems,
    foodDataByItem,
  ]);

  // Calculate daily history data for selected month
  const dailyHistoryData = useMemo(() => {
    if (!selectedMonth) return { days: [], habitsByDay: {}, foodByDay: {}, workoutsByDay: {} };

    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const isCurrentMonth = selectedMonth === currentMonth;
    const todayDate = now.getDate();

    const days = [];
    for (let d = daysInMonth; d >= 1; d--) {
      // Skip future days in current month
      if (isCurrentMonth && d > todayDate) continue;

      const dateStr = `${selectedMonth}-${String(d).padStart(2, "0")}`;
      const dateObj = new Date(year, month - 1, d);
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const isToday = dateStr === today;

      days.push({
        date: dateStr,
        dayNum: d,
        dayName,
        isToday,
      });
    }

    // Calculate workouts by day
    const workoutsByDay = {};
    days.forEach(({ date }) => {
      const dayData = workoutHeatmapData.find(d => d.date === date);
      workoutsByDay[date] = dayData
        ? { count: dayData.count, hasActivity: true }
        : { count: 0, hasActivity: false };
    });

    // Calculate habits by day for each trackable
    const habitsByDay = {};
    habitTrackables.forEach(t => {
      habitsByDay[t.id] = {};
      const habitDates = habitDataByTrackable[t.id] || [];
      days.forEach(({ date }) => {
        const hasEntry = habitDates.some(d => d.date === date);
        // Also check today's entries
        if (date === today && todayEntries[t.id]?.is_completed) {
          habitsByDay[t.id][date] = true;
        } else {
          habitsByDay[t.id][date] = hasEntry;
        }
      });
    });

    // Calculate food by day for each food item
    const foodByDay = {};
    foodItems.forEach(item => {
      foodByDay[item.id] = {};
      const itemDates = foodDataByItem[item.id] || [];
      days.forEach(({ date }) => {
        const hasEntry = itemDates.some(d => d.date === date);
        // Also check today's entries
        if (date === today && todayFoodEntries[item.id]) {
          foodByDay[item.id][date] = true;
        } else {
          foodByDay[item.id][date] = hasEntry;
        }
      });
    });

    return { days, habitsByDay, foodByDay, workoutsByDay };
  }, [
    selectedMonth,
    workoutHeatmapData,
    habitTrackables,
    habitDataByTrackable,
    foodItems,
    foodDataByItem,
    today,
    todayEntries,
    todayFoodEntries,
  ]);


  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
          <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
            Sign in to view progress
          </p>
          <button
            onClick={() => router.push("/auth")}
            className={`mt-4 px-6 py-2.5 rounded-card font-bold ${
              isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
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
      <FadeIn duration={0.5}>
      <div className="px-4 py-4">
        {/* Header - Sticky */}
        <div
          className={`sticky top-0 z-30 -mx-4 px-4 pb-3 pt-1 backdrop-blur-sm ${
            isDarkMode ? "bg-iron-950/95" : "bg-surface-page/95"
          }`}
        >
          <h2 className={`text-xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
            Progress
          </h2>
          <p className={`text-sm mt-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            Your activity over time
          </p>
        </div>

        <div className="space-y-6 mt-4">
          {/* Quick Stats - Horizontal Scrollable Strip */}
          <section className="-mx-4 px-4">
            {isProgressLoading ? (
              <SkeletonStats isDarkMode={isDarkMode} />
            ) : (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {/* Streak - Highlighted */}
              <div
                className={`flex-shrink-0 rounded-card px-5 py-3 border flex items-center gap-3 ${
                  isDarkMode
                    ? "bg-gradient-to-r from-lift-primary/20 to-lift-primary/5 border-lift-primary/30"
                    : "chart-panel border-l-2 border-l-amber-500"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-card flex items-center justify-center ${
                    isDarkMode ? "bg-lift-primary/20" : "bg-amber-50"
                  }`}
                >
                  <Flame
                    className={`w-5 h-5 ${isDarkMode ? "text-lift-primary" : "text-amber-600"}`}
                  />
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${isDarkMode ? "text-lift-primary" : "text-slate-800"}`}
                  >
                    {stats.currentStreak}
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
                    day streak
                  </p>
                </div>
              </div>

              {/* This Month */}
              <div
                className={`flex-shrink-0 rounded-card px-5 py-3 flex items-center gap-3 ${
                  isDarkMode ? "bg-iron-900/50" : "chart-panel"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-card flex items-center justify-center ${
                    isDarkMode ? "bg-iron-800" : "chart-panel-inner"
                  }`}
                >
                  <Calendar
                    className={`w-5 h-5 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
                  />
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                  >
                    {stats.workoutsThisMonth}
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    this month
                  </p>
                </div>
              </div>

              {/* Last Month */}
              <div
                className={`flex-shrink-0 rounded-card px-5 py-3 flex items-center gap-3 ${
                  isDarkMode ? "bg-iron-900/50" : "chart-panel"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-card flex items-center justify-center ${
                    isDarkMode ? "bg-iron-800" : "chart-panel-inner"
                  }`}
                >
                  <TrendingUp
                    className={`w-5 h-5 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
                  />
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                  >
                    {stats.workoutsLastMonth}
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    last month
                  </p>
                </div>
              </div>

              {/* Total Workouts */}
              <div
                className={`flex-shrink-0 rounded-card px-5 py-3 flex items-center gap-3 ${
                  isDarkMode ? "bg-iron-900/50" : "chart-panel"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-card flex items-center justify-center ${
                    isDarkMode ? "bg-iron-800" : "chart-panel-inner"
                  }`}
                >
                  <Target
                    className={`w-5 h-5 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
                  />
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                  >
                    {stats.totalWorkouts}
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    total days
                  </p>
                </div>
              </div>
            </div>
            )}
          </section>

          {/* Weekly Overview Table */}
          <div>
            {isProgressLoading ? (
              <SkeletonSection isDarkMode={isDarkMode} grid rows={0} />
            ) : (
            <>
            <TrackingOverview
              trackables={habitTrackables}
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

            {/* View All-Time History Button */}
            {monthlyHistoryData.months?.length > 0 && (
              <button
                onClick={() => setShowMonthlyHistory(true)}
                className={`w-full mt-3 py-3 rounded-card font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-300 hover:bg-iron-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                View All-Time Monthly History
              </button>
            )}
            </>
            )}
          </div>

          {/* Workout Heatmap */}
          {isProgressLoading ? (
            <SkeletonHeatmap isDarkMode={isDarkMode} />
          ) : (
          <ActivityHeatmap
            data={workoutHeatmapData}
            type="workout"
            label="Workout Activity"
            subtitle={`${stats.workoutsThisMonth} workout${stats.workoutsThisMonth !== 1 ? "s" : ""} this month`}
            isDarkMode={isDarkMode}
          />
          )}

          {/* Goals */}
          <GoalsWidget
            isDarkMode={isDarkMode}
            workoutHeatmapData={workoutHeatmapData}
            habitHeatmapData={habitHeatmapData}
            trackables={habitTrackables}
            todayEntries={todayEntries}
          />

          {/* Body Weight Tracker */}
          <BodyWeightTracker isDarkMode={isDarkMode} />

          {/* Volume Chart */}
          <VolumeChart
            exerciseLogsByName={exerciseLogsByName}
            workoutHeatmapData={workoutHeatmapData}
            isDarkMode={isDarkMode}
          />

          {/* Muscle Heatmap */}
          <MuscleHeatmap exerciseLogsByName={exerciseLogsByName} isDarkMode={isDarkMode} />

          {/* Progressive Overload */}
          {Object.keys(exerciseLogsByName).length > 0 && (
            <CollapsibleSection
              title="Progressive Overload"
              icon={Dumbbell}
              count={Object.keys(exerciseLogsByName).length}
              defaultOpen={false}
              isDarkMode={isDarkMode}
            >
              <p className={`text-xs mb-3 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                Track how your weights are increasing over time for each exercise.
              </p>
              {Object.entries(exerciseLogsByName)
                .sort((a, b) => b[1].length - a[1].length)
                .slice(0, 15)
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
        </div>
      </div>
      </FadeIn>

      {/* All-Time History Modal - Table Structure */}
      <Modal
        open={showMonthlyHistory}
        onOpenChange={open => {
          setShowMonthlyHistory(open);
          if (!open) {
            setHistoryViewMode("monthly");
            setSelectedMonth(null);
          }
        }}
      >
        <ModalContent
          className={`max-w-[95vw] w-full max-h-[85vh] overflow-hidden ${isDarkMode ? "bg-iron-900 border-iron-800" : "bg-surface-section border-surface-subtle shadow-[var(--shadow-elevation-section)]"}`}
        >
          <ModalHeader className="pb-3 border-b border-iron-800/50">
            <div className="flex flex-col gap-3 w-full pr-8">
              {/* Title Row */}
              <div className="flex items-center justify-between">
                <ModalTitle
                  className={`text-lg ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                >
                  All-Time Overview
                </ModalTitle>

                {/* View Toggle - Compact Pills */}
                <div
                  className={`flex rounded-full p-0.5 ${isDarkMode ? "bg-iron-800/80" : "bg-surface-interactive border border-surface-subtle"}`}
                >
                  <button
                    onClick={() => {
                      setHistoryViewMode("monthly");
                      setSelectedMonth(null);
                    }}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                      historyViewMode === "monthly"
                        ? isDarkMode
                          ? "bg-lift-primary text-iron-950 shadow-sm"
                          : "accent-soft-surface shadow-sm"
                        : isDarkMode
                          ? "text-iron-500 hover:text-iron-300"
                          : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedMonth && monthlyHistoryData.months?.length > 0) {
                        setSelectedMonth(monthlyHistoryData.months[0].month);
                      }
                      setHistoryViewMode("daily");
                    }}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                      historyViewMode === "daily"
                        ? isDarkMode
                          ? "bg-lift-primary text-iron-950 shadow-sm"
                          : "accent-soft-surface shadow-sm"
                        : isDarkMode
                          ? "text-iron-500 hover:text-iron-300"
                          : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                    }`}
                  >
                    Daily
                  </button>
                </div>
              </div>

              {/* Subtitle / Month Selector Row */}
              <div className="flex items-center justify-between">
                <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                  {monthlyHistoryData.months?.length > 0 &&
                    `Since ${monthlyHistoryData.months[monthlyHistoryData.months.length - 1]?.monthYear}`}
                  {historyViewMode === "daily" && monthlyHistoryData.months?.length > 0 && (
                    <span className="block mt-1">
                      Check marks mean completed that day; dashes mean not.
                    </span>
                  )}
                </p>

                {/* Month Navigator (Daily View Only) */}
                {historyViewMode === "daily" && monthlyHistoryData.months?.length > 0 && (
                  <div
                    className={`flex items-center gap-1 rounded-full px-1 py-0.5 ${isDarkMode ? "bg-iron-800/60" : "bg-slate-100"}`}
                  >
                    <button
                      onClick={() => {
                        const currentIndex = monthlyHistoryData.months.findIndex(
                          m => m.month === selectedMonth
                        );
                        if (currentIndex < monthlyHistoryData.months.length - 1) {
                          setSelectedMonth(monthlyHistoryData.months[currentIndex + 1].month);
                        }
                      }}
                      disabled={
                        monthlyHistoryData.months.findIndex(m => m.month === selectedMonth) >=
                        monthlyHistoryData.months.length - 1
                      }
                      className={`p-1.5 rounded-full transition-all ${
                        monthlyHistoryData.months.findIndex(m => m.month === selectedMonth) >=
                        monthlyHistoryData.months.length - 1
                          ? isDarkMode
                            ? "text-iron-700 cursor-not-allowed"
                            : "text-slate-300 cursor-not-allowed"
                          : isDarkMode
                            ? "text-iron-400 hover:text-iron-200 hover:bg-iron-700"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span
                      className={`px-3 py-1 text-xs font-semibold min-w-[80px] text-center ${
                        isDarkMode ? "text-iron-200" : "text-slate-700"
                      }`}
                    >
                      {selectedMonth &&
                        new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                    </span>

                    <button
                      onClick={() => {
                        const currentIndex = monthlyHistoryData.months.findIndex(
                          m => m.month === selectedMonth
                        );
                        if (currentIndex > 0) {
                          setSelectedMonth(monthlyHistoryData.months[currentIndex - 1].month);
                        }
                      }}
                      disabled={
                        monthlyHistoryData.months.findIndex(m => m.month === selectedMonth) <= 0
                      }
                      className={`p-1.5 rounded-full transition-all ${
                        monthlyHistoryData.months.findIndex(m => m.month === selectedMonth) <= 0
                          ? isDarkMode
                            ? "text-iron-700 cursor-not-allowed"
                            : "text-slate-300 cursor-not-allowed"
                          : isDarkMode
                            ? "text-iron-400 hover:text-iron-200 hover:bg-iron-700"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="p-0 overflow-hidden rounded-b-card">
            <div className="overflow-auto max-h-[60vh] p-1">
              {historyViewMode === "monthly" ? (
                /* Monthly View Table */
                <table className="w-full text-sm">
                  <thead className={`sticky top-0 z-10 ${isDarkMode ? "bg-iron-900" : "bg-white"}`}>
                    <tr className={isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}>
                      <th
                        className={`sticky left-0 z-20 p-2 text-left font-medium min-w-[100px] max-w-[110px] ${
                          isDarkMode ? "bg-iron-900 text-iron-400" : "bg-white text-slate-500"
                        }`}
                      >
                        <span className="text-xs">Metric</span>
                      </th>
                      {monthlyHistoryData.months?.map(({ month, monthYearShort, isCurrent }) => (
                        <th
                          key={month}
                          className={`p-2 text-center min-w-[60px] cursor-pointer hover:opacity-80 transition-opacity ${
                            isCurrent
                              ? isDarkMode
                                ? "bg-lift-primary/10"
                                : "bg-workout-primary/10"
                              : ""
                          }`}
                          onClick={() => {
                            setSelectedMonth(month);
                            setHistoryViewMode("daily");
                          }}
                        >
                          <div
                            className={`text-xs font-semibold ${
                              isCurrent
                                ? isDarkMode
                                  ? "text-lift-primary"
                                  : "text-workout-primary"
                                : isDarkMode
                                  ? "text-iron-300"
                                  : "text-slate-700"
                            }`}
                          >
                            {monthYearShort}
                          </div>
                        </th>
                      ))}
                      <th
                        className={`p-3 text-center font-medium min-w-[60px] ${
                          isDarkMode ? "text-iron-400" : "text-slate-500"
                        }`}
                      >
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {/* Workouts Row */}
                    <tr
                      className={`border-b ${isDarkMode ? "border-iron-800/30" : "border-slate-100"}`}
                    >
                      <td
                        className={`sticky left-0 z-10 p-2 ${isDarkMode ? "bg-iron-900" : "bg-white"}`}
                      >
                        <div className="flex items-center gap-1.5 max-w-[100px]">
                          <div
                            className={`w-6 h-6 min-w-[24px] rounded-md flex items-center justify-center ${
                              isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/20"
                            }`}
                          >
                            <Dumbbell
                              className={`w-3.5 h-3.5 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
                            />
                          </div>
                          <span
                            className={`font-medium text-xs leading-tight ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                          >
                            Workouts
                          </span>
                        </div>
                      </td>
                      {monthlyHistoryData.months?.map(({ month, isCurrent }) => {
                        const data = monthlyHistoryData.workoutsByMonth?.[month];
                        return (
                          <td
                            key={month}
                            className={`p-2 text-center cursor-pointer hover:opacity-80 transition-opacity ${
                              isCurrent
                                ? isDarkMode
                                  ? "bg-lift-primary/10"
                                  : "bg-workout-primary/10"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedMonth(month);
                              setHistoryViewMode("daily");
                            }}
                          >
                            {data?.days > 0 ? (
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs ${
                                  isDarkMode
                                    ? "bg-lift-primary/20 text-lift-primary"
                                    : "bg-workout-primary/20 text-workout-primary"
                                }`}
                              >
                                {data.days}
                              </span>
                            ) : (
                              <span className={isDarkMode ? "text-iron-700" : "text-slate-300"}>
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center">
                        <span
                          className={`text-xs font-bold ${isDarkMode ? "text-iron-300" : "text-slate-600"}`}
                        >
                          {Object.values(monthlyHistoryData.workoutsByMonth || {}).reduce(
                            (sum, d) => sum + d.days,
                            0
                          )}
                        </span>
                      </td>
                    </tr>

                    {/* Habits Rows */}
                    {habitTrackables.map(habit => (
                      <tr
                        key={habit.id}
                        className={`border-b ${isDarkMode ? "border-iron-800/30" : "border-slate-100"}`}
                      >
                        <td
                          className={`sticky left-0 z-10 p-2 ${isDarkMode ? "bg-iron-900" : "bg-white"}`}
                        >
                          <div className="flex items-center gap-1.5 max-w-[100px]">
                            <div
                              className="w-6 h-6 min-w-[24px] rounded-md flex items-center justify-center text-xs"
                              style={{ backgroundColor: `${habit.color}30` }}
                            >
                              {habit.icon}
                            </div>
                            <span
                              className={`font-medium leading-tight ${habit.name.length > 12 ? "text-[10px]" : "text-xs"} ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                              style={{ wordBreak: "break-word" }}
                            >
                              {habit.name}
                            </span>
                          </div>
                        </td>
                        {monthlyHistoryData.months?.map(({ month, isCurrent }) => {
                          const data = monthlyHistoryData.habitsByMonth?.[habit.id]?.[month];
                          return (
                            <td
                              key={month}
                              className={`p-2 text-center cursor-pointer hover:opacity-80 transition-opacity ${
                                isCurrent
                                  ? isDarkMode
                                    ? "bg-lift-primary/10"
                                    : "bg-workout-primary/10"
                                  : ""
                              }`}
                              onClick={() => {
                                setSelectedMonth(month);
                                setHistoryViewMode("daily");
                              }}
                            >
                              {data?.days > 0 ? (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs"
                                  style={{
                                    backgroundColor: `${habit.color}30`,
                                    color: habit.color,
                                  }}
                                >
                                  {data.days}
                                </span>
                              ) : (
                                <span className={isDarkMode ? "text-iron-700" : "text-slate-300"}>
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center">
                          <span
                            className={`text-xs font-bold ${isDarkMode ? "text-iron-300" : "text-slate-600"}`}
                          >
                            {Object.values(
                              monthlyHistoryData.habitsByMonth?.[habit.id] || {}
                            ).reduce((sum, d) => sum + d.days, 0)}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Food Rows */}
                    {foodItems.map(food => (
                      <tr
                        key={food.id}
                        className={`border-b ${isDarkMode ? "border-iron-800/30" : "border-slate-100"}`}
                      >
                        <td
                          className={`sticky left-0 z-10 p-2 ${isDarkMode ? "bg-iron-900" : "bg-white"}`}
                        >
                          <div className="flex items-center gap-1.5 max-w-[100px]">
                            <div
                              className="w-6 h-6 min-w-[24px] rounded-md flex items-center justify-center text-xs"
                              style={{ backgroundColor: `${food.color}30` }}
                            >
                              {food.icon}
                            </div>
                            <span
                              className={`font-medium leading-tight ${food.name.length > 12 ? "text-[10px]" : "text-xs"} ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                              style={{ wordBreak: "break-word" }}
                            >
                              {food.name}
                            </span>
                          </div>
                        </td>
                        {monthlyHistoryData.months?.map(({ month, isCurrent }) => {
                          const data = monthlyHistoryData.foodByMonth?.[food.id]?.[month];
                          return (
                            <td
                              key={month}
                              className={`p-2 text-center cursor-pointer hover:opacity-80 transition-opacity ${
                                isCurrent
                                  ? isDarkMode
                                    ? "bg-lift-primary/10"
                                    : "bg-workout-primary/10"
                                  : ""
                              }`}
                              onClick={() => {
                                setSelectedMonth(month);
                                setHistoryViewMode("daily");
                              }}
                            >
                              {data?.days > 0 ? (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs"
                                  style={{ backgroundColor: `${food.color}30`, color: food.color }}
                                >
                                  {data.days}
                                </span>
                              ) : (
                                <span className={isDarkMode ? "text-iron-700" : "text-slate-300"}>
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center">
                          <span
                            className={`text-xs font-bold ${isDarkMode ? "text-iron-300" : "text-slate-600"}`}
                          >
                            {Object.values(monthlyHistoryData.foodByMonth?.[food.id] || {}).reduce(
                              (sum, d) => sum + d.days,
                              0
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* Daily View Table */
                <table className="w-full text-sm">
                  <thead className={`sticky top-0 z-10 ${isDarkMode ? "bg-iron-900" : "bg-white"}`}>
                    <tr className={isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}>
                      <th
                        className={`sticky left-0 z-20 p-2 text-left font-medium min-w-[100px] max-w-[110px] ${
                          isDarkMode ? "bg-iron-900 text-iron-400" : "bg-white text-slate-500"
                        }`}
                      >
                        <span className="text-xs">Metric</span>
                      </th>
                      {dailyHistoryData.days?.map(({ date, dayNum, dayName, isToday }) => (
                        <th
                          key={date}
                          className={`p-2 text-center min-w-[44px] ${
                            isToday
                              ? isDarkMode
                                ? "bg-lift-primary/10"
                                : "bg-workout-primary/10"
                              : ""
                          }`}
                        >
                          <div
                            className={`text-xs ${
                              isToday
                                ? isDarkMode
                                  ? "text-lift-primary"
                                  : "text-workout-primary"
                                : isDarkMode
                                  ? "text-iron-500"
                                  : "text-slate-500"
                            }`}
                          >
                            {dayName}
                          </div>
                          <div
                            className={`font-bold ${
                              isToday
                                ? isDarkMode
                                  ? "text-lift-primary"
                                  : "text-workout-primary"
                                : isDarkMode
                                  ? "text-iron-300"
                                  : "text-slate-700"
                            }`}
                          >
                            {dayNum}
                          </div>
                        </th>
                      ))}
                      <th
                        className={`p-3 text-center font-medium min-w-[50px] ${
                          isDarkMode ? "text-iron-400" : "text-slate-500"
                        }`}
                      >
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {/* Workouts Row */}
                    <tr
                      className={`border-b ${isDarkMode ? "border-iron-800/30" : "border-slate-100"}`}
                    >
                      <td
                        className={`sticky left-0 z-10 p-2 ${isDarkMode ? "bg-iron-900" : "bg-white"}`}
                      >
                        <div className="flex items-center gap-1.5 max-w-[100px]">
                          <div
                            className={`w-6 h-6 min-w-[24px] rounded-md flex items-center justify-center ${
                              isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/20"
                            }`}
                          >
                            <Dumbbell
                              className={`w-3.5 h-3.5 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
                            />
                          </div>
                          <span
                            className={`font-medium text-xs leading-tight ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                          >
                            Workouts
                          </span>
                        </div>
                      </td>
                      {dailyHistoryData.days?.map(({ date, isToday }) => {
                        const data = dailyHistoryData.workoutsByDay?.[date];
                        return (
                          <td
                            key={date}
                            className={`p-2 text-center ${
                              isToday
                                ? isDarkMode
                                  ? "bg-lift-primary/10"
                                  : "bg-workout-primary/10"
                                : ""
                            }`}
                          >
                            {data?.hasActivity ? (
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${
                                  isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/20"
                                }`}
                              >
                                <Check
                                  className={`w-4 h-4 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
                                />
                              </span>
                            ) : (
                              <span className={isDarkMode ? "text-iron-700" : "text-slate-300"}>
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center">
                        <span
                          className={`text-xs font-bold ${isDarkMode ? "text-iron-300" : "text-slate-600"}`}
                        >
                          {
                            Object.values(dailyHistoryData.workoutsByDay || {}).filter(
                              d => d.hasActivity
                            ).length
                          }
                        </span>
                      </td>
                    </tr>

                    {/* Habits Rows */}
                    {habitTrackables.map(habit => (
                      <tr
                        key={habit.id}
                        className={`border-b ${isDarkMode ? "border-iron-800/30" : "border-slate-100"}`}
                      >
                        <td
                          className={`sticky left-0 z-10 p-2 ${isDarkMode ? "bg-iron-900" : "bg-white"}`}
                        >
                          <div className="flex items-center gap-1.5 max-w-[100px]">
                            <div
                              className="w-6 h-6 min-w-[24px] rounded-md flex items-center justify-center text-xs"
                              style={{ backgroundColor: `${habit.color}30` }}
                            >
                              {habit.icon}
                            </div>
                            <span
                              className={`font-medium leading-tight ${habit.name.length > 12 ? "text-[10px]" : "text-xs"} ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                              style={{ wordBreak: "break-word" }}
                            >
                              {habit.name}
                            </span>
                          </div>
                        </td>
                        {dailyHistoryData.days?.map(({ date, isToday }) => {
                          const completed = dailyHistoryData.habitsByDay?.[habit.id]?.[date];
                          return (
                            <td
                              key={date}
                              className={`p-2 text-center ${
                                isToday
                                  ? isDarkMode
                                    ? "bg-lift-primary/10"
                                    : "bg-workout-primary/10"
                                  : ""
                              }`}
                            >
                              {completed ? (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
                                  style={{ backgroundColor: `${habit.color}30` }}
                                >
                                  <Check className="w-4 h-4" style={{ color: habit.color }} />
                                </span>
                              ) : (
                                <span className={isDarkMode ? "text-iron-700" : "text-slate-300"}>
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center">
                          <span
                            className={`text-xs font-bold ${isDarkMode ? "text-iron-300" : "text-slate-600"}`}
                          >
                            {
                              Object.values(dailyHistoryData.habitsByDay?.[habit.id] || {}).filter(
                                Boolean
                              ).length
                            }
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Food Rows */}
                    {foodItems.map(food => (
                      <tr
                        key={food.id}
                        className={`border-b ${isDarkMode ? "border-iron-800/30" : "border-slate-100"}`}
                      >
                        <td
                          className={`sticky left-0 z-10 p-2 ${isDarkMode ? "bg-iron-900" : "bg-white"}`}
                        >
                          <div className="flex items-center gap-1.5 max-w-[100px]">
                            <div
                              className="w-6 h-6 min-w-[24px] rounded-md flex items-center justify-center text-xs"
                              style={{ backgroundColor: `${food.color}30` }}
                            >
                              {food.icon}
                            </div>
                            <span
                              className={`font-medium leading-tight ${food.name.length > 12 ? "text-[10px]" : "text-xs"} ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                              style={{ wordBreak: "break-word" }}
                            >
                              {food.name}
                            </span>
                          </div>
                        </td>
                        {dailyHistoryData.days?.map(({ date, isToday }) => {
                          const logged = dailyHistoryData.foodByDay?.[food.id]?.[date];
                          return (
                            <td
                              key={date}
                              className={`p-2 text-center ${
                                isToday
                                  ? isDarkMode
                                    ? "bg-lift-primary/10"
                                    : "bg-workout-primary/10"
                                  : ""
                              }`}
                            >
                              {logged ? (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
                                  style={{ backgroundColor: `${food.color}30` }}
                                >
                                  <Check className="w-4 h-4" style={{ color: food.color }} />
                                </span>
                              ) : (
                                <span className={isDarkMode ? "text-iron-700" : "text-slate-300"}>
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center">
                          <span
                            className={`text-xs font-bold ${isDarkMode ? "text-iron-300" : "text-slate-600"}`}
                          >
                            {
                              Object.values(dailyHistoryData.foodByDay?.[food.id] || {}).filter(
                                Boolean
                              ).length
                            }
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {monthlyHistoryData.months?.length === 0 && (
                <div
                  className={`text-center py-8 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                >
                  No history data available yet
                </div>
              )}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Layout>
  );
}

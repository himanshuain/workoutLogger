import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkout } from "@/context/WorkoutContext";
import { getLocalDateStr, transformSessionData } from "@/lib/dashboardData";
import { dailyMacroSeries, sumMacrosForDay } from "@/lib/macroCalculations";

/** Shared analytics queries for dashboard and macros pages. */
export function useAnalyticsData({ lookbackDays = 365 } = {}) {
  const {
    user,
    trackables,
    todayEntries,
    foodItems,
    todayFoodEntries,
    today,
    getExerciseLogs,
    getTrackingEntries,
    getWorkoutSessions,
    getFoodEntries,
  } = useWorkout();

  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - lookbackDays);
    return getLocalDateStr(d);
  }, [lookbackDays]);

  const sessionsQuery = useQuery({
    queryKey: ["workoutSessions", user?.id, startDate, today],
    queryFn: async () => {
      const sessions = await getWorkoutSessions(startDate, today);
      return transformSessionData(sessions);
    },
    enabled: !!user,
  });

  const legacyQuery = useQuery({
    queryKey: ["exerciseLogs", user?.id, startDate, today],
    queryFn: async () => {
      const logs = await getExerciseLogs(startDate, today);
      const byExerciseName = {};
      logs.forEach(log => {
        if (!byExerciseName[log.exercise_name]) byExerciseName[log.exercise_name] = [];
        byExerciseName[log.exercise_name].push(log);
      });
      return { exerciseLogsByName: byExerciseName, allLogs: logs };
    },
    enabled: !!user,
  });

  const trackingQuery = useQuery({
    queryKey: ["trackingEntries", user?.id, startDate, today],
    queryFn: () => getTrackingEntries(startDate, today),
    enabled: !!user,
  });

  const foodQuery = useQuery({
    queryKey: ["foodHistory", user?.id, startDate, today],
    queryFn: () => getFoodEntries(startDate, today),
    enabled: !!user,
  });

  const workoutHeatmapData = sessionsQuery.data?.workoutData || [];

  const exerciseLogsByName = useMemo(() => {
    const merged = { ...(legacyQuery.data?.exerciseLogsByName || {}) };
    Object.entries(sessionsQuery.data?.exerciseLogsByName || {}).forEach(([name, logs]) => {
      if (!merged[name]) merged[name] = [];
      merged[name] = [...merged[name], ...logs];
    });
    return merged;
  }, [legacyQuery.data, sessionsQuery.data]);

  const habitTrackables = useMemo(
    () => trackables.filter(t => t.name !== "Body Weight"),
    [trackables],
  );

  const foodHistory = foodQuery.data || [];

  const todayMacros = useMemo(() => {
    const entries = [
      ...foodHistory.filter(e => e.date === today),
      ...Object.entries(todayFoodEntries)
        .filter(([id]) => !foodHistory.some(e => e.date === today && e.food_item_id === id))
        .map(([, e]) => ({ ...e, date: today })),
    ];
    return sumMacrosForDay(entries, foodItems, today);
  }, [foodHistory, foodItems, todayFoodEntries, today]);

  const macroSeries = useMemo(
    () => dailyMacroSeries(foodHistory, foodItems, startDate, today),
    [foodHistory, foodItems, startDate, today],
  );

  const isLoading =
    sessionsQuery.isPending || legacyQuery.isPending || trackingQuery.isPending || foodQuery.isPending;

  return {
    user,
    today,
    startDate,
    isLoading,
    workoutHeatmapData,
    exerciseLogsByName,
    trackingEntries: trackingQuery.data || [],
    habitTrackables,
    todayEntries,
    foodItems,
    todayFoodEntries,
    foodHistory,
    todayMacros,
    macroSeries,
    allSessions: sessionsQuery.data?.allSessions || [],
  };
}

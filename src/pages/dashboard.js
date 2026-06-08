import { useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import { useWorkout } from "@/context/WorkoutContext";
import Layout from "@/components/Layout";
import { PageContainer } from "@/components/layout/PageContainer";
import { FadeIn } from "@/components/ui/fade-in";
import { SkeletonSection, SkeletonStats } from "@/components/SkeletonLoader";
import {
  LazyActivityHeatmap,
  LazyBodyWeightTracker,
  LazyGoalsWidget,
  LazyMuscleHeatmap,
  LazyTrackingOverview,
} from "@/components/charts/lazyCharts";
import {
  LazyDashboardStatCards,
  LazyWorkoutTrendChart,
  LazyVolumeTrendChart,
  LazyHabitConsistencyChart,
  LazyExerciseProgressChart,
  LazyCategoryVolumeChart,
} from "@/components/dashboard/lazyDashboard";
import MacroProgressRings from "@/components/macros/MacroProgressRings";
import MacroTargetsEditor from "@/components/macros/MacroTargetsEditor";
import { LazyMacroTrendChart } from "@/components/macros/lazyMacros";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import {
  computeDashboardStats,
  weeklyWorkoutSeries,
  weeklyVolumeSeries,
  weeklyHabitSeries,
  topExercisesForChart,
  exerciseProgressSeries,
  volumeByCategory,
} from "@/lib/dashboardData";
import { getMacroTargets } from "@/lib/macroCalculations";
import CollapsibleSection from "@/components/CollapsibleSection";
import { Beef, BarChart3, CalendarDays, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { actionSecondaryCompact } from "@/lib/actionButtonStyles";

export default function Dashboard() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { settings, updateSettings } = useWorkout();
  const analytics = useAnalyticsData();
  const macroTargets = getMacroTargets(settings);
  const unit = settings?.unit || "kg";

  const {
    user,
    today,
    isLoading,
    workoutHeatmapData,
    exerciseLogsByName,
    trackingEntries,
    habitTrackables,
    todayEntries,
    foodItems,
    todayFoodEntries,
    todayMacros,
    macroSeries,
  } = analytics;

  const stats = useMemo(
    () =>
      computeDashboardStats({
        workoutHeatmapData,
        todayEntries,
        habitTrackables,
        todayFoodEntries,
        foodItems,
        macroTotals: todayMacros.totals,
      }),
    [workoutHeatmapData, todayEntries, habitTrackables, todayFoodEntries, foodItems, todayMacros],
  );

  const workoutTrend = useMemo(() => weeklyWorkoutSeries(workoutHeatmapData, 12), [workoutHeatmapData]);
  const volumeTrend = useMemo(() => weeklyVolumeSeries(exerciseLogsByName, 12), [exerciseLogsByName]);
  const habitTrend = useMemo(
    () => weeklyHabitSeries(trackingEntries, habitTrackables, 8),
    [trackingEntries, habitTrackables],
  );
  const topExercises = useMemo(() => topExercisesForChart(exerciseLogsByName, 5), [exerciseLogsByName]);
  const exerciseSeries = useMemo(
    () => exerciseProgressSeries(topExercises),
    [topExercises],
  );
  const categoryData = useMemo(() => volumeByCategory(exerciseLogsByName), [exerciseLogsByName]);
  const exerciseNames = topExercises.map(e => e.name);

  const habitDataByTrackable = useMemo(() => {
    const byTrackable = {};
    trackingEntries.forEach(entry => {
      if (!byTrackable[entry.trackable_id]) byTrackable[entry.trackable_id] = {};
      if (entry.is_completed) byTrackable[entry.trackable_id][entry.date] = 1;
    });
    return Object.fromEntries(
      Object.entries(byTrackable).map(([id, dates]) => [
        id,
        Object.entries(dates).map(([date, count]) => ({ date, count })),
      ]),
    );
  }, [trackingEntries]);

  const foodDataByItem = useMemo(() => {
    const byItem = {};
    analytics.foodHistory.forEach(entry => {
      if (!byItem[entry.food_item_id]) byItem[entry.food_item_id] = {};
      byItem[entry.food_item_id][entry.date] = entry.quantity || 1;
    });
    Object.entries(todayFoodEntries).forEach(([itemId, entry]) => {
      if (!byItem[itemId]) byItem[itemId] = {};
      if (!byItem[itemId][today]) byItem[itemId][today] = entry.quantity || 1;
    });
    return Object.fromEntries(
      Object.entries(byItem).map(([id, dates]) => [
        id,
        Object.entries(dates).map(([date, count]) => ({ date, count })),
      ]),
    );
  }, [analytics.foodHistory, todayFoodEntries, today]);

  const handleSaveTargets = useCallback(
    async newTargets => {
      try {
        await updateSettings({ macro_targets: newTargets });
        toast.success("Macro targets updated");
      } catch {
        toast.error("Failed to save targets");
      }
    },
    [updateSettings],
  );

  const habitHeatmapData = useMemo(() => {
    const byDate = {};
    trackingEntries.forEach(entry => {
      if (entry.is_completed) {
        byDate[entry.date] = (byDate[entry.date] || 0) + 1;
      }
    });
    return Object.entries(byDate).map(([date, count]) => ({ date, count }));
  }, [trackingEntries]);

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>Sign in to view your dashboard</p>
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
      <FadeIn duration={0.4}>
        <PageContainer className="py-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className={`text-xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                Dashboard
              </h2>
              <p className={`text-sm mt-0.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                Progress & insights
              </p>
            </div>
            <Link
              href="/macro-planner"
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-card px-3 py-2 text-xs font-semibold",
                actionSecondaryCompact(isDarkMode),
              )}
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.25} />
              Plan
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <SkeletonStats />
              <SkeletonSection />
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              <LazyDashboardStatCards stats={stats} isDarkMode={isDarkMode} />

              <CollapsibleSection
                title="Macro Tracker"
                icon={Beef}
                defaultOpen={false}
                isDarkMode={isDarkMode}
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <MacroTargetsEditor
                      targets={macroTargets}
                      onSave={handleSaveTargets}
                      isDarkMode={isDarkMode}
                    />
                    <Link
                      href="/food"
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-card px-3 py-2 text-xs font-semibold",
                        actionSecondaryCompact(isDarkMode),
                      )}
                    >
                      <Utensils className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.25} />
                      Food
                    </Link>
                  </div>
                  <MacroProgressRings
                    totals={todayMacros.totals}
                    targets={macroTargets}
                    isDarkMode={isDarkMode}
                  />
                  <LazyMacroTrendChart
                    data={macroSeries}
                    isDarkMode={isDarkMode}
                    macroTargets={macroTargets}
                  />
                  <p className={`text-xs text-center ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                    Log food on{" "}
                    <Link href="/food" className="underline">
                      Food
                    </Link>{" "}
                    or plan on{" "}
                    <Link href="/macro-planner" className="underline">
                      Planner
                    </Link>
                  </p>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Charts"
                icon={BarChart3}
                defaultOpen={false}
                isDarkMode={isDarkMode}
              >
                <div className="space-y-4">
                  <LazyWorkoutTrendChart data={workoutTrend} isDarkMode={isDarkMode} />
                  <LazyVolumeTrendChart data={volumeTrend} isDarkMode={isDarkMode} />

                  <div className="grid grid-cols-1 gap-4">
                    <LazyHabitConsistencyChart data={habitTrend} isDarkMode={isDarkMode} />
                    <LazyExerciseProgressChart
                      data={exerciseSeries}
                      exercises={exerciseNames}
                      isDarkMode={isDarkMode}
                      unit={unit}
                    />
                  </div>

                  <LazyCategoryVolumeChart data={categoryData} isDarkMode={isDarkMode} />
                </div>
              </CollapsibleSection>

              <LazyTrackingOverview
                trackables={habitTrackables}
                habitDataByTrackable={habitDataByTrackable}
                todayEntries={todayEntries}
                exerciseLogsByName={exerciseLogsByName}
                workoutData={workoutHeatmapData}
                foodItems={foodItems}
                foodDataByItem={foodDataByItem}
                todayFoodEntries={todayFoodEntries}
                today={today}
                isDarkMode={isDarkMode}
              />

              <LazyActivityHeatmap
                data={workoutHeatmapData}
                type="workout"
                label="Workout Activity"
                subtitle={`${stats.workoutsThisMonth} workout${stats.workoutsThisMonth !== 1 ? "s" : ""} this month`}
                isDarkMode={isDarkMode}
              />

              <LazyGoalsWidget
                isDarkMode={isDarkMode}
                workoutHeatmapData={workoutHeatmapData}
                habitHeatmapData={habitHeatmapData}
                trackables={habitTrackables}
                todayEntries={todayEntries}
              />

              <LazyBodyWeightTracker isDarkMode={isDarkMode} />

              <LazyMuscleHeatmap
                exerciseLogsByName={exerciseLogsByName}
                isDarkMode={isDarkMode}
              />
            </div>
          )}
        </PageContainer>
      </FadeIn>
    </Layout>
  );
}

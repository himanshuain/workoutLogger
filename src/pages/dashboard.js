import { useMemo, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import { useWorkout } from "@/context/WorkoutContext";
import Layout from "@/components/Layout";
import { PageContainer } from "@/components/layout/PageContainer";
import { FadeIn } from "@/components/ui/fade-in";
import { SkeletonSection } from "@/components/SkeletonLoader";
import {
  LazyActivityHeatmap,
  LazyBodyWeightTracker,
  LazyGoalsWidget,
  LazyMuscleHeatmap,
  LazyTrackingOverview,
} from "@/components/charts/lazyCharts";
import {
  LazyVolumeTrendChart,
  LazyExerciseProgressChart,
  LazyCategoryVolumeChart,
} from "@/components/dashboard/lazyDashboard";
import MacroProgressRings from "@/components/macros/MacroProgressRings";
import MacroTargetsEditor from "@/components/macros/MacroTargetsEditor";
import { LazyMacroTrendChart } from "@/components/macros/lazyMacros";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import {
  computeDashboardStats,
  weeklyVolumeSeries,
  volumeByCategory,
} from "@/lib/dashboardData";
import { buildWorkoutSplitsByDate } from "@/lib/workoutHeatmapData";
import { getMacroTargets } from "@/lib/macroCalculations";
import {
  readPinnedCharts,
  writePinnedCharts,
  togglePinnedChart,
} from "@/lib/dashboardPins";
import DashboardSectionTabs from "@/components/dashboard/DashboardSectionTabs";
import PinnableChart from "@/components/dashboard/PinnableChart";
import { Beef, BarChart3, CalendarDays, Download, Pin, Target, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { actionSecondaryCompact } from "@/lib/actionButtonStyles";
import WorkoutExportModal from "@/components/dashboard/WorkoutExportModal";
import FoodTrackingActivity from "@/components/food/FoodTrackingActivity";

export default function Dashboard() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { settings, updateSettings } = useWorkout();
  const analytics = useAnalyticsData();
  const macroTargets = getMacroTargets(settings);
  const unit = settings?.unit || "kg";
  const [exportOpen, setExportOpen] = useState(false);
  const [pinnedCharts, setPinnedCharts] = useState([]);
  const [activeTab, setActiveTab] = useState("macros");

  useEffect(() => {
    const pins = readPinnedCharts();
    setPinnedCharts(pins);
    if (pins.length > 0) {
      setActiveTab("pinned");
    }
  }, []);

  const handleTogglePin = useCallback(chartId => {
    setPinnedCharts(prev => {
      const next = togglePinnedChart(prev, chartId);
      writePinnedCharts(next);
      if (!prev.includes(chartId)) {
        setActiveTab("pinned");
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (activeTab === "pinned" && pinnedCharts.length === 0) {
      setActiveTab("macros");
    } else if (activeTab === "activity") {
      setActiveTab("charts");
    }
  }, [activeTab, pinnedCharts.length]);

  const isPinned = useCallback(chartId => pinnedCharts.includes(chartId), [pinnedCharts]);

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
    allSessions,
    foodHistory,
  } = analytics;

  const workoutSplitsByDate = useMemo(
    () => buildWorkoutSplitsByDate(allSessions),
    [allSessions],
  );

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

  const volumeTrend = useMemo(() => weeklyVolumeSeries(exerciseLogsByName, 12), [exerciseLogsByName]);
  const categoryData = useMemo(() => volumeByCategory(exerciseLogsByName), [exerciseLogsByName]);

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

  const trackingOverviewProps = {
    trackables: habitTrackables,
    habitDataByTrackable,
    todayEntries,
    exerciseLogsByName,
    workoutSplitsByDate,
    foodItems,
    foodDataByItem,
    todayFoodEntries,
    today,
    isDarkMode,
  };

  const renderChart = chartId => {
    switch (chartId) {
      case "macro_trend":
        return (
          <LazyMacroTrendChart data={macroSeries} isDarkMode={isDarkMode} macroTargets={macroTargets} />
        );
      case "volume":
        return <LazyVolumeTrendChart data={volumeTrend} isDarkMode={isDarkMode} />;
      case "exercise_progress":
        return (
          <LazyExerciseProgressChart
            exerciseLogsByName={exerciseLogsByName}
            isDarkMode={isDarkMode}
            unit={unit}
          />
        );
      case "category_volume":
        return <LazyCategoryVolumeChart data={categoryData} isDarkMode={isDarkMode} />;
      case "tracking_overview":
        return <LazyTrackingOverview {...trackingOverviewProps} />;
      case "activity_heatmap":
        return (
          <LazyActivityHeatmap
            data={workoutHeatmapData}
            type="workout"
            label="Workout Activity"
            subtitle={`${stats.workoutsThisMonth} workout${stats.workoutsThisMonth !== 1 ? "s" : ""} this month`}
            isDarkMode={isDarkMode}
          />
        );
      case "food_activity":
        return foodItems.length > 0 ? (
          <FoodTrackingActivity
            foodItems={foodItems}
            foodHistory={foodHistory}
            todayFoodEntries={todayFoodEntries}
            today={today}
            isDarkMode={isDarkMode}
          />
        ) : null;
      case "goals":
        return (
          <LazyGoalsWidget
            isDarkMode={isDarkMode}
            workoutHeatmapData={workoutHeatmapData}
            habitHeatmapData={habitHeatmapData}
            trackables={habitTrackables}
            todayEntries={todayEntries}
          />
        );
      case "body_weight":
        return <LazyBodyWeightTracker isDarkMode={isDarkMode} />;
      case "muscle_heatmap":
        return <LazyMuscleHeatmap exerciseLogsByName={exerciseLogsByName} isDarkMode={isDarkMode} />;
      default:
        return null;
    }
  };

  const wrapChart = (chartId, node) => {
    if (!node) return null;
    return (
      <PinnableChart
        chartId={chartId}
        isPinned={isPinned(chartId)}
        onTogglePin={handleTogglePin}
        isDarkMode={isDarkMode}
      >
        {node}
      </PinnableChart>
    );
  };

  const showChart = chartId => !isPinned(chartId);

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
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-card px-3 py-2 text-xs font-semibold",
                  actionSecondaryCompact(isDarkMode),
                )}
              >
                <Download className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.25} />
                Export
              </button>
              <Link
                href="/macro-planner"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-card px-3 py-2 text-xs font-semibold",
                  actionSecondaryCompact(isDarkMode),
                )}
              >
                <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.25} />
                Plan
              </Link>
            </div>
          </div>

          <WorkoutExportModal open={exportOpen} onOpenChange={setExportOpen} isDarkMode={isDarkMode} />

          {isLoading ? (
            <div className="space-y-4">
              <SkeletonSection />
            </div>
          ) : (
            <DashboardSectionTabs
              isDarkMode={isDarkMode}
              value={activeTab}
              onValueChange={setActiveTab}
              tabs={[
                {
                  value: "pinned",
                  label: "Pinned",
                  icon: Pin,
                  badge: pinnedCharts.length || null,
                  hidden: pinnedCharts.length === 0,
                  content: (
                    <>
                      {pinnedCharts.map(chartId => (
                        <div key={`pinned-${chartId}`}>{wrapChart(chartId, renderChart(chartId))}</div>
                      ))}
                    </>
                  ),
                },
                {
                  value: "macros",
                  label: "Macros",
                  icon: Beef,
                  content: (
                    <>
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
                      {showChart("macro_trend")
                        ? wrapChart(
                            "macro_trend",
                            <LazyMacroTrendChart
                              data={macroSeries}
                              isDarkMode={isDarkMode}
                              macroTargets={macroTargets}
                            />,
                          )
                        : null}
                    </>
                  ),
                },
                {
                  value: "charts",
                  label: "Charts",
                  icon: BarChart3,
                  content: (
                    <>
                      {showChart("volume")
                        ? wrapChart(
                            "volume",
                            <LazyVolumeTrendChart data={volumeTrend} isDarkMode={isDarkMode} />,
                          )
                        : null}
                      {showChart("exercise_progress")
                        ? wrapChart(
                            "exercise_progress",
                            <LazyExerciseProgressChart
                              exerciseLogsByName={exerciseLogsByName}
                              isDarkMode={isDarkMode}
                              unit={unit}
                            />,
                          )
                        : null}
                      {showChart("category_volume")
                        ? wrapChart(
                            "category_volume",
                            <LazyCategoryVolumeChart data={categoryData} isDarkMode={isDarkMode} />,
                          )
                        : null}
                      {showChart("tracking_overview")
                        ? wrapChart("tracking_overview", <LazyTrackingOverview {...trackingOverviewProps} />)
                        : null}
                      {showChart("activity_heatmap")
                        ? wrapChart(
                            "activity_heatmap",
                            <LazyActivityHeatmap
                              data={workoutHeatmapData}
                              type="workout"
                              label="Workout Activity"
                              subtitle={`${stats.workoutsThisMonth} workout${stats.workoutsThisMonth !== 1 ? "s" : ""} this month`}
                              isDarkMode={isDarkMode}
                            />,
                          )
                        : null}
                      {showChart("food_activity") && foodItems.length > 0
                        ? wrapChart(
                            "food_activity",
                            <FoodTrackingActivity
                              foodItems={foodItems}
                              foodHistory={foodHistory}
                              todayFoodEntries={todayFoodEntries}
                              today={today}
                              isDarkMode={isDarkMode}
                            />,
                          )
                        : null}
                    </>
                  ),
                },
                {
                  value: "goals",
                  label: "Goals",
                  icon: Target,
                  content: (
                    <>
                      {showChart("goals")
                        ? wrapChart(
                            "goals",
                            <LazyGoalsWidget
                              isDarkMode={isDarkMode}
                              workoutHeatmapData={workoutHeatmapData}
                              habitHeatmapData={habitHeatmapData}
                              trackables={habitTrackables}
                              todayEntries={todayEntries}
                            />,
                          )
                        : null}
                      {showChart("body_weight")
                        ? wrapChart("body_weight", <LazyBodyWeightTracker isDarkMode={isDarkMode} />)
                        : null}
                      {showChart("muscle_heatmap")
                        ? wrapChart(
                            "muscle_heatmap",
                            <LazyMuscleHeatmap
                              exerciseLogsByName={exerciseLogsByName}
                              isDarkMode={isDarkMode}
                            />,
                          )
                        : null}
                    </>
                  ),
                },
              ]}
            />
          )}
        </PageContainer>
      </FadeIn>
    </Layout>
  );
}

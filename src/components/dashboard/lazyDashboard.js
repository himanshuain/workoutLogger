import dynamic from "next/dynamic";

export const LazyWorkoutTrendChart = dynamic(
  () => import("@/components/dashboard/WorkoutTrendChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
export const LazyVolumeTrendChart = dynamic(
  () => import("@/components/dashboard/VolumeTrendChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
export const LazyHabitConsistencyChart = dynamic(
  () => import("@/components/dashboard/HabitConsistencyChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
export const LazyExerciseProgressChart = dynamic(
  () => import("@/components/dashboard/ExerciseProgressChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
export const LazyCategoryVolumeChart = dynamic(
  () => import("@/components/dashboard/CategoryVolumeChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
export const LazyMacroTrendChart = dynamic(
  () => import("@/components/dashboard/MacroTrendChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
export const LazyDashboardStatCards = dynamic(
  () => import("@/components/dashboard/DashboardStatCards"),
  { ssr: false },
);

function ChartSkeleton() {
  return <div className="h-48 w-full rounded-card bg-surface-interactive animate-pulse" />;
}

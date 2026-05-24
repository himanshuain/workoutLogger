import dynamic from "next/dynamic";

function workoutSectionFallback() {
  return (
    <div className="section-spacing animate-pulse">
      <div className="h-40 rounded-card bg-surface-interactive opacity-40" />
    </div>
  );
}

export const LazyTodayWorkoutSection = dynamic(
  () => import("@/components/workout/TodayWorkoutSection"),
  { loading: workoutSectionFallback },
);

export const LazyLogDayWorkoutPanel = dynamic(
  () => import("@/components/logging/LogDayWorkoutPanel"),
);

export const LazyHomeWorkoutHistory = dynamic(
  () => import("@/components/home/HomeWorkoutHistory"),
);

export const LazyHomeRoutineSelectorModal = dynamic(
  () => import("@/components/home/HomeRoutineSelectorModal"),
  { ssr: false },
);

export const LazyHomeAddHabitModal = dynamic(
  () => import("@/components/home/HomeAddHabitModal"),
  { ssr: false },
);

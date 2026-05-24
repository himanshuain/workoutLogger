import dynamic from "next/dynamic";
import { SkeletonHeatmap, SkeletonSection } from "@/components/SkeletonLoader";

const sectionFallback = () => <SkeletonSection rows={0} />;
const heatmapFallback = () => <SkeletonHeatmap />;

export const LazyActivityHeatmap = dynamic(() => import("@/components/ActivityHeatmap"), {
  loading: heatmapFallback,
});

export const LazyTrackingOverview = dynamic(() => import("@/components/TrackingOverview"), {
  loading: sectionFallback,
});

export const LazyGoalsWidget = dynamic(() => import("@/components/GoalsWidget"), {
  loading: sectionFallback,
});

export const LazyBodyWeightTracker = dynamic(() => import("@/components/BodyWeightTracker"), {
  loading: sectionFallback,
});

export const LazyVolumeChart = dynamic(() => import("@/components/VolumeChart"), {
  loading: sectionFallback,
});

export const LazyMuscleHeatmap = dynamic(() => import("@/components/MuscleHeatmap"), {
  loading: sectionFallback,
  ssr: false,
});

export const LazyProgressGraph = dynamic(() => import("@/components/ProgressGraph"));

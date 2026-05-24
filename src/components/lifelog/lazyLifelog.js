import dynamic from "next/dynamic";

export const LazyExpandedLogInsightsTabs = dynamic(
  () => import("@/components/logging/ExpandedLogInsightsTabs"),
);

export const LazyEventExpandedInsightsGraph = dynamic(
  () => import("@/components/logging/EventExpandedInsightsGraph"),
);

export const LazyNotificationSettings = dynamic(
  () => import("@/components/NotificationSettings"),
  { ssr: false },
);

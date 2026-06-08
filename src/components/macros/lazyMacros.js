import dynamic from "next/dynamic";

export const LazyProteinBreakdownChart = dynamic(
  () => import("@/components/macros/ProteinBreakdownChart"),
  { ssr: false, loading: () => <div className="h-52 rounded-card bg-surface-interactive animate-pulse" /> },
);
export const LazyMacroTrendChart = dynamic(
  () => import("@/components/dashboard/MacroTrendChart"),
  { ssr: false, loading: () => <div className="h-48 rounded-card bg-surface-interactive animate-pulse" /> },
);

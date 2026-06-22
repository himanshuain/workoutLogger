import DashboardPinButton from "@/components/dashboard/DashboardPinButton";
import { ChartPinProvider } from "@/components/dashboard/ChartPinContext";

export default function PinnableChart({ chartId, isPinned, onTogglePin, isDarkMode, children }) {
  const pinButton = (
    <DashboardPinButton
      isPinned={isPinned}
      onClick={() => onTogglePin(chartId)}
      isDarkMode={isDarkMode}
    />
  );

  return <ChartPinProvider pinButton={pinButton}>{children}</ChartPinProvider>;
}

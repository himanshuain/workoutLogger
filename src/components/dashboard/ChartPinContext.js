import { createContext, useContext } from "react";

const ChartPinContext = createContext(null);

export function ChartPinProvider({ pinButton, children }) {
  return <ChartPinContext.Provider value={pinButton}>{children}</ChartPinContext.Provider>;
}

export function useChartPin() {
  return useContext(ChartPinContext);
}

/** Renders the pin control when the chart is wrapped in PinnableChart. */
export function ChartPinSlot({ className }) {
  const pin = useChartPin();
  if (!pin) return null;
  return <span className={className}>{pin}</span>;
}

/** Recharts color tokens aligned with app theme. */
export function getChartColors(isDarkMode) {
  if (isDarkMode) {
    return {
      primary: "#fbbf24",
      secondary: "#f59e0b",
      success: "#22c55e",
      info: "#3b82f6",
      purple: "#a78bfa",
      pink: "#f472b6",
      teal: "#2dd4bf",
      grid: "#3f3f46",
      axis: "#71717a",
      tooltipBg: "#27272a",
      tooltipBorder: "#3f3f46",
      text: "#a1a1aa",
      textBright: "#f4f4f5",
    };
  }
  return {
    primary: "#d91a11",
    secondary: "#b01510",
    success: "#3d8b6e",
    info: "#004236",
    purple: "#7c3aed",
    pink: "#db2777",
    teal: "#0d9488",
    grid: "rgba(0, 66, 54, 0.08)",
    axis: "rgba(0, 66, 54, 0.52)",
    tooltipBg: "#faf8f3",
    tooltipBorder: "rgba(0, 66, 54, 0.14)",
    text: "rgba(0, 66, 54, 0.52)",
    textBright: "#004236",
  };
}

export function chartTooltipStyle(isDarkMode) {
  const c = getChartColors(isDarkMode);
  return {
    backgroundColor: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    borderRadius: 12,
    fontSize: 12,
    color: c.textBright,
  };
}

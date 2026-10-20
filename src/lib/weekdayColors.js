/** Enabled-day styling for the habit week strip (single green palette). */
export function weekdayStripCellStyle({ highlighted = false, isDarkMode = false } = {}) {
  const green = isDarkMode ? "#22c55e" : "#16a34a";
  if (highlighted) {
    return {
      backgroundColor: green,
      color: "#fff",
    };
  }
  return {
    backgroundColor: isDarkMode ? "rgba(34, 197, 94, 0.2)" : "rgba(22, 163, 74, 0.14)",
    color: green,
  };
}

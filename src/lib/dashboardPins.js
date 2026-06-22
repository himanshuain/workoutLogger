export const DASHBOARD_PIN_STORAGE_KEY = "dashboard-pinned-charts";

export const PINNABLE_CHART_IDS = [
  "macro_trend",
  "volume",
  "exercise_progress",
  "category_volume",
  "tracking_overview",
  "activity_heatmap",
  "food_activity",
  "goals",
  "body_weight",
  "muscle_heatmap",
];

export function readPinnedCharts() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DASHBOARD_PIN_STORAGE_KEY);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(id => PINNABLE_CHART_IDS.includes(id));
  } catch {
    return [];
  }
}

export function writePinnedCharts(ids) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DASHBOARD_PIN_STORAGE_KEY, JSON.stringify(ids));
}

export function togglePinnedChart(current, chartId) {
  if (current.includes(chartId)) {
    return current.filter(id => id !== chartId);
  }
  return [...current, chartId];
}

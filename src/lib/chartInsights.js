/** Format a week-start date string for display. */
export function formatWeekRange(weekStartStr) {
  if (!weekStartStr) return "";
  const start = new Date(weekStartStr + "T12:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatFullDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function deltaLabel(current, previous, unit = "") {
  if (previous == null || previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0) return `Same as prior period`;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff}${unit} vs prior period`;
}

export function trendWord(values) {
  if (!values || values.length < 2) return null;
  const recent = values.slice(-3);
  const older = values.slice(-6, -3);
  if (!older.length) return null;
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  if (recentAvg > olderAvg * 1.1) return "Trending up";
  if (recentAvg < olderAvg * 0.9) return "Trending down";
  return "Holding steady";
}

export function sumValues(data, key) {
  return (data || []).reduce((acc, d) => acc + (Number(d[key]) || 0), 0);
}

export function avgValues(data, key) {
  if (!data?.length) return 0;
  return Math.round((sumValues(data, key) / data.length) * 10) / 10;
}

export function maxEntry(data, key) {
  if (!data?.length) return null;
  return data.reduce((best, d) => ((Number(d[key]) || 0) > (Number(best[key]) || 0) ? d : best), data[0]);
}

export function formatVolume(vol) {
  const n = Number(vol) || 0;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

export function habitRateInsight(rate) {
  if (rate >= 80) return "Excellent consistency";
  if (rate >= 60) return "Good — room to tighten up";
  if (rate >= 40) return "Moderate — try stacking habits";
  return "Low — focus on 1–2 key habits";
}

export function proteinInsight(current, target) {
  if (!target) return null;
  const pct = Math.round((current / target) * 100);
  if (pct >= 100) return `At or above your ${target}g target`;
  return `${target - Math.round(current)}g remaining to hit ${target}g target`;
}

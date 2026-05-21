/** Gap formatting helpers for lifelog calendar views. */

export function formatDaysSince(days) {
  if (days === null || days === undefined) return "Never";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "1 month ago";
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  if (days < 730) return "1 year ago";
  return `${Math.floor(days / 365)} years ago`;
}

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const GAP_MONTH_DAYS = 30;
export const GAP_WEEK_DAYS = 7;

export function buildGapTierOrder(gapDays) {
  const order = ["d"];
  if (gapDays >= GAP_WEEK_DAYS) order.push("w");
  if (gapDays >= GAP_MONTH_DAYS) order.push("m");
  return order;
}

export function nextTierAriaHint(tiers, idx) {
  if (tiers.length < 2) return "";
  const next = tiers[(idx + 1) % tiers.length];
  if (next === "d") return " Tap again for days.";
  if (next === "w") return " Tap again for weeks.";
  return " Tap again for months.";
}

export function formatGapCompoundWeeks(totalDays) {
  if (totalDays <= 0) return "";
  const w = Math.floor(totalDays / 7);
  const d = totalDays % 7;
  const parts = [];
  if (w > 0) parts.push(`${w}w`);
  if (d > 0) parts.push(`${d}d`);
  return parts.length ? parts.join(" ") : "0d";
}

export function formatGapCompoundMonths(totalDays) {
  if (totalDays <= 0) return "";
  let rem = Math.max(0, Math.floor(totalDays));
  const months = Math.floor(rem / GAP_MONTH_DAYS);
  rem -= months * GAP_MONTH_DAYS;
  const weeks = Math.floor(rem / 7);
  rem -= weeks * 7;
  const days = rem;

  const parts = [];
  if (months > 0) parts.push(months === 1 ? "1 month" : `${months} months`);
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (parts.length === 0 && totalDays > 0) parts.push(`${Math.floor(totalDays)}d`);

  return parts.join(" ");
}

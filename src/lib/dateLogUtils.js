/** Shared date helpers for Log + Today date strip. */

export function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysStr(isoDate, deltaDays) {
  const [y, mo, da] = isoDate.split("-").map(Number);
  const dt = new Date(y, mo - 1, da);
  dt.setDate(dt.getDate() + deltaDays);
  return localDateStr(dt);
}

export function formatChipLabel(iso, todayRef) {
  const t = todayRef || localDateStr();
  const yest = addDaysStr(t, -1);
  const dby = addDaysStr(t, -2);
  if (iso === t) return "Today";
  if (iso === yest) return "Yesterday";
  if (iso === dby) return "Day before yesterday";
  const dt = new Date(iso + "T12:00:00");
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function formatShortDate(iso) {
  const dt = new Date(iso + "T12:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDayHeaderFull(iso, todayRef) {
  const d = new Date(iso + "T12:00:00");
  const todayYear = new Date((todayRef || localDateStr()) + "T12:00:00").getFullYear();
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== todayYear ? { year: "numeric" } : {}),
  });
}

/** Page header + sticky scroll bar: primary title with optional full-date subtitle. */
export function formatDayHeader(iso, todayRef) {
  const relative = formatChipLabel(iso, todayRef || localDateStr());
  const full = formatDayHeaderFull(iso, todayRef);

  if (relative === "Today") {
    return { title: "Today", subtitle: full };
  }
  if (relative === "Yesterday" || relative === "Day before yesterday") {
    return { title: relative, subtitle: full };
  }
  return { title: full, subtitle: null };
}

/** @deprecated Use formatDayHeader */
export function formatPastDayScrollLabel(iso, todayRef) {
  return formatDayHeader(iso, todayRef);
}

/** @deprecated Legacy fixed window; prefer STRIP_INITIAL_DAYS + load-more. */
export const STRIP_WINDOW_DAYS = 35;

/** First paint: days ending at today (inclusive). */
export const STRIP_INITIAL_DAYS = 10;

/** Each time user scrolls to the oldest edge, extend the strip by this many older days. */
export const STRIP_LOAD_MORE_DAYS = 10;

/** Cap total days on the strip (past + today) to avoid unbounded queries. */
export const STRIP_MAX_PAST_DAYS = 400;

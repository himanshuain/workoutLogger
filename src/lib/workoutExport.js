
import { getLocalDateStr } from "@/context/utils/getLocalDateStr";

export const ALL_TIME_START = "2000-01-01";

export const EXPORT_PRESETS = [
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "last_3_months", label: "Last 3 months" },
  { id: "this_year", label: "This year" },
  { id: "all_time", label: "All time" },
];

/** YYYY-MM for the current local month. */
export function currentMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function shiftMonthKey(monthKey, deltaMonths) {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(year, month - 1 + deltaMonths, 1);
  return currentMonthKey(d);
}

/** First and last calendar dates for a YYYY-MM month key. */
export function getMonthBounds(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Resolve start/end dates for an export preset. */
export function getExportBounds(presetId, today = getLocalDateStr()) {
  const todayDate = new Date(`${today}T12:00:00`);

  switch (presetId) {
    case "this_month": {
      const bounds = getMonthBounds(currentMonthKey(todayDate));
      return {
        startDate: bounds.startDate,
        endDate: today < bounds.endDate ? today : bounds.endDate,
      };
    }
    case "last_month":
      return getMonthBounds(shiftMonthKey(currentMonthKey(todayDate), -1));
    case "last_3_months": {
      const start = getMonthBounds(shiftMonthKey(currentMonthKey(todayDate), -2)).startDate;
      return { startDate: start, endDate: today };
    }
    case "this_year":
      return { startDate: `${todayDate.getFullYear()}-01-01`, endDate: today };
    case "all_time":
      return { startDate: ALL_TIME_START, endDate: today };
    default:
      return getExportBounds("this_month", today);
  }
}

export function getExportRangeLabel(presetId) {
  return EXPORT_PRESETS.find(p => p.id === presetId)?.label ?? "This month";
}

export function resolveExportPresetId(payload, fallback = "this_month") {
  return payload?.range?.preset ?? payload?.presetId ?? fallback;
}

export function getExportDateBounds(payload) {
  const workouts = payload?.workouts || [];
  const end = payload?.range?.end ?? workouts[0]?.date;
  let start = payload?.range?.start;
  if (!start && workouts.length) {
    start = workouts[workouts.length - 1].date;
  }
  return { start, end };
}

export function formatMonthSpanLabel(startDate, endDate) {
  if (!startDate || !endDate) return null;

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  if (start.getFullYear() === end.getFullYear()) {
    const startName = start.toLocaleDateString("en-US", { month: "long" });
    const endName = end.toLocaleDateString("en-US", { month: "long" });
    return `${startName} – ${endName} ${end.getFullYear()}`;
  }

  const startLabel = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

export function formatExportPeriodLabel(payload) {
  const presetLabel = getExportRangeLabel(resolveExportPresetId(payload));
  const { start, end } = getExportDateBounds(payload);
  const months = formatMonthSpanLabel(start, end);
  return months ? `${presetLabel} · ${months}` : presetLabel;
}

function groupSetsByExercise(sets) {
  const map = new Map();
  sets.forEach(set => {
    const key = set.exercise_name;
    if (!map.has(key)) {
      map.set(key, { name: set.exercise_name, category: set.category || "other", sets: [] });
    }
    map.get(key).sets.push({
      set_number: set.set_number,
      weight: Number(set.weight) || 0,
      reps: Number(set.reps) || 0,
    });
  });
  return Array.from(map.values()).map(ex => ({
    ...ex,
    sets: ex.sets.sort((a, b) => a.set_number - b.set_number),
  }));
}

function legacyToSets(log) {
  const count = Math.max(1, Number(log.sets) || 1);
  return Array.from({ length: count }, (_, i) => ({
    set_number: i + 1,
    weight: Number(log.weight) || 0,
    reps: Number(log.reps) || 0,
  }));
}

/** Normalize sessions + legacy logs into a single export payload. */
export function buildWorkoutExportPayload({
  sessions = [],
  legacyLogs = [],
  unit = "kg",
  startDate,
  endDate,
  presetId = "this_month",
}) {
  const allTime = presetId === "all_time";
  const byDate = new Map();

  sessions.forEach(session => {
    if (session.status !== "completed") return;
    const date = session.date;
    if (!byDate.has(date)) {
      byDate.set(date, { date, sessions: [], legacy_logs: [] });
    }
    const completedSets = (session.set_logs || []).filter(s => s.is_completed);
    if (completedSets.length === 0) return;
    byDate.get(date).sessions.push({
      id: session.id,
      routine_name: session.routine_name || "Workout",
      completed_at: session.completed_at,
      exercises: groupSetsByExercise(completedSets),
    });
  });

  legacyLogs.forEach(log => {
    const date = log.date;
    if (!byDate.has(date)) {
      byDate.set(date, { date, sessions: [], legacy_logs: [] });
    }
    byDate.get(date).legacy_logs.push({
      exercise_name: log.exercise_name,
      weight: Number(log.weight) || 0,
      reps: Number(log.reps) || 0,
      sets: Number(log.sets) || 1,
      notes: log.notes || null,
    });
  });

  const workouts = Array.from(byDate.values())
    .filter(day => day.sessions.length > 0 || day.legacy_logs.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  let totalSets = 0;
  let totalVolume = 0;
  workouts.forEach(day => {
    day.sessions.forEach(session => {
      session.exercises.forEach(ex => {
        ex.sets.forEach(s => {
          totalSets += 1;
          totalVolume += s.weight * s.reps;
        });
      });
    });
    day.legacy_logs.forEach(log => {
      const n = Math.max(1, log.sets);
      totalSets += n;
      totalVolume += log.weight * log.reps * n;
    });
  });

  return {
    exported_at: new Date().toISOString(),
    unit,
    presetId,
    range: {
      start: allTime ? null : startDate,
      end: endDate,
      all_time: allTime,
      preset: presetId,
    },
    summary: {
      workout_days: workouts.length,
      total_sets: totalSets,
      total_volume: Math.round(totalVolume),
    },
    workouts,
  };
}

export function exportFilename(base, ext, { presetId } = {}) {
  return `${base}-${presetId || "export"}.${ext}`;
}

function formatShortDateLabel(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatWeight(weight, unit) {
  const n = Number(weight) || 0;
  const rounded = Math.round(n * 10) / 10;
  const text = Number.isInteger(rounded) ? String(Math.round(rounded)) : rounded.toFixed(1);
  return `${text} ${unit}`;
}

export function formatSetsInline(sets, unit) {
  return sets
    .map(set => `${formatWeight(set.weight, unit)}×${set.reps}`)
    .join(" · ");
}

const PDF_PAGE_WIDTH = 794;
const PDF_PAGE_MAX_HEIGHT = 1040;

const PDF_STYLES = `
  .pdf-page {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial,
      "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
    font-size: 11px;
    line-height: 1.3;
    color: #1a1a1a;
    background: #fff;
    width: ${PDF_PAGE_WIDTH}px;
    padding: 8px 12px;
    box-sizing: border-box;
  }
  .pdf-page * { box-sizing: border-box; }
  .pdf-block { margin-bottom: 10px; }
  .pdf-block:last-child { margin-bottom: 0; }
  .title-row {
    font-size: 14px;
    font-weight: 700;
    margin: 0 0 3px;
  }
  .stats-row {
    font-size: 10px;
    color: #444;
    margin: 0;
  }
  .pdf-divider { border: none; border-top: 1px solid #ddd; margin: 8px 0; }
  .day-header {
    background: #d91a11;
    color: #fff;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    margin: 0 0 5px;
    text-align: center;
  }
  .routine-name {
    font-size: 9px;
    font-weight: 700;
    color: #666;
    margin: 0 0 3px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .exercise-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4px;
  }
  .exercise-table td {
    padding: 2px 0;
    vertical-align: top;
    font-size: 10px;
  }
  .exercise-table .name {
    width: 44%;
    font-weight: 600;
    color: #111;
    padding-right: 10px;
    word-break: break-word;
  }
  .exercise-table .sets {
    width: 56%;
    color: #444;
    text-align: right;
    word-break: break-word;
  }
`;

function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text != null && text !== "") node.textContent = text;
  return node;
}

function appendExerciseRows(doc, parent, exercises, unit) {
  const table = el(doc, "table", "exercise-table");
  const tbody = doc.createElement("tbody");
  exercises.forEach(({ name, sets }) => {
    const row = doc.createElement("tr");
    const nameCell = doc.createElement("td");
    nameCell.className = "name";
    nameCell.textContent = name || "Exercise";
    const setsCell = doc.createElement("td");
    setsCell.className = "sets";
    setsCell.textContent = formatSetsInline(sets, unit);
    row.appendChild(nameCell);
    row.appendChild(setsCell);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  parent.appendChild(table);
}

function buildDayBlock(doc, day, unit) {
  const activeSessions = day.sessions.filter(s => s.exercises.length > 0);
  const hasLegacy = day.legacy_logs.length > 0;
  if (activeSessions.length === 0 && !hasLegacy) return null;

  const block = el(doc, "div", "pdf-block");
  let dayHeaderText = formatShortDateLabel(day.date);
  if (activeSessions.length === 1 && !hasLegacy) {
    dayHeaderText += ` · ${activeSessions[0].routine_name || "Workout"}`;
  }
  block.appendChild(el(doc, "div", "day-header", dayHeaderText));

  activeSessions.forEach(session => {
    if (activeSessions.length > 1 || hasLegacy) {
      block.appendChild(el(doc, "div", "routine-name", session.routine_name || "Workout"));
    }
    appendExerciseRows(
      doc,
      block,
      session.exercises.map(ex => ({ name: ex.name, sets: ex.sets })),
      unit,
    );
  });

  if (hasLegacy) {
    block.appendChild(el(doc, "div", "routine-name", "Earlier logs"));
    appendExerciseRows(
      doc,
      block,
      day.legacy_logs.map(log => ({ name: log.exercise_name, sets: legacyToSets(log) })),
      unit,
    );
  }

  return block;
}

function buildHeaderBlock(doc, payload) {
  const unit = payload.unit;
  const rangeLabel = formatExportPeriodLabel(payload);
  const block = el(doc, "div", "pdf-block");
  block.appendChild(el(doc, "p", "title-row", `Workout History · ${rangeLabel}`));
  block.appendChild(el(
    doc,
    "p",
    "stats-row",
    `${payload.summary.workout_days} days · ${payload.summary.total_sets} sets · ${payload.summary.total_volume.toLocaleString()} ${unit} volume`,
  ));
  block.appendChild(el(doc, "hr", "pdf-divider"));
  return block;
}

function createPageShell(doc) {
  return el(doc, "div", "pdf-page");
}

/** Pack content blocks into page-sized containers using live DOM measurement. */
function packPdfPages(blocks, doc, mount) {
  const pages = [];
  let page = createPageShell(doc);
  mount.appendChild(page);

  blocks.forEach(block => {
    page.appendChild(block);
    if (page.scrollHeight > PDF_PAGE_MAX_HEIGHT && page.childNodes.length > 1) {
      page.removeChild(block);
      pages.push(page);
      page = createPageShell(doc);
      mount.appendChild(page);
      page.appendChild(block);
    }
  });

  if (page.childNodes.length > 0) {
    pages.push(page);
  }

  return pages;
}

function buildContentBlocks(payload, doc) {
  const blocks = [buildHeaderBlock(doc, payload)];
  if (payload.workouts.length === 0) {
    blocks.push(el(doc, "div", "pdf-block", "No workouts in this period."));
    return blocks;
  }
  payload.workouts.forEach(day => {
    const block = buildDayBlock(doc, day, payload.unit);
    if (block) blocks.push(block);
  });
  return blocks;
}

function waitForLayout() {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function renderToCanvas(element) {
  const html2canvas = (await import("html2canvas")).default;
  const height = element.scrollHeight;
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: PDF_PAGE_WIDTH,
    height,
    windowWidth: PDF_PAGE_WIDTH,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
  });
}

/** Build a DOM tree for PDF export (uses textContent so emojis render correctly). */
export function createWorkoutExportElement(payload, doc = document) {
  const mount = el(doc, "div");
  const blocks = buildContentBlocks(payload, doc);
  const pages = packPdfPages(blocks, doc, mount);
  const root = el(doc, "div");
  pages.forEach(page => root.appendChild(page));
  return root;
}

/** Generate and download a PDF report via browser rendering (supports emojis & unicode). */
export async function downloadWorkoutPdf(payload, filename, { presetId: presetOverride } = {}) {
  if (typeof document === "undefined") {
    throw new Error("PDF export is only available in the browser");
  }

  if (!payload?.summary || !Array.isArray(payload?.workouts)) {
    throw new Error("Invalid export data");
  }

  const presetId = presetOverride ?? resolveExportPresetId(payload);
  const exportPayload = {
    ...payload,
    presetId,
    range: {
      ...(payload.range || {}),
      preset: presetId,
    },
  };

  const { jsPDF } = await import("jspdf");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;top:0;left:0;width:794px;border:0;opacity:0;pointer-events:none;z-index:999999;";
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  if (!idoc) {
    document.body.removeChild(iframe);
    throw new Error("PDF export failed to initialize");
  }

  idoc.open();
  idoc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PDF_STYLES}</style></head><body style="margin:0;background:#fff;color:#1a1a1a;"></body></html>`,
  );
  idoc.close();

  const mount = idoc.body;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 10;
  const contentW = pageWidth - margin * 2;

  try {
    const blocks = buildContentBlocks(exportPayload, idoc);
    const pages = packPdfPages(blocks, idoc, mount);
    await waitForLayout();

    if (pages.length === 0) {
      throw new Error("PDF export produced no content");
    }

    for (let i = 0; i < pages.length; i += 1) {
      const pageEl = pages[i];
      iframe.style.height = `${Math.max(pageEl.scrollHeight, 80)}px`;
      await waitForLayout();

      const canvas = await renderToCanvas(pageEl);
      if (!canvas.width || !canvas.height) continue;

      if (i > 0) pdf.addPage();
      let drawW = contentW;
      let drawH = (canvas.height * drawW) / canvas.width;
      const maxH = pdf.internal.pageSize.getHeight() - margin * 2;
      if (drawH > maxH) {
        drawH = maxH;
        drawW = (canvas.width * drawH) / canvas.height;
      }
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, drawW, drawH);
    }

    pdf.save(filename);
  } finally {
    mount.innerHTML = "";
    document.body.removeChild(iframe);
  }
}

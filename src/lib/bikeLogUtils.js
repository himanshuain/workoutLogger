import { filterBikeEventTypes } from "@/lib/bikeEventScope";
import { formatDaysSince } from "@/lib/lifelogUtils";

export const BIKE_SCOPE_FILTER_ALL = "all";
export const BIKE_SCOPE_FILTER_UNTAGGED = "untagged";
export const BIKE_SCOPE_FILTER_PENDING = "pending";

/** Whole calendar days from log date to today (0 = today). */
export function calendarDaysBeforeToday(dateStr) {
  if (!dateStr) return null;
  const logDate = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  logDate.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
  return days < 0 ? 0 : days;
}

export function formatRelativeFromToday(dateStr) {
  const days = calendarDaysBeforeToday(dateStr);
  if (days === null) return "";
  return formatDaysSince(days);
}

export function normalizeTags(tags) {
  if (!tags) return [];
  const list = Array.isArray(tags) ? tags : String(tags).split(/[,#]/);
  return [...new Set(list.map(t => String(t).trim().toLowerCase()).filter(Boolean))];
}

export function resolveLogTags(log) {
  return normalizeTags(log?.tags);
}

export function logNeedsTags(log) {
  return resolveLogTags(log).length === 0;
}

export function isEventTypeOverdue(eventType) {
  return Boolean(
    eventType?.reminder_days &&
      eventType.days_since !== null &&
      eventType.days_since >= eventType.reminder_days,
  );
}

/** Split stored log into title + body (supports legacy single notes field). */
export function resolveBikeLogFields(log) {
  let title = String(log?.title || "").trim();
  let body = String(log?.notes || "").trim();
  if (!title && body) {
    const nl = body.indexOf("\n");
    if (nl > 0) {
      title = body.slice(0, nl).trim();
      body = body.slice(nl + 1).trim();
    } else {
      title = body;
      body = "";
    }
  }
  const rawKm = log?.odometer_km;
  const odometer_km =
    rawKm != null && rawKm !== "" && !Number.isNaN(Number(rawKm)) ? Math.round(Number(rawKm)) : null;
  return { title, body, odometer_km };
}

/** Tags used on other entries — for suggesting in the drawer. */
export function collectSuggestedTags(logs, selectedTags = []) {
  const selected = new Set(normalizeTags(selectedTags));
  const out = new Set();
  for (const row of logs) {
    for (const t of normalizeTags(row.tags || [])) {
      if (!selected.has(t)) out.add(t);
    }
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}

/** All distinct tags from history + current selection (one pill per tag). */
export function collectKnownBikeTags(logs, selectedTags = []) {
  const out = new Set();
  for (const row of logs || []) {
    for (const t of normalizeTags(row.tags || [])) out.add(t);
  }
  for (const t of normalizeTags(selectedTags)) out.add(t);
  return [...out].sort((a, b) => a.localeCompare(b));
}

export function packBikeLogForSave({ title, notes, cost, odometer_km, tags }) {
  const t = String(title || "").trim();
  const n = String(notes || "").trim();
  return {
    title: t || null,
    notes: n || null,
    cost: cost ?? null,
    odometer_km: odometer_km ?? null,
    tags: normalizeTags(tags),
  };
}

/**
 * @typedef {object} FlatBikeLog
 * @property {string} id
 * @property {string} eventTypeId
 * @property {string} eventName
 * @property {string} eventIcon
 * @property {string} eventColor
 * @property {string} date
 * @property {string|null} notes
 * @property {string} title
 * @property {string} body
 * @property {number|null} cost
 * @property {number|null} odometer_km
 * @property {string[]} tags
 * @property {boolean} needsTags
 */

/** Event types included on /bike-logs (`scope = 'bike'`). */
export function eventTypesForBikePage(eventTypes = []) {
  return filterBikeEventTypes(eventTypes);
}

/** Flatten logs from bike-scoped event types, newest first. */
export function flattenBikeLogs(eventTypes = []) {
  const sources = eventTypesForBikePage(eventTypes);
  const rows = [];
  for (const et of sources) {
    for (const log of et.event_logs || []) {
      const tags = resolveLogTags(log);
      const { title, body, odometer_km } = resolveBikeLogFields(log);
      rows.push({
        id: log.id,
        eventTypeId: et.id,
        eventName: et.name,
        eventIcon: et.icon,
        eventColor: et.color,
        date: log.date,
        notes: log.notes ?? null,
        title,
        body,
        cost: log.cost ?? null,
        odometer_km,
        tags,
        needsTags: tags.length === 0,
        created_at: log.created_at,
      });
    }
  }
  rows.sort((a, b) => {
    const d = String(b.date).localeCompare(String(a.date));
    if (d !== 0) return d;
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });
  return rows;
}

/** Filter pills from tags you have actually used (no built-in suggestions). */
export function collectTagFilters(logs) {
  const fromLogs = new Set();
  for (const row of logs) {
    for (const t of row.tags) fromLogs.add(t);
  }
  return [...fromLogs].sort((a, b) => a.localeCompare(b));
}

export function filterBikeLogsByPill(logs, pill) {
  if (!pill || pill === BIKE_SCOPE_FILTER_ALL) return logs;
  if (pill === BIKE_SCOPE_FILTER_UNTAGGED) return logs.filter(l => l.needsTags);
  if (pill === BIKE_SCOPE_FILTER_PENDING) return logs.filter(l => l.needsTags);
  return logs.filter(l => l.tags.includes(pill));
}

export function getPendingBikeMaintenance(eventTypes = []) {
  return eventTypesForBikePage(eventTypes).filter(isEventTypeOverdue);
}

export function getUntaggedBikeLogs(logs) {
  return logs.filter(l => l.needsTags);
}

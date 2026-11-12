/** Local fallback when `event_logs.tags` column is not migrated yet. */

const STORAGE_KEY = "bike_log_tags_v1";

function readMap() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeMap(map) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function readLocalLogTags(logId) {
  if (!logId) return [];
  const map = readMap();
  const raw = map[logId];
  return Array.isArray(raw) ? raw.map(t => String(t).trim().toLowerCase()).filter(Boolean) : [];
}

export function writeLocalLogTags(logId, tags) {
  if (!logId) return;
  const map = readMap();
  const normalized = [...new Set(tags.map(t => String(t).trim().toLowerCase()).filter(Boolean))];
  if (normalized.length === 0) {
    delete map[logId];
  } else {
    map[logId] = normalized;
  }
  writeMap(map);
}

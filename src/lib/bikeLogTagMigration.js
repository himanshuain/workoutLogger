/** One-time: push legacy localStorage tags into `event_logs.tags`. */

const STORAGE_KEY = "bike_log_tags_v1";

function readTagMap() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export async function migrateLocalBikeLogTagsToDb(updateEventLog) {
  if (!updateEventLog || typeof window === "undefined") return;
  const map = readTagMap();
  const ids = Object.keys(map);
  if (ids.length === 0) return;

  let migrated = 0;
  for (const logId of ids) {
    const tags = map[logId];
    if (!Array.isArray(tags) || tags.length === 0) continue;
    const result = await updateEventLog(logId, { tags });
    if (result) migrated += 1;
  }

  if (migrated > 0) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

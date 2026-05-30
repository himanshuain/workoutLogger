const PREFIX = "wl_area_collapse_";

export function areaCollapseStorageKey(sessionId) {
  if (!sessionId) return null;
  return `${PREFIX}${sessionId}`;
}

/** @returns {Set<string> | null} collapsed area ids */
export function readAreaCollapse(storageKey) {
  if (!storageKey || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter(a => typeof a === "string")) : null;
  } catch {
    return null;
  }
}

/** @param {Set<string>} collapsedAreas */
export function writeAreaCollapse(storageKey, collapsedAreas) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify([...collapsedAreas]));
  } catch {
    /* quota / private mode */
  }
}

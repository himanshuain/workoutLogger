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

/**
 * Hydrate or sync collapsed areas when group list changes.
 * When `knownAreas` is null, restores from storage (first collapsible render after navigation).
 * Otherwise only adds genuinely new areas — never treats an empty in-memory set as "all known".
 *
 * @param {object} opts
 * @param {Set<string> | null} opts.knownAreas — areas seen on last sync; null = hydrate
 * @param {Set<string>} opts.currentAreas
 * @param {Set<string>} opts.prevCollapsed
 * @param {Set<string> | null} opts.stored
 * @param {boolean} opts.defaultExpanded
 */
export function resolveAreaCollapseAfterGroupChange({
  knownAreas,
  currentAreas,
  prevCollapsed,
  stored,
  defaultExpanded,
}) {
  if (knownAreas == null) {
    const collapsed =
      stored ?? (defaultExpanded ? new Set() : new Set(currentAreas));
    return { collapsed, knownAreas: new Set(currentAreas), changed: true };
  }

  let changed = false;
  const next = new Set();
  for (const area of prevCollapsed) {
    if (currentAreas.has(area)) next.add(area);
    else changed = true;
  }
  if (!defaultExpanded) {
    for (const area of currentAreas) {
      if (!knownAreas.has(area)) {
        next.add(area);
        changed = true;
      }
    }
  }
  return {
    collapsed: changed ? next : prevCollapsed,
    knownAreas: new Set(currentAreas),
    changed,
  };
}

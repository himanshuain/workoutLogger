const STORAGE_KEY = "bike_event_type_ids_v1";

function readIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeIds(ids) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids)]));
}

export function readLocalBikeEventIds() {
  return readIds();
}

export function addLocalBikeEventId(id) {
  if (!id) return;
  writeIds([...readIds(), id]);
}

export function removeLocalBikeEventId(id) {
  if (!id) return;
  writeIds(readIds().filter(x => x !== id));
}

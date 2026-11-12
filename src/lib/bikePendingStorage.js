/** Local bike to-dos — mark done becomes a log entry. */

const STORAGE_KEY = "bike_pending_v1";

function readAll() {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeAll(items) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function readBikePendingItems() {
  return readAll()
    .map(item => ({
      id: String(item.id || ""),
      title: String(item.title || "").trim(),
      notes: item.notes ? String(item.notes).trim() : "",
      createdAt: item.createdAt || new Date().toISOString(),
    }))
    .filter(item => item.id && item.title)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function addBikePendingItem({ title, notes = "" }) {
  const t = String(title || "").trim();
  if (!t) return null;
  const item = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: t,
    notes: String(notes || "").trim(),
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...readAll()];
  writeAll(next);
  return item;
}

export function removeBikePendingItem(id) {
  if (!id) return;
  writeAll(readAll().filter(item => item.id !== id));
}

/** After one-time import into Supabase. */
export function clearBikePendingLocalStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

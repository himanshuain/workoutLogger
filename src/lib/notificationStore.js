/** IndexedDB mirror of notification schedules for service worker access. */

const DB_NAME = "logbook-notifications";
const DB_VERSION = 1;
const STORE = "schedules";
const META_STORE = "meta";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
  });
}

export async function syncSchedulesToIndexedDB(userId, schedules) {
  if (!userId || typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    const tx = db.transaction([STORE, META_STORE], "readwrite");
    const store = tx.objectStore(STORE);
    store.clear();
    for (const row of schedules || []) {
      const trackableId = row.trackable_id || row.id;
      store.put({
        id: trackableId,
        userId,
        title: row.title,
        body: row.body,
        icon: row.icon,
        time: row.time,
        days: row.days || [],
        enabled: row.enabled !== false,
      });
    }
    tx.objectStore(META_STORE).put(userId, "activeUserId");
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    notifyServiceWorker();
  } catch (err) {
    console.error("Failed to sync schedules to IndexedDB:", err);
  }
}

export async function readLastShown() {
  if (typeof indexedDB === "undefined") return {};
  try {
    const db = await openDb();
    const tx = db.transaction(META_STORE, "readonly");
    const req = tx.objectStore(META_STORE).get("lastShown");
    const result = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || {});
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return {};
  }
}

export async function writeLastShown(lastShown) {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    const tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).put(lastShown, "lastShown");
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export function notifyServiceWorker() {
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({ type: "CHECK_REMINDERS" });
}

export async function registerPeriodicSync() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("periodicSync" in reg) {
      await reg.periodicSync.register("check-reminders", { minInterval: 60 * 60 * 1000 });
    }
  } catch {
    /* periodicSync unsupported or denied */
  }
}

// Service Worker for Logbook PWA

const CACHE_NAME = "logbook-v1";
const IDB_NAME = "logbook-notifications";
const IDB_VERSION = 1;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(clients.claim());
});

self.addEventListener("message", event => {
  if (event.data?.type === "CHECK_REMINDERS") {
    event.waitUntil(checkReminders());
  }
});

function openNotificationDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

async function readSchedulesFromIdb() {
  try {
    const db = await openNotificationDb();
    const tx = db.transaction("schedules", "readonly");
    const store = tx.objectStore("schedules");
    const req = store.getAll();
    const rows = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows;
  } catch {
    return [];
  }
}

async function readLastShownFromIdb() {
  try {
    const db = await openNotificationDb();
    const tx = db.transaction("meta", "readonly");
    const req = tx.objectStore("meta").get("lastShown");
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

async function writeLastShownToIdb(lastShown) {
  try {
    const db = await openNotificationDb();
    const tx = db.transaction("meta", "readwrite");
    tx.objectStore("meta").put(lastShown, "lastShown");
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

async function checkReminders() {
  const schedules = await readSchedulesFromIdb();
  if (!schedules.length) return;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const currentDay = now.getDay();
  const today = now.toISOString().split("T")[0];
  const lastShown = await readLastShownFromIdb();

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;

    const [schedHour, schedMin] = schedule.time.split(":").map(Number);
    const [currHour, currMin] = currentTime.split(":").map(Number);
    const isTimeMatch = schedHour === currHour && schedMin === currMin;
    const isDayMatch = !schedule.days?.length || schedule.days.includes(currentDay);
    const scheduleId = schedule.id;
    const alreadyShownToday = lastShown[scheduleId] === today;

    if (isTimeMatch && isDayMatch && !alreadyShownToday) {
      await self.registration.showNotification(schedule.title, {
        body: schedule.body || "",
        icon: schedule.icon || "/favicon.svg",
        badge: "/favicon.svg",
        tag: `habit-${scheduleId}`,
        vibrate: [100, 50, 100],
        data: { trackableId: scheduleId },
      });
      lastShown[scheduleId] = today;
    }
  }

  await writeLastShownToIdb(lastShown);
}

self.addEventListener("push", event => {
  let data = { title: "Logbook Reminder", body: "Time to log your activity!" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [
      { action: "open", title: "Open App" },
      { action: "dismiss", title: "Dismiss" },
    ],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    }),
  );
});

self.addEventListener("sync", () => {
  /* reserved for offline logging */
});

self.addEventListener("periodicsync", event => {
  if (event.tag === "check-reminders") {
    event.waitUntil(checkReminders());
  }
});

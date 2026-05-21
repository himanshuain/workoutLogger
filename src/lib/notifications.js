import {
  notifyServiceWorker,
  readLastShown,
  registerPeriodicSync,
  syncSchedulesToIndexedDB,
  writeLastShown,
} from "@/lib/notificationStore";

// Notification utility for PWA

let scheduleCache = {};
let currentUserId = null;

function rowToSchedule(row) {
  const trackableId = row.trackable_id || row.id;
  return {
    id: trackableId,
    trackable_id: trackableId,
    title: row.title,
    body: row.body,
    icon: row.icon,
    time: row.time,
    days: row.days || [],
    enabled: row.enabled !== false,
  };
}

export const NotificationService = {
  setUserId(userId) {
    currentUserId = userId;
  },

  setSchedulesFromServer(rows, userId) {
    currentUserId = userId || currentUserId;
    const map = {};
    for (const row of rows || []) {
      const sched = rowToSchedule(row);
      map[sched.id] = sched;
    }
    scheduleCache = map;
    if (currentUserId) {
      void syncSchedulesToIndexedDB(
        currentUserId,
        Object.values(scheduleCache),
      );
    }
  },

  isSupported() {
    return "Notification" in window && "serviceWorker" in navigator;
  },

  getPermission() {
    if (!this.isSupported()) return "unsupported";
    return Notification.permission;
  },

  async requestPermission() {
    if (!this.isSupported()) {
      return { granted: false, reason: "unsupported" };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await registerPeriodicSync();
      }
      return {
        granted: permission === "granted",
        permission,
      };
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return { granted: false, reason: "error", error };
    }
  },

  scheduleNotification(id, { title, body, icon, time, days = [], enabled = true }) {
    const schedules = this.getSchedules();
    schedules[id] = { title, body, icon, time, days, enabled, id };
    scheduleCache = schedules;
    this.startScheduleChecker();
    notifyServiceWorker();
    return schedules[id];
  },

  removeSchedule(id) {
    const schedules = this.getSchedules();
    delete schedules[id];
    scheduleCache = schedules;
    notifyServiceWorker();
  },

  getSchedules() {
    return { ...scheduleCache };
  },

  getSchedule(id) {
    return scheduleCache[id] || null;
  },

  async showNotification(title, options = {}) {
    if (this.getPermission() !== "granted") {
      return false;
    }

    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body: options.body || "",
          icon: options.icon || "/favicon.svg",
          badge: "/favicon.svg",
          tag: options.tag || "logbook-notification",
          vibrate: [100, 50, 100],
          data: options.data || {},
          requireInteraction: options.requireInteraction || false,
          ...options,
        });
      } else {
        new Notification(title, {
          body: options.body || "",
          icon: options.icon || "/favicon.svg",
          tag: options.tag || "logbook-notification",
          ...options,
        });
      }
      return true;
    } catch (error) {
      console.error("Error showing notification:", error);
      return false;
    }
  },

  async checkSchedules() {
    const schedules = this.getSchedules();
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const currentDay = now.getDay();
    const today = now.toISOString().split("T")[0];

    const lastShown = await readLastShown();

    for (const schedule of Object.values(schedules)) {
      if (!schedule.enabled) continue;

      const [schedHour, schedMin] = schedule.time.split(":").map(Number);
      const [currHour, currMin] = currentTime.split(":").map(Number);

      const isTimeMatch = schedHour === currHour && schedMin === currMin;
      const isDayMatch =
        !schedule.days?.length || schedule.days.includes(currentDay);
      const alreadyShownToday = lastShown[schedule.id] === today;

      if (isTimeMatch && isDayMatch && !alreadyShownToday) {
        await this.showNotification(schedule.title, {
          body: schedule.body,
          icon: schedule.icon,
          tag: `habit-${schedule.id}`,
          data: { trackableId: schedule.id },
        });

        lastShown[schedule.id] = today;
        await writeLastShown(lastShown);
      }
    }
  },

  startScheduleChecker() {
    if (this._checkerInterval) return;
    void this.checkSchedules();
    this._checkerInterval = setInterval(() => {
      void this.checkSchedules();
    }, 60000);
  },

  stopScheduleChecker() {
    if (this._checkerInterval) {
      clearInterval(this._checkerInterval);
      this._checkerInterval = null;
    }
  },

  formatTime(time) {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  },

  dayNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  dayNamesFull: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
};

export default NotificationService;

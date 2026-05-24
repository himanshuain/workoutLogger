/** One-time localStorage → Supabase migrations (GoalsWidget pattern). */

export function readLocalActiveDays(userId) {
  if (typeof window === "undefined" || !userId) return {};
  try {
    const stored = localStorage.getItem(`logbook_active_days_${userId}`);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function cacheLocalActiveDays(userId, map) {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(`logbook_active_days_${userId}`, JSON.stringify(map));
}

export function readLocalRestMap(userId) {
  if (typeof window === "undefined" || !userId) return {};
  try {
    const raw = localStorage.getItem(`wl_routine_rest_${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function cacheLocalRestMap(userId, map) {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(`wl_routine_rest_${userId}`, JSON.stringify(map));
}

export function readLocalEventSettings() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("logbook_event_settings") || "{}");
  } catch {
    return {};
  }
}

export function readLocalNavConfig() {
  if (typeof window === "undefined") return { order: null, hidden: [], labels: {} };
  try {
    const stored = localStorage.getItem("logbook_nav_config");
    return stored ? JSON.parse(stored) : { order: null, hidden: [], labels: {} };
  } catch {
    return { order: null, hidden: [], labels: {} };
  }
}

export function cacheLocalNavConfig(config) {
  if (typeof window === "undefined") return;
  localStorage.setItem("logbook_nav_config", JSON.stringify(config));
}

export function readLocalExerciseMediaOverrides(userId) {
  if (typeof window === "undefined" || !userId) return {};
  try {
    const raw = localStorage.getItem(`wl_exercise_media_overrides_${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function cacheLocalExerciseMediaOverrides(userId, map) {
  if (typeof window === "undefined" || !userId) return;
  if (!map || typeof map !== "object") return;
  localStorage.setItem(`wl_exercise_media_overrides_${userId}`, JSON.stringify(map));
}

export function readLegacyNotificationSchedules() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("notification_schedules") || "{}");
  } catch {
    return {};
  }
}

/** Merge server trackables with local active_days; returns rows needing DB backfill. */
export function mergeTrackablesActiveDays(trackables, userId) {
  const local = readLocalActiveDays(userId);
  const toMigrate = [];

  const merged = (trackables || []).map(t => {
    const fromDb = t.active_days ?? null;
    const fromLocal = local[t.id] ?? null;
    const activeDays = fromDb ?? fromLocal ?? null;
    if (fromDb == null && fromLocal != null) {
      toMigrate.push({ id: t.id, active_days: fromLocal });
    }
    return { ...t, active_days: activeDays };
  });

  const cache = {};
  for (const t of merged) {
    if (t.active_days != null) cache[t.id] = t.active_days;
  }
  cacheLocalActiveDays(userId, cache);

  return { merged, toMigrate };
}

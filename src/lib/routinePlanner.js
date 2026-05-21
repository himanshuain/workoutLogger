/** Mon-first week UI (Sunday last). day_of_week matches JS Date: 0=Sun … 6=Sat */

import {
  cacheLocalRestMap,
  readLocalRestMap,
} from "@/lib/userPrefsMigration";

export const PLANNER_DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];

/** @deprecated use resolveRestMap */
export const REST_KEY = userId => `wl_routine_rest_${userId}`;

/** Resolve rest-day map: server settings first, then localStorage cache. */
export function resolveRestMap(userId, serverRestDays) {
  if (!userId) return {};
  const server =
    serverRestDays && typeof serverRestDays === "object" && !Array.isArray(serverRestDays)
      ? serverRestDays
      : {};
  if (Object.keys(server).length > 0) {
    cacheLocalRestMap(userId, server);
    return server;
  }
  return readLocalRestMap(userId);
}

/** @deprecated use resolveRestMap */
export function loadRestMap(userId, serverRestDays) {
  return resolveRestMap(userId, serverRestDays);
}

export async function persistRestMap(userId, map, updateSettings) {
  if (!userId) return;
  cacheLocalRestMap(userId, map);
  if (updateSettings) {
    await updateSettings({ routine_rest_days: map });
  }
}

/** @deprecated use persistRestMap */
export function saveRestMap(userId, map, updateSettings) {
  void persistRestMap(userId, map, updateSettings);
}

/** Mon–Sun order (0 = Sunday last in week), then templates with no day last. */
export function sortRoutinesForList(routines) {
  const rank = d => {
    if (d === null || d === undefined) return 999;
    if (d === 0) return 7;
    return d;
  };
  return [...routines].sort((a, b) => {
    const ra = rank(a.day_of_week);
    const rb = rank(b.day_of_week);
    if (ra !== rb) return ra - rb;
    return (a.name || "").localeCompare(b.name || "");
  });
}

export function routineDayLabel(dayOfWeek) {
  if (dayOfWeek === null || dayOfWeek === undefined) return "Any day";
  return PLANNER_DAYS.find(d => d.value === dayOfWeek)?.label ?? "Day";
}

export function routineSubtitleForDay({ markedRest, routine }) {
  if (markedRest) return "Rest";
  if (routine?.name?.trim()) return routine.name.trim();
  return "Not planned";
}

export function swapRestMarkers(map, dayA, dayB) {
  const next = { ...map };
  const hadA = !!next[dayA];
  const hadB = !!next[dayB];
  if (hadA) next[dayB] = true;
  else delete next[dayB];
  if (hadB) next[dayA] = true;
  else delete next[dayA];
  return next;
}

/** After moving one routine onto an empty day: clear conflicting flags on both weekdays. */
export function restMapAfterMove(map, sourceDay, targetDay) {
  const next = { ...map };
  delete next[sourceDay];
  delete next[targetDay];
  return next;
}

export function bareRoutineFields(routine, day_of_week) {
  return {
    name: routine.name,
    day_of_week,
    color: routine.color || "#3b82f6",
  };
}

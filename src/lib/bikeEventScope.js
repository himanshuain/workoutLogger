/** Bike-scoped lifelog event types (`event_types.scope = 'bike'`). */

export const BIKE_EVENT_SCOPE = "bike";

/** Matches your Life Log tracker named "Bike Logs" (works even if SQL scope update missed). */
export function isBikeEventTypeByName(eventType) {
  const name = String(eventType?.name || "").trim();
  return /^bike\s*logs?$/i.test(name) || /^bike-logs$/i.test(name);
}

export function isBikeEventType(eventType) {
  if (!eventType?.id) return false;
  if (eventType.scope === BIKE_EVENT_SCOPE) return true;
  return isBikeEventTypeByName(eventType);
}

export function filterBikeEventTypes(eventTypes = []) {
  return eventTypes.filter(isBikeEventType);
}

/** Events that stay on Home / Life Log (bike trackers live on /bike-logs). */
export function filterGeneralLifeLogEvents(eventTypes = []) {
  return eventTypes.filter(et => !isBikeEventType(et));
}

export async function markEventTypeAsBike(eventTypeId, updateEventType) {
  if (!eventTypeId || !updateEventType) return false;
  await updateEventType(eventTypeId, { scope: BIKE_EVENT_SCOPE });
  return true;
}

export async function unmarkEventTypeAsBike(eventTypeId, updateEventType) {
  if (!eventTypeId || !updateEventType) return;
  await updateEventType(eventTypeId, { scope: null });
}

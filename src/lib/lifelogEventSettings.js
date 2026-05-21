/** Per–event-type UI flags stored in Supabase on `event_types`. */

export const LIFELOG_EVENT_SETTINGS_CHANGED = "lifelog-event-settings-changed";

/** Announce same-tab listeners (storage event does not fire in the originating tab). */
export function notifyLifelogEventSettingsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LIFELOG_EVENT_SETTINGS_CHANGED));
}

/** Event types already include DB-backed UI flags. */
export function mergeEventTypesWithLifelogSettings(eventTypes = []) {
  return eventTypes.map(et => ({
    ...et,
    track_graph: et.track_graph || false,
    need_value: et.need_value || false,
    need_notes: et.need_notes || false,
  }));
}

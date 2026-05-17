/** Per–event-type UI flags stored beside Supabase (`track_graph`, required value/notes). */

export const LIFEBOOK_EVENT_SETTINGS_KEY = "logbook_event_settings";

export const LIFELOG_EVENT_SETTINGS_CHANGED = "lifelog-event-settings-changed";

export function readLifelogEventSettings() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LIFEBOOK_EVENT_SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Announce same-tab listeners (storage event does not fire in the originating tab). */
export function notifyLifelogEventSettingsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LIFELOG_EVENT_SETTINGS_CHANGED));
}

/**
 * Same merge as Lifelog page: toggles live in localStorage beside Supabase.
 */
export function mergeEventTypesWithLifelogSettings(eventTypes = []) {
  const settings = readLifelogEventSettings();
  return eventTypes.map(et => ({
    ...et,
    track_graph: settings[et.id]?.track_graph || false,
    need_value: settings[et.id]?.need_value || false,
    need_notes: settings[et.id]?.need_notes || false,
  }));
}

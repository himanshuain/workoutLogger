/** Lifelog page tab query values (see /lifelog). */
export const LIFELOG_TAB_EVENTS = "events";
export const LIFELOG_TAB_HABITS = "habits";

/**
 * @param {"events" | "habits"} [tab]
 * @returns {{ pathname: string; query: { tab: string } }}
 */
export function lifelogRoute(tab = LIFELOG_TAB_EVENTS) {
  const t = tab === LIFELOG_TAB_HABITS ? LIFELOG_TAB_HABITS : LIFELOG_TAB_EVENTS;
  return { pathname: "/lifelog", query: { tab: t } };
}

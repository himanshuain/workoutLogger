/**
 * Centralized navigation helpers for workout flows
 * Handles date-aware routing for today vs past-date sessions
 */

/**
 * Get the appropriate return path after workout actions based on session date
 * @param {Object} session - Workout session with date property
 * @returns {string} - Path to navigate to
 */
export function getPostWorkoutReturnPath(session) {
  if (!session?.date) return "/";
  
  const today = new Date().toISOString().split('T')[0];
  if (session.date === today) {
    return "/";
  }
  return `/?date=${session.date}`;
}

/**
 * Async helper to get return path when you only have sessionId
 * @param {string} sessionId - Session ID
 * @param {Function} getWorkoutSession - Context function to fetch session
 * @returns {Promise<string>} - Path to navigate to
 */
export async function getSessionAwareReturnPath(sessionId, getWorkoutSession) {
  if (!sessionId || !getWorkoutSession) return "/";
  
  try {
    const session = await getWorkoutSession(sessionId);
    return getPostWorkoutReturnPath(session);
  } catch (error) {
    console.error('Error getting session for navigation:', error);
    return "/";
  }
}

/**
 * After adding an exercise to a workout from the exercise browser (when `sessionId` is present).
 * Unlike {@link getPostWorkoutReturnPath} / {@link getSessionAwareReturnPath} (finish → home/date),
 * this always returns the active session route so the list reflects localStorage extras.
 * @param {string} sessionId
 * @returns {string}
 */
export function getPostAddExerciseSessionPath(sessionId) {
  if (!sessionId || typeof sessionId !== "string") return "/";
  return `/workout/${encodeURIComponent(sessionId)}`;
}

/** Next.js router query values can be `string | string[] | undefined`. */
export function getQueryParamString(query, key) {
  const v = query?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

/**
 * Landing route after “Add to today/session” from `/exercises` or `/exercises/custom`.
 * `addReturn=summary` returns to the workout summary so the completion screen stays consistent.
 * @param {string} sessionId
 * @param {Record<string, string | string[] | undefined>} [query]
 * @returns {string}
 */
export function getPostAddExerciseNavigatePath(sessionId, query) {
  if (!sessionId || typeof sessionId !== "string") return "/";
  const addReturn = getQueryParamString(query, "addReturn").trim().toLowerCase();
  if (addReturn === "summary") {
    return `/workout/${encodeURIComponent(sessionId)}/summary`;
  }
  return getPostAddExerciseSessionPath(sessionId);
}

/**
 * Get appropriate copy for exercise actions based on session date
 * @param {Object} session - Workout session with date property
 * @returns {Object} - Copy strings for UI
 */
export function getSessionAwareCopy(session) {
  if (!session?.date) {
    return {
      addedMessage: "Added to workout",
      addAction: "Add to workout",
      errorMessage: "Start a workout first"
    };
  }
  
  const today = new Date().toISOString().split('T')[0];
  const isToday = session.date === today;
  
  return {
    addedMessage: isToday ? "Added to today" : "Added to workout",
    addAction: isToday ? "Add to today" : "Add to workout", 
    errorMessage: isToday ? "Start a workout from Today first" : "Session not found"
  };
}

/**
 * Check if a session is for today
 * @param {Object} session - Workout session with date property
 * @returns {boolean} - True if session is for today
 */
export function isSessionToday(session) {
  if (!session?.date) return false;
  const today = new Date().toISOString().split('T')[0];
  return session.date === today;
}

/**
 * When exercises are opened from the routine planner (`returnTo`) and exercises are saved
 * to a routine, navigate back here so `day` restores the weekday on /plan (or /routine, which redirects).
 * Returns null unless `returnTo` is `plan` or `routine` and a weekday 0–6 is known.
 *
 * @param {Record<string, string | string[] | undefined>} query - `router.query`
 * @param {number} [pickedDay] - Day from RoutineDayPickerDialog when URL has no routineDay/day
 */
export function getRoutinePlannerReturnHref(query, pickedDay) {
  const returnToRaw = typeof query.returnTo === "string" ? query.returnTo.trim() : "";
  if (returnToRaw !== "plan" && returnToRaw !== "routine") return null;

  const pickStr = raw => {
    if (typeof raw !== "string") return null;
    const t = raw.trim();
    return t === "" ? null : t;
  };

  let dayRaw = pickStr(Array.isArray(query.day) ? query.day[0] : query.day);
  if (dayRaw == null) dayRaw = pickStr(Array.isArray(query.routineDay) ? query.routineDay[0] : query.routineDay);

  let dayNum = typeof dayRaw === "string" ? Number.parseInt(dayRaw, 10) : NaN;
  if (Number.isNaN(dayNum)) {
    if (typeof pickedDay === "number" && Number.isInteger(pickedDay)) dayNum = pickedDay;
    else dayNum = NaN;
  }
  if (Number.isNaN(dayNum) || dayNum < 0 || dayNum > 6) return null;

  const pathname = returnToRaw === "routine" ? "/routine" : "/plan";
  return `${pathname}?day=${encodeURIComponent(String(dayNum))}`;
}
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
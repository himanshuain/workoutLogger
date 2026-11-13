/**
 * Single source of truth for which Today workout panel to show (home / TodayWorkoutSection).
 * Priority: active > completed > no_routines > pick_routine
 */
export function getTodayWorkoutPhase({ hasUser, routines = [], activeSession, completedSession }) {
  if (!hasUser) return "unauthenticated";
  if (activeSession?.status === "active") return "active";
  if (completedSession?.status === "completed") return "completed";
  if (!routines?.length) return "no_routines";
  return "pick_routine";
}

import { createContext, useContext, useMemo } from "react";

const WorkoutAuthContext = createContext(null);

export function WorkoutAuthProvider({ value, children }) {
  const memo = useMemo(() => value, [value]);
  return <WorkoutAuthContext.Provider value={memo}>{children}</WorkoutAuthContext.Provider>;
}

export function useWorkoutAuthContext() {
  const ctx = useContext(WorkoutAuthContext);
  if (!ctx) {
    throw new Error("useWorkoutAuthContext must be used within WorkoutProvider");
  }
  return ctx;
}

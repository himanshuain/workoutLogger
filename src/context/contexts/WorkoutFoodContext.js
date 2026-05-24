import { createContext, useContext, useMemo } from "react";

const WorkoutFoodContext = createContext(null);

export function WorkoutFoodProvider({ value, children }) {
  const memo = useMemo(() => value, [value]);
  return <WorkoutFoodContext.Provider value={memo}>{children}</WorkoutFoodContext.Provider>;
}

export function useWorkoutFoodContext() {
  const ctx = useContext(WorkoutFoodContext);
  if (!ctx) {
    throw new Error("useWorkoutFoodContext must be used within WorkoutProvider");
  }
  return ctx;
}

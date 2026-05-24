import { createContext, useContext, useMemo } from "react";

const StepCardsContext = createContext(null);

export function StepCardsProvider({ value, children }) {
  const memo = useMemo(() => value, [value]);
  return <StepCardsContext.Provider value={memo}>{children}</StepCardsContext.Provider>;
}

export function useStepCardsContext() {
  const ctx = useContext(StepCardsContext);
  if (!ctx) {
    throw new Error("useStepCardsContext must be used within WorkoutProvider");
  }
  return ctx;
}

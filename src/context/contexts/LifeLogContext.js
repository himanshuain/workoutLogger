import { createContext, useContext, useMemo } from "react";

const LifeLogContext = createContext(null);

export function LifeLogProvider({ value, children }) {
  const memo = useMemo(() => value, [value]);
  return <LifeLogContext.Provider value={memo}>{children}</LifeLogContext.Provider>;
}

export function useLifeLogContext() {
  const ctx = useContext(LifeLogContext);
  if (!ctx) {
    throw new Error("useLifeLogContext must be used within WorkoutProvider");
  }
  return ctx;
}

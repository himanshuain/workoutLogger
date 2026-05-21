import { cn } from "@/lib/utils";

/** Shared outer chrome for Habits, Food, and DayHabitsLifeLogCard sections (Today / Log). */
export function sectionSurfaceClass(isDarkMode, className) {
  return cn(
    "rounded-card border p-4",
    isDarkMode ? "border-iron-800" : "border-slate-200",
    className,
  );
}

export default function SectionSurface({ isDarkMode, children, className }) {
  return <div className={sectionSurfaceClass(isDarkMode, className)}>{children}</div>;
}

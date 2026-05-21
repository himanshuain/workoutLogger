import { cn } from "@/lib/utils";
import { surfaceSection } from "@/lib/surfaceStyles";

/** Shared outer chrome for Habits, Food, and DayHabitsLifeLogCard sections (Today / Log). */
export function sectionSurfaceClass(isDarkMode, className) {
  return surfaceSection(isDarkMode, cn("p-4", className));
}

export default function SectionSurface({ isDarkMode, children, className }) {
  return <div className={sectionSurfaceClass(isDarkMode, className)}>{children}</div>;
}

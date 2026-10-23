import { cn } from "@/lib/utils";

/** Segmented control shell (layout toggle, session actions). */
export function workoutToolbarShellClass(isDarkMode) {
  return cn(
    "flex shrink-0 items-center gap-px rounded-lg p-0.5",
    isDarkMode
      ? "bg-iron-900/90 ring-1 ring-inset ring-iron-800/70"
      : "bg-slate-100 ring-1 ring-inset ring-slate-200/80",
  );
}

/** Full-width bar above the exercise grid. */
export function workoutGridToolbarBarClass(isDarkMode) {
  return cn(
    "mb-2 flex min-h-8 items-center justify-between gap-2 rounded-lg px-2 py-1",
    isDarkMode
      ? "bg-iron-900/45 ring-1 ring-inset ring-iron-800/55"
      : "bg-slate-50 ring-1 ring-inset ring-slate-200/70",
  );
}

export function workoutToolbarBtnClass(isDarkMode, { destructive = false } = {}) {
  const base =
    "inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50";
  if (destructive) {
    return cn(
      base,
      isDarkMode
        ? "text-red-400 hover:bg-red-500/15 hover:text-red-300"
        : "text-red-600 hover:bg-red-50 hover:text-red-700",
    );
  }
  return cn(
    base,
    isDarkMode
      ? "text-iron-400 hover:bg-iron-800 hover:text-iron-200"
      : "text-slate-600 hover:bg-white hover:text-slate-900",
  );
}

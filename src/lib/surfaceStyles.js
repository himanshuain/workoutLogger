import { cn } from "@/lib/utils";

/**
 * Elevation helpers (dark): page → section → interactive → pressed/selected.
 * Prefer these over ad-hoc iron-900/800 mixes.
 */

/** Section cards — Habits, Food, planner panels */
export function surfaceSection(isDarkMode, className) {
  return cn(
    "rounded-card border",
    isDarkMode
      ? "border-surface-subtle bg-surface-section"
      : "border-slate-200 bg-white shadow-sm",
    className,
  );
}

/** List rows, chips, inputs at rest */
export function surfaceInteractive(isDarkMode, className) {
  return cn(
    "rounded-card border",
    isDarkMode
      ? "border-surface-subtle bg-surface-interactive"
      : "border-slate-200 bg-slate-100",
    className,
  );
}

/** Hover / active on interactive items */
export function surfacePressed(isDarkMode, className) {
  return cn(
    isDarkMode ? "bg-surface-pressed" : "bg-slate-200",
    className,
  );
}

/** Selected day pill, tab, etc. (pair with accent ring when needed) */
export function surfaceSelected(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "border-surface bg-surface-selected"
      : "border-slate-300 bg-white shadow-sm",
    className,
  );
}

export function surfaceSectionClass(isDarkMode) {
  return isDarkMode
    ? "border-surface-subtle bg-surface-section"
    : "border-slate-200 bg-white shadow-sm";
}

export function surfaceInteractiveClass(isDarkMode) {
  return isDarkMode
    ? "border-surface-subtle bg-surface-interactive"
    : "border-slate-200 bg-slate-100";
}

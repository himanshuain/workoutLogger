import { cn } from "@/lib/utils";

/**
 * Elevation helpers: page → section → interactive → pressed/selected.
 * Light: slate page, white cards, pale-red selected states.
 */

/** Section cards — Habits, Food, planner panels */
export function surfaceSection(isDarkMode, className) {
  return cn(
    "rounded-card",
    isDarkMode
      ? "border border-surface-subtle bg-surface-section"
      : "border border-surface-subtle bg-surface-section shadow-[var(--shadow-elevation-section)]",
    className,
  );
}

/** List rows, chips, inputs at rest */
export function surfaceInteractive(isDarkMode, className) {
  return cn(
    "rounded-card",
    isDarkMode
      ? "border border-surface-subtle bg-surface-interactive"
      : "border border-surface-subtle bg-surface-interactive",
    className,
  );
}

/** Hover / active on interactive items */
export function surfacePressed(isDarkMode, className) {
  return cn(
    isDarkMode ? "bg-surface-pressed" : "bg-surface-pressed",
    className,
  );
}

/** Selected day pill, tab, etc. */
export function surfaceSelected(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "border-surface bg-surface-selected"
      : "accent-soft-surface border border-red-100 shadow-sm",
    className,
  );
}

export function surfaceSectionClass(isDarkMode) {
  return isDarkMode
    ? "border border-surface-subtle bg-surface-section"
    : "border border-surface-subtle bg-surface-section shadow-[var(--shadow-elevation-section)]";
}

export function surfaceInteractiveClass(isDarkMode) {
  return isDarkMode
    ? "border border-surface-subtle bg-surface-interactive"
    : "border border-surface-subtle bg-surface-interactive";
}

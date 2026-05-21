import { cn } from "@/lib/utils";

/** Filled accent — one primary CTA per screen (Start, Save, Sign in). */
export function actionPrimary(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "bg-lift-primary text-iron-950 hover:bg-lift-primary/90"
      : "bg-workout-primary text-white hover:bg-workout-secondary shadow-[0_2px_8px_rgba(220,38,38,0.14)] hover:shadow-[0_4px_12px_rgba(220,38,38,0.18)]",
    className,
  );
}

/** Neutral secondary — Manage, Cancel, Pick routine, Review. */
export function actionSecondary(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "border border-surface-subtle bg-surface-interactive text-iron-300 hover:bg-surface-pressed hover:text-iron-200"
      : "border border-surface-subtle bg-white text-[color:var(--text-secondary)] hover:bg-surface-interactive hover:text-[color:var(--text-primary)] shadow-sm",
    className,
  );
}

/** Compact secondary for section headers and inline actions. */
export function actionSecondaryCompact(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "bg-surface-interactive text-iron-400 ring-1 ring-surface-subtle hover:bg-surface-pressed hover:text-iron-300"
      : "bg-white text-[color:var(--text-secondary)] ring-1 ring-surface-subtle hover:bg-surface-interactive hover:text-[color:var(--text-primary)] shadow-sm",
    className,
  );
}

/** Text-only tertiary — Clear, Switch, ghost links. */
export function actionGhost(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "text-iron-400 hover:bg-surface-interactive hover:text-iron-200"
      : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-surface-interactive",
    className,
  );
}

/** Destructive confirm — Delete, Discard. */
export function actionDestructive(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "bg-red-600 text-white hover:bg-red-500"
      : "bg-red-600 text-white hover:bg-red-700",
    className,
  );
}

/** Destructive icon / text — delete, clear, reset (red by default). */
export function actionDestructiveGhost(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
      : "text-red-600 hover:text-red-700 hover:bg-red-50",
    className,
  );
}

/** Logged / completed toggle state (not a primary CTA). */
export function actionSuccess(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "bg-green-500/20 text-green-400 ring-1 ring-inset ring-green-500/35"
      : "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
    className,
  );
}

/** Neutral idle state for row quick-log controls. */
export function actionNeutralIcon(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "bg-surface-interactive text-iron-400 ring-1 ring-surface-subtle hover:bg-surface-pressed hover:text-iron-300"
      : "bg-surface-interactive text-[color:var(--text-secondary)] ring-1 ring-surface-subtle hover:bg-surface-pressed hover:text-[color:var(--text-primary)]",
    className,
  );
}

/** Pale red selected — pills, tabs, nav (not a filled primary CTA). */
export function actionAccentSoft(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "bg-surface-selected text-iron-100 ring-1 ring-inset ring-surface"
      : "accent-soft-surface shadow-sm",
    className,
  );
}

/** Segmented control — selected option (not a screen primary). */
export function segmentSelected(isDarkMode, className) {
  return actionAccentSoft(isDarkMode, cn("font-semibold", className));
}

export function segmentUnselected(isDarkMode, className) {
  return cn(
    isDarkMode ? "bg-transparent text-iron-500" : "bg-transparent text-[color:var(--text-secondary)]",
    className,
  );
}

/** Toggle switch track — on/off (neutral, not accent). */
export function toggleTrackOn(isDarkMode) {
  return isDarkMode ? "bg-iron-500" : "bg-slate-600";
}

export function toggleTrackOff(isDarkMode) {
  return isDarkMode ? "bg-iron-700" : "bg-slate-300";
}

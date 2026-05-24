import { cn } from "@/lib/utils";
import { touchPress } from "@/lib/touchFeedback";

const press = touchPress;

/** Filled accent — one primary CTA per screen (Start, Save, Sign in). */
export function actionPrimary(isDarkMode, className) {
  return cn(
    press,
    isDarkMode
      ? "bg-lift-primary text-iron-950 hover:bg-lift-primary/90 active:bg-lift-primary/85"
      : "bg-workout-primary text-white hover:bg-workout-secondary active:bg-workout-secondary shadow-[0_2px_8px_rgba(220,38,38,0.14)] hover:shadow-[0_4px_12px_rgba(220,38,38,0.18)]",
    className,
  );
}

/** Neutral secondary — Manage, Cancel, Pick routine, Review. */
export function actionSecondary(isDarkMode, className) {
  return cn(
    press,
    isDarkMode
      ? "border border-surface-subtle bg-surface-interactive text-iron-300 hover:bg-surface-pressed hover:text-iron-200 active:bg-surface-pressed"
      : "border border-surface-subtle bg-white text-[color:var(--text-secondary)] hover:bg-surface-interactive hover:text-[color:var(--text-primary)] active:bg-surface-pressed shadow-sm",
    className,
  );
}

/** Compact secondary for section headers and inline actions. */
export function actionSecondaryCompact(isDarkMode, className) {
  return cn(
    press,
    isDarkMode
      ? "bg-surface-interactive text-iron-400 ring-1 ring-surface-subtle hover:bg-surface-pressed hover:text-iron-300 active:bg-surface-pressed"
      : "bg-white text-[color:var(--text-secondary)] ring-1 ring-surface-subtle hover:bg-surface-interactive hover:text-[color:var(--text-primary)] active:bg-surface-pressed shadow-sm",
    className,
  );
}

/** Text-only tertiary — Clear, Switch, ghost links. */
export function actionGhost(isDarkMode, className) {
  return cn(
    press,
    isDarkMode
      ? "text-iron-400 hover:bg-surface-interactive hover:text-iron-200 active:bg-surface-pressed"
      : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-surface-interactive active:bg-surface-pressed",
    className,
  );
}

/** Destructive confirm — Delete, Discard. */
export function actionDestructive(isDarkMode, className) {
  return cn(
    press,
    isDarkMode
      ? "bg-red-600 text-white hover:bg-red-500 active:bg-red-500/90"
      : "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
    className,
  );
}

/** Destructive icon / text — delete, clear, reset (red by default). */
export function actionDestructiveGhost(isDarkMode, className) {
  return cn(
    press,
    isDarkMode
      ? "text-red-400 hover:text-red-300 hover:bg-red-500/10 active:bg-red-500/15"
      : "text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100",
    className,
  );
}

/** Mark workout done — green confirm (distinct from primary Start/Finish). */
export function actionMarkDone(isDarkMode, className) {
  return cn(
    press,
    "inline-flex items-center justify-center gap-1.5 font-semibold",
    isDarkMode
      ? "bg-emerald-500 text-iron-950 hover:bg-emerald-400 active:bg-emerald-400/90"
      : "bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 shadow-sm",
    className,
  );
}

/** Logged / completed toggle state (not a primary CTA). */
export function actionSuccess(isDarkMode, className) {
  return cn(
    press,
    isDarkMode
      ? "bg-green-500/20 text-green-400 ring-1 ring-inset ring-green-500/35"
      : "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
    className,
  );
}

/** Neutral idle state for row quick-log controls. */
export function actionNeutralIcon(isDarkMode, className) {
  return cn(
    press,
    isDarkMode
      ? "bg-surface-interactive text-iron-400 ring-1 ring-surface-subtle hover:bg-surface-pressed hover:text-iron-300 active:bg-surface-pressed"
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
  return actionAccentSoft(isDarkMode, cn(press, "font-semibold", className));
}

export function segmentUnselected(isDarkMode, className) {
  return cn(
    press,
    isDarkMode
      ? "bg-transparent text-iron-500 active:bg-surface-interactive"
      : "bg-transparent text-[color:var(--text-secondary)] active:bg-surface-interactive",
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

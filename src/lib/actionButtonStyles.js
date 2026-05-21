import { cn } from "@/lib/utils";

/** Filled accent — one primary CTA per screen (Start, Save, Sign in). */
export function actionPrimary(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "bg-lift-primary text-iron-950 hover:bg-lift-primary/90"
      : "bg-workout-primary text-white hover:bg-workout-secondary",
    className,
  );
}

/** Neutral secondary — Manage, Cancel, Pick routine, Review. */
export function actionSecondary(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "border border-iron-700 bg-iron-800 text-iron-300 hover:bg-iron-700 hover:text-iron-200"
      : "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-800",
    className,
  );
}

/** Compact secondary for section headers and inline actions. */
export function actionSecondaryCompact(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "bg-iron-800 text-iron-400 ring-1 ring-iron-700 hover:bg-iron-700 hover:text-iron-300"
      : "border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-800",
    className,
  );
}

/** Text-only tertiary — Clear, Switch, ghost links. */
export function actionGhost(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "text-iron-400 hover:text-iron-200 hover:bg-iron-800/80"
      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
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
      ? "bg-iron-800 text-iron-400 ring-1 ring-iron-700 hover:bg-iron-700 hover:text-iron-300"
      : "bg-slate-100 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-200 hover:text-slate-700",
    className,
  );
}

/** Segmented control — selected option (not a screen primary). */
export function segmentSelected(isDarkMode, className) {
  return cn(
    isDarkMode
      ? "bg-iron-700 text-iron-100 ring-1 ring-inset ring-iron-600"
      : "bg-white text-slate-800 shadow-sm ring-1 ring-inset ring-slate-200",
    className,
  );
}

export function segmentUnselected(isDarkMode, className) {
  return cn(
    isDarkMode ? "bg-transparent text-iron-500" : "bg-transparent text-slate-500",
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

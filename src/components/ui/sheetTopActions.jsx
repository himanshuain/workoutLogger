import { cn } from "@/lib/utils";
import { actionDestructive } from "@/lib/actionButtonStyles";
import {
  modalSheetTopActionsClass,
  modalSheetHeaderBelowActionsClass,
} from "@/components/ui/modal";

/** Fixed top-left actions in Vaul sheets (mirrors close button on the right). */
export function SheetTopActions({ children, className }) {
  return (
    <div className={cn(modalSheetTopActionsClass, className)}>
      {children}
    </div>
  );
}

/** Filled destructive pill — Delete in sheet top bars (matches Cancel/Save sizing). */
export function sheetTopActionDestructiveClass(isDarkMode, className) {
  return cn(
    "inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold",
    actionDestructive(isDarkMode),
    className,
  );
}

export function sheetTopActionButtonClass(isDarkMode, { primary = false } = {}) {
  if (primary) {
    return cn(
      "inline-flex min-h-9 shrink-0 items-center justify-center rounded-full px-3.5 text-xs font-bold",
      isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white",
    );
  }
  return cn(
    "inline-flex min-h-9 shrink-0 items-center justify-center rounded-full px-3.5 text-xs font-semibold",
    isDarkMode ? "bg-iron-800/95 text-iron-200 ring-1 ring-white/10" : "bg-white/95 text-slate-700 ring-1 ring-slate-200",
  );
}

/** Room for title under pinned top actions + drawer handle. */
export const sheetHeaderWithTopActionsClass = modalSheetHeaderBelowActionsClass;

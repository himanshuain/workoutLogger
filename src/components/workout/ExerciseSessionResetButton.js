import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { actionGhost } from "@/lib/actionButtonStyles";

export function exerciseHasLoggedSets(exerciseName, setLogs) {
  return (setLogs || []).some(
    log => log.exercise_name === exerciseName && log.is_completed,
  );
}

export function completedSetCountForExercise(exerciseName, setLogs) {
  return (setLogs || []).filter(
    log => log.exercise_name === exerciseName && log.is_completed,
  ).length;
}

/**
 * Clears logged sets for one exercise in an active session (card overlay).
 */
export default function ExerciseSessionResetButton({
  exerciseName,
  isDarkMode,
  disabled,
  onClick,
  compact = false,
  variant = "overlay",
  className,
}) {
  const inline = variant === "inline";
  const isPill = variant === "pill";
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
        onClick?.(exerciseName);
      }}
      disabled={disabled}
      className={cn(
        "pointer-events-auto flex items-center justify-center border transition-colors touch-manipulation disabled:opacity-50",
        isPill &&
          cn(
            actionGhost(isDarkMode),
            "min-w-0 flex-1 gap-1 rounded-full px-2 h-8 text-[10px] font-semibold leading-none",
          ),
        inline && !isPill && cn(actionGhost(isDarkMode), "relative shrink-0 h-9 w-9 rounded-lg"),
        variant === "overlay" &&
          cn(
            "absolute z-10 rounded-card",
            compact
              ? "top-2 right-2 h-8 w-8"
              : "top-3 right-3 h-9 w-9 sm:h-10 sm:w-10",
            isDarkMode
              ? "border-iron-700/80 bg-iron-900/70 text-iron-400 hover:bg-iron-800 hover:text-iron-200"
              : "border-slate-200/90 bg-white/90 text-slate-400 hover:bg-slate-50 hover:text-slate-700",
          ),
        className,
      )}
      aria-label={`Reset ${exerciseName}`}
    >
      <RotateCw
        className={cn(
          isPill ? "h-3.5 w-3.5 shrink-0" : inline || compact ? "h-4 w-4" : "h-[18px] w-[18px] sm:h-5 sm:w-5",
          disabled && "animate-spin",
        )}
        aria-hidden
      />
      {isPill ? <span className="truncate">Reset</span> : null}
    </button>
  );
}

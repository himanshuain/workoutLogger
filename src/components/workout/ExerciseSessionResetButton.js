import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function exerciseHasLoggedSets(exerciseName, setLogs) {
  return (setLogs || []).some(log => log.exercise_name === exerciseName);
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
  className,
}) {
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
        "pointer-events-auto absolute z-10 flex items-center justify-center rounded-card border transition-colors touch-manipulation disabled:opacity-50",
        compact
          ? "top-2 right-2 h-8 w-8 rounded-lg"
          : "top-3 right-3 h-9 w-9 sm:h-10 sm:w-10",
        isDarkMode
          ? "border-iron-700/80 bg-iron-900/70 text-iron-400 hover:bg-iron-800 hover:text-iron-200"
          : "border-slate-200/90 bg-white/90 text-slate-400 hover:bg-slate-50 hover:text-slate-700",
        className,
      )}
      aria-label={`Reset ${exerciseName}`}
    >
      <RotateCw
        className={cn(
          compact ? "h-3.5 w-3.5" : "h-[18px] w-[18px] sm:h-5 sm:w-5",
          disabled && "animate-spin",
        )}
        aria-hidden
      />
    </button>
  );
}

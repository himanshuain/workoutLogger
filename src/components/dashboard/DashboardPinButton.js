import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPinButton({ isPinned, onClick, isDarkMode, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPinned ? "Unpin from top" : "Pin to top"}
      aria-pressed={isPinned}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-pill transition-colors",
        isPinned
          ? isDarkMode
            ? "bg-lift-primary/20 text-lift-primary"
            : "bg-workout-primary/15 text-workout-primary"
          : isDarkMode
            ? "text-iron-500 hover:bg-iron-800 hover:text-iron-300"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
        className,
      )}
    >
      <Pin className={cn("h-3.5 w-3.5", isPinned && "fill-current")} strokeWidth={2.25} />
    </button>
  );
}

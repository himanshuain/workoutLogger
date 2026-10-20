import { SlidersHorizontal, Plus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { actionSecondaryCompact } from "@/lib/actionButtonStyles";

/**
 * Neutral secondary control for section headers (Today, Log, etc.).
 * @param {{ variant?: "manage" | "add" | "all" }} props.variant — "add" uses a plus icon; "all" is text + chevron.
 */
export default function SectionManageButton({
  isDarkMode,
  onClick,
  ariaLabel = "Manage",
  children = "Manage",
  variant = "manage",
}) {
  if (variant === "all") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex shrink-0 items-center gap-0.5 py-1 text-xs font-semibold transition-colors",
          isDarkMode
            ? "text-iron-400 hover:text-iron-200 active:text-iron-200"
            : "text-slate-500 hover:text-slate-800 active:text-slate-700",
        )}
      >
        All
        <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
      </button>
    );
  }

  const Icon = variant === "add" ? Plus : SlidersHorizontal;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-card px-3 py-2 text-xs font-semibold", actionSecondaryCompact(isDarkMode))}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
      {children}
    </button>
  );
}

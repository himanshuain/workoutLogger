import { SlidersHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { actionSecondaryCompact } from "@/lib/actionButtonStyles";

/**
 * Neutral secondary control for section headers (Today, Log, etc.).
 * @param {{ variant?: "manage" | "add" }} props.variant — "add" uses a plus icon (e.g. empty food list).
 */
export default function SectionManageButton({
  isDarkMode,
  onClick,
  ariaLabel = "Manage",
  children = "Manage",
  variant = "manage",
}) {
  const Icon = variant === "add" ? Plus : SlidersHorizontal;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-card px-3 py-2 text-xs font-semibold transition-colors active:scale-[0.98]",
        actionSecondaryCompact(isDarkMode),
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
      {children}
    </button>
  );
}

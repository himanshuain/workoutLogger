import { SlidersHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Consistent green “Manage” control for section headers (Today, Log, etc.).
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
        "inline-flex shrink-0 items-center gap-1.5 rounded-card px-3 py-2 text-xs font-bold transition-colors active:scale-[0.98]",
        isDarkMode
          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/35 hover:bg-emerald-500/25 hover:text-emerald-200"
          : "bg-emerald-600 text-white shadow-sm shadow-emerald-900/15 hover:bg-emerald-700",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-95" strokeWidth={2.25} aria-hidden />
      {children}
    </button>
  );
}

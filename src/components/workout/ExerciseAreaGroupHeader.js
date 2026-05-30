import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { touchPressCard } from "@/lib/touchFeedback";

export default function ExerciseAreaGroupHeader({
  label,
  count,
  isDarkMode,
  className,
  expanded,
  onToggle,
}) {
  const collapsible = typeof onToggle === "function";
  const Wrapper = collapsible ? "button" : "div";

  return (
    <Wrapper
      type={collapsible ? "button" : undefined}
      onClick={onToggle}
      aria-expanded={collapsible ? expanded : undefined}
      className={cn(
        "flex w-full items-center justify-between gap-2 pt-1 pb-2 text-left",
        collapsible && touchPressCard,
        collapsible &&
          (isDarkMode ? "hover:bg-surface-interactive/50 rounded-card -mx-1 px-1" : "hover:bg-surface-interactive/80 rounded-card -mx-1 px-1"),
        className,
      )}
    >
      <h3
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wider",
          isDarkMode ? "text-iron-400" : "text-slate-500",
        )}
      >
        {label}
      </h3>
      <div className="flex shrink-0 items-center gap-1.5">
        {typeof count === "number" ? (
          <span className={cn("text-[10px] font-medium", isDarkMode ? "text-iron-600" : "text-slate-400")}>
            {count}
          </span>
        ) : null}
        {collapsible ? (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              isDarkMode ? "text-iron-500" : "text-slate-400",
              expanded ? "rotate-180" : "",
            )}
            aria-hidden
          />
        ) : null}
      </div>
    </Wrapper>
  );
}

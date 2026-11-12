import { cn } from "@/lib/utils";
import { hapticLight, touchPress } from "@/lib/touchFeedback";
import {
  BIKE_SCOPE_FILTER_ALL,
  BIKE_SCOPE_FILTER_UNTAGGED,
} from "@/lib/bikeLogUtils";

function formatPillLabel(pill) {
  if (pill === BIKE_SCOPE_FILTER_ALL) return "All";
  if (pill === BIKE_SCOPE_FILTER_UNTAGGED) return "Untagged";
  return pill.charAt(0).toUpperCase() + pill.slice(1);
}

export default function BikeLogFilterPills({
  pills,
  selected,
  onSelect,
  isDarkMode,
  className = "",
}) {
  return (
    <div
      className={cn(
        "flex overflow-x-auto gap-1.5 pb-1 -mx-1 px-1 overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      style={{ WebkitOverflowScrolling: "touch" }}
      role="tablist"
      aria-label="Filter bike logs"
    >
      {pills.map(pill => {
        const active = selected === pill;
        return (
          <button
            key={pill}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              hapticLight();
              onSelect(pill);
            }}
            className={cn(
              touchPress,
              "shrink-0 rounded-pill min-h-[34px] px-3 text-[12px] font-semibold transition-colors",
              active
                ? isDarkMode
                  ? "bg-lift-primary text-iron-950 shadow-sm shadow-lift-primary/20"
                  : "bg-workout-primary text-white shadow-sm"
                : isDarkMode
                  ? "bg-iron-800/90 text-iron-300 border border-iron-700/70"
                  : "bg-white text-[color:var(--text-secondary)] border border-surface-subtle shadow-sm",
            )}
          >
            {formatPillLabel(pill)}
          </button>
        );
      })}
    </div>
  );
}

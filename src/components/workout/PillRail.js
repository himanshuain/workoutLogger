import { useRef, useEffect } from "react";
import { actionAccentSoft } from "@/lib/actionButtonStyles";
import { hapticLight, touchPress } from "@/lib/touchFeedback";
import { cn } from "@/lib/utils";

/**
 * Single horizontal row of pills. Scrollable on overflow — no visible scrollbar handle.
 */
export default function PillRail({
  label,
  values,
  selected,
  onSelect,
  format = (v) => String(v),
  isDarkMode,
  scrollToSelected = true,
  dense = false,
}) {
  const scrollRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    if (!scrollToSelected || selected == null) return;
    const el = selectedRef.current;
    const wrap = scrollRef.current;
    if (!el || !wrap) return;
    const left = el.offsetLeft - wrap.clientWidth / 2 + el.offsetWidth / 2;
    wrap.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [selected, scrollToSelected]);

  return (
    <div className={dense ? "space-y-1" : "space-y-2"}>
      <p
        className={cn(
          "font-semibold uppercase tracking-widest",
          dense ? "text-[9px] tracking-wide" : "text-[11px] tracking-widest",
          isDarkMode ? "text-iron-500" : "text-slate-500",
        )}
      >
        {label}
      </p>
      <div
        ref={scrollRef}
        className={cn(
          "flex overflow-x-auto pb-0.5 -mx-1 px-1 overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          dense ? "gap-1" : "gap-2",
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {values.map((v) => {
          const active =
            typeof selected === "number" && typeof v === "number"
              ? Math.abs(selected - v) < 0.001
              : selected === v;
          return (
            <button
              key={v}
              type="button"
              ref={active ? selectedRef : null}
              onClick={() => {
                hapticLight();
                onSelect(v);
              }}
              className={cn(
                "shrink-0 rounded-pill touchPress",
                dense
                  ? "min-h-[28px] min-w-[32px] px-2 text-[11px] font-medium leading-none"
                  : "min-h-[44px] min-w-[44px] px-4 text-sm font-semibold",
                active
                  ? isDarkMode
                    ? cn(
                        "bg-lift-primary text-iron-950",
                        dense ? "shadow-sm shadow-lift-primary/20" : "shadow-lg shadow-lift-primary/25",
                      )
                    : actionAccentSoft(false)
                  : isDarkMode
                    ? cn(
                        "bg-iron-800/90 text-iron-200",
                        dense ? "border border-iron-700/70" : "border border-iron-700/80",
                      )
                    : cn(
                        "bg-white text-[color:var(--text-secondary)] active:bg-surface-pressed",
                        dense ? "border border-surface-subtle/80" : "border border-surface-subtle shadow-sm",
                      ),
              )}
            >
              {format(v)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

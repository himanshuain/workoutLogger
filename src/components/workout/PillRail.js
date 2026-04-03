import { useRef, useEffect } from "react";

/**
 * Single horizontal row of pills (no wrap). Scrollable on overflow.
 */
export default function PillRail({
  label,
  values,
  selected,
  onSelect,
  format = (v) => String(v),
  isDarkMode,
}) {
  const scrollRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    const el = selectedRef.current;
    const wrap = scrollRef.current;
    if (!el || !wrap) return;
    const left = el.offsetLeft - wrap.clientWidth / 2 + el.offsetWidth / 2;
    wrap.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [selected]);

  return (
    <div className="space-y-2">
      <p
        className={`text-[11px] font-semibold uppercase tracking-widest ${
          isDarkMode ? "text-iron-500" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin scrollbar-thumb-transparent"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "thin",
          maskImage: "linear-gradient(to right, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)",
        }}
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
              onClick={() => onSelect(v)}
              className={`shrink-0 min-h-[44px] min-w-[44px] px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${
                active
                  ? isDarkMode
                    ? "bg-lift-primary text-iron-950 shadow-lg shadow-lift-primary/25"
                    : "bg-workout-primary text-white shadow-md"
                  : isDarkMode
                    ? "bg-iron-800/90 text-iron-200 border border-iron-700/80"
                    : "bg-white text-slate-700 border border-slate-200 shadow-sm"
              }`}
            >
              {format(v)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

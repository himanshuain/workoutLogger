import { useRef, useLayoutEffect, useCallback } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const SCROLL_LOAD_EDGE_PX = 72;

/**
 * Horizontal scrollable day picker (Today). Infinite-style: load more past days when scrolled to the oldest edge.
 * @param {{
 *   isDarkMode: boolean;
 *   glanceDays: string[];
 *   selectedDate: string;
 *   todayStr: string;
 *   foodCountByDate: Record<string, number>;
 *   onPickDate: (iso: string) => void;
 *   stripScrollAnchorDate?: string;
 *   onNearPastEdge?: () => void;
 *   canLoadMorePast?: boolean;
 *   className?: string;
 * }} props
 */
export default function HorizontalDateStrip({
  isDarkMode,
  glanceDays,
  selectedDate,
  todayStr,
  foodCountByDate,
  onPickDate,
  stripScrollAnchorDate,
  onNearPastEdge,
  canLoadMorePast = true,
  className,
}) {
  const stripScrollRef = useRef(null);
  const stripAnchorRef = useRef(null);
  const anchorDate = stripScrollAnchorDate ?? todayStr;
  const isViewingToday = Boolean(todayStr && selectedDate === todayStr);
  const preExpandScroll = useRef(null);
  const loadMoreLock = useRef(false);

  const goToToday = () => {
    if (todayStr) onPickDate(todayStr);
    requestAnimationFrame(() => {
      const el = stripScrollRef.current;
      if (!el) return;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      el.scrollTo({ left: max, behavior: "smooth" });
    });
  };

  useLayoutEffect(() => {
    const container = stripScrollRef.current;
    if (!container) return;

    const pre = preExpandScroll.current;
    if (pre) {
      preExpandScroll.current = null;
      const newWidth = container.scrollWidth;
      container.scrollLeft = pre.left + (newWidth - pre.width);
      loadMoreLock.current = false;
      return;
    }

    const anchor = stripAnchorRef.current;
    if (!anchor) return;
    const anchorRight = anchor.offsetLeft + anchor.offsetWidth;
    const nextLeft = anchorRight - container.clientWidth + 24;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    container.scrollLeft = Math.min(maxScroll, Math.max(0, nextLeft));
  }, [anchorDate, glanceDays]);

  const handleStripScroll = useCallback(() => {
    const el = stripScrollRef.current;
    if (!el || !onNearPastEdge || !canLoadMorePast || loadMoreLock.current) return;
    if (el.scrollLeft > SCROLL_LOAD_EDGE_PX) return;
    loadMoreLock.current = true;
    preExpandScroll.current = { left: el.scrollLeft, width: el.scrollWidth };
    onNearPastEdge();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (loadMoreLock.current && preExpandScroll.current) {
          preExpandScroll.current = null;
          loadMoreLock.current = false;
        }
      });
    });
  }, [onNearPastEdge, canLoadMorePast]);

  const shellGradient = isViewingToday
    ? isDarkMode
      ? "border-emerald-800/70 bg-gradient-to-b from-emerald-950/95 via-emerald-900/55 to-iron-950 shadow-inner shadow-black/25"
      : "border-emerald-200/90 bg-gradient-to-b from-green-50 via-emerald-50/90 to-emerald-100/80 shadow-sm shadow-emerald-900/5"
    : isDarkMode
      ? "border-sky-800/60 bg-gradient-to-b from-sky-950/90 via-sky-900/35 to-iron-950 shadow-inner shadow-black/20"
      : "border-sky-200/90 bg-gradient-to-b from-sky-50 via-sky-100/70 to-blue-50/90 shadow-sm";

  return (
    <div className={cn("rounded-2xl border p-3 mb-6 transition-colors duration-300", shellGradient, className)}>
      <div className="relative w-full min-w-0">
        {!isViewingToday && todayStr ? (
          <div className="pointer-events-none absolute right-0 top-0 z-30 flex h-6 items-center pr-0.5">
            <button
              type="button"
              onClick={goToToday}
              aria-label="Go to today"
              className={cn(
                "pointer-events-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all active:scale-[0.97]",
                isDarkMode
                  ? "bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/30 hover:bg-sky-500/30"
                  : "bg-sky-600 text-white shadow-sm hover:bg-sky-700",
              )}
            >
              <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        ) : null}

        <div
          ref={stripScrollRef}
          onScroll={handleStripScroll}
          className={cn(
            "flex min-h-[7.75rem] w-full min-w-0 items-stretch gap-2 overflow-x-auto px-4 scrollbar-hide",
            isDarkMode && "[mask-image:linear-gradient(90deg,transparent,black_14px,black_calc(100%-14px),transparent)]",
            !isViewingToday && todayStr && "pr-[2.75rem]",
          )}
        >
        {glanceDays.map((d, i) => {
          const c = foodCountByDate[d] || 0;
          const active = selectedDate === d;
          const isToday = d === todayStr;
          const prevDay = i > 0 ? glanceDays[i - 1] : null;
          const showMonthLabel = i === 0 || (prevDay && d.slice(0, 7) !== prevDay.slice(0, 7));

          return (
            <div
              key={d}
              ref={d === anchorDate ? stripAnchorRef : undefined}
              className="flex min-h-[7.75rem] shrink-0 flex-col items-center"
            >
              <div className="mb-1 flex h-6 w-full items-center justify-center">
                {showMonthLabel ? (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]",
                      isViewingToday
                        ? isDarkMode
                          ? "bg-emerald-500/15 text-emerald-400/95"
                          : "bg-emerald-100 text-emerald-900"
                        : isDarkMode
                          ? "bg-sky-500/12 text-sky-300/95"
                          : "bg-sky-100 text-sky-900",
                    )}
                  >
                    {new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                  </span>
                ) : null}
              </div>

              <div className="mb-1 flex h-5 w-full items-center justify-center">
                {isToday ? (
                  <span
                    className={`text-[8px] font-bold uppercase tracking-[0.12em] ${
                      isDarkMode ? "text-red-400" : "text-red-600"
                    }`}
                  >
                    Today
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                disabled={d > todayStr}
                onClick={() => d <= todayStr && onPickDate(d)}
                className={cn(
                  "grid h-[4.5rem] min-w-[3.25rem] grid-rows-[1fr_auto_1fr] grid-cols-1 justify-items-center rounded-2xl border px-2.5 transition-all duration-200 active:scale-[0.96] disabled:opacity-40",
                  active
                    ? isViewingToday
                      ? isDarkMode
                        ? "border-emerald-400/50 bg-gradient-to-b from-emerald-500/25 via-emerald-600/15 to-transparent text-emerald-50 shadow-[0_0_0_1px_rgba(52,211,153,0.25),0_8px_24px_-4px_rgba(0,0,0,0.45)]"
                        : "border-emerald-500 bg-gradient-to-b from-emerald-100 to-white text-emerald-950 shadow-md shadow-emerald-300/40"
                      : isDarkMode
                        ? "border-sky-400/50 bg-gradient-to-b from-sky-500/20 via-sky-600/12 to-transparent text-sky-50 shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_8px_24px_-4px_rgba(0,0,0,0.45)]"
                        : "border-sky-500 bg-gradient-to-b from-sky-100 to-white text-sky-950 shadow-md shadow-sky-200/50"
                    : isDarkMode
                      ? "border-iron-700/70 bg-iron-900/40 text-iron-400 hover:border-iron-600 hover:bg-iron-800/40 hover:text-iron-200"
                      : "border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm",
                )}
              >
                <span
                  className={cn(
                    "self-end text-[10px] font-semibold uppercase leading-none",
                    active
                      ? isViewingToday
                        ? isDarkMode
                          ? "text-emerald-200/85"
                          : "text-emerald-800/90"
                        : isDarkMode
                          ? "text-sky-200/85"
                          : "text-sky-800/90"
                      : isToday
                        ? isDarkMode
                          ? "text-red-300/80"
                          : "text-red-600/80"
                        : isDarkMode
                          ? "text-iron-500"
                          : "text-slate-400",
                  )}
                >
                  {new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}
                </span>

                <span
                  className={cn(
                    "text-base font-bold tabular-nums leading-none",
                    active
                      ? isViewingToday
                        ? isDarkMode
                          ? "text-emerald-50"
                          : "text-emerald-950"
                        : isDarkMode
                          ? "text-sky-50"
                          : "text-sky-950"
                      : isToday
                        ? isDarkMode
                          ? "text-red-200"
                          : "text-red-700"
                        : isDarkMode
                          ? "text-iron-300"
                          : "text-slate-700",
                  )}
                >
                  {new Date(d + "T12:00:00").getDate()}
                </span>

                <span className="flex h-1.5 w-full items-start justify-center self-start pt-0.5">
                  {c > 0 ? (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        isViewingToday
                          ? isDarkMode
                            ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.55)]"
                            : "bg-emerald-500"
                          : isDarkMode
                            ? "bg-sky-400 shadow-[0_0_4px_rgba(56,189,248,0.55)]"
                            : "bg-sky-500",
                      )}
                    />
                  ) : (
                    <span className="h-1.5 w-1.5 shrink-0" aria-hidden />
                  )}
                </span>
              </button>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

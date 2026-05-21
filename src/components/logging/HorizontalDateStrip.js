import { useRef, useLayoutEffect, useCallback, useState, useEffect, forwardRef } from "react";
import { Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticLight, touchPress, touchPressCard } from "@/lib/touchFeedback";

const SCROLL_LOAD_EDGE_PX = 72;

const monthPillClass = (isDarkMode, isViewingToday) =>
  cn(
    "inline-flex items-center rounded-md px-1.5 py-px text-[8px] font-normal uppercase tracking-[0.14em]",
    isViewingToday
      ? isDarkMode
        ? "bg-emerald-500/15 text-emerald-400/95"
        : "bg-emerald-100 text-emerald-900"
      : isDarkMode
        ? "bg-sky-500/12 text-sky-300/95"
        : "bg-sky-100 text-sky-900",
  );

function monthLabelForIso(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short" });
}

const HorizontalDateStrip = forwardRef(function HorizontalDateStrip(
  {
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
  },
  ref,
) {
  const stripScrollRef = useRef(null);
  const stripAnchorRef = useRef(null);
  const todayColRef = useRef(null);
  const anchorDate = stripScrollAnchorDate ?? todayStr;
  const isViewingToday = Boolean(todayStr && selectedDate === todayStr);
  const preExpandScroll = useRef(null);
  const loadMoreLock = useRef(false);
  const [scrollAnchorIso, setScrollAnchorIso] = useState(selectedDate);
  const [todayVisibleInStrip, setTodayVisibleInStrip] = useState(false);

  const headerMonthIso = scrollAnchorIso || selectedDate;
  const headerMonthLabel = headerMonthIso ? monthLabelForIso(headerMonthIso) : null;

  const goToToday = () => {
    if (todayStr) onPickDate(todayStr);
    requestAnimationFrame(() => {
      const el = stripScrollRef.current;
      if (!el) return;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      el.scrollTo({ left: max, behavior: "smooth" });
    });
  };

  const updateScrollContext = useCallback(() => {
    const el = stripScrollRef.current;
    if (!el) return;

    const viewLeft = el.scrollLeft + 6;
    const cols = el.querySelectorAll("[data-strip-day]");
    for (const col of cols) {
      if (col.offsetLeft + col.offsetWidth > viewLeft) {
        const iso = col.getAttribute("data-strip-day");
        if (iso) setScrollAnchorIso(iso);
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (selectedDate) setScrollAnchorIso(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (isViewingToday || !todayStr) {
      setTodayVisibleInStrip(false);
      return;
    }

    const scrollEl = stripScrollRef.current;
    const todayEl = todayColRef.current;
    if (!scrollEl || !todayEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => setTodayVisibleInStrip(entry.isIntersecting),
      { root: scrollEl, threshold: 0.15 },
    );

    observer.observe(todayEl);
    return () => observer.disconnect();
  }, [isViewingToday, todayStr, glanceDays]);

  useLayoutEffect(() => {
    const container = stripScrollRef.current;
    if (!container) return;

    const pre = preExpandScroll.current;
    if (pre) {
      preExpandScroll.current = null;
      const newWidth = container.scrollWidth;
      container.scrollLeft = pre.left + (newWidth - pre.width);
      loadMoreLock.current = false;
      updateScrollContext();
      return;
    }

    const anchor = stripAnchorRef.current;
    if (!anchor) return;
    const anchorRight = anchor.offsetLeft + anchor.offsetWidth;
    const nextLeft = anchorRight - container.clientWidth + 24;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    container.scrollLeft = Math.min(maxScroll, Math.max(0, nextLeft));
    updateScrollContext();
  }, [anchorDate, glanceDays, updateScrollContext]);

  const handleStripScroll = useCallback(() => {
    updateScrollContext();

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
  }, [onNearPastEdge, canLoadMorePast, updateScrollContext]);

  const shellGradient = isViewingToday
    ? isDarkMode
      ? "border-emerald-800/70 bg-gradient-to-b from-emerald-950/95 via-emerald-900/55 to-iron-950 shadow-inner shadow-black/25"
      : "border-emerald-200/90 bg-gradient-to-b from-green-50 via-emerald-50/90 to-emerald-100/80 shadow-sm shadow-emerald-900/5"
    : isDarkMode
      ? "border-sky-800/60 bg-gradient-to-b from-sky-950/90 via-sky-900/35 to-iron-950 shadow-inner shadow-black/20"
      : "border-sky-200/90 bg-gradient-to-b from-sky-50 via-sky-100/70 to-blue-50/90 shadow-sm";

  const todayFadeClass = isDarkMode
    ? "from-iron-950 via-sky-950/90 to-transparent"
    : "from-sky-50 via-sky-50/95 to-transparent";

  const showNowButton = !isViewingToday && todayStr && !todayVisibleInStrip;

  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-card border px-2 py-2 mb-section transition-colors duration-300",
        shellGradient,
        className,
      )}
    >
      {!isViewingToday && headerMonthIso && headerMonthLabel ? (
        <div className="mb-1 flex items-center">
          <span className={monthPillClass(isDarkMode, false)}>{headerMonthLabel}</span>
        </div>
      ) : null}

      <div className="relative min-w-0">
        <div
          ref={stripScrollRef}
          onScroll={handleStripScroll}
          className={cn(
            "flex w-full min-w-0 items-end gap-1.5 overflow-x-auto pl-0.5 scrollbar-hide",
            showNowButton ? "pr-14" : "pr-3",
            isDarkMode && "[mask-image:linear-gradient(90deg,transparent,black_8px,black_calc(100%-8px),transparent)]",
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
                ref={node => {
                  if (d === anchorDate) stripAnchorRef.current = node;
                  if (isToday) todayColRef.current = node;
                }}
                data-strip-day={d}
                className="flex w-[3rem] shrink-0 flex-col items-center justify-end"
              >
                {isToday ? (
                  <span
                    className={cn(
                      "mb-0.5 text-[8px] font-normal uppercase leading-none tracking-[0.14em]",
                      isDarkMode ? "text-red-400" : "text-emerald-700",
                    )}
                  >
                    Today
                  </span>
                ) : showMonthLabel ? (
                  <span className={cn("mb-0.5", monthPillClass(isDarkMode, isViewingToday))}>
                    {monthLabelForIso(d)}
                  </span>
                ) : null}

                <button
                  type="button"
                  disabled={d > todayStr}
                  onClick={() => {
                    if (d <= todayStr) {
                      hapticLight();
                      onPickDate(d);
                    }
                  }}
                  className={cn(
                    touchPressCard,
                    "relative mt-0.5 flex h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-card border px-0.5 py-1 disabled:opacity-40",
                    active
                      ? isViewingToday
                        ? isDarkMode
                          ? "border-emerald-400/50 bg-gradient-to-b from-emerald-500/25 via-emerald-600/15 to-transparent text-emerald-50 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]"
                          : "border-emerald-500 bg-gradient-to-b from-emerald-100 to-white text-emerald-950 shadow-md shadow-emerald-300/30"
                        : isDarkMode
                          ? "border-sky-400/50 bg-gradient-to-b from-sky-500/20 via-sky-600/12 to-transparent text-sky-50 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
                          : "border-sky-500 bg-gradient-to-b from-sky-100 to-white text-sky-950 shadow-md shadow-sky-200/40"
                      : isDarkMode
                        ? "border-surface-subtle bg-surface-interactive text-iron-400 hover:border-surface hover:bg-surface-pressed hover:text-iron-200"
                        : "border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm",
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-normal uppercase leading-none tracking-[0.16em]",
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
                            : "text-emerald-700/90"
                          : isDarkMode
                            ? "text-iron-500"
                            : "text-slate-400",
                    )}
                  >
                    {new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}
                  </span>

                  <span
                    className={cn(
                      "text-base font-normal leading-none tracking-[0.12em]",
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
                            : "text-emerald-800"
                          : isDarkMode
                            ? "text-iron-300"
                            : "text-slate-700",
                    )}
                  >
                    {new Date(d + "T12:00:00").getDate()}
                  </span>

                  <span className="flex h-1 w-full items-center justify-center">
                    {c > 0 ? (
                      <span
                        className={cn(
                          "h-1 w-1 shrink-0 rounded-full",
                          isViewingToday
                            ? isDarkMode
                              ? "bg-emerald-400"
                              : "bg-emerald-500"
                            : isDarkMode
                              ? "bg-sky-400"
                              : "bg-sky-500",
                        )}
                      />
                    ) : (
                      <span className="h-1 w-1 shrink-0" aria-hidden />
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {showNowButton ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 z-20 flex w-12 items-center justify-end bg-gradient-to-l pl-4 transition-opacity duration-150",
              todayFadeClass,
            )}
          >
            <button
              type="button"
              onClick={() => {
                hapticLight();
                goToToday();
              }}
              aria-label="Go to today"
              className={cn(
                touchPress,
                "pointer-events-auto flex h-9 w-9 flex-col items-center justify-center gap-0.5 rounded-card",
                isDarkMode
                  ? "bg-sky-500/25 text-sky-100 ring-1 ring-sky-400/35 hover:bg-sky-500/35"
                  : "bg-sky-600 text-white shadow-sm hover:bg-sky-700",
              )}
            >
              <Undo2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
              <span className="text-[7px] font-normal uppercase leading-none tracking-[0.08em]">Now</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
});

export default HorizontalDateStrip;

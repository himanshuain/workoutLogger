import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Normalize wheel delta to roughly CSS pixels */
function normalizeWheelDy(ev) {
  if (ev.deltaMode === 1) return ev.deltaY * 16;
  if (ev.deltaMode === 2)
    return (
      ev.deltaY * (typeof window !== "undefined" ? window.innerHeight * 0.9 : 400)
    );
  return ev.deltaY;
}

function shouldForwardVerticalScroll(panelEl, deltaDown) {
  if (deltaDown === 0) return false;

  const { scrollTop, scrollHeight, clientHeight } = panelEl;

  const canScroll = scrollHeight > clientHeight + 1;

  const atTop = scrollTop <= 1;
  const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

  return !canScroll || (deltaDown > 0 && atBottom) || (deltaDown < 0 && atTop);
}

/** Nearest ancestor whose vertical overflow carries the page scroll (e.g. Layout main). */
function ancestorVerticalScrollSink(fromEl) {
  let node = fromEl.parentElement;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    const scrollable =
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowY === "overlay";
    if (scrollable && node.scrollHeight > node.clientHeight + 2) {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

/**
 * Wheel / touch overscroll chains into Layout `<main>` when the expanded tab panel cannot scroll further.
 */
function subscribeExpandedPanelScrollForward(panelEl) {
  if (!panelEl?.addEventListener) {
    return undefined;
  }

  let touchLastY = null;

  const wheel = ev => {
    const delta = normalizeWheelDy(ev);

    if (!shouldForwardVerticalScroll(panelEl, delta)) return;

    const parent = ancestorVerticalScrollSink(panelEl);
    if (!parent || parent === panelEl) return;

    parent.scrollTop += delta;
    ev.preventDefault();
    ev.stopPropagation();
  };

  const onTouchStart = ev => {
    if (ev.touches?.length !== 1) {
      touchLastY = null;
      return;
    }
    touchLastY = ev.touches[0].clientY;
  };

  const onTouchEnd = () => {
    touchLastY = null;
  };

  const onTouchMove = ev => {
    if (touchLastY === null || ev.touches?.length !== 1) return;

    const y = ev.touches[0].clientY;
    const deltaDown = touchLastY - y;
    touchLastY = y;

    if (!ev.cancelable) return;

    if (!shouldForwardVerticalScroll(panelEl, deltaDown)) return;

    const parent = ancestorVerticalScrollSink(panelEl);
    if (!parent || parent === panelEl) return;

    parent.scrollTop += deltaDown;
    ev.preventDefault();
    ev.stopPropagation();
  };

  panelEl.addEventListener("wheel", wheel, { passive: false });

  panelEl.addEventListener("touchstart", onTouchStart, { passive: true });
  panelEl.addEventListener("touchmove", onTouchMove, { passive: false });
  panelEl.addEventListener("touchend", onTouchEnd, { passive: true });
  panelEl.addEventListener("touchcancel", onTouchEnd, { passive: true });

  return () => {
    panelEl.removeEventListener("wheel", wheel);
    panelEl.removeEventListener("touchstart", onTouchStart);
    panelEl.removeEventListener("touchmove", onTouchMove);
    panelEl.removeEventListener("touchend", onTouchEnd);
    panelEl.removeEventListener("touchcancel", onTouchEnd);
  };
}

/**
 * Life Log expanded panel: primary action row, pill tabs, horizontally swipeable panels.
 */
export default function ExpandedLogInsightsTabs({
  isDarkMode,
  primaryAction,
  insightsLabel = "Insights",
  logsLabel = "Logs",
  insightsChildren,
  logsChildren,
}) {
  const outerRef = useRef(null);
  const scrollRef = useRef(null);
  const insightsPanelRef = useRef(null);
  const logsPanelRef = useRef(null);
  const [viewportW, setViewportW] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    function measure() {
      setViewportW(el.clientWidth || 0);
    }
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const syncFromScroll = useCallback(() => {
    const sc = scrollRef.current;
    const w = viewportW || sc?.clientWidth || 1;
    if (!sc || w <= 0) return;
    const idx = Math.min(1, Math.max(0, Math.round(sc.scrollLeft / w)));
    setActive(idx);
  }, [viewportW]);

  useEffect(() => {
    syncFromScroll();
  }, [syncFromScroll, viewportW]);

  useLayoutEffect(() => {
    const cleanups = [insightsPanelRef, logsPanelRef]
      .map(r => subscribeExpandedPanelScrollForward(r.current))
      .filter(Boolean);
    return () => cleanups.forEach(c => c());
  }, []);

  function go(idx) {
    const sc = scrollRef.current;
    const w = viewportW || sc?.clientWidth || 1;
    if (!sc || w <= 0) return;
    sc.scrollTo({ left: idx * w, behavior: "smooth" });
    setActive(idx);
  }

  const tabActive = isDarkMode
    ? "bg-lift-primary text-iron-950 shadow-inner"
    : "bg-workout-primary text-white shadow-sm";
  const tabInactive = isDarkMode
    ? "text-iron-400 hover:bg-iron-800/80 hover:text-iron-100"
    : "text-slate-600 hover:bg-slate-50";

  return (
    <div className={`space-y-3 border-t pt-3 ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>
      <div>{primaryAction}</div>

      <div
        className={`flex shrink-0 gap-1 rounded-xl p-1 ${isDarkMode ? "bg-iron-900/70" : "bg-slate-100"}`}
        role="tablist"
        aria-label="Expanded section"
      >
        <button
          type="button"
          role="tab"
          aria-selected={active === 0}
          onClick={() => go(0)}
          className={cn(
            "min-h-[44px] flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap",
            active === 0 ? tabActive : tabInactive,
          )}
        >
          {insightsLabel}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === 1}
          onClick={() => go(1)}
          className={cn(
            "min-h-[44px] flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap",
            active === 1 ? tabActive : tabInactive,
          )}
        >
          {logsLabel}
        </button>
      </div>

      <div ref={outerRef} className="w-full min-w-0 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={syncFromScroll}
          className={cn(
            "flex touch-pan-x snap-x snap-mandatory overflow-x-auto scroll-smooth overscroll-x-contain",
            "[scrollbar-width:none] [-ms-overflow-style:none]",
            "[&::-webkit-scrollbar]:hidden",
          )}
        >
          <section
            ref={insightsPanelRef}
            className={cn(
              "shrink-0 snap-start snap-always pb-2 pr-1",
              "max-h-[min(58vh,30rem)] overflow-y-auto overflow-x-hidden overscroll-y-auto",
              "touch-pan-y [scrollbar-width:thin]",
              "[-webkit-overflow-scrolling:touch]",
              isDarkMode
                ? "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-iron-700 [&::-webkit-scrollbar]:w-1.5"
                : "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar]:w-1.5",
              viewportW <= 0 && "min-w-full",
            )}
            style={
              viewportW > 0
                ? {
                    flex: "0 0 auto",
                    width: viewportW,
                    minWidth: viewportW,
                    maxWidth: viewportW,
                  }
                : {}
            }
            aria-hidden={active !== 0}
          >
            <div className="space-y-2">{insightsChildren}</div>
          </section>

          <section
            ref={logsPanelRef}
            className={cn(
              "shrink-0 snap-start snap-always pb-2 pr-1",
              "max-h-[min(58vh,30rem)] overflow-y-auto overflow-x-hidden overscroll-y-auto",
              "touch-pan-y [scrollbar-width:thin]",
              "[-webkit-overflow-scrolling:touch]",
              isDarkMode
                ? "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-iron-700 [&::-webkit-scrollbar]:w-1.5"
                : "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar]:w-1.5",
              viewportW <= 0 && "min-w-full",
            )}
            style={
              viewportW > 0
                ? {
                    flex: "0 0 auto",
                    width: viewportW,
                    minWidth: viewportW,
                    maxWidth: viewportW,
                  }
                : {}
            }
            aria-hidden={active !== 1}
          >
            <div className="space-y-2">{logsChildren}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

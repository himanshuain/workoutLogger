import { useRef, useEffect, useMemo, useCallback, useState } from "react";

const ITEM_WIDTH = 32;
/** Half item width for calc(50% - X) padding */
const HALF_ITEM = ITEM_WIDTH / 2;

function buildValues(min, max, step) {
  const arr = [];
  for (let v = min; v <= max + 1e-9; v += step) {
    const n = Math.round((v / step) * step * 1000) / 1000;
    arr.push(n);
  }
  return arr;
}

function nearestIndex(values, value) {
  let best = 0;
  let bestD = Infinity;
  values.forEach((val, i) => {
    const d = Math.abs(val - value);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function isMajorTick(v, min, max, step) {
  if (Math.abs(v - min) < 1e-9 || Math.abs(v - max) < 1e-9) return true;
  if (step >= 1) return v % 10 === 0;
  const near = Math.round(v / 10) * 10;
  return Math.abs(v - near) < 0.35;
}

/**
 * Horizontal sliding scale (analog-style): ticks scroll; orange needle fixed at center.
 */
export default function SlidingNumberPicker({
  value,
  min,
  max,
  step,
  onChange,
  isDarkMode,
  accent = "reps",
  format = v => String(v),
  /** Shown next to the large readout (e.g. "reps", "kg") */
  unitLabel = "",
}) {
  const scrollRef = useRef(null);
  const syncingRef = useRef(false);
  const settleTimer = useRef(null);
  const [centerIndex, setCenterIndex] = useState(0);

  const values = useMemo(() => buildValues(min, max, step), [min, max, step]);

  const scrollToIndex = useCallback(
    (idx, behavior = "auto") => {
      const el = scrollRef.current;
      if (!el || values.length === 0) return;
      const clamped = Math.max(0, Math.min(values.length - 1, idx));
      syncingRef.current = true;
      el.scrollTo({ left: clamped * ITEM_WIDTH, behavior });
      setCenterIndex(clamped);
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    },
    [values.length]
  );

  useEffect(() => {
    const idx = nearestIndex(values, value);
    scrollToIndex(idx, "auto");
  }, [value, values, scrollToIndex]);

  const commitScrollPosition = useCallback(() => {
    const el = scrollRef.current;
    if (!el || syncingRef.current) return;
    const idx = Math.round(el.scrollLeft / ITEM_WIDTH);
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    if (Math.abs(el.scrollLeft - clamped * ITEM_WIDTH) > 1) {
      el.scrollTo({ left: clamped * ITEM_WIDTH, behavior: "smooth" });
    }
    setCenterIndex(clamped);
    const next = values[clamped];
    if (next !== undefined && Math.abs(next - value) > 1e-9) {
      onChange(next);
      if (window.navigator?.vibrate) window.navigator.vibrate(4);
    }
  }, [values, value, onChange]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / ITEM_WIDTH);
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    setCenterIndex(clamped);

    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      commitScrollPosition();
    }, 100);
  }, [values.length, commitScrollPosition]);

  const frameClass = isDarkMode
    ? "border-[3px] border-emerald-800/70 bg-gradient-to-b from-emerald-950/50 to-emerald-950/20 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]"
    : "border-[3px] border-emerald-600/35 bg-gradient-to-b from-emerald-50 to-emerald-100/80 shadow-[inset_0_1px_6px_rgba(16,185,129,0.12)]";

  const fadeL = isDarkMode
    ? "from-emerald-950 via-emerald-950/40"
    : "from-emerald-100 via-emerald-50/30";
  const fadeR = isDarkMode
    ? "to-emerald-950 via-emerald-950/40"
    : "to-emerald-100 via-emerald-50/30";

  const tickMajor = isDarkMode ? "bg-iron-200" : "bg-slate-700";
  const tickMinor = isDarkMode ? "bg-iron-500/60" : "bg-slate-400/70";

  const numClass = isDarkMode ? "text-iron-300" : "text-slate-800";

  const displayVal = values[centerIndex] ?? value;

  return (
    <div className="select-none" data-no-swipe-deck>
      <div className={`relative overflow-hidden rounded-t-[1.75rem] rounded-b-2xl ${frameClass}`}>
        {/* Side fades */}
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r ${fadeL} to-transparent`}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l ${fadeR} from-transparent`}
          aria-hidden
        />

        {/* Fixed center needle */}
        <div
          className="pointer-events-none absolute left-1/2 top-2 bottom-0 z-20 w-[3px] -translate-x-1/2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.7)]"
          aria-hidden
        />

        <div className="relative h-[88px] pt-2">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex h-full flex-row overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{
              WebkitOverflowScrolling: "touch",
              paddingLeft: `calc(50% - ${HALF_ITEM}px)`,
              paddingRight: `calc(50% - ${HALF_ITEM}px)`,
            }}
          >
            {values.map((v, i) => {
              const major = isMajorTick(v, min, max, step);
              const dist = Math.abs(i - centerIndex);
              const labelOpacity = major ? Math.max(0.25, 1 - dist * 0.12) : 0;

              return (
                <div
                  key={i}
                  className="flex w-8 shrink-0 snap-center flex-col items-center justify-end pb-2"
                >
                  <div className="flex h-14 flex-col items-center justify-end gap-0.5">
                    <div
                      className={`rounded-full ${major ? `h-7 w-[3px] ${tickMajor}` : `h-3.5 w-px ${tickMinor}`}`}
                    />
                    {major ? (
                      <span
                        className={`mt-1 text-[11px] font-bold tabular-nums ${numClass}`}
                        style={{ opacity: labelOpacity }}
                      >
                        {format(v)}
                      </span>
                    ) : (
                      <span className="mt-1 h-3.5" aria-hidden />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Large readout — like a scale display */}
      <div
        className={`mt-3 flex flex-col items-center rounded-b-2xl px-2 pb-1 ${
          accent === "reps"
            ? isDarkMode
              ? "text-cyan-100"
              : "text-cyan-950"
            : isDarkMode
              ? "text-amber-100"
              : "text-amber-950"
        }`}
      >
        <p className="text-center text-3xl font-bold tabular-nums tracking-tight">
          {format(displayVal)}
          {unitLabel ? (
            <span
              className={`ml-1.5 text-lg font-semibold ${
                accent === "reps"
                  ? isDarkMode
                    ? "text-cyan-400/90"
                    : "text-cyan-700"
                  : isDarkMode
                    ? "text-amber-400/90"
                    : "text-amber-800"
              }`}
            >
              {unitLabel}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

/**
 * Browser preview: horizontal date strip (mock food dots).
 * Open: http://localhost:3000/demo/today-strip
 * Real logging: home (/)
 */
import { useMemo, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import HorizontalDateStrip from "@/components/logging/HorizontalDateStrip";
import {
  localDateStr,
  addDaysStr,
  STRIP_INITIAL_DAYS,
  STRIP_LOAD_MORE_DAYS,
  STRIP_MAX_PAST_DAYS,
} from "@/lib/dateLogUtils";

function formatChip(iso, todayRef) {
  if (iso === todayRef) return "Today";
  const y = addDaysStr(todayRef, -1);
  if (iso === y) return "Yesterday";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function TodayStripDemoPage() {
  const todayStr = useMemo(() => localDateStr(), []);
  const [selected, setSelected] = useState(todayStr);
  const [stripPastDaysLoaded, setStripPastDaysLoaded] = useState(STRIP_INITIAL_DAYS);

  const glanceDays = useMemo(() => {
    const n = stripPastDaysLoaded;
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      out.push(addDaysStr(todayStr, -i));
    }
    return out;
  }, [todayStr, stripPastDaysLoaded]);

  const loadMoreStripPast = useCallback(() => {
    setStripPastDaysLoaded(prev =>
      prev >= STRIP_MAX_PAST_DAYS ? prev : Math.min(prev + STRIP_LOAD_MORE_DAYS, STRIP_MAX_PAST_DAYS),
    );
  }, []);

  const mockFood = useMemo(() => {
    const m = {};
    glanceDays.forEach((d, i) => {
      if (i % 4 === 0 || d === todayStr) m[d] = (i % 3) + 1;
    });
    return m;
  }, [glanceDays, todayStr]);

  return (
    <>
      <Head>
        <title>Demo · Today date strip</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-sky-950 via-iron-950 to-black text-iron-100 px-4 py-8 pb-24">
        <div className="mx-auto max-w-lg">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-amber-400/90 mb-2">
            Preview · not saved
          </p>
          <h1 className="text-center text-2xl font-bold mb-1">Today date strip</h1>
          <p className="text-center text-sm text-iron-400 mb-6">
            Mock dots = food logged. Scroll left to load older days.{" "}
            <Link href="/" className="text-amber-400 underline underline-offset-2 font-semibold">
              Today
            </Link>{" "}
            for real data.
          </p>

          <HorizontalDateStrip
            isDarkMode
            glanceDays={glanceDays}
            selectedDate={selected}
            todayStr={todayStr}
            foodCountByDate={mockFood}
            onPickDate={iso => {
              if (iso <= todayStr) setSelected(iso);
            }}
            stripScrollAnchorDate={todayStr}
            onNearPastEdge={loadMoreStripPast}
            canLoadMorePast={stripPastDaysLoaded < STRIP_MAX_PAST_DAYS}
            className="mb-6"
          />

          <div className="rounded-2xl border border-iron-800 bg-iron-900/40 p-5">
            <p className="text-xs font-semibold text-iron-500 uppercase tracking-wide mb-1">Selected</p>
            <p className="text-2xl font-bold text-iron-50">{formatChip(selected, todayStr)}</p>
            <p className="text-sm text-iron-400 mt-1 font-mono">{selected}</p>
            <p className="text-sm text-iron-500 mt-4 leading-relaxed">
              Same strip as home: loads {STRIP_INITIAL_DAYS} days first, then +{STRIP_LOAD_MORE_DAYS} when you
              reach the oldest edge (max {STRIP_MAX_PAST_DAYS} days).
            </p>
          </div>

          <p className="text-center text-xs text-iron-600 mt-8">
            <Link href="/" className="text-iron-400 hover:text-iron-300">
              ← Back to app
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

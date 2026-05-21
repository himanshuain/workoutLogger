import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatDayHeader } from "@/lib/dateLogUtils";

export default function PastDayScrollPill({ stripRef, isDarkMode, selectedDate, todayStr, enabled }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || !stripRef?.current) {
      setVisible(false);
      return;
    }

    const target = stripRef.current;
    const root = target.closest("main");

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { root: root ?? null, threshold: 0 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, stripRef, selectedDate]);

  if (!enabled || !selectedDate) return null;

  const { title, subtitle } = formatDayHeader(selectedDate, todayStr);

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-transform duration-200 ease-out",
        isDarkMode
          ? "border-sky-900/80 bg-iron-950"
          : "border-sky-200 bg-slate-50",
        visible ? "translate-y-0" : "-translate-y-full pointer-events-none",
      )}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex max-w-lg items-center px-4 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <p
          className={cn(
            "min-w-0 truncate tracking-wide",
            isDarkMode ? "text-iron-100" : "text-slate-900",
          )}
        >
          <span className="text-sm">{title}</span>
          {subtitle ? (
            <>
              <span className={cn("mx-2", isDarkMode ? "text-iron-600" : "text-slate-300")} aria-hidden>
                ·
              </span>
              <span className={cn("text-sm", isDarkMode ? "text-iron-400" : "text-slate-500")}>
                {subtitle}
              </span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

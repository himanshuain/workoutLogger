import { useState } from "react";
import {
  PLANNER_DAYS,
  routineSubtitleForDay,
} from "@/lib/routinePlanner";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import RoutineTransferDialog from "@/components/planner/RoutineTransferDialog";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, Plus } from "lucide-react";

/**
 * Planner weekday row: one selectable pill per day (day + subtitle + actions).
 */
export default function RoutinePlannerWeekStrip({
  selectedDay,
  onDaySelect,
  isDarkMode,
  getRoutineForDay,
  createRoutine,
  updateRoutine,
  restMap,
  onRestMapChange,
  onAddDay,
}) {
  const [transferFrom, setTransferFrom] = useState(null);

  const ctxMenuCls = isDarkMode
    ? "border-iron-700 bg-iron-900 text-iron-100"
    : "border-slate-200 bg-white text-slate-900";

  const ctxItemCls = isDarkMode ? "dark:data-[highlighted]:bg-white/10" : "";

  const subtitleBodyCls = active =>
    cn(
      "w-full min-h-[2.875rem] px-0.5 text-left text-xs font-medium leading-snug line-clamp-2 break-words",
      isDarkMode
        ? active
          ? "text-iron-200"
          : "text-iron-400"
        : active
          ? "text-slate-800"
          : "text-slate-600",
    );

  return (
    <>
      <div
        className={cn(
          "-mx-1 mt-8 flex gap-3 overflow-x-auto scrollbar-thin",
          "snap-x snap-mandatory px-px",
          "py-4 sm:py-4",
          "scroll-pl-4 scroll-pr-4 scroll-pt-3 scroll-pb-3 sm:scroll-pl-5 sm:scroll-pr-5 sm:scroll-pt-4 sm:scroll-pb-4",
        )}
      >
        {PLANNER_DAYS.map(d => {
          const active = selectedDay === d.value;
          const r = getRoutineForDay(d.value);
          const isRest = !!restMap[d.value];
          const hasPlan =
            isRest ||
            Boolean(r?.name?.trim()) ||
            (r?.routine_exercises?.length ?? 0) > 0;
          const isEmpty = !hasPlan;
          const subtitle = routineSubtitleForDay({
            markedRest: isRest,
            routine: r,
          });
          const canTransfer = !!r;

          const pillBase = cn(
            "flex flex-col gap-2 rounded-card px-3 py-3 outline-none cursor-pointer transition-[color,background-color,border-color,box-shadow]",
            isEmpty
              ? active
                ? isDarkMode
                  ? "border-lift-primary/45 bg-surface-selected text-iron-100 ring-2 ring-inset ring-lift-primary/55"
                  : "accent-soft-surface border border-red-100 shadow-sm ring-2 ring-inset ring-red-200/80"
                : "border-transparent bg-transparent shadow-none ring-0 hover:bg-surface-interactive/60"
              : isDarkMode
                ? active
                  ? "border-lift-primary/45 bg-surface-selected text-iron-100 ring-2 ring-inset ring-lift-primary/55 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lift-primary/70"
                  : "border-surface-subtle bg-surface-section text-iron-300 ring-0 ring-transparent hover:bg-surface-interactive focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-iron-500"
                : active
                  ? "accent-soft-surface border border-red-100 shadow-sm focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-200/80"
                  : "border-surface-subtle bg-surface-section shadow-sm ring-0 ring-transparent hover:bg-surface-interactive focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-300/60",
          );

          const dayBadgeCls =
            `text-[10px] font-semibold tracking-wide [font-variant:small-caps] ` +
            (isDarkMode
              ? active
                ? "text-iron-200"
                : "text-iron-400"
              : active
                ? "text-red-800"
                : "text-[color:var(--text-secondary)]");

          const columnInner = (
            <div className="min-w-[5.25rem] max-w-[6rem] shrink-0 snap-start md:min-w-[5.5rem] md:max-w-[6.25rem]">
              <div
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={
                  isEmpty ? `Add workout for ${d.label}` : `${d.label}, ${subtitle}`
                }
                data-state={active ? "active" : "inactive"}
                onClick={() => onDaySelect(d.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onDaySelect(d.value);
                  }
                }}
                className={cn(pillBase, "min-h-[6.125rem]")}
              >
                <span className={`${dayBadgeCls} block truncate`}>{d.short}</span>

                {isEmpty ? (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onDaySelect(d.value);
                      onAddDay?.(d.value);
                    }}
                    className={cn(
                      "flex flex-1 w-full min-h-[2.875rem] items-center justify-center transition-colors",
                      isDarkMode
                        ? "text-iron-400 hover:text-iron-200"
                        : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]",
                    )}
                    aria-label={`Add workout for ${d.label}`}
                  >
                    <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  </button>
                ) : (
                  <p className={`${subtitleBodyCls(active)} flex-1`} title={subtitle}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          );

          return canTransfer ? (
            <ContextMenu key={d.value}>
              <ContextMenuTrigger asChild>{columnInner}</ContextMenuTrigger>
              <ContextMenuContent align="center" sideOffset={4} className={ctxMenuCls}>
                <ContextMenuItem
                  className={cn(ctxItemCls, "gap-2")}
                  onSelect={() => {
                    requestAnimationFrame(() => setTransferFrom(d.value));
                  }}
                >
                  <ArrowRightLeft className="w-4 h-4 shrink-0 opacity-70" aria-hidden />
                  Move or copy…
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ) : (
            <div key={d.value}>{columnInner}</div>
          );
        })}
      </div>

      {getRoutineForDay(selectedDay) ? (
        <button
          type="button"
          onClick={() => setTransferFrom(selectedDay)}
          className={`mt-1 inline-flex items-center gap-1.5 text-xs font-medium ${
            isDarkMode
              ? "text-iron-500 hover:text-iron-300"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden />
          Move or copy to another day
        </button>
      ) : null}

      <RoutineTransferDialog
        open={transferFrom !== null}
        fromDay={transferFrom}
        onOpenChange={open => !open && setTransferFrom(null)}
        isDarkMode={isDarkMode}
        getRoutineForDay={getRoutineForDay}
        createRoutine={createRoutine}
        updateRoutine={updateRoutine}
        restMap={restMap}
        onRestMapChange={onRestMapChange}
      />
    </>
  );
}

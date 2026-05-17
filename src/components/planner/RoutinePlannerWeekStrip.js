import { useCallback, useState } from "react";
import {
  PLANNER_DAYS,
  routineSubtitleForDay,
  swapRestMarkers,
  restMapAfterMove,
  bareRoutineFields,
} from "@/lib/routinePlanner";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Planner weekday row: one selectable pill per day (day + subtitle + actions), move/swap via menu + dialog.
 */
export default function RoutinePlannerWeekStrip({
  selectedDay,
  onDaySelect,
  isDarkMode,
  getRoutineForDay,
  updateRoutine,
  restMap,
  onRestMapChange,
}) {
  const [movePickerFrom, setMovePickerFrom] = useState(null);
  const [swapConfirm, setSwapConfirm] = useState(null);

  const execMove = useCallback(
    async (fromDay, toDay) => {
      const moving = getRoutineForDay(fromDay);
      const target = getRoutineForDay(toDay);
      if (!moving) return;

      try {
        if (target) {
          await updateRoutine(moving.id, bareRoutineFields(moving, null));
          await updateRoutine(target.id, bareRoutineFields(target, fromDay));
          await updateRoutine(moving.id, bareRoutineFields(moving, toDay));
          onRestMapChange(prev => swapRestMarkers(prev, fromDay, toDay));
          toast.success("Swapped routines between days");
          return;
        }

        await updateRoutine(moving.id, bareRoutineFields(moving, toDay));
        onRestMapChange(prev => restMapAfterMove(prev, fromDay, toDay));
        toast.success(`Moved to ${PLANNER_DAYS.find(d => d.value === toDay)?.short ?? "day"}`);
      } catch (err) {
        console.error(err);
        toast.error("Could not update routine — try again");
      }
    },
    [getRoutineForDay, onRestMapChange, updateRoutine],
  );

  const handlePickTargetDay = useCallback(
    toDay => {
      const fromDay = movePickerFrom;
      if (fromDay == null || fromDay === toDay) return;
      const target = getRoutineForDay(toDay);
      const source = getRoutineForDay(fromDay);
      if (!source) return;
      setMovePickerFrom(null);
      if (target) {
        setSwapConfirm({
          fromDay,
          toDay,
          sourceName: source.name?.trim() || "Untitled",
          targetName: target.name?.trim() || "Untitled",
        });
        return;
      }
      void execMove(fromDay, toDay);
    },
    [execMove, getRoutineForDay, movePickerFrom],
  );

  const openMovePicker = day => setMovePickerFrom(day);

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

  const moveSourceBanner =
    movePickerFrom !== null
      ? (() => {
          const r = getRoutineForDay(movePickerFrom);
          const subtitle = routineSubtitleForDay({
            markedRest: !!restMap[movePickerFrom],
            routine: r,
          });
          const dayLabel =
            PLANNER_DAYS.find(x => x.value === movePickerFrom)?.label ?? "Selected day";
          return { subtitle, dayLabel };
        })()
      : null;

  return (
    <>
      <div
        className={cn(
          "-mx-1 mt-8 flex gap-3 overflow-x-auto scrollbar-thin",
          "snap-x snap-mandatory px-px",
          /* Room for ring + ring-offset on selected pill (overflow-x clips overflow in y too) */
          "py-4 sm:py-4",
          "scroll-pl-4 scroll-pr-4 scroll-pt-3 scroll-pb-3 sm:scroll-pl-5 sm:scroll-pr-5 sm:scroll-pt-4 sm:scroll-pb-4",
        )}
      >
        {PLANNER_DAYS.map(d => {
          const active = selectedDay === d.value;
          const r = getRoutineForDay(d.value);
          const subtitle = routineSubtitleForDay({
            markedRest: !!restMap[d.value],
            routine: r,
          });
          const canMove = !!r;

          const pillBase =
            "flex flex-col gap-2 rounded-2xl border px-3 py-3 outline-none cursor-pointer transition-[color,background-color,border-color,box-shadow] " +
            (isDarkMode
              ? active
                ? "border-lift-primary/45 bg-lift-primary/15 text-iron-100 ring-2 ring-inset ring-lift-primary/55 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lift-primary/70 "
                : "border-iron-800 bg-iron-900/60 text-iron-300 ring-0 ring-transparent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-iron-500 "
              : active
                ? "border-workout-primary/40 bg-workout-primary/10 ring-2 ring-inset ring-workout-primary/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-workout-primary/55 "
                : "border-slate-200 bg-slate-50/90 ring-0 ring-transparent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 ");

          const dayBadgeCls =
            `text-[10px] font-semibold tracking-wide [font-variant:small-caps] ` +
            (isDarkMode
              ? active
                ? "text-iron-200"
                : "text-iron-400"
              : active
                ? "text-slate-700"
                : "text-slate-500");

          const actionBtnCls = isDarkMode
            ? "shrink-0 rounded-lg p-1 text-iron-500 hover:bg-iron-800/90 hover:text-iron-300"
            : "shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700";

          const columnInner = (
            <div className="min-w-[5.25rem] max-w-[6rem] shrink-0 snap-start md:min-w-[5.5rem] md:max-w-[6.25rem]">
              <div
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={`${d.label}, ${subtitle}`}
                data-state={active ? "active" : "inactive"}
                onClick={() => onDaySelect(d.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onDaySelect(d.value);
                  }
                }}
                className={`${pillBase} min-h-[6.125rem]`}
              >
                <div className="flex min-h-[1.625rem] shrink-0 items-center justify-between gap-1.5">
                  <span className={`${dayBadgeCls} min-w-0 flex-1 truncate`}>{d.short}</span>
                  {canMove ? (
                    <button
                      type="button"
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        openMovePicker(d.value);
                      }}
                      className={`${actionBtnCls} [&_svg]:size-[1.05rem]`}
                      aria-label={`Actions for ${d.label}`}
                      title={`Move routine from ${d.label}`}
                    >
                      <MoreHorizontal strokeWidth={2} aria-hidden />
                    </button>
                  ) : (
                    <span
                      className="inline-flex size-7 shrink-0 items-center justify-center"
                      aria-hidden
                    >
                      <MoreHorizontal strokeWidth={2} className="invisible size-[1.05rem]" />
                    </span>
                  )}
                </div>

                <p className={`${subtitleBodyCls(active)} flex-1`} title={subtitle}>
                  {subtitle}
                </p>
              </div>
            </div>
          );

          return canMove ? (
            <ContextMenu key={d.value}>
              <ContextMenuTrigger asChild>{columnInner}</ContextMenuTrigger>
              <ContextMenuContent align="center" sideOffset={4} className={ctxMenuCls}>
                <ContextMenuItem
                  className={cn(ctxItemCls, "gap-2")}
                  onSelect={() => {
                    requestAnimationFrame(() => openMovePicker(d.value));
                  }}
                >
                  <ArrowRightLeft className="w-4 h-4 shrink-0 opacity-70" aria-hidden />
                  Move split…
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ) : (
            <div key={d.value}>{columnInner}</div>
          );
        })}
      </div>

      <Dialog open={movePickerFrom !== null} onOpenChange={open => !open && setMovePickerFrom(null)}>
        <DialogContent className={`max-w-sm ${isDarkMode ? "!bg-iron-900 !border-iron-700" : "!bg-white !border-slate-200"}`}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? "text-iron-50" : "text-slate-900"}>Move routine</DialogTitle>
            <DialogDescription className={isDarkMode ? "text-iron-400" : "text-slate-600"}>
              Pick a day. If it already has a routine, workouts will swap.
            </DialogDescription>
          </DialogHeader>
          {moveSourceBanner ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                isDarkMode
                  ? "border-iron-700 bg-iron-950/70 text-iron-50"
                  : "border-slate-200 bg-slate-50 text-slate-900"
              }`}
            >
              <p className="font-semibold leading-snug">{moveSourceBanner.subtitle}</p>
              <p
                className={
                  isDarkMode ? "mt-1.5 text-[11px] text-iron-400" : "mt-1.5 text-[11px] text-slate-500"
                }
              >
                Currently on <span className="font-medium">{moveSourceBanner.dayLabel}</span>
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-4 gap-2.5 gap-y-3 py-4 pt-2">
            {PLANNER_DAYS.filter(d => d.value !== movePickerFrom).map(d => (
              <button
                key={d.value}
                type="button"
                className={`py-2.5 rounded-xl text-xs font-semibold ${
                  isDarkMode ? "bg-iron-800 text-iron-200 hover:bg-iron-700" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                }`}
                onClick={() => handlePickTargetDay(d.value)}
              >
                {d.short}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!swapConfirm} onOpenChange={open => !open && setSwapConfirm(null)}>
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-iron-50" : ""}>Swap routines?</AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : ""}>
              {swapConfirm
                ? `${PLANNER_DAYS.find(x => x.value === swapConfirm.toDay)?.label} already has “${swapConfirm.targetName}”. Swap with “${swapConfirm.sourceName}”?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={`inline-flex items-center justify-center gap-2 ${isDarkMode ? "border-iron-700 bg-iron-800 text-iron-200" : ""}`}
            >
              <X className="w-4 h-4 shrink-0 opacity-70" aria-hidden />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault();
                const payload = swapConfirm;
                setSwapConfirm(null);
                if (!payload) return;
                void execMove(payload.fromDay, payload.toDay);
              }}
              className={`inline-flex items-center justify-center gap-2 ${
                isDarkMode ? "bg-lift-primary text-iron-950 hover:bg-lift-primary/90" : "bg-workout-primary text-white"
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 shrink-0" aria-hidden />
              Swap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

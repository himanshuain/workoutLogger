import { useMemo, useState, useCallback } from "react";
import {
  PLANNER_DAYS,
  routineSubtitleForDay,
  buildRoutineCopyPayload,
  restMapClearDay,
  restMapAfterMove,
  swapRestMarkers,
  bareRoutineFields,
} from "@/lib/routinePlanner";
import { describeRoutineTransfer } from "@/lib/routineTransferPreview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { actionPrimary, actionSecondary } from "@/lib/actionButtonStyles";
import { ArrowRight, ArrowRightLeft, Copy, Loader2, X } from "lucide-react";
import { toast } from "sonner";

function DayOutcomeCard({ side, isDarkMode }) {
  const cardCls = isDarkMode
    ? "border-iron-700 bg-iron-950/60"
    : "border-slate-200 bg-slate-50";

  return (
    <div className={cn("flex-1 min-w-0 rounded-card border px-3 py-2.5", cardCls)}>
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide",
          isDarkMode ? "text-iron-500" : "text-slate-500",
        )}
      >
        {side.label}
      </p>
      <div className="mt-2 space-y-1.5">
        <div>
          <p className={cn("text-[10px]", isDarkMode ? "text-iron-600" : "text-slate-400")}>Before</p>
          <p
            className={cn(
              "text-sm font-medium line-clamp-2",
              isDarkMode ? "text-iron-400 line-through decoration-iron-600" : "text-slate-500 line-through decoration-slate-300",
            )}
          >
            {side.before}
          </p>
        </div>
        <div>
          <p className={cn("text-[10px]", isDarkMode ? "text-iron-500" : "text-slate-500")}>After</p>
          <p className={cn("text-sm font-semibold line-clamp-2", isDarkMode ? "text-iron-50" : "text-slate-900")}>
            {side.after}
          </p>
          <p className={cn("mt-0.5 text-[10px] font-medium", isDarkMode ? "text-lift-primary/90" : "text-red-700")}>
            {side.note}
          </p>
        </div>
      </div>
    </div>
  );
}

function TransferPreview({ preview, isDarkMode }) {
  if (!preview) return null;

  return (
    <div
      className={cn(
        "rounded-card border px-3 py-3 space-y-3",
        isDarkMode ? "border-iron-700/80 bg-iron-900/40" : "border-slate-200 bg-white",
      )}
    >
      <p className={cn("text-xs font-semibold", isDarkMode ? "text-iron-200" : "text-slate-800")}>
        {preview.headline}
      </p>
      <div className="flex items-stretch gap-2">
        <DayOutcomeCard side={preview.from} isDarkMode={isDarkMode} />
        <div className="flex shrink-0 flex-col items-center justify-center px-0.5">
          {preview.action === "swap" ? (
            <ArrowRightLeft
              className={cn("h-5 w-5", isDarkMode ? "text-iron-500" : "text-slate-400")}
              aria-hidden
            />
          ) : (
            <ArrowRight
              className={cn("h-5 w-5", isDarkMode ? "text-iron-500" : "text-slate-400")}
              aria-hidden
            />
          )}
        </div>
        <DayOutcomeCard side={preview.to} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}

/**
 * Unified move / copy dialog with live before→after preview.
 */
export default function RoutineTransferDialog({
  open,
  fromDay,
  onOpenChange,
  isDarkMode,
  getRoutineForDay,
  createRoutine,
  updateRoutine,
  restMap,
  onRestMapChange,
}) {
  const [mode, setMode] = useState("move");
  const [targetDay, setTargetDay] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setMode("move");
    setTargetDay(null);
    setBusy(false);
  }, []);

  const handleOpenChange = useCallback(
    next => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const sourceRoutine = fromDay != null ? getRoutineForDay(fromDay) : null;
  const sourceBanner = useMemo(() => {
    if (fromDay == null) return null;
    return routineSubtitleForDay({
      markedRest: !!restMap[fromDay],
      routine: sourceRoutine,
    });
  }, [fromDay, restMap, sourceRoutine]);

  const preview = useMemo(() => {
    if (fromDay == null || targetDay == null) return null;
    return describeRoutineTransfer({
      mode,
      fromDay,
      toDay: targetDay,
      restMap,
      getRoutineForDay,
    });
  }, [fromDay, targetDay, mode, restMap, getRoutineForDay]);

  const execMove = useCallback(
    async (from, to) => {
      const moving = getRoutineForDay(from);
      const target = getRoutineForDay(to);
      if (!moving) return;

      if (target) {
        await updateRoutine(moving.id, bareRoutineFields(moving, null));
        await updateRoutine(target.id, bareRoutineFields(target, from));
        await updateRoutine(moving.id, bareRoutineFields(moving, to));
        onRestMapChange(prev => swapRestMarkers(prev, from, to));
        toast.success("Swapped workouts");
        return;
      }

      await updateRoutine(moving.id, bareRoutineFields(moving, to));
      onRestMapChange(prev => restMapAfterMove(prev, from, to));
      toast.success(`Moved to ${PLANNER_DAYS.find(d => d.value === to)?.short ?? "day"}`);
    },
    [getRoutineForDay, onRestMapChange, updateRoutine],
  );

  const execCopy = useCallback(
    async (from, to) => {
      const source = getRoutineForDay(from);
      if (!source) return;
      const target = getRoutineForDay(to);
      const payload = buildRoutineCopyPayload(source, to);
      if (target) await updateRoutine(target.id, payload);
      else await createRoutine(payload);
      onRestMapChange(prev => restMapClearDay(prev, to));
      toast.success(`Copied to ${PLANNER_DAYS.find(d => d.value === to)?.short ?? "day"}`);
    },
    [createRoutine, getRoutineForDay, onRestMapChange, updateRoutine],
  );

  const handleConfirm = useCallback(async () => {
    if (fromDay == null || targetDay == null || busy) return;
    setBusy(true);
    try {
      if (mode === "copy") await execCopy(fromDay, targetDay);
      else await execMove(fromDay, targetDay);
      handleOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(mode === "copy" ? "Could not copy routine" : "Could not move routine");
    } finally {
      setBusy(false);
    }
  }, [busy, execCopy, execMove, fromDay, handleOpenChange, mode, targetDay]);

  const fromLabel = PLANNER_DAYS.find(d => d.value === fromDay)?.label ?? "Day";

  const modeBtn = active =>
    cn(
      "flex-1 inline-flex items-center justify-center gap-1.5 rounded-card py-2.5 text-xs font-semibold transition-colors",
      active
        ? isDarkMode
          ? "bg-lift-primary/20 text-iron-50 ring-1 ring-inset ring-lift-primary/50"
          : "bg-red-50 text-red-900 ring-1 ring-inset ring-red-200"
        : isDarkMode
          ? "bg-iron-800/80 text-iron-400 hover:bg-iron-800"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
    );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "max-w-md gap-0 p-0 overflow-hidden",
          isDarkMode ? "!bg-iron-900 !border-iron-700" : "!bg-white !border-slate-200",
        )}
      >
        <div className="px-5 pt-5 pb-4 space-y-4">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className={isDarkMode ? "text-iron-50" : "text-slate-900"}>
              Move or copy workout
            </DialogTitle>
            <DialogDescription className={isDarkMode ? "text-iron-400" : "text-slate-600"}>
              Choose how to apply <span className="font-medium text-inherit">“{sourceBanner}”</span> from{" "}
              {fromLabel}. Pick a target day to see what will change.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2" role="tablist" aria-label="Transfer type">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "move"}
              className={modeBtn(mode === "move")}
              onClick={() => setMode("move")}
            >
              <ArrowRightLeft className="h-3.5 w-3.5 opacity-80" aria-hidden />
              Move
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "copy"}
              className={modeBtn(mode === "copy")}
              onClick={() => setMode("copy")}
            >
              <Copy className="h-3.5 w-3.5 opacity-80" aria-hidden />
              Copy
            </button>
          </div>

          <div>
            <p
              className={cn(
                "mb-2 text-[11px] font-semibold uppercase tracking-wide",
                isDarkMode ? "text-iron-500" : "text-slate-500",
              )}
            >
              Target day
            </p>
            <div className="grid grid-cols-4 gap-2">
              {PLANNER_DAYS.filter(d => d.value !== fromDay).map(d => {
                const picked = targetDay === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setTargetDay(d.value)}
                    className={cn(
                      "py-2.5 rounded-card text-xs font-semibold transition-colors",
                      picked
                        ? isDarkMode
                          ? "bg-lift-primary/25 text-iron-50 ring-2 ring-inset ring-lift-primary/60"
                          : "bg-red-50 text-red-900 ring-2 ring-inset ring-red-300"
                        : isDarkMode
                          ? "bg-iron-800 text-iron-200 hover:bg-iron-700"
                          : "bg-slate-100 text-slate-800 hover:bg-slate-200",
                    )}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>

          {targetDay != null ? (
            <TransferPreview preview={preview} isDarkMode={isDarkMode} />
          ) : (
            <p
              className={cn(
                "rounded-card border border-dashed px-3 py-4 text-center text-xs",
                isDarkMode
                  ? "border-iron-700 text-iron-500"
                  : "border-slate-200 text-slate-500",
              )}
            >
              Select a day above to preview what will happen
            </p>
          )}
        </div>

        <div
          className={cn(
            "flex gap-2 border-t px-5 py-4",
            isDarkMode ? "border-iron-800 bg-iron-950/50" : "border-slate-100 bg-slate-50/80",
          )}
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => handleOpenChange(false)}
            className={cn("flex-1 inline-flex items-center justify-center gap-2", actionSecondary(isDarkMode))}
          >
            <X className="h-4 w-4 opacity-70" aria-hidden />
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || targetDay == null}
            onClick={() => void handleConfirm()}
            className={cn("flex-1 inline-flex items-center justify-center gap-2 border-0", actionPrimary(isDarkMode))}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : mode === "copy" ? (
              <Copy className="h-4 w-4" aria-hidden />
            ) : (
              <ArrowRightLeft className="h-4 w-4" aria-hidden />
            )}
            {preview?.confirmLabel ?? (mode === "copy" ? "Copy" : "Move")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CalendarPlus, Loader2 } from "lucide-react";

/** Matches Routine / Plan picker order (Monday → Sunday). */
const PLANNER_DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];

export default function RoutineDayPickerDialog({
  open,
  onOpenChange,
  isDarkMode,
  getRoutineForDay,
  onConfirm,
  disabled = false,
}) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedDay(1);
      setBusy(false);
    }
  }, [open]);

  const routine = getRoutineForDay(selectedDay);
  const count = routine?.routine_exercises?.length ?? 0;

  const handleConfirm = async () => {
    if (disabled || busy) return;
    setBusy(true);
    try {
      const result = await onConfirm(selectedDay);
      if (result !== false) onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const dayLabelFull = PLANNER_DAYS.find(d => d.value === selectedDay)?.label ?? "Day";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "!z-[100] max-h-[85vh] overflow-y-auto rounded-2xl border p-5 sm:p-6",
          isDarkMode ? "border-iron-800 bg-iron-900" : "!border-slate-200 !bg-white"
        )}
      >
        <DialogHeader className="text-left">
          <DialogTitle
            className={cn(isDarkMode ? "!text-iron-50" : "!text-slate-900")}
          >
            Add to routine
          </DialogTitle>
          <DialogDescription
            className={cn(isDarkMode ? "!text-iron-400" : "!text-slate-600")}
          >
            Choose which day&apos;s routine should include this exercise.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <p
            className={cn(
              "text-[11px] font-medium uppercase tracking-wide mb-2",
              isDarkMode ? "text-iron-500" : "text-slate-500"
            )}
          >
            Day of week
          </p>
          <div className="flex flex-wrap gap-2">
            {PLANNER_DAYS.map(d => {
              const active = selectedDay === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setSelectedDay(d.value)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                    active
                      ? isDarkMode
                        ? "bg-lift-primary text-iron-950"
                        : "bg-workout-primary text-white"
                      : isDarkMode
                        ? "bg-iron-800 text-iron-200 hover:bg-iron-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={cn(
            "mt-5 rounded-2xl border p-4",
            isDarkMode ? "border-iron-800 bg-iron-950/50" : "border-slate-200 bg-slate-50"
          )}
        >
          <p
            className={cn(
              "text-xs font-semibold",
              isDarkMode ? "text-iron-300" : "text-slate-700"
            )}
          >
            {dayLabelFull}
          </p>
          {routine ? (
            <p
              className={cn(
                "mt-1 text-sm",
                isDarkMode ? "text-iron-200" : "text-slate-800"
              )}
            >
              <span className="font-medium">{routine.name}</span>
              <span className={cn("font-normal", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                {" "}
                · {count} exercise{count !== 1 ? "s" : ""}
              </span>
            </p>
          ) : (
            <p
              className={cn(
                "mt-1 text-sm",
                isDarkMode ? "text-iron-400" : "text-slate-600"
              )}
            >
              No routine for this day yet — we&apos;ll create one with this exercise.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={disabled || busy}
          onClick={handleConfirm}
          className={cn(
            "mt-5 w-full py-3.5 rounded-2xl font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2",
            isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
          )}
        >
          {busy ? (
            <Loader2 className="w-5 h-5 shrink-0 animate-spin" aria-hidden />
          ) : (
            <CalendarPlus className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden />
          )}
          {busy ? "Saving…" : routine ? "Add to this routine" : "Create routine & add"}
        </button>
      </DialogContent>
    </Dialog>
  );
}

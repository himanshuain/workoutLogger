import { sortRoutinesByName, routineExerciseCount, NEW_SPLIT_ID } from "@/lib/routineSplits";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export default function PlannerSplitTabs({
  routines,
  selectedRoutineId,
  isDarkMode,
  onSelectSplit,
  onNewSplit,
  className,
}) {
  const splits = sortRoutinesByName(routines);
  const tabValue =
    selectedRoutineId ??
    (splits.length > 0 ? splits[0].id : NEW_SPLIT_ID);

  if (splits.length === 0) {
    return (
      <div className="mt-6">
        <button
          type="button"
          onClick={onNewSplit}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-card border border-dashed py-4 text-sm font-semibold",
            isDarkMode
              ? "border-iron-700 text-iron-300 hover:bg-iron-900/50"
              : "border-slate-300 text-slate-700 hover:bg-slate-50",
          )}
        >
          <Plus className="h-5 w-5" aria-hidden />
          Create your first split
        </button>
      </div>
    );
  }

  return (
    <Tabs
      value={tabValue}
      onValueChange={onSelectSplit}
      className={cn("w-full", className ?? "mt-6")}
    >
      <div
        className={cn(
          "-mx-1 overflow-x-auto overscroll-x-contain scrollbar-thin px-1 pb-0.5",
          isDarkMode ? "scrollbar-thumb-iron-700" : "",
        )}
      >
        <TabsList
          className={cn(
            "inline-flex h-auto w-max min-w-full max-w-none justify-start gap-1 rounded-card p-1",
            isDarkMode
              ? "bg-iron-900/90 text-iron-400"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {splits.map(routine => {
            const count = routineExerciseCount(routine);
            const label = routine.name?.trim() || "Untitled";
            return (
              <TabsTrigger
                key={routine.id}
                value={routine.id}
                className={cn(
                  "shrink-0 gap-2 px-3 py-2.5 text-xs font-semibold sm:text-sm",
                  "data-[state=active]:shadow-sm",
                  isDarkMode &&
                    "data-[state=inactive]:text-iron-400 data-[state=active]:bg-lift-primary data-[state=active]:text-iron-950",
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: routine.color || "#3b82f6" }}
                  aria-hidden
                />
                <span className="max-w-[7rem] truncate sm:max-w-[9rem]">{label}</span>
                <span
                  className={cn(
                    "tabular-nums text-[10px] font-medium opacity-70",
                    isDarkMode ? "text-inherit" : "text-inherit",
                  )}
                >
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
          <TabsTrigger
            value={NEW_SPLIT_ID}
            className={cn(
              "shrink-0 gap-1.5 px-3 py-2.5 text-xs font-semibold sm:text-sm",
              isDarkMode &&
                "data-[state=inactive]:text-iron-400 data-[state=active]:bg-lift-primary data-[state=active]:text-iron-950",
            )}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            New
          </TabsTrigger>
        </TabsList>
      </div>
    </Tabs>
  );
}

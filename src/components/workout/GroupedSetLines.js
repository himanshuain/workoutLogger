import { cn } from "@/lib/utils";

function formatSetLabel(weight, reps) {
  if (weight) return `${weight} kg × ${reps}`;
  return `${reps} reps`;
}

export default function GroupedSetLines({ sets, isDarkMode, className, variant = "chips" }) {
  if (variant === "list") {
    return (
      <div className={cn("space-y-0.5", className)}>
        {sets.map((set, idx) => {
          const weight = Number(set?.weight) || 0;
          const reps = Number(set?.reps) || 0;
          return (
            <div
              key={set?.id ?? idx}
              className={cn(
                "flex items-center gap-2 py-1 text-sm tabular-nums",
                isDarkMode ? "text-iron-300" : "text-slate-700",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                  isDarkMode ? "bg-iron-700 text-iron-500" : "bg-slate-100 text-slate-400",
                )}
              >
                {idx + 1}
              </span>
              <span>{formatSetLabel(weight, reps)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {sets.map((set, idx) => {
        const weight = Number(set?.weight) || 0;
        const reps = Number(set?.reps) || 0;
        return (
          <span
            key={set?.id ?? idx}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium tabular-nums",
              isDarkMode
                ? "border border-iron-700/60 bg-iron-900/60 text-iron-200"
                : "border border-slate-200/90 bg-white text-slate-700 shadow-sm",
            )}
          >
            <span>{formatSetLabel(weight, reps)}</span>
          </span>
        );
      })}
    </div>
  );
}

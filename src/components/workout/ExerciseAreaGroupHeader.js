import { cn } from "@/lib/utils";

export default function ExerciseAreaGroupHeader({ label, count, isDarkMode, className }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 pt-1 pb-2",
        className,
      )}
    >
      <h3
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wider",
          isDarkMode ? "text-iron-400" : "text-slate-500",
        )}
      >
        {label}
      </h3>
      {typeof count === "number" ? (
        <span className={cn("text-[10px] font-medium", isDarkMode ? "text-iron-600" : "text-slate-400")}>
          {count}
        </span>
      ) : null}
    </div>
  );
}

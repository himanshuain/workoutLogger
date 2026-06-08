import { cn } from "@/lib/utils";

/** Minimal below-chart note: one summary line + optional compact legend. */
export default function ChartInsightFooter({
  isDarkMode,
  takeaway,
  summary,
  description,
  legend,
  className,
}) {
  const line = takeaway || summary || description;

  if (!line && !legend?.length) return null;

  return (
    <div
      className={cn(
        "mt-2 pt-2 border-t space-y-1.5",
        isDarkMode ? "border-iron-800" : "border-slate-100",
        className,
      )}
    >
      {line && (
        <p className={cn("text-[10px] leading-snug", isDarkMode ? "text-iron-500" : "text-slate-500")}>
          {line}
        </p>
      )}
      {legend?.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {legend.map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className={cn("text-[10px]", isDarkMode ? "text-iron-500" : "text-slate-400")}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

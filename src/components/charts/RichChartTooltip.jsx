import { getChartColors } from "@/lib/chartTheme";
import { cn } from "@/lib/utils";

/**
 * Rich Recharts tooltip — title, labeled rows, optional insight line.
 * rows: [{ label, value, sub?, color? }]
 */
export default function RichChartTooltip({
  active,
  payload,
  label,
  isDarkMode,
  title,
  rows,
  insight,
}) {
  if (!active) return null;

  const colors = getChartColors(isDarkMode);
  const resolvedRows =
    rows ??
    (payload || []).map(p => ({
      label: p.name || p.dataKey,
      value: p.value,
      color: p.color || p.stroke || p.fill,
    }));

  if (!resolvedRows.length && !title && !insight) return null;

  return (
    <div
      className={cn(
        "rounded-card px-3 py-2.5 shadow-lg max-w-[240px]",
        isDarkMode ? "bg-iron-800 border border-iron-700" : "bg-white border border-slate-200",
      )}
      style={{ fontSize: 12 }}
    >
      {(title || label) && (
        <p
          className={cn("font-semibold mb-1.5", isDarkMode ? "text-iron-100" : "text-slate-900")}
        >
          {title || label}
        </p>
      )}
      <div className="space-y-1">
        {resolvedRows.map((row, i) => (
          <div key={i} className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0">
              {row.color && (
                <span
                  className="w-2 h-2 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: row.color }}
                />
              )}
              <span className={cn("text-[11px]", isDarkMode ? "text-iron-400" : "text-slate-500")}>
                {row.label}
              </span>
            </div>
            <div className="text-right shrink-0">
              {row.valueNode ?? (
                <span className={cn("font-semibold tabular-nums", isDarkMode ? "text-iron-50" : "text-slate-800")}>
                  {row.value}
                </span>
              )}
              {row.sub && !row.valueNode && (
                <p className={cn("text-[10px] mt-0.5", isDarkMode ? "text-iron-500" : "text-slate-400")}>
                  {row.sub}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {insight && (
        <p
          className={cn(
            "text-[10px] mt-2 pt-2 border-t leading-snug",
            isDarkMode ? "text-lift-primary/90 border-iron-700" : "text-workout-primary border-slate-100",
          )}
        >
          {insight}
        </p>
      )}
    </div>
  );
}

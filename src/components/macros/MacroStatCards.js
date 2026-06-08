import { cn } from "@/lib/utils";
import { macroProgress } from "@/lib/macroCalculations";

const METRICS = [
  { key: "calories", label: "Energy", unit: "kcal", color: "#fbbf24", colorClass: "text-amber-400" },
  { key: "protein_g", label: "Protein", unit: "g", color: "#f472b6", colorClass: "text-pink-400" },
  { key: "carbs_g", label: "Carbs", unit: "g", color: "#fb923c", colorClass: "text-orange-400" },
  { key: "fat_g", label: "Fat", unit: "g", color: "#a78bfa", colorClass: "text-violet-400" },
];

function statusLabel(current, target, unit) {
  const left = Math.round((Number(target) || 0) - (Number(current) || 0));
  const suffix = unit === "kcal" ? "" : "g";
  if (left === 0) return "On target";
  if (left > 0) return `${left}${suffix} to go`;
  return `${Math.abs(left)}${suffix} over`;
}

function StatCard({ label, unit, current, target, isDarkMode, color, colorClass }) {
  const pct = macroProgress(current, target);
  const status = statusLabel(current, target, unit);

  return (
    <div className="p-3.5 flex flex-col min-h-[108px]">
      <p className={cn("text-[10px] font-semibold uppercase tracking-wider", isDarkMode ? "text-iron-500" : "text-slate-500")}>
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-1 min-w-0">
        <span className={cn("text-2xl font-bold tabular-nums leading-none", colorClass)}>
          {Math.round(current)}
        </span>
        <span className={cn("text-xs tabular-nums truncate", isDarkMode ? "text-iron-500" : "text-slate-400")}>
          / {target}{unit === "kcal" ? "" : "g"}
        </span>
      </div>
      <div className={cn("mt-3 h-1.5 w-full rounded-pill overflow-hidden", isDarkMode ? "bg-iron-800" : "bg-slate-200")}>
        <div
          className="h-full rounded-pill transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
        />
      </div>
      <p
        className={cn(
          "text-[10px] font-medium tabular-nums mt-1.5",
          status.includes("over")
            ? isDarkMode ? "text-amber-400" : "text-amber-600"
            : isDarkMode ? "text-iron-500" : "text-slate-500",
        )}
      >
        {status}
      </p>
    </div>
  );
}

export default function MacroStatCards({ totals, targets, isDarkMode }) {
  return (
    <div
      className={cn(
        "rounded-card border overflow-hidden",
        isDarkMode ? "bg-iron-900/60 border-iron-800" : "bg-white border-slate-200 shadow-sm",
      )}
    >
      <div className={cn("px-3.5 py-2.5 border-b", isDarkMode ? "border-iron-800" : "border-slate-100")}>
        <p className={cn("text-xs font-semibold", isDarkMode ? "text-iron-300" : "text-slate-700")}>
          Planned totals
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 p-2">
        {METRICS.map(m => (
          <div
            key={m.key}
            className={cn(
              "rounded-card",
              isDarkMode ? "bg-iron-800/50" : "bg-slate-50",
            )}
          >
            <StatCard
              label={m.label}
              unit={m.unit}
              current={totals[m.key]}
              target={targets[m.key]}
              isDarkMode={isDarkMode}
              color={m.color}
              colorClass={isDarkMode ? m.colorClass : m.colorClass.replace("400", "600")}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

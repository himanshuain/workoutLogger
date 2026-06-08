import { macroProgress } from "@/lib/macroCalculations";
import { cn } from "@/lib/utils";

function MacroBar({ label, current, target, color, isDarkMode }) {
  const pct = macroProgress(current, target);
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className={isDarkMode ? "text-iron-400" : "text-slate-600"}>{label}</span>
        <span className={cn("tabular-nums font-medium", isDarkMode ? "text-iron-200" : "text-slate-800")}>
          {Math.round(current)}/{target}
        </span>
      </div>
      <div className={cn("h-2 rounded-pill overflow-hidden", isDarkMode ? "bg-iron-800" : "bg-slate-200")}>
        <div
          className="h-full rounded-pill transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function MacroPlannerSummary({ totals, targets, isDarkMode, label = "Planned total" }) {
  return (
    <div
      className={cn(
        "rounded-card border p-4 space-y-3",
        isDarkMode ? "bg-iron-900/60 border-iron-800" : "bg-white border-slate-200 shadow-sm",
      )}
    >
      <p className={cn("text-sm font-semibold", isDarkMode ? "text-iron-100" : "text-slate-800")}>
        {label}
      </p>
      <MacroBar
        label="Protein (g)"
        current={totals.protein_g}
        target={targets.protein_g}
        color={isDarkMode ? "#f472b6" : "#db2777"}
        isDarkMode={isDarkMode}
      />
      <MacroBar
        label="Carbs (g)"
        current={totals.carbs_g}
        target={targets.carbs_g}
        color={isDarkMode ? "#fbbf24" : "#d91a11"}
        isDarkMode={isDarkMode}
      />
      <MacroBar
        label="Fat (g)"
        current={totals.fat_g}
        target={targets.fat_g}
        color={isDarkMode ? "#a78bfa" : "#7c3aed"}
        isDarkMode={isDarkMode}
      />
      <MacroBar
        label="Calories"
        current={totals.calories}
        target={targets.calories}
        color={isDarkMode ? "#2dd4bf" : "#0d9488"}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

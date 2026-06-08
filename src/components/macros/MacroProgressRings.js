import { macroProgress } from "@/lib/macroCalculations";
import { cn } from "@/lib/utils";

function MacroRing({ label, current, target, color, isDarkMode }) {
  const pct = macroProgress(current, target);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[88px] h-[88px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            strokeWidth="7"
            className={isDarkMode ? "stroke-iron-800" : "stroke-slate-200"}
          />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            strokeWidth="7"
            stroke={color}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-lg font-bold tabular-nums", isDarkMode ? "text-iron-50" : "text-slate-900")}>
            {Math.round(current)}
          </span>
          <span className={cn("text-[9px]", isDarkMode ? "text-iron-500" : "text-slate-500")}>
            /{target}
          </span>
        </div>
      </div>
      <span className={cn("text-[11px] font-medium", isDarkMode ? "text-iron-400" : "text-slate-600")}>
        {label}
      </span>
      <span className={cn("text-[10px] tabular-nums", isDarkMode ? "text-iron-600" : "text-slate-400")}>
        {pct}%
      </span>
    </div>
  );
}

export default function MacroProgressRings({ totals, targets, isDarkMode }) {
  const rings = [
    { label: "Protein", current: totals.protein_g, target: targets.protein_g, color: isDarkMode ? "#f472b6" : "#db2777" },
    { label: "Carbs", current: totals.carbs_g, target: targets.carbs_g, color: isDarkMode ? "#fbbf24" : "#d91a11" },
    { label: "Fat", current: totals.fat_g, target: targets.fat_g, color: isDarkMode ? "#a78bfa" : "#7c3aed" },
    { label: "Calories", current: totals.calories, target: targets.calories, color: isDarkMode ? "#2dd4bf" : "#0d9488" },
  ];

  return (
    <div
      className={cn(
        "rounded-card p-4",
        isDarkMode ? "bg-iron-900/60 border border-iron-800" : "bg-white border border-slate-200 shadow-sm",
      )}
    >
      <h3 className={cn("text-sm font-semibold mb-4", isDarkMode ? "text-iron-100" : "text-slate-800")}>
        Today&apos;s Macros
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {rings.map(r => (
          <MacroRing key={r.label} {...r} isDarkMode={isDarkMode} />
        ))}
      </div>
    </div>
  );
}

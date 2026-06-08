import { useState } from "react";
import { Plus, X, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMealMacros, formatItemMacros } from "@/lib/macroPlanner";

export default function MealPlanCard({
  meal,
  rows,
  totals,
  isDarkMode,
  isActive,
  canDelete,
  onSelect,
  onRename,
  onDelete,
  onAddFood,
  onRemove,
  onQuantityChange,
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(meal.name);

  const saveName = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== meal.name) onRename(trimmed);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "rounded-card border transition-colors",
        isActive
          ? isDarkMode ? "border-lift-primary/40 bg-iron-900/60" : "border-teal-400 bg-teal-50/30"
          : isDarkMode ? "bg-iron-900/50 border-iron-800" : "bg-white border-slate-200",
      )}
      onClick={() => onSelect?.()}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-inherit">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") setEditing(false);
                }}
                className={cn(
                  "flex-1 h-8 px-2 text-sm font-semibold rounded-card border outline-none",
                  isDarkMode ? "bg-iron-800 border-iron-700 text-iron-100" : "bg-white border-slate-200",
                )}
                autoFocus
              />
              <button type="button" onClick={saveName} className={cn("p-1", isDarkMode ? "text-green-400" : "text-green-600")}>
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setEditName(meal.name);
                setEditing(true);
              }}
              className="flex items-center gap-1.5 min-w-0 group"
            >
              <span className={cn("text-sm font-semibold truncate", isDarkMode ? "text-iron-100" : "text-slate-800")}>
                {meal.name}
              </span>
              <Pencil className={cn("w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100", isDarkMode ? "text-iron-500" : "text-slate-400")} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-[10px] tabular-nums font-medium", isDarkMode ? "text-iron-400" : "text-slate-500")}>
            {formatMealMacros(totals)}
          </span>
          {canDelete && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
              className={cn("p-1 rounded-card", isDarkMode ? "text-iron-600 hover:text-red-400" : "text-slate-400 hover:text-red-500")}
              aria-label="Delete meal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2">
        {rows.length === 0 ? (
          <p className={cn("text-xs py-1", isDarkMode ? "text-iron-600" : "text-slate-400")}>
            No foods yet
          </p>
        ) : (
          <ul className="space-y-0">
            {rows.map(row => (
              <li
                key={row.id}
                className={cn(
                  "flex items-center gap-2 py-2 border-b last:border-0",
                  isDarkMode ? "border-iron-800" : "border-slate-100",
                )}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-medium leading-snug", isDarkMode ? "text-iron-100" : "text-slate-800")}>
                    {row.name}
                  </p>
                  <p className={cn("text-[10px] mt-0.5", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                    {formatItemMacros(row.macros)}
                  </p>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={row.quantity}
                  onChange={e => onQuantityChange(row.id, Math.max(0.5, Number(e.target.value) || 1))}
                  className={cn(
                    "w-14 h-8 px-1 text-center text-xs rounded-card border shrink-0",
                    isDarkMode ? "bg-iron-900 border-iron-700 text-iron-100" : "bg-white border-slate-200",
                  )}
                />
                <span className={cn("text-[10px] w-6 shrink-0 text-center", isDarkMode ? "text-iron-500" : "text-slate-400")}>
                  {row.unit}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(row.id)}
                  className={cn("p-1 shrink-0", isDarkMode ? "text-iron-600 hover:text-red-400" : "text-slate-400 hover:text-red-500")}
                  aria-label="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onAddFood();
          }}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold uppercase tracking-wide rounded-card border border-dashed",
            isDarkMode
              ? "border-iron-700 text-iron-400 hover:border-lift-primary/50 hover:text-lift-primary"
              : "border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600",
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Add food
        </button>
      </div>
    </div>
  );
}

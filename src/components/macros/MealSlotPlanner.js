import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import DragReorderList from "@/components/DragReorderList";

export default function MealSlotPlanner({
  slot,
  rows,
  totals,
  isDarkMode,
  onAdd,
  onRemove,
  onQuantityChange,
  onReorder,
}) {
  const items = rows.map(row => ({ id: row.id, foodItemId: row.foodItemId, quantity: row.quantity }));

  return (
    <div
      className={cn(
        "rounded-card border p-3",
        isDarkMode ? "bg-iron-900/50 border-iron-800" : "bg-white border-slate-200",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{slot.icon}</span>
          <div>
            <p className={cn("text-sm font-semibold", isDarkMode ? "text-iron-100" : "text-slate-800")}>
              {slot.label}
            </p>
            <p className={cn("text-[10px]", isDarkMode ? "text-iron-500" : "text-slate-500")}>
              {slot.hint}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-card text-xs font-medium",
            isDarkMode ? "bg-iron-800 text-iron-300" : "bg-slate-100 text-slate-600",
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {rows.length === 0 ? (
        <p className={cn("text-xs py-2", isDarkMode ? "text-iron-600" : "text-slate-400")}>
          No foods — tap Add
        </p>
      ) : (
        <DragReorderList
          items={items}
          keyExtractor={item => item.id}
          onReorder={onReorder}
          isDarkMode={isDarkMode}
          renderItem={item => {
            const row = rows.find(r => r.id === item.id);
            if (!row) return null;
            return (
              <div
                className={cn(
                  "flex items-center gap-2 p-2 rounded-card flex-1",
                  isDarkMode ? "bg-iron-800/50" : "bg-slate-50",
                )}
              >
                <span className="text-lg shrink-0">{row.icon || "🍽️"}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-medium truncate", isDarkMode ? "text-iron-100" : "text-slate-800")}>
                    {row.name}
                  </p>
                  <p className={cn("text-[10px]", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                    {Math.round(row.macros.protein_g)}g P · {Math.round(row.macros.calories)} kcal
                  </p>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={row.quantity}
                  onChange={e => onQuantityChange(row.id, Math.max(0.5, Number(e.target.value) || 1))}
                  className={cn(
                    "w-14 h-8 px-1 text-center text-xs rounded-card border",
                    isDarkMode
                      ? "bg-iron-900 border-iron-700 text-iron-100"
                      : "bg-white border-slate-200 text-slate-800",
                  )}
                />
                <span className={cn("text-[10px] w-8 shrink-0", isDarkMode ? "text-iron-500" : "text-slate-400")}>
                  {row.unit}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(row.id)}
                  className={cn("p-1.5 rounded-card", isDarkMode ? "text-red-400 hover:bg-iron-700" : "text-red-500")}
                  aria-label="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }}
        />
      )}

      {rows.length > 0 && (
        <p className={cn("text-[10px] mt-2 font-medium tabular-nums", isDarkMode ? "text-iron-400" : "text-slate-600")}>
          {Math.round(totals.protein_g)}g protein · {Math.round(totals.calories)} kcal
        </p>
      )}
    </div>
  );
}

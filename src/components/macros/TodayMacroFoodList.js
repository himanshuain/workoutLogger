import { useState } from "react";
import { Check, Plus, Sparkles } from "lucide-react";
import { macrosForEntry } from "@/lib/macroCalculations";
import { applyLookupToFood } from "@/lib/nutritionLookup";
import { initialFoodQuantity, foodLogsDirectly } from "@/lib/foodQuantity";
import NutritionLookupPanel from "@/components/macros/NutritionLookupPanel";
import { cn } from "@/lib/utils";
import { hapticLight, touchPressCard } from "@/lib/touchFeedback";

export default function TodayMacroFoodList({
  foodItems,
  todayFoodEntries,
  toggleFoodEntry,
  updateFoodEntryQuantity,
  updateFoodItem,
  onOpenQuantity,
  isDarkMode,
}) {
  const [lookupId, setLookupId] = useState(null);
  const sorted = [...(foodItems || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  const handleToggle = async item => {
    const consumed = !!todayFoodEntries[item.id];
    if (consumed) {
      await toggleFoodEntry(item.id);
    } else if (foodLogsDirectly(item)) {
      await updateFoodEntryQuantity(item.id, initialFoodQuantity(item));
    } else {
      onOpenQuantity(item, initialFoodQuantity(item));
    }
    hapticLight();
  };

  const handleLookupSelect = async (item, result) => {
    if (!updateFoodItem) return;
    const updates = applyLookupToFood(result, item);
    await updateFoodItem(item.id, updates);
    setLookupId(null);
    hapticLight();
  };

  if (!sorted.length) {
    return (
      <div
        className={cn(
          "rounded-card p-6 text-center",
          isDarkMode ? "bg-iron-900/60 border border-iron-800" : "bg-white border border-slate-200",
        )}
      >
        <p className={cn("text-sm", isDarkMode ? "text-iron-500" : "text-slate-500")}>
          No food items yet. Add items on the Food page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map(item => {
        const entry = todayFoodEntries[item.id];
        const consumed = !!entry;
        const qty = entry?.quantity || 0;
        const macros = consumed ? macrosForEntry(item, qty) : macrosForEntry(item, item.default_quantity || 1);
        const hasMacros = (item.protein_g || 0) > 0;
        const showLookup = lookupId === item.id;

        return (
          <div key={item.id} className="space-y-2">
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => handleToggle(item)}
                className={cn(
                  touchPressCard,
                  "flex-1 flex items-center gap-3 p-3 rounded-card text-left transition-colors min-w-0",
                  consumed
                    ? isDarkMode
                      ? "bg-lift-primary/15 border border-lift-primary/30"
                      : "bg-green-50 border border-green-200"
                    : isDarkMode
                      ? "bg-iron-900/60 border border-iron-800"
                      : "bg-white border border-slate-200",
                )}
              >
                <span className="text-2xl shrink-0">{item.icon || "🍽️"}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium truncate", isDarkMode ? "text-iron-100" : "text-slate-800")}>
                    {item.name}
                  </p>
                  <p className={cn("text-xs mt-0.5", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                    {hasMacros ? (
                      <>
                        {Math.round(macros.protein_g)}g protein
                        {macros.calories > 0 && ` · ${Math.round(macros.calories)} kcal`}
                        {consumed && ` · ${qty} ${item.unit}`}
                      </>
                    ) : (
                      "Tap ✨ to find macros"
                    )}
                  </p>
                </div>
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    consumed
                      ? isDarkMode
                        ? "bg-lift-primary text-iron-950"
                        : "bg-green-500 text-white"
                      : isDarkMode
                        ? "bg-iron-800 text-iron-500"
                        : "bg-slate-100 text-slate-400",
                  )}
                >
                  {consumed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
              </button>

              {!hasMacros && updateFoodItem && (
                <button
                  type="button"
                  onClick={() => setLookupId(showLookup ? null : item.id)}
                  className={cn(
                    "shrink-0 px-3 rounded-card border flex items-center justify-center",
                    showLookup
                      ? isDarkMode
                        ? "bg-lift-primary/20 border-lift-primary/40 text-lift-primary"
                        : "bg-amber-100 border-amber-300 text-amber-700"
                      : isDarkMode
                        ? "bg-iron-800 border-iron-700 text-iron-400"
                        : "bg-slate-100 border-slate-200 text-slate-500",
                  )}
                  aria-label={`Find macros for ${item.name}`}
                  title="Find macros"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              )}
            </div>

            {showLookup && (
              <NutritionLookupPanel
                query={item.name}
                isDarkMode={isDarkMode}
                compact
                onSelect={result => handleLookupSelect(item, result)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

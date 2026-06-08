import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { macrosForEntry } from "@/lib/macroCalculations";
import { formatItemMacros } from "@/lib/macroPlanner";

export default function FoodLibraryPanel({
  foodItems,
  isDarkMode,
  activeMealName,
  onPick,
}) {
  const [search, setSearch] = useState("");

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return [...(foodItems || [])]
      .filter(f => f.name.toLowerCase().includes(q))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .slice(0, 30);
  }, [foodItems, search]);

  return (
    <div
      className={cn(
        "rounded-card border flex flex-col h-full min-h-[280px] lg:min-h-[calc(100vh-8rem)] lg:max-h-[calc(100vh-8rem)]",
        isDarkMode ? "bg-iron-900/80 border-iron-800" : "bg-white border-slate-200",
      )}
    >
      <div className="p-3 border-b border-inherit">
        <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2", isDarkMode ? "text-iron-300" : "text-slate-700")}>
          Food library
        </p>
        <div className="relative">
          <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4", isDarkMode ? "text-iron-500" : "text-slate-400")} />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search foods…"
            className={cn(
              "w-full h-10 pl-9 pr-3 text-sm rounded-card border outline-none focus:ring-2",
              isDarkMode
                ? "bg-iron-800 border-iron-700 text-iron-100 focus:ring-lift-primary/40"
                : "bg-slate-50 border-slate-200 text-slate-800 focus:ring-teal-400/40",
            )}
          />
        </div>
        {activeMealName && (
          <p className={cn("text-[10px] mt-2", isDarkMode ? "text-iron-500" : "text-slate-500")}>
            Adding to <span className="font-medium">{activeMealName}</span>
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {search.trim().length < 2 ? (
          <p className={cn("text-xs text-center py-8 px-3", isDarkMode ? "text-iron-600" : "text-slate-400")}>
            Type at least 2 characters to search your foods
          </p>
        ) : results.length === 0 ? (
          <p className={cn("text-xs text-center py-8", isDarkMode ? "text-iron-600" : "text-slate-400")}>
            No matches — add foods on the Food page first
          </p>
        ) : (
          <ul className="space-y-0.5">
            {results.map(item => {
              const m = macrosForEntry(item, item.default_quantity || 1);
              const hasMacros = (item.protein_g || 0) > 0 || (item.calories || 0) > 0;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    className={cn(
                      "w-full text-left px-2.5 py-2 rounded-card transition-colors",
                      isDarkMode ? "hover:bg-iron-800" : "hover:bg-slate-50",
                    )}
                  >
                    <p className={cn("text-xs font-medium leading-snug", isDarkMode ? "text-iron-100" : "text-slate-800")}>
                      {item.name}
                    </p>
                    <p className={cn("text-[10px] mt-0.5", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                      {hasMacros
                        ? `${formatItemMacros(m)} per ${item.default_quantity || 1} ${item.unit}`
                        : "No macros set"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

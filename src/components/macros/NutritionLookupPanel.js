import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search, Loader2, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "whole", label: "Whole foods" },
  { id: "branded", label: "Branded" },
];

function TypeBadge({ result, isDarkMode }) {
  const branded = result.isBranded;
  return (
    <span
      className={cn(
        "shrink-0 rounded-pill px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        branded
          ? isDarkMode
            ? "bg-blue-500/20 text-blue-300"
            : "bg-blue-100 text-blue-700"
          : isDarkMode
            ? "bg-lift-primary/20 text-lift-primary"
            : "bg-amber-100 text-amber-800",
      )}
    >
      {result.typeLabel}
    </span>
  );
}

function MacroPills({ macros, isDarkMode, small }) {
  const items = [
    { label: "P", value: `${macros.protein_g}g`, accent: true },
    { label: "C", value: `${macros.carbs_g}g` },
    { label: "F", value: `${macros.fat_g}g` },
    { label: "kcal", value: `${macros.calories}` },
  ];
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {items.map(item => (
        <span
          key={item.label}
          className={cn(
            "rounded-pill px-1.5 py-0.5 tabular-nums",
            small ? "text-[9px]" : "text-[10px]",
            item.accent
              ? isDarkMode
                ? "bg-pink-500/20 text-pink-300 font-semibold"
                : "bg-pink-100 text-pink-800 font-semibold"
              : isDarkMode
                ? "bg-iron-700/80 text-iron-400"
                : "bg-slate-100 text-slate-600",
          )}
        >
          {item.label} {item.value}
        </span>
      ))}
    </div>
  );
}

export default function NutritionLookupPanel({
  query = "",
  isDarkMode,
  onSelect,
  autoSearch = true,
  compact = false,
  minimal = false,
}) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [pickedId, setPickedId] = useState(null);
  const debounceRef = useRef(null);

  const runSearch = useCallback(async (q) => {
    const term = (q || "").trim();
    if (term.length < 2) {
      setResults([]);
      setSearched(false);
      setPickedId(null);
      return;
    }

    setLoading(true);
    setError(null);
    setPickedId(null);
    try {
      const r = await fetch(`/api/nutrition-lookup?q=${encodeURIComponent(term)}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Lookup failed");
      setResults(json.results || []);
      setSearched(true);
    } catch (err) {
      setError(err.message || "Could not look up nutrition");
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoSearch) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 450);
    return () => clearTimeout(debounceRef.current);
  }, [query, autoSearch, runSearch]);

  const filtered = useMemo(() => {
    if (filter === "whole") return results.filter(r => !r.isBranded);
    if (filter === "branded") return results.filter(r => r.isBranded);
    return results;
  }, [results, filter]);

  const wholeCount = results.filter(r => !r.isBranded).length;
  const brandedCount = results.filter(r => r.isBranded).length;

  const handleSelect = (result) => {
    setPickedId(result.id);
    onSelect(result);
    toast.success(`Applied: ${result.description}`, {
      description: `${result.macroLine} per ${result.basisLabel}`,
    });
  };

  const showPanel = autoSearch ? query.trim().length >= 2 : true;

  if (!showPanel && !compact) return null;

  return (
    <div
      className={cn(
        "rounded-card border",
        isDarkMode ? "bg-iron-800/40 border-iron-700" : "bg-slate-50 border-slate-200",
        minimal ? "p-2.5" : compact ? "p-2.5" : "p-3",
      )}
    >
      {!minimal && (
        <div className="flex items-start gap-2 mb-2">
          <Sparkles className={cn("w-4 h-4 shrink-0 mt-0.5", isDarkMode ? "text-lift-primary" : "text-amber-600")} />
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs font-medium", isDarkMode ? "text-iron-300" : "text-slate-700")}>
              Pick the match that fits how you log this food
            </p>
            <p className={cn("text-[10px] mt-0.5", isDarkMode ? "text-iron-500" : "text-slate-500")}>
              Compare type, brand, serving size & macros — then tap to apply
            </p>
          </div>
          {loading && <Loader2 className={cn("w-3.5 h-3.5 animate-spin shrink-0", isDarkMode ? "text-iron-500" : "text-slate-400")} />}
        </div>
      )}

      {!autoSearch && (
        <button
          type="button"
          onClick={() => runSearch(query)}
          disabled={loading || query.trim().length < 2}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-card text-sm font-medium disabled:opacity-50",
            minimal ? "mb-0" : "mb-2",
            isDarkMode ? "bg-iron-700 text-iron-200" : "bg-white text-slate-700 border border-slate-200",
          )}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Look up &quot;{query.trim()}&quot;
        </button>
      )}

      {results.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {FILTERS.map(f => {
            const count =
              f.id === "all" ? results.length : f.id === "whole" ? wholeCount : brandedCount;
            if (f.id !== "all" && count === 0) return null;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-pill px-2 py-0.5 text-[10px] font-medium transition-colors",
                  filter === f.id
                    ? isDarkMode
                      ? "bg-lift-primary/25 text-lift-primary"
                      : "bg-amber-200 text-amber-900"
                    : isDarkMode
                      ? "bg-iron-700/60 text-iron-400 hover:text-iron-200"
                      : "bg-white text-slate-500 border border-slate-200",
                )}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {autoSearch && query.trim().length >= 2 && !loading && !results.length && searched && !error && (
        <p className={cn("text-xs", isDarkMode ? "text-iron-500" : "text-slate-500")}>
          No matches — try a simpler name (e.g. &quot;egg whole&quot;, &quot;chicken breast&quot;)
        </p>
      )}

      {error && (
        <p className={cn("text-xs", isDarkMode ? "text-red-400" : "text-red-600")}>{error}</p>
      )}

      {filtered.length > 0 && (
        <ul className={cn("space-y-2", compact ? "max-h-52" : "max-h-64", "overflow-y-auto pr-0.5")}>
          {filtered.map(result => {
            const selected = pickedId === result.id;
            return (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "w-full text-left px-2.5 py-2.5 rounded-card transition-colors border",
                    selected
                      ? isDarkMode
                        ? "bg-lift-primary/15 border-lift-primary/40"
                        : "bg-amber-50 border-amber-300"
                      : isDarkMode
                        ? "hover:bg-iron-700/80 bg-iron-900/50 border-iron-700/50"
                        : "hover:bg-white bg-white border-slate-100",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5 flex-wrap">
                        <p className={cn("text-xs font-semibold leading-snug flex-1 min-w-0", isDarkMode ? "text-iron-100" : "text-slate-800")}>
                          {result.description}
                        </p>
                        <TypeBadge result={result} isDarkMode={isDarkMode} />
                      </div>

                      {!minimal && result.brand && (
                        <p className={cn("text-[10px] mt-0.5 font-medium", isDarkMode ? "text-blue-300/90" : "text-blue-700")}>
                          Brand: {result.brand}
                        </p>
                      )}

                      <p className={cn("text-[10px] mt-1", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                        Per {result.basisLabel}
                      </p>
                      <MacroPills macros={result.macros} isDarkMode={isDarkMode} small={minimal} />

                      {!minimal && (
                        <>
                          <p className={cn("text-[10px] mt-1.5", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                            Per 100g: {result.per100gLine}
                          </p>
                          <p className={cn("text-[10px] mt-0.5", isDarkMode ? "text-iron-600" : "text-slate-400")}>
                            {result.unitHint}
                            {result.category ? ` · ${result.category}` : ""}
                          </p>
                        </>
                      )}
                    </div>
                    {selected && (
                      <Check className={cn("w-4 h-4 shrink-0 mt-0.5", isDarkMode ? "text-lift-primary" : "text-amber-600")} />
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {results.length > 0 && filtered.length === 0 && (
        <p className={cn("text-xs", isDarkMode ? "text-iron-500" : "text-slate-500")}>
          No results in this filter — try &quot;All&quot;
        </p>
      )}

      {!minimal && (
        <p className={cn("text-[10px] mt-2", isDarkMode ? "text-iron-600" : "text-slate-400")}>
          USDA FoodData Central · Whole foods = generic (eggs, chicken). Branded = packaged products.
        </p>
      )}
    </div>
  );
}

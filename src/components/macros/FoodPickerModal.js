import { useMemo, useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { macrosForEntry } from "@/lib/macroCalculations";
import { applyLookupToFood } from "@/lib/nutritionLookup";
import NutritionLookupPanel from "@/components/macros/NutritionLookupPanel";
import { formatItemMacros } from "@/lib/macroPlanner";
import { List, PenLine } from "lucide-react";

const EMPTY_MANUAL = {
  name: "",
  icon: "🍽️",
  color: "#f59e0b",
  unit: "g",
  default_quantity: 100,
  quantity_whole_numbers: false,
  log_directly: false,
  category: "protein",
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  calories: 0,
};

export default function FoodPickerModal({
  open,
  onClose,
  foodItems,
  isDarkMode,
  onPick,
  onCreateFood,
  title = "Add food",
  mealName,
}) {
  const [mode, setMode] = useState("list");
  const [search, setSearch] = useState("");
  const [manual, setManual] = useState({ ...EMPTY_MANUAL });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setMode("list");
      setSearch("");
      setManual({ ...EMPTY_MANUAL });
      setSaving(false);
    }
  }, [open]);

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...(foodItems || [])]
      .filter(f => !q || f.name.toLowerCase().includes(q))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [foodItems, search]);

  const handlePick = item => {
    onPick(item);
    onClose();
  };

  const handleSaveManual = async () => {
    if (!manual.name.trim() || !onCreateFood) return;
    setSaving(true);
    try {
      const created = await onCreateFood({
        ...manual,
        name: manual.name.trim(),
        protein_g: Number(manual.protein_g) || 0,
        carbs_g: Number(manual.carbs_g) || 0,
        fat_g: Number(manual.fat_g) || 0,
        calories: Number(manual.calories) || 0,
        default_quantity: Number(manual.default_quantity) || 1,
      });
      if (created) {
        onPick(created);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const inputCls = cn(
    "input-field box-border h-11 text-sm",
    isDarkMode
      ? "bg-iron-800 border-iron-700 text-iron-100 placeholder:text-iron-500 focus:ring-lift-primary/40"
      : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-teal-400/40"
  );

  const inputStyle = { paddingLeft: "1.25rem", paddingRight: "1.25rem" };

  const labelCls = cn("block text-xs mb-1", isDarkMode ? "text-iron-400" : "text-slate-600");

  return (
    <Modal open={open} onOpenChange={v => !v && onClose()}>
      <ModalContent
        className={cn(
          "max-h-[90vh] flex flex-col",
          isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"
        )}
      >
        <ModalHeader>
          <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
            {title}
            {mealName ? (
              <span
                className={cn(
                  "block text-xs font-normal mt-0.5",
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                )}
              >
                {mealName}
              </span>
            ) : null}
          </ModalTitle>
        </ModalHeader>
        <ModalBody className="overflow-hidden flex flex-col min-h-0">
          <div
            className={cn(
              "flex rounded-card p-0.5 mb-3 shrink-0",
              isDarkMode ? "bg-iron-800" : "bg-slate-100"
            )}
          >
            {[
              { id: "list", label: "Your foods", icon: List },
              { id: "manual", label: "Enter manually", icon: PenLine },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-card transition-colors",
                  mode === tab.id
                    ? isDarkMode
                      ? "bg-iron-700 text-iron-100"
                      : "bg-white text-slate-800 shadow-sm"
                    : isDarkMode
                      ? "text-iron-500"
                      : "text-slate-500"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {mode === "list" ? (
            <>
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search your foods…"
                style={inputStyle}
                className={cn(inputCls, "mb-3 shrink-0")}
              />
              <ul className="overflow-y-auto space-y-0.5 min-h-0 flex-1 max-h-[50vh]">
                {sorted.length === 0 ? (
                  <li
                    className={cn(
                      "text-sm text-center py-8",
                      isDarkMode ? "text-iron-600" : "text-slate-400"
                    )}
                  >
                    {foodItems?.length === 0 ? "No saved foods — use Enter manually" : "No matches"}
                  </li>
                ) : (
                  sorted.map(item => {
                    const m = macrosForEntry(item, item.default_quantity || 1);
                    const hasMacros = (item.protein_g || 0) > 0 || (item.calories || 0) > 0;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handlePick(item)}
                          className={cn(
                            "w-full text-left px-2.5 py-2.5 rounded-card",
                            isDarkMode ? "hover:bg-iron-800" : "hover:bg-slate-50"
                          )}
                        >
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-iron-100" : "text-slate-800"
                            )}
                          >
                            {item.name}
                          </p>
                          <p
                            className={cn(
                              "text-[10px] mt-0.5",
                              isDarkMode ? "text-iron-500" : "text-slate-500"
                            )}
                          >
                            {hasMacros
                              ? `${formatItemMacros(m)} per ${item.default_quantity || 1} ${item.unit}`
                              : "No macros set"}
                          </p>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </>
          ) : (
            <div className="overflow-y-auto space-y-3 min-h-0 flex-1 max-h-[55vh]">
              <div>
                <label className={labelCls}>Name</label>
                <input
                  type="text"
                  value={manual.name}
                  onChange={e => setManual(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Chicken breast"
                  style={inputStyle}
                  className={inputCls}
                />
              </div>

              {manual.name.trim().length >= 2 && (
                <NutritionLookupPanel
                  query={manual.name}
                  isDarkMode={isDarkMode}
                  onSelect={result => setManual(prev => applyLookupToFood(result, prev))}
                />
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Unit</label>
                  <input
                    type="text"
                    value={manual.unit}
                    onChange={e => setManual(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="g, serving"
                    style={inputStyle}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Quantity</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={manual.default_quantity}
                    onChange={e =>
                      setManual(prev => ({
                        ...prev,
                        default_quantity: Math.max(0.5, Number(e.target.value) || 1),
                      }))
                    }
                    style={inputStyle}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Macros per {manual.unit || "serving"}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "protein_g", label: "Protein (g)" },
                    { key: "carbs_g", label: "Carbs (g)" },
                    { key: "fat_g", label: "Fat (g)" },
                    { key: "calories", label: "Calories" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label
                        className={cn(
                          "block text-[10px] mb-0.5",
                          isDarkMode ? "text-iron-500" : "text-slate-500"
                        )}
                      >
                        {label}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={manual[key]}
                        onChange={e => setManual(prev => ({ ...prev, [key]: e.target.value }))}
                        style={inputStyle}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveManual}
                disabled={!manual.name.trim() || saving}
                className={cn(
                  "w-full py-3 rounded-card text-sm font-bold disabled:opacity-50",
                  isDarkMode ? "bg-lift-primary text-iron-950" : "bg-teal-600 text-white"
                )}
              >
                {saving ? "Saving…" : "Add to meal"}
              </button>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

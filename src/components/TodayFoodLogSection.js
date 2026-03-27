import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Utensils, ChevronRight, Check } from "lucide-react";
import FoodQuantityModal from "@/components/FoodQuantityModal";
import { normalizeFoodQuantity } from "@/lib/foodQuantity";

export default function TodayFoodLogSection({
  isDarkMode,
  foodItems,
  todayFoodEntries,
  toggleFoodEntry,
  updateFoodEntryQuantity,
  queryClient,
}) {
  const router = useRouter();
  const [qtyItem, setQtyItem] = useState(null);
  const [tempQty, setTempQty] = useState(1);

  const sortedItems = useMemo(
    () => [...foodItems].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [foodItems],
  );

  const openQuantity = useCallback((item, quantity) => {
    setQtyItem(item);
    setTempQty(quantity);
  }, []);

  const handleToggle = async (item) => {
    const consumed = !!todayFoodEntries[item.id];
    if (consumed) {
      await toggleFoodEntry(item.id);
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    } else {
      const def = item.default_quantity ?? 1;
      const initial = item.quantity_whole_numbers
        ? Math.max(1, Math.round(Number(def)))
        : Number(def) || 1;
      openQuantity(item, initial);
    }
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const handleChangeAmount = (item) => {
    const q = todayFoodEntries[item.id]?.quantity ?? item.default_quantity ?? 1;
    openQuantity(item, q);
  };

  const handleQuantityConfirm = async () => {
    if (!qtyItem) return;
    const q = normalizeFoodQuantity(tempQty, qtyItem);
    await updateFoodEntryQuantity(qtyItem.id, q);
    queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    setQtyItem(null);
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  if (foodItems.length === 0) {
    return (
      <section className="mt-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3
            className={`text-xs font-medium uppercase tracking-wider flex items-center gap-2 ${
              isDarkMode ? "text-iron-400" : "text-slate-500"
            }`}
          >
            <Utensils className="w-3.5 h-3.5 shrink-0" />
            Food
          </h3>
          <button
            type="button"
            onClick={() => router.push("/food")}
            className={`text-xs font-medium flex items-center gap-0.5 ${
              isDarkMode ? "text-iron-500 active:text-iron-300" : "text-slate-400 active:text-slate-600"
            }`}
          >
            Add items <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => router.push("/food")}
          className={`w-full rounded-2xl px-4 py-3 text-left text-sm ${
            isDarkMode ? "bg-iron-900/50 text-iron-400 hover:bg-iron-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Add food items to log them here for today.
        </button>
      </section>
    );
  }

  const isAdjusting = qtyItem && !!todayFoodEntries[qtyItem.id];

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3
          className={`text-xs font-medium uppercase tracking-wider flex items-center gap-2 ${
            isDarkMode ? "text-iron-400" : "text-slate-500"
          }`}
        >
          <Utensils className="w-3.5 h-3.5 shrink-0" />
          Food (today)
        </h3>
        <button
          type="button"
          onClick={() => router.push("/food")}
          className={`text-xs font-medium flex items-center gap-0.5 ${
            isDarkMode ? "text-iron-500 active:text-iron-300" : "text-slate-400 active:text-slate-600"
          }`}
        >
          Manage <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <ul className="space-y-2">
        {sortedItems.map((item) => {
          const consumed = !!todayFoodEntries[item.id];
          const quantity =
            todayFoodEntries[item.id]?.quantity ?? item.default_quantity ?? 1;
          const displayQty = item.quantity_whole_numbers
            ? Math.round(Number(quantity))
            : quantity;

          return (
            <li key={item.id}>
              <div
                className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 ${
                  isDarkMode ? "bg-iron-900/80" : "bg-white border border-slate-200 shadow-sm"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(item)}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl transition-all active:scale-95 ${
                    consumed
                      ? "shadow-md"
                      : isDarkMode
                        ? "bg-iron-800 ring-1 ring-iron-700"
                        : "bg-slate-100 ring-1 ring-slate-200"
                  }`}
                  style={{
                    backgroundColor: consumed ? item.color : undefined,
                  }}
                  aria-label={consumed ? `Unlog ${item.name}` : `Log ${item.name}`}
                >
                  {consumed ? <Check className="h-6 w-6 text-white" strokeWidth={2.5} /> : item.icon}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-semibold ${
                      consumed
                        ? isDarkMode
                          ? "text-iron-100"
                          : "text-slate-800"
                        : isDarkMode
                          ? "text-iron-400"
                          : "text-slate-500"
                    }`}
                  >
                    {item.name}
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    {consumed ? (
                      <>
                        <span className={isDarkMode ? "text-lift-primary" : "text-amber-600"}>
                          {displayQty} {item.unit || "units"}
                        </span>
                        {" · "}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChangeAmount(item);
                          }}
                          className={`font-medium underline-offset-2 hover:underline ${
                            isDarkMode ? "text-iron-400" : "text-slate-600"
                          }`}
                        >
                          Change
                        </button>
                      </>
                    ) : (
                      "Tap icon to log"
                    )}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <FoodQuantityModal
        open={!!qtyItem}
        item={qtyItem}
        tempQuantity={tempQty}
        onTempQuantityChange={setTempQty}
        onConfirm={handleQuantityConfirm}
        onClose={() => setQtyItem(null)}
        isDarkMode={isDarkMode}
        isAdjusting={isAdjusting}
      />
    </section>
  );
}

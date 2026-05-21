import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Utensils, Check } from "lucide-react";
import SectionManageButton from "@/components/SectionManageButton";
import SectionHeader from "@/components/SectionHeader";
import SectionSurface from "@/components/SectionSurface";
import FoodQuantityModal from "@/components/FoodQuantityModal";
import { normalizeFoodQuantity } from "@/lib/foodQuantity";
import { formatChipLabel } from "@/lib/dateLogUtils";

export default function TodayFoodLogSection({
  isDarkMode,
  foodItems,
  todayFoodEntries,
  toggleFoodEntry,
  updateFoodEntryQuantity,
  queryClient,
  logForDate = null,
  foodEntriesMap = null,
  calendarToday = null,
  userId = null,
}) {
  const router = useRouter();
  const [qtyItem, setQtyItem] = useState(null);
  const [tempQty, setTempQty] = useState(1);
  const [qtyTargetDate, setQtyTargetDate] = useState(null);

  const isPastDayMode = Boolean(logForDate && foodEntriesMap != null);
  const entryMap = isPastDayMode ? foodEntriesMap : todayFoodEntries;

  const sortedItems = useMemo(
    () => [...foodItems].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [foodItems],
  );

  const loggedCount = useMemo(
    () => sortedItems.filter(item => entryMap[item.id]).length,
    [sortedItems, entryMap],
  );

  const foodMeta =
    sortedItems.length > 0
      ? `${loggedCount} logged`
      : null;

  const openQuantity = useCallback((item, quantity, targetDate = null) => {
    setQtyItem(item);
    setTempQty(quantity);
    setQtyTargetDate(targetDate);
  }, []);

  const handleToggleToday = async item => {
    const consumed = !!entryMap[item.id];
    if (isPastDayMode) {
      if (!logForDate) return;
      if (consumed) {
        await toggleFoodEntry(item.id, { date: logForDate });
        queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ["foodEntriesForDate", userId, logForDate] });
          queryClient.invalidateQueries({ queryKey: ["pastModalFoodStrip", userId] });
        }
      } else {
        const def = item.default_quantity ?? 1;
        const initial = item.quantity_whole_numbers
          ? Math.max(1, Math.round(Number(def)))
          : Number(def) || 1;
        openQuantity(item, initial, logForDate);
      }
      if (window.navigator?.vibrate) window.navigator.vibrate(10);
      return;
    }
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

  const handleChangeAmountToday = item => {
    const q = entryMap[item.id]?.quantity ?? item.default_quantity ?? 1;
    if (isPastDayMode && logForDate) openQuantity(item, q, logForDate);
    else openQuantity(item, q);
  };

  const handleQuantityConfirm = async () => {
    if (!qtyItem) return;
    const q = normalizeFoodQuantity(tempQty, qtyItem);
    const target = qtyTargetDate ?? logForDate;
    if (isPastDayMode && target) {
      await updateFoodEntryQuantity(qtyItem.id, q, target);
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["foodEntriesForDate", userId, target] });
        queryClient.invalidateQueries({ queryKey: ["pastModalFoodStrip", userId] });
      }
    } else {
      await updateFoodEntryQuantity(qtyItem.id, q);
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    }
    setQtyItem(null);
    setQtyTargetDate(null);
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const isAdjustingQuantity = qtyItem && !!entryMap[qtyItem.id];

  const renderFoodBox = (item, consumed, quantity, onToggle, onChangeAmount, compact) => {
    const displayQty = item.quantity_whole_numbers ? Math.round(Number(quantity)) : quantity;
    return (
      <button
        key={item.id}
        type="button"
        aria-pressed={consumed}
        aria-label={
          consumed
            ? `${item.name}, logged — tap to remove`
            : `${item.name} — tap to log`
        }
        onClick={() => onToggle(item)}
        className={`flex flex-col items-stretch rounded-card border text-left transition-all active:scale-[0.98] ${
          compact ? "p-2.5" : "p-3"
        } ${
          isDarkMode
            ? consumed
              ? "border-iron-700 bg-iron-900/90"
              : "border-iron-800 bg-iron-900/60"
            : consumed
              ? "border-slate-200 bg-white shadow-sm"
              : "border-slate-200/80 bg-slate-50/80"
        }`}
      >
        <div className="flex items-start gap-2">
          <span
            className={`flex shrink-0 items-center justify-center rounded-card text-xl ${
              compact ? "h-10 w-10" : "h-11 w-11"
            } ${
              consumed
                ? "shadow-sm"
                : isDarkMode
                  ? "bg-iron-800 ring-1 ring-iron-700"
                  : "bg-white ring-1 ring-slate-200"
            }`}
            style={consumed ? { backgroundColor: item.color } : undefined}
          >
            {consumed ? <Check className="h-5 w-5 text-white" strokeWidth={2.5} /> : item.icon}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p
              className={`truncate text-xs font-semibold leading-tight ${
                consumed
                  ? isDarkMode
                    ? "text-iron-100"
                    : "text-slate-800"
                  : isDarkMode
                    ? "text-iron-400"
                    : "text-slate-600"
              }`}
            >
              {item.name}
            </p>
            <p className={`mt-1 text-[10px] leading-snug ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              {consumed ? (
                <>
                  <span className={isDarkMode ? "text-lift-primary" : "text-amber-600"}>
                    {displayQty} {item.unit || "units"}
                  </span>
                  {" · "}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={e => {
                      e.stopPropagation();
                      onChangeAmount(item);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onChangeAmount(item);
                      }
                    }}
                    className={`font-medium underline-offset-2 hover:underline ${
                      isDarkMode ? "text-iron-400" : "text-slate-600"
                    }`}
                  >
                    Change
                  </span>
                </>
              ) : (
                "Tap to log"
              )}
            </p>
          </div>
        </div>
      </button>
    );
  };

  if (foodItems.length === 0) {
    return (
      <section className="section-spacing mt-6">
        <SectionSurface isDarkMode={isDarkMode}>
          <SectionHeader
            icon={Utensils}
            label="Food"
            meta={foodMeta}
            isDarkMode={isDarkMode}
          >
            <SectionManageButton
              isDarkMode={isDarkMode}
              onClick={() => router.push("/food")}
              ariaLabel="Add or manage food items"
              variant="add"
            >
              Add items
            </SectionManageButton>
          </SectionHeader>
          <button
            type="button"
            onClick={() => router.push("/food")}
            className={`w-full rounded-card px-4 py-3 text-left text-sm ${
              isDarkMode ? "bg-iron-900/50 text-iron-400 hover:bg-iron-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Add food items to log them here{isPastDayMode ? "." : " for today."}
          </button>
        </SectionSurface>
      </section>
    );
  }

  return (
    <section className="section-spacing mt-6">
      <SectionSurface isDarkMode={isDarkMode}>
        <SectionHeader
          icon={Utensils}
          label="Food"
          meta={
            isPastDayMode && calendarToday && logForDate
              ? `${loggedCount} logged · ${formatChipLabel(logForDate, calendarToday)}`
              : foodMeta
          }
          isDarkMode={isDarkMode}
        >
          <SectionManageButton
            isDarkMode={isDarkMode}
            onClick={() => router.push("/food")}
            ariaLabel="Manage food items"
          />
        </SectionHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sortedItems.map(item => {
            const consumed = !!entryMap[item.id];
            const quantity = entryMap[item.id]?.quantity ?? item.default_quantity ?? 1;
            return renderFoodBox(
              item,
              consumed,
              quantity,
              handleToggleToday,
              handleChangeAmountToday,
              isPastDayMode,
            );
          })}
        </div>
      </SectionSurface>

      <FoodQuantityModal
        open={!!qtyItem}
        item={qtyItem}
        tempQuantity={tempQty}
        onTempQuantityChange={setTempQty}
        onConfirm={handleQuantityConfirm}
        onClose={() => {
          setQtyItem(null);
          setQtyTargetDate(null);
        }}
        isDarkMode={isDarkMode}
        isAdjusting={isAdjustingQuantity}
      />
    </section>
  );
}

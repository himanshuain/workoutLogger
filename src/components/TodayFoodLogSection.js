import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Utensils, Check, CalendarDays } from "lucide-react";
import SectionManageButton from "@/components/SectionManageButton";
import SectionHeader from "@/components/SectionHeader";
import { actionSecondaryCompact } from "@/lib/actionButtonStyles";
import SectionSurface from "@/components/SectionSurface";
import FoodQuantityModal from "@/components/FoodQuantityModal";
import { normalizeFoodQuantity, initialFoodQuantity, foodLogsDirectly } from "@/lib/foodQuantity";
import EmptyState from "@/components/EmptyState";
import { hapticLight, touchPressCard } from "@/lib/touchFeedback";
import { cn } from "@/lib/utils";

export default function TodayFoodLogSection({
  isDarkMode,
  foodItems,
  todayFoodEntries,
  toggleFoodEntry,
  updateFoodEntryQuantity,
  queryClient,
  logForDate = null,
  foodEntriesMap = null,
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
          queryClient.invalidateQueries({ queryKey: ["homeDateStrip", userId] });
        }
      } else if (foodLogsDirectly(item)) {
        await updateFoodEntryQuantity(item.id, initialFoodQuantity(item), logForDate);
        queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ["foodEntriesForDate", userId, logForDate] });
          queryClient.invalidateQueries({ queryKey: ["pastModalFoodStrip", userId] });
          queryClient.invalidateQueries({ queryKey: ["homeDateStrip", userId] });
        }
      } else {
        openQuantity(item, initialFoodQuantity(item), logForDate);
      }
      hapticLight();
      return;
    }
    if (consumed) {
      await toggleFoodEntry(item.id);
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
      if (userId) queryClient.invalidateQueries({ queryKey: ["homeDateStrip", userId] });
    } else if (foodLogsDirectly(item)) {
      await updateFoodEntryQuantity(item.id, initialFoodQuantity(item));
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
      if (userId) queryClient.invalidateQueries({ queryKey: ["homeDateStrip", userId] });
    } else {
      openQuantity(item, initialFoodQuantity(item));
    }
    hapticLight();
  };

  const handleChangeAmountToday = item => {
    if (foodLogsDirectly(item)) return;
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
        queryClient.invalidateQueries({ queryKey: ["homeDateStrip", userId] });
      }
    } else {
      await updateFoodEntryQuantity(qtyItem.id, q);
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
      if (userId) queryClient.invalidateQueries({ queryKey: ["homeDateStrip", userId] });
    }
    setQtyItem(null);
    setQtyTargetDate(null);
    hapticLight();
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
        className={cn(
          touchPressCard,
          "flex flex-col items-stretch rounded-card border text-left",
          compact ? "p-2.5" : "p-3",
          isDarkMode
            ? consumed
              ? "border-iron-700 bg-iron-900/90 active:bg-iron-800/90"
              : "border-iron-800 bg-iron-900/60 active:bg-iron-800/70"
            : consumed
              ? "border-slate-200 bg-white shadow-sm active:bg-surface-interactive"
              : "border-slate-200/80 bg-slate-50/80 active:bg-surface-interactive",
        )}
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
                foodLogsDirectly(item) ? (
                  <span className={isDarkMode ? "text-lift-primary" : "text-amber-600"}>
                    {displayQty} {item.unit || "units"}
                  </span>
                ) : (
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
                )
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
            <button
              type="button"
              onClick={() => router.push("/macro-planner")}
              aria-label="Open macro planner"
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-card px-3 py-2 text-xs font-semibold",
                actionSecondaryCompact(isDarkMode),
              )}
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
              Plan
            </button>
            <SectionManageButton
              isDarkMode={isDarkMode}
              onClick={() => router.push("/food")}
              ariaLabel="Add or manage food items"
              variant="add"
            >
              Add items
            </SectionManageButton>
          </SectionHeader>
          <EmptyState
            isDarkMode={isDarkMode}
            message="No food items yet"
            hint={isPastDayMode ? "Add items to log meals on past days." : "Add items to log meals for today."}
            actionLabel="Add food items"
            onAction={() => router.push("/food")}
          />
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
          meta={foodMeta}
          isDarkMode={isDarkMode}
        >
          <button
            type="button"
            onClick={() => router.push("/macro-planner")}
            aria-label="Open macro planner"
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-card px-3 py-2 text-xs font-semibold",
              actionSecondaryCompact(isDarkMode),
            )}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
            Plan
          </button>
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

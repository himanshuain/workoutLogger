import { useState, useMemo, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useWorkout } from "@/context/WorkoutContext";
import { LazyActivityHeatmap } from "@/components/charts/lazyCharts";
import FoodQuantityModal from "@/components/FoodQuantityModal";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from "@/components/ui/modal";
import { normalizeFoodQuantity, initialFoodQuantity, foodLogsDirectly } from "@/lib/foodQuantity";

function formatDisplayDate(dateStr, today) {
  const date = new Date(`${dateStr}T12:00:00`);
  const now = new Date();
  if (dateStr === today) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth() + 1).padStart(2, "0");
  const d = String(yesterday.getDate()).padStart(2, "0");
  if (dateStr === `${y}-${m}-${d}`) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function FoodTrackingActivity({
  foodItems = [],
  foodHistory = [],
  todayFoodEntries = {},
  today,
  isDarkMode,
}) {
  const queryClient = useQueryClient();
  const { toggleFoodEntry, updateFoodEntryQuantity } = useWorkout();

  const [dayNudgeDate, setDayNudgeDate] = useState(null);
  const [showQuantityModal, setShowQuantityModal] = useState(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [quantityTargetDate, setQuantityTargetDate] = useState(null);
  const nudgeResumeDateRef = useRef(null);

  const sortedFoodItems = useMemo(
    () => [...foodItems].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [foodItems],
  );

  const overallHeatmap = useMemo(() => {
    const byDate = {};
    foodHistory.forEach(entry => {
      byDate[entry.date] = (byDate[entry.date] || 0) + 1;
    });
    const todayCount = Object.keys(todayFoodEntries).length;
    if (todayCount > 0) {
      byDate[today] = todayCount;
    }
    return Object.entries(byDate).map(([date, count]) => ({ date, count }));
  }, [foodHistory, todayFoodEntries, today]);

  const subtitle = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const days = overallHeatmap.filter(d => d.date.startsWith(thisMonth) && d.count > 0).length;
    return `${days} day${days !== 1 ? "s" : ""} this month`;
  }, [overallHeatmap]);

  const entriesForDayNudge = useMemo(() => {
    if (!dayNudgeDate) return {};
    const map = {};
    foodHistory
      .filter(e => e.date === dayNudgeDate)
      .forEach(e => {
        map[e.food_item_id] = e;
      });
    if (dayNudgeDate === today) {
      Object.entries(todayFoodEntries).forEach(([id, entry]) => {
        map[id] = entry;
      });
    }
    return map;
  }, [dayNudgeDate, foodHistory, today, todayFoodEntries]);

  const quantityContextEntries = useMemo(() => {
    const d = quantityTargetDate ?? today;
    const map = {};
    foodHistory
      .filter(e => e.date === d)
      .forEach(e => {
        map[e.food_item_id] = e;
      });
    if (d === today) {
      Object.entries(todayFoodEntries).forEach(([id, entry]) => {
        map[id] = entry;
      });
    }
    return map;
  }, [quantityTargetDate, today, foodHistory, todayFoodEntries]);

  const endQuantityModal = useCallback(() => {
    setShowQuantityModal(null);
    setQuantityTargetDate(null);
    const resume = nudgeResumeDateRef.current;
    nudgeResumeDateRef.current = null;
    if (resume) setDayNudgeDate(resume);
  }, []);

  const openQuantityForPastDay = (foodItem, quantity, dateStr) => {
    nudgeResumeDateRef.current = dateStr;
    setDayNudgeDate(null);
    setQuantityTargetDate(dateStr);
    setShowQuantityModal(foodItem);
    setTempQuantity(quantity);
  };

  const handleQuantityConfirm = async () => {
    if (!showQuantityModal) return;
    const q = normalizeFoodQuantity(tempQuantity, showQuantityModal);
    await updateFoodEntryQuantity(showQuantityModal.id, q, quantityTargetDate ?? today);
    queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    endQuantityModal();
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const handleDayNudgeToggle = async item => {
    if (!dayNudgeDate) return;
    const consumed = !!entriesForDayNudge[item.id];
    if (consumed) {
      await toggleFoodEntry(item.id, { date: dayNudgeDate });
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    } else if (foodLogsDirectly(item)) {
      await updateFoodEntryQuantity(item.id, initialFoodQuantity(item), dayNudgeDate);
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    } else {
      openQuantityForPastDay(item, initialFoodQuantity(item), dayNudgeDate);
    }
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const handleDayNudgeEditAmount = item => {
    if (!dayNudgeDate) return;
    const q = entriesForDayNudge[item.id]?.quantity ?? item.default_quantity ?? 1;
    openQuantityForPastDay(item, q, dayNudgeDate);
  };

  if (foodItems.length === 0) return null;

  return (
    <>
      <LazyActivityHeatmap
        data={overallHeatmap}
        type="habit"
        label="Food Tracking Activity"
        color="#f59e0b"
        subtitle={subtitle}
        isDarkMode={isDarkMode}
        progressMode
        progressItems={foodItems}
        onDateClick={dateStr => {
          nudgeResumeDateRef.current = null;
          setDayNudgeDate(dateStr);
        }}
      />

      <Modal open={!!dayNudgeDate} onOpenChange={open => !open && setDayNudgeDate(null)}>
        <ModalContent
          className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}
        >
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              {dayNudgeDate ? formatDisplayDate(dayNudgeDate, today) : ""}
            </ModalTitle>
            <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              {sortedFoodItems.filter(item => entriesForDayNudge[item.id]).length} of{" "}
              {sortedFoodItems.length} items logged
            </p>
          </ModalHeader>
          <ModalBody className="space-y-2 max-h-[min(70vh,24rem)] overflow-y-auto">
            {sortedFoodItems.map(item => {
              const entry = entriesForDayNudge[item.id];
              const consumed = !!entry;
              const quantity = entry?.quantity ?? item.default_quantity ?? 1;
              const displayQty = item.quantity_whole_numbers
                ? Math.round(Number(quantity))
                : quantity;

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-card p-3 ${
                    isDarkMode ? "bg-iron-800/60" : "bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={consumed}
                    onClick={() => handleDayNudgeToggle(item)}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-card text-xl transition-all active:scale-95 ${
                      consumed
                        ? "shadow-md"
                        : isDarkMode
                          ? "bg-iron-900 ring-1 ring-iron-700"
                          : "bg-white ring-1 ring-slate-200"
                    }`}
                    style={consumed ? { backgroundColor: item.color } : undefined}
                    aria-label={consumed ? `Remove ${item.name} for this day` : `Log ${item.name}`}
                  >
                    {consumed ? (
                      <Check className="h-6 w-6 text-white" strokeWidth={2.5} />
                    ) : (
                      item.icon
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold truncate ${
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
                        <span className={isDarkMode ? "text-lift-primary" : "text-amber-600"}>
                          {displayQty} {item.unit || "units"}
                        </span>
                      ) : (
                        "Not logged — tap icon to add"
                      )}
                    </p>
                  </div>
                  {consumed && (
                    <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => handleDayNudgeEditAmount(item)}
                        className={`rounded-card px-3 py-2 text-xs font-semibold ${
                          isDarkMode
                            ? "bg-iron-700 text-iron-200 active:bg-iron-600"
                            : "bg-white text-slate-700 ring-1 ring-slate-200 active:bg-slate-100"
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDayNudgeToggle(item)}
                        className={`rounded-card px-3 py-2 text-xs font-semibold ${
                          isDarkMode
                            ? "bg-red-500/15 text-red-400 active:bg-red-500/25"
                            : "bg-red-50 text-red-600 active:bg-red-100"
                        }`}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </ModalBody>
        </ModalContent>
      </Modal>

      <FoodQuantityModal
        open={!!showQuantityModal}
        item={showQuantityModal}
        tempQuantity={tempQuantity}
        onTempQuantityChange={setTempQuantity}
        onConfirm={handleQuantityConfirm}
        onClose={endQuantityModal}
        isDarkMode={isDarkMode}
        isAdjusting={Boolean(showQuantityModal && quantityContextEntries[showQuantityModal.id])}
      />
    </>
  );
}

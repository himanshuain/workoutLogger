import { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import CollapsibleSection from "@/components/CollapsibleSection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import FoodQuantityModal from "@/components/FoodQuantityModal";
import { normalizeFoodQuantity } from "@/lib/foodQuantity";
import {
  Plus,
  Check,
  Pencil,
  Trash2,
  Utensils,
  ChevronDown,
  History,
  Calendar,
  TrendingUp,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import LongPressContextHint from "@/components/LongPressContextHint";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { FadeIn } from "@/components/ui/fade-in";

const FOOD_ICONS = [
  "🥚",
  "🥤",
  "🍗",
  "🥩",
  "🐟",
  "🥛",
  "🍌",
  "🥜",
  "🍚",
  "🥦",
  "🍳",
  "🧀",
  "🍞",
  "💊",
];
const FOOD_COLORS = [
  "#f59e0b",
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
];

export default function Food() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDarkMode } = useTheme();
  const {
    user,
    foodItems,
    todayFoodEntries,
    today,
    createFoodItem,
    updateFoodItem,
    deleteFoodItem,
    toggleFoodEntry,
    updateFoodEntryQuantity,
    getFoodEntries,
  } = useWorkout();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showQuantityModal, setShowQuantityModal] = useState(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [expandedItem, setExpandedItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dayNudgeDate, setDayNudgeDate] = useState(null);
  const [quantityTargetDate, setQuantityTargetDate] = useState(null);
  const nudgeResumeDateRef = useRef(null);

  const [newFood, setNewFood] = useState({
    name: "",
    icon: "🥚",
    color: "#f59e0b",
    unit: "servings",
    default_quantity: 1,
    quantity_whole_numbers: false,
    category: "protein",
  });

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get date range
  const dateRange = useMemo(() => {
    const end = today;
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    return { start: formatDate(start), end };
  }, [today]);

  // TanStack Query for all food history
  const { data: foodHistory = [] } = useQuery({
    queryKey: ["foodHistory", user?.id, dateRange.start, dateRange.end],
    queryFn: () => getFoodEntries(dateRange.start, dateRange.end),
    enabled: !!user,
  });

  // Process history data for heatmaps and stats
  const { heatmapsByItem, recentHistory, stats } = useMemo(() => {
    const byItem = {};
    const allByDate = {};

    foodHistory.forEach((entry) => {
      if (!byItem[entry.food_item_id]) {
        byItem[entry.food_item_id] = {};
      }
      byItem[entry.food_item_id][entry.date] = entry.quantity || 1;

      if (!allByDate[entry.date]) {
        allByDate[entry.date] = [];
      }
      allByDate[entry.date].push(entry);
    });

    Object.entries(todayFoodEntries).forEach(([itemId, entry]) => {
      if (!byItem[itemId]) byItem[itemId] = {};
      byItem[itemId][today] = entry.quantity || 1;

      if (!allByDate[today]) allByDate[today] = [];
      const item = foodItems.find((f) => f.id === itemId);
      if (item && !allByDate[today].find((e) => e.food_item_id === itemId)) {
        allByDate[today].push({
          ...entry,
          food_item_id: itemId,
          food_item: item,
        });
      }
    });

    const heatmaps = {};
    Object.entries(byItem).forEach(([itemId, dates]) => {
      heatmaps[itemId] = Object.entries(dates).map(([date, count]) => ({
        date,
        count,
      }));
    });

    const recent = Object.entries(allByDate)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 14)
      .map(([date, entries]) => ({ date, entries }));

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const daysThisMonth = Object.keys(allByDate).filter((d) =>
      d.startsWith(thisMonth),
    ).length;
    const totalDays = Object.keys(allByDate).length;

    let streak = 0;
    let checkDate = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = formatDate(checkDate);
      if (allByDate[dateStr]) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i > 0) {
        break;
      } else {
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    return {
      heatmapsByItem: heatmaps,
      recentHistory: recent,
      stats: { daysThisMonth, totalDays, streak },
    };
  }, [foodHistory, todayFoodEntries, foodItems, today]);

  const overallHeatmap = useMemo(() => {
    const byDate = {};
    foodHistory.forEach((entry) => {
      byDate[entry.date] = (byDate[entry.date] || 0) + 1;
    });
    const todayCount = Object.keys(todayFoodEntries).length;
    if (todayCount > 0) {
      byDate[today] = todayCount;
    }
    return Object.entries(byDate).map(([date, count]) => ({ date, count }));
  }, [foodHistory, todayFoodEntries, today]);

  const todayStats = useMemo(() => {
    const consumed = Object.keys(todayFoodEntries).length;
    return {
      consumed,
      total: foodItems.length,
      percentage:
        foodItems.length > 0
          ? Math.round((consumed / foodItems.length) * 100)
          : 0,
    };
  }, [todayFoodEntries, foodItems]);

  const sortedFoodItems = useMemo(
    () => [...foodItems].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [foodItems],
  );

  const entriesForDayNudge = useMemo(() => {
    if (!dayNudgeDate) return {};
    const map = {};
    foodHistory
      .filter((e) => e.date === dayNudgeDate)
      .forEach((e) => {
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
      .filter((e) => e.date === d)
      .forEach((e) => {
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

  const openQuantityModal = (foodItem, quantity) => {
    nudgeResumeDateRef.current = null;
    setQuantityTargetDate(null);
    setShowQuantityModal(foodItem);
    setTempQuantity(quantity);
  };

  const openQuantityForPastDay = (foodItem, quantity, dateStr) => {
    nudgeResumeDateRef.current = dateStr;
    setDayNudgeDate(null);
    setQuantityTargetDate(dateStr);
    setShowQuantityModal(foodItem);
    setTempQuantity(quantity);
  };

  const handleToggle = async (foodItem) => {
    const isConsumed = !!todayFoodEntries[foodItem.id];

    if (isConsumed) {
      await toggleFoodEntry(foodItem.id);
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    } else {
      openQuantityModal(foodItem, foodItem.default_quantity || 1);
    }

    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handleQuantityConfirm = async () => {
    if (!showQuantityModal) return;
    const q = normalizeFoodQuantity(tempQuantity, showQuantityModal);
    await updateFoodEntryQuantity(showQuantityModal.id, q, quantityTargetDate ?? today);
    queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    endQuantityModal();
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const handleDayNudgeToggle = async (item) => {
    if (!dayNudgeDate) return;
    const consumed = !!entriesForDayNudge[item.id];
    if (consumed) {
      await toggleFoodEntry(item.id, { date: dayNudgeDate });
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    } else {
      const def = item.default_quantity ?? 1;
      const initial = item.quantity_whole_numbers
        ? Math.max(1, Math.round(Number(def)))
        : Number(def) || 1;
      openQuantityForPastDay(item, initial, dayNudgeDate);
    }
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const handleDayNudgeEditAmount = (item) => {
    if (!dayNudgeDate) return;
    const q = entriesForDayNudge[item.id]?.quantity ?? item.default_quantity ?? 1;
    openQuantityForPastDay(item, q, dayNudgeDate);
  };

  const handleSaveFood = async () => {
    if (!newFood.name.trim()) return;

    try {
      if (editingItem) {
        await updateFoodItem(editingItem.id, newFood);
        toast.success("Food item updated");
      } else {
        await createFoodItem(newFood);
        toast.success("Food item added");
      }

      setShowAddModal(false);
      setEditingItem(null);
      setNewFood({
        name: "",
        icon: "🥚",
        color: "#f59e0b",
        unit: "servings",
        default_quantity: 1,
        quantity_whole_numbers: false,
        category: "protein",
      });
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleEditFood = (item) => {
    setEditingItem(item);
    setNewFood({
      name: item.name,
      icon: item.icon || "🥚",
      color: item.color || "#f59e0b",
      unit: item.unit || "servings",
      default_quantity: item.default_quantity || 1,
      quantity_whole_numbers: Boolean(item.quantity_whole_numbers),
      category: item.category || "protein",
    });
    setShowAddModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteFoodItem(deleteConfirm.id);
      toast.success("Food item deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to save");
      setDeleteConfirm(null);
    }
  };

  const handleExpandItem = (itemId) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  };

  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr + "T12:00:00");
    const now = new Date();
    const isToday = dateStr === today;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = dateStr === formatDate(yesterday);

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const accentColor = isDarkMode ? "#fbbf24" : "#f59e0b";


  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
            Sign in to track food
          </p>
          <button
            onClick={() => router.push("/auth")}
            className={`mt-4 px-6 py-2.5 rounded-card font-bold ${
              isDarkMode
                ? "bg-lift-primary text-iron-950"
                : "bg-workout-primary text-white"
            }`}
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <FadeIn duration={0.5}>
      <div className="px-4 py-4">
        {/* Header */}
        <div
          className={`sticky top-0 z-30 backdrop-blur-sm -mx-4 px-4 pb-3 pt-1 flex items-center justify-between ${
            isDarkMode ? "bg-iron-950/95" : "bg-slate-50/95"
          }`}
        >
          <div>
            <h2
              className={`text-xl font-bold ${
                isDarkMode ? "text-iron-100" : "text-slate-800"
              }`}
            >
              Food Tracking
            </h2>
            <p
              className={`text-sm mt-1 ${
                isDarkMode ? "text-iron-500" : "text-slate-500"
              }`}
            >
              {todayStats.consumed}/{todayStats.total} consumed today
            </p>
          </div>
          <button
            onClick={() => {
              setEditingItem(null);
              setNewFood({
                name: "",
                icon: "🥚",
                color: "#f59e0b",
                unit: "servings",
                default_quantity: 1,
                quantity_whole_numbers: false,
                category: "protein",
              });
              setShowAddModal(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-card font-medium ${
              isDarkMode
                ? "bg-lift-primary/20 text-lift-primary"
                : "bg-amber-100 text-amber-600"
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Food
          </button>
        </div>

        <div className="space-y-6 mt-4">
          {/* Quick Stats */}
          <section className="grid grid-cols-3 gap-3">
            <div
              className={`rounded-card p-3 ${
                isDarkMode
                  ? "bg-iron-900/50"
                  : "bg-white border border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar
                  className={`w-3.5 h-3.5 ${
                    isDarkMode ? "text-iron-500" : "text-slate-500"
                  }`}
                />
                <p
                  className={`text-xs ${
                    isDarkMode ? "text-iron-500" : "text-slate-500"
                  }`}
                >
                  This Month
                </p>
              </div>
              <p
                className={`text-xl font-bold ${
                  isDarkMode ? "text-iron-100" : "text-slate-800"
                }`}
              >
                {stats.daysThisMonth}
              </p>
              <p
                className={`text-xs ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                days
              </p>
            </div>
            <div
              className={`rounded-card p-3 border ${
                isDarkMode
                  ? "bg-gradient-to-br from-lift-primary/20 to-transparent border-lift-primary/30"
                  : "bg-gradient-to-br from-amber-100 to-transparent border-amber-300"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp
                  className={`w-3.5 h-3.5 ${
                    isDarkMode ? "text-lift-primary" : "text-amber-500"
                  }`}
                />
                <p
                  className={`text-xs ${
                    isDarkMode ? "text-lift-primary/80" : "text-amber-600"
                  }`}
                >
                  Streak
                </p>
              </div>
              <p
                className={`text-xl font-bold ${
                  isDarkMode ? "text-lift-primary" : "text-amber-500"
                }`}
              >
                {stats.streak}
              </p>
              <p
                className={`text-xs ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                days
              </p>
            </div>
            <div
              className={`rounded-card p-3 ${
                isDarkMode
                  ? "bg-iron-900/50"
                  : "bg-white border border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Utensils
                  className={`w-3.5 h-3.5 ${
                    isDarkMode ? "text-iron-500" : "text-slate-500"
                  }`}
                />
                <p
                  className={`text-xs ${
                    isDarkMode ? "text-iron-500" : "text-slate-500"
                  }`}
                >
                  Total
                </p>
              </div>
              <p
                className={`text-xl font-bold ${
                  isDarkMode ? "text-iron-100" : "text-slate-800"
                }`}
              >
                {stats.totalDays}
              </p>
              <p
                className={`text-xs ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                days
              </p>
            </div>
          </section>

          {/* Progress Bar */}
          {foodItems.length > 0 && (
            <div
              className={`p-4 rounded-card ${
                isDarkMode
                  ? "bg-iron-900/50"
                  : "bg-white border border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex justify-between mb-2">
                <span
                  className={`text-sm ${
                    isDarkMode ? "text-iron-400" : "text-slate-600"
                  }`}
                >
                  Today&apos;s Progress
                </span>
                <span
                  className={`font-medium ${
                    isDarkMode ? "text-lift-primary" : "text-amber-500"
                  }`}
                >
                  {todayStats.percentage}%
                </span>
              </div>
              <div
                className={`h-2.5 rounded-full overflow-hidden ${
                  isDarkMode ? "bg-iron-800" : "bg-slate-200"
                }`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isDarkMode
                      ? "bg-gradient-to-r from-lift-primary to-lift-secondary"
                      : "bg-gradient-to-r from-amber-500 to-amber-400"
                  }`}
                  style={{ width: `${todayStats.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Food Items */}
          <div className="space-y-3">
            {foodItems.length > 0 && (
              <LongPressContextHint isDarkMode={isDarkMode} className="-mb-1" />
            )}
            {foodItems.map((item) => {
              const isConsumed = !!todayFoodEntries[item.id];
              const quantity =
                todayFoodEntries[item.id]?.quantity ||
                item.default_quantity ||
                1;
              const isExpanded = expandedItem === item.id;
              const itemHeatmap = heatmapsByItem[item.id] || [];
              const daysTracked = itemHeatmap.length;

              return (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={`rounded-card overflow-hidden ${
                        isDarkMode
                          ? "bg-iron-900/50"
                          : "bg-white border border-slate-200 shadow-sm"
                      }`}
                    >
                      <div className="p-4 flex items-center gap-3">
                        <button
                          type="button"
                          aria-pressed={isConsumed}
                          aria-label={
                            isConsumed
                              ? `${item.name} logged — tap to remove`
                              : `Log ${item.name}`
                          }
                          onClick={() => handleToggle(item)}
                          className={`
                            w-14 h-14 rounded-card flex items-center justify-center text-2xl
                            transition-all duration-200 active:scale-90
                            ${
                              isConsumed
                                ? "shadow-lg"
                                : isDarkMode
                                  ? "bg-iron-800 ring-2 ring-iron-700 hover:ring-iron-500"
                                  : "bg-slate-100 ring-2 ring-slate-200 hover:ring-slate-400"
                            }
                          `}
                          style={{
                            backgroundColor: isConsumed ? item.color : undefined,
                            boxShadow: !isConsumed ? `0 0 0 0 ${item.color}40` : undefined,
                          }}
                        >
                          {isConsumed ? (
                            <Check className="w-6 h-6 text-white" />
                          ) : (
                            <span className="relative">
                              {item.icon}
                              <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full ${
                                isDarkMode ? "bg-iron-600" : "bg-slate-300"
                              }`} />
                            </span>
                          )}
                        </button>

                        <button
                          className="flex-1 text-left"
                          onClick={() => handleExpandItem(item.id)}
                        >
                          <p
                            className={`font-medium ${
                              isConsumed
                                ? isDarkMode
                                  ? "text-iron-100"
                                  : "text-slate-800"
                                : isDarkMode
                                  ? "text-iron-300"
                                  : "text-slate-600"
                            }`}
                          >
                            {item.name}
                          </p>
                          <p
                            className={`text-sm ${
                              isDarkMode ? "text-iron-500" : "text-slate-500"
                            }`}
                          >
                            {isConsumed ? (
                              <>
                                <span
                                  className={
                                    isDarkMode
                                      ? "text-lift-primary"
                                      : "text-amber-500"
                                  }
                                >
                                  Logged: {quantity} {item.unit || "units"}
                                </span>
                                <span className="opacity-70"> · </span>
                              </>
                            ) : null}
                            {daysTracked > 0
                              ? `${daysTracked} days tracked`
                              : "Tap icon to log — set amount in the next step"}
                          </p>
                        </button>

                        {isConsumed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openQuantityModal(item, quantity);
                            }}
                            className={`shrink-0 px-3 py-2 rounded-card text-sm font-semibold ${
                              isDarkMode
                                ? "bg-iron-800 text-iron-200 active:bg-iron-700"
                                : "bg-slate-100 text-slate-700 active:bg-slate-200"
                            }`}
                          >
                            Change amount
                          </button>
                        )}

                        <ChevronDown
                          className={`w-5 h-5 transition-transform cursor-pointer flex-shrink-0 ${
                            isExpanded ? "rotate-180" : ""
                          } ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                          onClick={() => handleExpandItem(item.id)}
                        />
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <ActivityHeatmap
                            data={itemHeatmap}
                            type="habit"
                            label=""
                            color={item.color}
                            compact={true}
                            isDarkMode={isDarkMode}
                          />
                        </div>
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
                    <ContextMenuItem
                      onClick={() => handleEditFood(item)}
                      className={isDarkMode ? "text-iron-200" : "text-slate-700"}
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      destructive
                      onClick={() => setDeleteConfirm(item)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}

            {foodItems.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className={`w-full p-8 rounded-card border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${
                  isDarkMode
                    ? "border-iron-800 hover:border-iron-700 active:bg-iron-900/50"
                    : "border-slate-300 hover:border-slate-400 active:bg-slate-50"
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-card flex items-center justify-center ${
                    isDarkMode ? "bg-lift-primary/20" : "bg-amber-100"
                  }`}
                >
                  <Utensils
                    className={`w-8 h-8 ${
                      isDarkMode ? "text-lift-primary" : "text-amber-500"
                    }`}
                  />
                </div>
                <div className="text-center">
                  <p
                    className={`font-medium ${
                      isDarkMode ? "text-iron-300" : "text-slate-700"
                    }`}
                  >
                    Add your first food item
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      isDarkMode ? "text-iron-600" : "text-slate-500"
                    }`}
                  >
                    Track eggs, shakes, supplements...
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Overall Heatmap — tap a day to view or edit logs */}
          {foodItems.length > 0 && (
            <ActivityHeatmap
              data={overallHeatmap}
              type="habit"
              label="Food Tracking Activity"
              color="#f59e0b"
              subtitle={`${stats.daysThisMonth} days this month`}
              isDarkMode={isDarkMode}
              progressMode
              progressItems={foodItems}
              onDateClick={(dateStr) => {
                nudgeResumeDateRef.current = null;
                setDayNudgeDate(dateStr);
              }}
            />
          )}

          {/* Recent History */}
          {recentHistory.length > 0 && (
            <CollapsibleSection
              title="Recent History"
              icon={History}
              count={recentHistory.length}
              defaultOpen={false}
              isDarkMode={isDarkMode}
            >
              {recentHistory.map(({ date, entries }) => (
                <div
                  key={date}
                  className={`rounded-card p-3 ${
                    isDarkMode ? "bg-iron-900/30" : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className={`font-medium text-sm ${
                        isDarkMode ? "text-iron-300" : "text-slate-700"
                      }`}
                    >
                      {formatDisplayDate(date)}
                    </p>
                    <span
                      className={`text-xs ${
                        isDarkMode ? "text-iron-500" : "text-slate-500"
                      }`}
                    >
                      {entries.length} items
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entries.map((entry, idx) => {
                      const item =
                        foodItems.find((f) => f.id === entry.food_item_id) ||
                        entry.food_item;
                      if (!item) return null;
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
                          style={{ backgroundColor: `${item.color}20` }}
                        >
                          <span>{item.icon}</span>
                          <span
                            className={
                              isDarkMode ? "text-iron-300" : "text-slate-700"
                            }
                          >
                            {item.name}
                          </span>
                          {entry.quantity && entry.quantity !== 1 && (
                            <span
                              className={
                                isDarkMode ? "text-iron-500" : "text-slate-500"
                              }
                            >
                              ×{entry.quantity}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CollapsibleSection>
          )}
        </div>
      </div>
      </FadeIn>

      {/* Add/Edit Food Modal */}
      <Modal open={showAddModal} onOpenChange={setShowAddModal}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              {editingItem ? "Edit Food Item" : "Add Food Item"}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Name
              </label>
              <input
                type="text"
                value={newFood.name}
                onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                placeholder="e.g., Eggs, Protein Shake"
                className={`w-full h-12 px-4 rounded-card outline-none focus:ring-2 ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600 focus:ring-lift-primary/50"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400 focus:ring-amber-500/50"
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                  Unit
                </label>
                <input
                  type="text"
                  value={newFood.unit}
                  onChange={(e) => setNewFood({ ...newFood, unit: e.target.value })}
                  placeholder="servings, eggs, ml"
                  className={`w-full h-12 px-4 rounded-card outline-none focus:ring-2 ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-100 placeholder-iron-600 focus:ring-lift-primary/50"
                      : "bg-slate-100 text-slate-800 placeholder-slate-400 focus:ring-amber-500/50"
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                  Default Qty
                </label>
                <input
                  type="number"
                  step={newFood.quantity_whole_numbers ? "1" : "0.5"}
                  min={newFood.quantity_whole_numbers ? "1" : "0.5"}
                  value={newFood.default_quantity}
                  onChange={(e) => {
                    const raw = parseFloat(e.target.value);
                    if (newFood.quantity_whole_numbers) {
                      const n = Math.max(1, Math.round(Number.isFinite(raw) ? raw : 1));
                      setNewFood({ ...newFood, default_quantity: n });
                    } else {
                      setNewFood({ ...newFood, default_quantity: Number.isFinite(raw) ? raw : 1 });
                    }
                  }}
                  className={`w-full h-12 px-4 rounded-card outline-none focus:ring-2 ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-100 placeholder-iron-600 focus:ring-lift-primary/50"
                      : "bg-slate-100 text-slate-800 placeholder-slate-400 focus:ring-amber-500/50"
                  }`}
                />
              </div>
            </div>

            <label
              className={`flex items-start gap-3 cursor-pointer rounded-card p-3 ${
                isDarkMode ? "bg-iron-800/50" : "bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={newFood.quantity_whole_numbers}
                onChange={(e) => {
                  const whole = e.target.checked;
                  setNewFood((prev) => ({
                    ...prev,
                    quantity_whole_numbers: whole,
                    default_quantity: whole
                      ? Math.max(1, Math.round(Number(prev.default_quantity) || 1))
                      : prev.default_quantity,
                  }));
                }}
                className="mt-1 h-4 w-4 rounded border-slate-500"
              />
              <span className={`text-sm ${isDarkMode ? "text-iron-300" : "text-slate-700"}`}>
                <span className="font-medium">Whole numbers only</span>
                <span className={`block text-xs mt-0.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                  For items counted in whole units (eggs, bars, pills). No halves like 1.5.
                </span>
              </span>
            </label>

            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Icon
              </label>
              <EmojiPicker
                value={newFood.icon}
                onChange={(icon) => setNewFood({ ...newFood, icon })}
                presets={FOOD_ICONS}
                isDarkMode={isDarkMode}
              />
            </div>

            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Color
              </label>
              <ColorPicker
                value={newFood.color}
                onChange={(color) => setNewFood({ ...newFood, color })}
                presets={FOOD_COLORS}
                isDarkMode={isDarkMode}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            {editingItem && (
              <button
                onClick={() => {
                  setDeleteConfirm(editingItem);
                  setShowAddModal(false);
                }}
                className="px-4 py-3 rounded-card bg-red-500/20 text-red-400 font-medium"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setShowAddModal(false)}
              className={`flex-1 py-3 rounded-card font-medium ${
                isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveFood}
              disabled={!newFood.name.trim()}
              className={`flex-1 py-3 rounded-card font-bold disabled:opacity-50 flex items-center justify-center gap-2 ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-amber-500 text-white"
              }`}
            >
              <Check className="w-4 h-4" />
              {editingItem ? "Save" : "Add"}
            </button>
          </ModalFooter>
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
        isAdjusting={Boolean(
          showQuantityModal && quantityContextEntries[showQuantityModal.id],
        )}
      />

      {/* Day tap: what was logged + edit */}
      <Modal open={!!dayNudgeDate} onOpenChange={(open) => !open && setDayNudgeDate(null)}>
        <ModalContent
          className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}
        >
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              {dayNudgeDate ? formatDisplayDate(dayNudgeDate) : ""}
            </ModalTitle>
            <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              {sortedFoodItems.filter((item) => entriesForDayNudge[item.id]).length} of{" "}
              {sortedFoodItems.length} items logged
            </p>
          </ModalHeader>
          <ModalBody className="space-y-2 max-h-[min(70vh,24rem)] overflow-y-auto">
            {sortedFoodItems.map((item) => {
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
                        <>
                          <span className={isDarkMode ? "text-lift-primary" : "text-amber-600"}>
                            {displayQty} {item.unit || "units"}
                          </span>
                        </>
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

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Delete food item?
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : "text-slate-500"}>
              This will remove &quot;{deleteConfirm?.name}&quot; and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={isDarkMode ? "bg-iron-800 text-iron-300 hover:bg-iron-700 border-0" : ""}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 border-0"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

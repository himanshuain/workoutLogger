import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import CollapsibleSection from "@/components/CollapsibleSection";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Plus,
  Check,
  Minus,
  Pencil,
  Trash2,
  Utensils,
  ChevronDown,
  History,
  Calendar,
  TrendingUp,
} from "lucide-react";
import ActivityHeatmap from "@/components/ActivityHeatmap";

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
    isLoading,
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

  const [newFood, setNewFood] = useState({
    name: "",
    icon: "🥚",
    color: "#f59e0b",
    unit: "servings",
    default_quantity: 1,
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

  const handleToggle = async (foodItem) => {
    const isConsumed = !!todayFoodEntries[foodItem.id];

    if (isConsumed) {
      await toggleFoodEntry(foodItem.id);
    } else {
      if (foodItem.unit && foodItem.default_quantity > 1) {
        setShowQuantityModal(foodItem);
        setTempQuantity(foodItem.default_quantity);
      } else {
        await toggleFoodEntry(foodItem.id, foodItem.default_quantity || 1);
      }
    }

    queryClient.invalidateQueries(["foodHistory"]);

    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handleQuantityConfirm = async () => {
    if (showQuantityModal) {
      await updateFoodEntryQuantity(showQuantityModal.id, tempQuantity);
      queryClient.invalidateQueries(["foodHistory"]);
      setShowQuantityModal(null);
    }
  };

  const handleSaveFood = async () => {
    if (!newFood.name.trim()) return;

    if (editingItem) {
      await updateFoodItem(editingItem.id, newFood);
    } else {
      await createFoodItem(newFood);
    }

    setShowAddModal(false);
    setEditingItem(null);
    setNewFood({
      name: "",
      icon: "🥚",
      color: "#f59e0b",
      unit: "servings",
      default_quantity: 1,
      category: "protein",
    });
  };

  const handleEditFood = (item) => {
    setEditingItem(item);
    setNewFood({
      name: item.name,
      icon: item.icon || "🥚",
      color: item.color || "#f59e0b",
      unit: item.unit || "servings",
      default_quantity: item.default_quantity || 1,
      category: item.category || "protein",
    });
    setShowAddModal(true);
  };

  const handleDeleteFood = async (id) => {
    if (confirm("Delete this food item?")) {
      await deleteFoodItem(id);
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

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div
            className={`animate-spin w-8 h-8 border-2 rounded-full ${
              isDarkMode
                ? "border-lift-primary border-t-transparent"
                : "border-workout-primary border-t-transparent"
            }`}
          />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
            Sign in to track food
          </p>
          <button
            onClick={() => router.push("/auth")}
            className={`mt-4 px-6 py-2.5 rounded-xl font-bold ${
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
      <div className="px-4 py-4 pb-24">
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
                category: "protein",
              });
              setShowAddModal(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium ${
              isDarkMode
                ? "bg-lift-primary/20 text-lift-primary"
                : "bg-amber-100 text-amber-600"
            }`}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        <div className="space-y-6 mt-4">
          {/* Quick Stats */}
          <section className="grid grid-cols-3 gap-3">
            <div
              className={`rounded-xl p-3 ${
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
              className={`rounded-xl p-3 border ${
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
              className={`rounded-xl p-3 ${
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
              className={`p-4 rounded-2xl ${
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
                  Today's Progress
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
                <div
                  key={item.id}
                  className={`rounded-2xl overflow-hidden ${
                    isDarkMode
                      ? "bg-iron-900/50"
                      : "bg-white border border-slate-200 shadow-sm"
                  }`}
                >
                  <div className="p-4 flex items-center gap-3">
                    <button
                      onClick={() => handleToggle(item)}
                      className={`
                        w-14 h-14 rounded-xl flex items-center justify-center text-2xl
                        transition-all duration-200 active:scale-95
                        ${
                          isConsumed
                            ? "shadow-lg"
                            : isDarkMode
                              ? "bg-iron-800"
                              : "bg-slate-100"
                        }
                      `}
                      style={{
                        backgroundColor: isConsumed ? item.color : undefined,
                      }}
                    >
                      {isConsumed ? (
                        <Check className="w-6 h-6 text-white" />
                      ) : (
                        item.icon
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
                        {isConsumed && (
                          <span
                            className={
                              isDarkMode
                                ? "text-lift-primary"
                                : "text-amber-500"
                            }
                          >
                            {quantity} {item.unit} ·{" "}
                          </span>
                        )}
                        {daysTracked > 0
                          ? `${daysTracked} days tracked`
                          : "Tap to log"}
                      </p>
                    </button>

                    {isConsumed && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            updateFoodEntryQuantity(
                              item.id,
                              Math.max(0.5, quantity - 0.5),
                            );
                            queryClient.invalidateQueries(["foodHistory"]);
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isDarkMode ? "bg-iron-800" : "bg-slate-100"
                          }`}
                        >
                          <Minus
                            className={`w-4 h-4 ${
                              isDarkMode ? "text-iron-400" : "text-slate-500"
                            }`}
                          />
                        </button>
                        <span
                          className={`w-8 text-center font-medium ${
                            isDarkMode ? "text-iron-100" : "text-slate-800"
                          }`}
                        >
                          {quantity}
                        </span>
                        <button
                          onClick={() => {
                            updateFoodEntryQuantity(item.id, quantity + 0.5);
                            queryClient.invalidateQueries(["foodHistory"]);
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isDarkMode ? "bg-iron-800" : "bg-slate-100"
                          }`}
                        >
                          <Plus
                            className={`w-4 h-4 ${
                              isDarkMode ? "text-iron-400" : "text-slate-500"
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditFood(item)}
                        className={`p-2 ${
                          isDarkMode
                            ? "text-iron-500 hover:text-iron-300"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <ChevronDown
                        className={`w-5 h-5 transition-transform cursor-pointer ${
                          isExpanded ? "rotate-180" : ""
                        } ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                        onClick={() => handleExpandItem(item.id)}
                      />
                    </div>
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
              );
            })}

            {foodItems.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className={`w-full p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${
                  isDarkMode
                    ? "border-iron-800 hover:border-iron-700 active:bg-iron-900/50"
                    : "border-slate-300 hover:border-slate-400 active:bg-slate-50"
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
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

          {/* Overall Heatmap */}
          {overallHeatmap.length > 0 && (
            <ActivityHeatmap
              data={overallHeatmap}
              type="habit"
              label="Food Tracking Activity"
              color="#f59e0b"
              subtitle={`${stats.daysThisMonth} days this month`}
              isDarkMode={isDarkMode}
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
                  className={`rounded-xl p-3 ${
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

      {/* Add/Edit Food Modal */}
      <Drawer open={showAddModal} onOpenChange={setShowAddModal}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editingItem ? "Edit Food Item" : "Add Food Item"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4 overflow-y-auto max-h-[60vh]">
            <div>
              <label
                className={`block text-sm mb-2 ${
                  isDarkMode ? "text-iron-400" : "text-slate-600"
                }`}
              >
                Name
              </label>
              <input
                type="text"
                value={newFood.name}
                onChange={(e) =>
                  setNewFood({ ...newFood, name: e.target.value })
                }
                placeholder="e.g., Eggs, Protein Shake"
                className={`w-full h-12 px-4 rounded-xl outline-none focus:ring-2 ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600 focus:ring-lift-primary/50"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400 focus:ring-amber-500/50"
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className={`block text-sm mb-2 ${
                    isDarkMode ? "text-iron-400" : "text-slate-600"
                  }`}
                >
                  Unit
                </label>
                <input
                  type="text"
                  value={newFood.unit}
                  onChange={(e) =>
                    setNewFood({ ...newFood, unit: e.target.value })
                  }
                  placeholder="servings, eggs, ml"
                  className={`w-full h-12 px-4 rounded-xl outline-none focus:ring-2 ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-100 placeholder-iron-600 focus:ring-lift-primary/50"
                      : "bg-slate-100 text-slate-800 placeholder-slate-400 focus:ring-amber-500/50"
                  }`}
                />
              </div>
              <div>
                <label
                  className={`block text-sm mb-2 ${
                    isDarkMode ? "text-iron-400" : "text-slate-600"
                  }`}
                >
                  Default Qty
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={newFood.default_quantity}
                  onChange={(e) =>
                    setNewFood({
                      ...newFood,
                      default_quantity: parseFloat(e.target.value) || 1,
                    })
                  }
                  className={`w-full h-12 px-4 rounded-xl outline-none focus:ring-2 ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-100 placeholder-iron-600 focus:ring-lift-primary/50"
                      : "bg-slate-100 text-slate-800 placeholder-slate-400 focus:ring-amber-500/50"
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                className={`block text-sm mb-2 ${
                  isDarkMode ? "text-iron-400" : "text-slate-600"
                }`}
              >
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {FOOD_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewFood({ ...newFood, icon })}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center ${
                      newFood.icon === icon
                        ? isDarkMode
                          ? "bg-iron-700 ring-2 ring-lift-primary"
                          : "bg-slate-200 ring-2 ring-amber-500"
                        : isDarkMode
                          ? "bg-iron-800"
                          : "bg-slate-100"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                className={`block text-sm mb-2 ${
                  isDarkMode ? "text-iron-400" : "text-slate-600"
                }`}
              >
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {FOOD_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewFood({ ...newFood, color })}
                    className={`w-10 h-10 rounded-xl transition-transform ${
                      newFood.color === color
                        ? "ring-2 ring-white ring-offset-2 scale-110"
                        : ""
                    }`}
                    style={{
                      backgroundColor: color,
                      ringOffsetColor: isDarkMode ? "#18181b" : "#f8fafc",
                    }}
                  />
                ))}
              </div>
            </div>

            <div
              className={`p-4 rounded-xl ${
                isDarkMode ? "bg-iron-800/50" : "bg-slate-100"
              }`}
            >
              <p
                className={`text-xs mb-2 ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                Preview
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: newFood.color }}
                >
                  {newFood.icon}
                </div>
                <div>
                  <p
                    className={`font-medium ${
                      isDarkMode ? "text-iron-100" : "text-slate-800"
                    }`}
                  >
                    {newFood.name || "Food Name"}
                  </p>
                  <p
                    className={`text-sm ${
                      isDarkMode ? "text-iron-500" : "text-slate-500"
                    }`}
                  >
                    {newFood.default_quantity} {newFood.unit}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2 pb-safe">
              {editingItem && (
                <button
                  onClick={() => {
                    handleDeleteFood(editingItem.id);
                    setShowAddModal(false);
                  }}
                  className="px-4 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowAddModal(false)}
                className={`flex-1 py-3 rounded-xl font-medium ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-400"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFood}
                disabled={!newFood.name.trim()}
                className={`flex-1 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-amber-500 text-white"
                }`}
              >
                <Check className="w-4 h-4" />
                {editingItem ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Quantity Modal */}
      <Drawer
        open={!!showQuantityModal}
        onOpenChange={() => setShowQuantityModal(null)}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>How much?</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-4">
            <div className="flex items-center justify-center gap-4 py-6">
              <button
                onClick={() =>
                  setTempQuantity(Math.max(0.5, tempQuantity - 0.5))
                }
                className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  isDarkMode ? "bg-iron-800" : "bg-slate-100"
                }`}
              >
                <Minus
                  className={`w-6 h-6 ${
                    isDarkMode ? "text-iron-300" : "text-slate-600"
                  }`}
                />
              </button>
              <div className="text-center w-24">
                <span
                  className={`text-4xl font-bold ${
                    isDarkMode ? "text-iron-100" : "text-slate-800"
                  }`}
                >
                  {tempQuantity}
                </span>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-iron-500" : "text-slate-500"
                  }`}
                >
                  {showQuantityModal?.unit}
                </p>
              </div>
              <button
                onClick={() => setTempQuantity(tempQuantity + 0.5)}
                className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  isDarkMode ? "bg-iron-800" : "bg-slate-100"
                }`}
              >
                <Plus
                  className={`w-6 h-6 ${
                    isDarkMode ? "text-iron-300" : "text-slate-600"
                  }`}
                />
              </button>
            </div>
            <button
              onClick={handleQuantityConfirm}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 mb-safe ${
                isDarkMode
                  ? "bg-lift-primary text-iron-950"
                  : "bg-amber-500 text-white"
              }`}
            >
              <Check className="w-5 h-5" />
              Log {tempQuantity} {showQuantityModal?.unit}
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}

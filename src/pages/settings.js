import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  User,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  Zap,
  Check,
  Bell,
  BellRing,
  Sun,
  Moon,
} from "lucide-react";
import NotificationSettings from "@/components/NotificationSettings";
import NotificationService from "@/lib/notifications";

const PILL_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#f59e0b",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
];

const PILL_ICONS = [
  "💧",
  "💊",
  "🥩",
  "😴",
  "🧘",
  "🏃",
  "💪",
  "🍎",
  "☀️",
  "🧠",
  "❤️",
  "⚡",
];

export default function Settings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDarkMode, toggleTheme } = useTheme();
  const {
    user,
    signOut,
    trackables,
    todayEntries,
    createTrackable,
    updateTrackable,
    deleteTrackable,
    getTrackingEntries,
    updateSettings,
    settings,
    today,
  } = useWorkout();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTrackable, setEditingTrackable] = useState(null);
  const [expandedHabit, setExpandedHabit] = useState(null);
  const [notificationTrackable, setNotificationTrackable] = useState(null);
  const [newPill, setNewPill] = useState({
    name: "",
    type: "habit",
    icon: "💧",
    color: "#22c55e",
    has_value: false,
    value_unit: "",
  });

  // Helper function for local date formatting
  const getLocalDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get date range
  const dateRange = useMemo(() => {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    return { start: getLocalDateStr(startDate), end: today };
  }, [today]);

  // TanStack Query for tracking entries
  const { data: habitHeatmapData = {} } = useQuery({
    queryKey: [
      "trackingEntriesForHeatmap",
      user?.id,
      dateRange.start,
      dateRange.end,
      trackables.length,
    ],
    queryFn: async () => {
      if (!user || trackables.length === 0) return {};

      const entries = await getTrackingEntries(dateRange.start, dateRange.end);

      const dataByTrackable = {};
      entries.forEach((entry) => {
        if (!dataByTrackable[entry.trackable_id]) {
          dataByTrackable[entry.trackable_id] = {};
        }
        if (entry.is_completed) {
          dataByTrackable[entry.trackable_id][entry.date] =
            (dataByTrackable[entry.trackable_id][entry.date] || 0) + 1;
        }
      });

      const heatmapData = {};

      trackables.forEach((trackable) => {
        const trackableData = { ...(dataByTrackable[trackable.id] || {}) };

        const todayEntry = todayEntries[trackable.id];
        if (todayEntry?.is_completed) {
          trackableData[today] = 1;
        }

        heatmapData[trackable.id] = Object.entries(trackableData).map(
          ([date, count]) => ({ date, count }),
        );
      });

      return heatmapData;
    },
    enabled: !!user && trackables.length > 0,
  });

  const handleSavePill = async () => {
    if (!newPill.name.trim()) return;

    if (editingTrackable) {
      await updateTrackable(editingTrackable.id, newPill);
    } else {
      await createTrackable(newPill);
    }

    queryClient.invalidateQueries(["trackingEntriesForHeatmap"]);

    setShowAddModal(false);
    setEditingTrackable(null);
    setNewPill({
      name: "",
      type: "habit",
      icon: "💧",
      color: "#22c55e",
      has_value: false,
      value_unit: "",
    });
  };

  const handleEditPill = (trackable) => {
    setEditingTrackable(trackable);
    setNewPill({
      name: trackable.name,
      type: trackable.type,
      icon: trackable.icon || "💧",
      color: trackable.color || "#22c55e",
      has_value: trackable.has_value || false,
      value_unit: trackable.value_unit || "",
    });
    setShowAddModal(true);
  };

  const handleDeletePill = async (id) => {
    if (confirm("Delete this trackable?")) {
      await deleteTrackable(id);
      queryClient.invalidateQueries(["trackingEntriesForHeatmap"]);
    }
  };

  const getStreakCount = (trackableId) => {
    const data = habitHeatmapData[trackableId] || [];
    return data.length;
  };

  const handleToggleTheme = () => {
    toggleTheme();
    // Also update in database
    updateSettings({ dark_mode: !isDarkMode });
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
          <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
            Sign in to access settings
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
        {/* Header - Sticky */}
        <div
          className={`sticky top-0 z-30 -mx-4 px-4 pb-3 pt-1 backdrop-blur-sm ${
            isDarkMode ? "bg-iron-950/95" : "bg-slate-50/95"
          }`}
        >
          <h2
            className={`text-xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
          >
            Settings
          </h2>
        </div>

        <div className="space-y-6 mt-4">
          {/* Theme Toggle */}
          <section>
            <h3
              className={`text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2 ${
                isDarkMode ? "text-iron-500" : "text-slate-500"
              }`}
            >
              {isDarkMode ? (
                <Moon className="w-3.5 h-3.5" />
              ) : (
                <Sun className="w-3.5 h-3.5" />
              )}
              Appearance
            </h3>
            <div
              className={`p-4 rounded-2xl ${isDarkMode ? "bg-iron-900" : "bg-white border border-slate-200 shadow-sm"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isDarkMode ? "bg-iron-800" : "bg-slate-100"
                    }`}
                  >
                    {isDarkMode ? (
                      <Moon
                        className={`w-6 h-6 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
                      />
                    ) : (
                      <Sun
                        className={`w-6 h-6 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
                      />
                    )}
                  </div>
                  <div>
                    <p
                      className={`font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                    >
                      {isDarkMode ? "Dark Mode" : "Light Mode"}
                    </p>
                    <p
                      className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                    >
                      {isDarkMode ? "Easy on the eyes" : "Bright and clean"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleTheme}
                  className={`
                    relative w-14 h-8 rounded-full transition-colors duration-300
                    ${isDarkMode ? "bg-lift-primary" : "bg-workout-primary"}
                  `}
                >
                  <div
                    className={`
                      absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300
                      ${isDarkMode ? "left-7" : "left-1"}
                    `}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Account */}
          <section>
            <h3
              className={`text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2 ${
                isDarkMode ? "text-iron-500" : "text-slate-500"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Account
            </h3>
            <div
              className={`p-4 rounded-2xl ${isDarkMode ? "bg-iron-900" : "bg-white border border-slate-200 shadow-sm"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p
                    className={`font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                  >
                    {user.email}
                  </p>
                  <p
                    className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                  >
                    Logged in
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/20"
                  }`}
                >
                  <span
                    className={`font-bold text-lg ${
                      isDarkMode ? "text-lift-primary" : "text-workout-primary"
                    }`}
                  >
                    {user.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  router.push("/auth");
                }}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-400 active:bg-iron-700"
                    : "bg-slate-100 text-slate-600 active:bg-slate-200"
                }`}
              >
                Sign Out
              </button>
            </div>
          </section>

          {/* Manage Habits/Health Pills */}
          <section id="habits">
            <div className="flex items-center justify-between mb-3">
              <h3
                className={`text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                Habits & Health Tracking
              </h3>
              <button
                onClick={() => {
                  setEditingTrackable(null);
                  setNewPill({
                    name: "",
                    type: "habit",
                    icon: "💧",
                    color: "#22c55e",
                    has_value: false,
                    value_unit: "",
                  });
                  setShowAddModal(true);
                }}
                className={`flex items-center gap-1 text-sm font-medium ${
                  isDarkMode ? "text-lift-primary" : "text-workout-primary"
                }`}
              >
                <Plus className="w-4 h-4" />
                Add New
              </button>
            </div>

            <div className="space-y-3">
              {trackables.map((trackable) => {
                const isExpanded = expandedHabit === trackable.id;
                const streakDays = getStreakCount(trackable.id);

                return (
                  <div
                    key={trackable.id}
                    className={`rounded-2xl overflow-hidden ${
                      isDarkMode
                        ? "bg-iron-900"
                        : "bg-white border border-slate-200 shadow-sm"
                    }`}
                  >
                    {/* Habit Header */}
                    <div className="p-3 flex items-center justify-between">
                      <button
                        onClick={() =>
                          setExpandedHabit(isExpanded ? null : trackable.id)
                        }
                        className="flex items-center gap-3 flex-1"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                          style={{ backgroundColor: `${trackable.color}30` }}
                        >
                          {trackable.icon}
                        </div>
                        <div className="text-left">
                          <p
                            className={`font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                          >
                            {trackable.name}
                          </p>
                          <p
                            className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                          >
                            {streakDays} day{streakDays !== 1 ? "s" : ""}{" "}
                            tracked
                          </p>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 transition-transform ml-auto ${
                            isExpanded ? "rotate-180" : ""
                          } ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                        />
                      </button>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => setNotificationTrackable(trackable)}
                          className={`p-2 rounded-lg ${
                            isDarkMode
                              ? "active:bg-iron-800"
                              : "active:bg-slate-100"
                          } ${
                            NotificationService.getSchedule(trackable.id)
                              ?.enabled
                              ? isDarkMode
                                ? "text-lift-primary"
                                : "text-workout-primary"
                              : isDarkMode
                                ? "text-iron-500 hover:text-iron-300"
                                : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {NotificationService.getSchedule(trackable.id)
                            ?.enabled ? (
                            <BellRing className="w-4 h-4" />
                          ) : (
                            <Bell className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditPill(trackable)}
                          className={`p-2 rounded-lg ${
                            isDarkMode
                              ? "text-iron-500 hover:text-iron-300 active:bg-iron-800"
                              : "text-slate-400 hover:text-slate-600 active:bg-slate-100"
                          }`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePill(trackable.id)}
                          className={`p-2 rounded-lg ${
                            isDarkMode
                              ? "text-iron-500 hover:text-red-500 active:bg-iron-800"
                              : "text-slate-400 hover:text-red-500 active:bg-slate-100"
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Heatmap */}
                    {isExpanded && (
                      <div className="px-3 pb-3 animate-in slide-in-from-top duration-200">
                        <ActivityHeatmap
                          data={habitHeatmapData[trackable.id] || []}
                          type="habit"
                          label=""
                          color={trackable.color}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {trackables.length === 0 && (
                <button
                  onClick={() => {
                    setEditingTrackable(null);
                    setNewPill({
                      name: "",
                      type: "habit",
                      icon: "💧",
                      color: "#22c55e",
                      has_value: false,
                      value_unit: "",
                    });
                    setShowAddModal(true);
                  }}
                  className={`
                    w-full p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2
                    ${
                      isDarkMode
                        ? "border-iron-800 hover:border-iron-700 active:bg-iron-900/50"
                        : "border-slate-300 hover:border-slate-400 active:bg-slate-100"
                    }
                  `}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isDarkMode ? "bg-iron-800" : "bg-slate-100"
                    }`}
                  >
                    <Plus
                      className={`w-6 h-6 ${isDarkMode ? "text-iron-400" : "text-slate-400"}`}
                    />
                  </div>
                  <p
                    className={`font-medium ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                  >
                    Add a habit to track
                  </p>
                  <p
                    className={`text-sm ${isDarkMode ? "text-iron-600" : "text-slate-500"}`}
                  >
                    Water, sleep, supplements...
                  </p>
                </button>
              )}
            </div>
          </section>

          {/* About */}
          <section className="text-center py-8">
            <div
              className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
              style={{
                background: isDarkMode
                  ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                  : "linear-gradient(135deg, #4F8CFF 0%, #6366f1 100%)",
              }}
            >
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3
              className={`font-bold text-lg ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
            >
              Logbook
            </h3>
            <p
              className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
            >
              Version 3.0.0
            </p>
            <p
              className={`text-xs mt-2 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}
            >
              Simple workout & habit tracking
            </p>
          </section>
        </div>

        {/* Add/Edit Pill Drawer */}
        <Drawer open={showAddModal} onOpenChange={setShowAddModal}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                {editingTrackable ? "Edit Trackable" : "Add Trackable"}
              </DrawerTitle>
            </DrawerHeader>

            <div className="px-4 pb-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Name */}
              <div>
                <label
                  className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={newPill.name}
                  onChange={(e) =>
                    setNewPill({ ...newPill, name: e.target.value })
                  }
                  placeholder="e.g., Water, Sleep, Creatine"
                  className={`input-field ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                      : "bg-slate-100 text-slate-800 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* Type */}
              <div>
                <label
                  className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                >
                  Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setNewPill({
                        ...newPill,
                        type: "habit",
                        has_value: false,
                      })
                    }
                    className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
                      newPill.type === "habit"
                        ? isDarkMode
                          ? "bg-lift-primary text-iron-950"
                          : "bg-workout-primary text-white"
                        : isDarkMode
                          ? "bg-iron-800 text-iron-400"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {newPill.type === "habit" && <Check className="w-4 h-4" />}
                    Habit (Yes/No)
                  </button>
                  <button
                    onClick={() =>
                      setNewPill({
                        ...newPill,
                        type: "health",
                        has_value: true,
                      })
                    }
                    className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
                      newPill.type === "health"
                        ? isDarkMode
                          ? "bg-lift-primary text-iron-950"
                          : "bg-workout-primary text-white"
                        : isDarkMode
                          ? "bg-iron-800 text-iron-400"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {newPill.type === "health" && <Check className="w-4 h-4" />}
                    Health (Value)
                  </button>
                </div>
              </div>

              {/* Value Unit (for health type) */}
              {newPill.type === "health" && (
                <div>
                  <label
                    className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                  >
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newPill.value_unit}
                    onChange={(e) =>
                      setNewPill({ ...newPill, value_unit: e.target.value })
                    }
                    placeholder="e.g., hours, liters, 1-10"
                    className={`input-field ${
                      isDarkMode
                        ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                        : "bg-slate-100 text-slate-800 placeholder-slate-400"
                    }`}
                  />
                </div>
              )}

              {/* Icon */}
              <div>
                <label
                  className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                >
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {PILL_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewPill({ ...newPill, icon })}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center ${
                        newPill.icon === icon
                          ? isDarkMode
                            ? "bg-iron-700 ring-2 ring-lift-primary"
                            : "bg-slate-200 ring-2 ring-workout-primary"
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

              {/* Color */}
              <div>
                <label
                  className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                >
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {PILL_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewPill({ ...newPill, color })}
                      className={`w-10 h-10 rounded-xl transition-transform ${
                        newPill.color === color
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

              {/* Preview */}
              <div
                className={`p-4 rounded-xl ${isDarkMode ? "bg-iron-800/50" : "bg-slate-100"}`}
              >
                <p
                  className={`text-xs mb-2 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                >
                  Preview
                </p>
                <div
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-iron-950 font-medium"
                  style={{ backgroundColor: newPill.color }}
                >
                  <span>{newPill.icon}</span>
                  <Check className="w-4 h-4" />
                  <span>{newPill.name || "Name"}</span>
                  {newPill.has_value && (
                    <span className="text-xs bg-black/20 px-1.5 py-0.5 rounded-full">
                      8 {newPill.value_unit}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 pb-safe">
                <button
                  onClick={() => setShowAddModal(false)}
                  className={`flex-1 py-3.5 rounded-xl font-medium ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-400"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePill}
                  disabled={!newPill.name.trim()}
                  className={`flex-1 py-3.5 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isDarkMode
                      ? "bg-lift-primary text-iron-950"
                      : "bg-workout-primary text-white"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {editingTrackable ? "Save" : "Add"}
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Notification Settings */}
        {notificationTrackable && (
          <NotificationSettings
            trackable={notificationTrackable}
            onClose={() => setNotificationTrackable(null)}
          />
        )}
      </div>
    </Layout>
  );
}

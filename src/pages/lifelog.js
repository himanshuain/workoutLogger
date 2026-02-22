import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import DayPicker from "@/components/DayPicker";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
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
  Plus,
  Calendar,
  Clock,
  Check,
  Trash2,
  Edit3,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  History,
  AlertCircle,
  AlertTriangle,
  Pencil,
  Bell,
  BellRing,
  CalendarPlus,
  Heart,
} from "lucide-react";
import NotificationSettings from "@/components/NotificationSettings";
import NotificationService from "@/lib/notifications";
import { toast } from "sonner";

const EVENT_ICONS = [
  "💇",
  "🏥",
  "🚗",
  "🦷",
  "💉",
  "👁️",
  "🏦",
  "📋",
  "🔧",
  "🧹",
  "✂️",
  "🎂",
  "📅",
  "💼",
  "🏠",
  "📱",
  "💻",
  "🎁",
  "✈️",
  "🎬",
];

const EVENT_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
];

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

const PILL_ICONS = ["💧", "💊", "🥩", "😴", "🧘", "🏃", "💪", "🍎", "☀️", "🧠", "❤️", "⚡"];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", 
                     "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

// Format days since into human readable
function formatDaysSince(days) {
  if (days === null || days === undefined) return "Never";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "1 month ago";
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  if (days < 730) return "1 year ago";
  return `${Math.floor(days / 365)} years ago`;
}

// Format date for display
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LifeLog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDarkMode } = useTheme();
  const {
    user,
    eventTypes,
    isLoading,
    createEventType,
    updateEventType,
    deleteEventType,
    logEvent,
    deleteEventLog,
    getEventLogs,
    trackables,
    todayEntries,
    createTrackable,
    updateTrackable,
    deleteTrackable,
    getTrackingEntries,
    toggleTrackingEntryForDate,
    today,
  } = useWorkout();

  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventLogs, setEventLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const [newEvent, setNewEvent] = useState({
    name: "",
    icon: "📅",
    color: "#3b82f6",
    description: "",
    reminder_days: null,
  });

  const [logDetails, setLogDetails] = useState({
    date: new Date().toISOString().split("T")[0],
    notes: "",
    cost: "",
  });

  // Confirmation dialog state for duplicate date
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [pendingLogAction, setPendingLogAction] = useState(null);

  // Delete confirmation state (habit, eventType, log)
  const [deleteConfirm, setDeleteConfirm] = useState({ type: null, data: null });

  // Habits state
  const [activeTab, setActiveTab] = useState("events"); // "events" or "habits"
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [editingTrackable, setEditingTrackable] = useState(null);
  const [expandedHabit, setExpandedHabit] = useState(null);
  const [notificationTrackable, setNotificationTrackable] = useState(null);
  const [pastEntryTrackable, setPastEntryTrackable] = useState(null);
  const [pastEntryMonth, setPastEntryMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [pastEntryDates, setPastEntryDates] = useState({});
  const [pastEntrySaving, setPastEntrySaving] = useState(false);
  const [newPill, setNewPill] = useState({
    name: "",
    type: "habit",
    icon: "💧",
    color: "#22c55e",
    has_value: false,
    value_unit: "",
    active_days: null,
  });

  // Helper function for local date formatting
  const getLocalDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get date range for habits heatmap
  const dateRange = useMemo(() => {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    return { start: getLocalDateStr(startDate), end: today };
  }, [today]);

  // TanStack Query for tracking entries (habits heatmap)
  const { data: habitHeatmapData = {} } = useQuery({
    queryKey: ["trackingEntriesForHeatmap", user?.id, dateRange.start, dateRange.end, trackables.length],
    queryFn: async () => {
      if (!user || trackables.length === 0) return {};
      const entries = await getTrackingEntries(dateRange.start, dateRange.end);
      const dataByTrackable = {};
      entries.forEach(entry => {
        if (!dataByTrackable[entry.trackable_id]) {
          dataByTrackable[entry.trackable_id] = {};
        }
        if (entry.is_completed) {
          dataByTrackable[entry.trackable_id][entry.date] =
            (dataByTrackable[entry.trackable_id][entry.date] || 0) + 1;
        }
      });
      const heatmapData = {};
      trackables.filter(t => t.name !== "Body Weight").forEach(trackable => {
        const trackableData = { ...(dataByTrackable[trackable.id] || {}) };
        const todayEntry = todayEntries[trackable.id];
        if (todayEntry?.is_completed) {
          trackableData[today] = 1;
        }
        heatmapData[trackable.id] = Object.entries(trackableData).map(([date, count]) => ({
          date,
          count,
        }));
      });
      return heatmapData;
    },
    enabled: !!user && trackables.length > 0,
  });

  const getStreakCount = (trackableId) => {
    const data = habitHeatmapData[trackableId] || [];
    return data.length;
  };

  // Check if an entry exists for a specific date for an event type
  const checkExistingEntry = useCallback(async (eventTypeId, date) => {
    const logs = await getEventLogs(eventTypeId);
    return logs.find(log => log.date === date);
  }, [getEventLogs]);

  // Sort events: those needing attention first, then by days since
  const sortedEvents = useMemo(() => {
    return [...eventTypes].sort((a, b) => {
      // Items with reminder_days that are overdue come first
      const aOverdue =
        a.reminder_days && a.days_since !== null && a.days_since >= a.reminder_days;
      const bOverdue =
        b.reminder_days && b.days_since !== null && b.days_since >= b.reminder_days;

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then sort by days_since (null = never logged = comes last)
      if (a.days_since === null && b.days_since === null) return 0;
      if (a.days_since === null) return 1;
      if (b.days_since === null) return -1;
      return b.days_since - a.days_since; // Oldest first
    });
  }, [eventTypes]);

  // Handle creating new event type
  const handleCreateEvent = async () => {
    if (!newEvent.name.trim()) return;

    try {
      await createEventType({
        name: newEvent.name.trim(),
        icon: newEvent.icon,
        color: newEvent.color,
        description: newEvent.description.trim() || null,
        reminder_days: newEvent.reminder_days || null,
      });

      toast.success("Event type created");
      setShowAddDrawer(false);
      setNewEvent({
        name: "",
        icon: "📅",
        color: "#3b82f6",
        description: "",
        reminder_days: null,
      });

      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
    } catch (error) {
      console.error("Error creating event type:", error);
      toast.error("Something went wrong");
    }
  };

  // Habit handlers
  const handleSavePill = async () => {
    if (!newPill.name.trim()) return;

    const pillData = {
      name: newPill.name.trim(),
      type: newPill.type,
      icon: newPill.icon,
      color: newPill.color,
      has_value: newPill.has_value,
      value_unit: newPill.has_value ? newPill.value_unit : null,
      active_days: newPill.active_days,
    };

    try {
      if (editingTrackable) {
        await updateTrackable(editingTrackable.id, pillData);
        toast.success("Habit updated");
      } else {
        await createTrackable(pillData);
        toast.success("Habit created");
      }

      setShowAddHabitModal(false);
      setEditingTrackable(null);
      setNewPill({
        name: "",
        type: "habit",
        icon: "💧",
        color: "#22c55e",
        has_value: false,
        value_unit: "",
        active_days: null,
      });

      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
    } catch (error) {
      console.error("Error saving habit:", error);
      toast.error("Something went wrong");
    }
  };

  const handleEditPill = (trackable) => {
    setEditingTrackable(trackable);
    setNewPill({
      name: trackable.name,
      type: trackable.type,
      icon: trackable.icon,
      color: trackable.color,
      has_value: trackable.has_value || false,
      value_unit: trackable.value_unit || "",
      active_days: trackable.active_days || null,
    });
    setShowAddHabitModal(true);
  };

  const handleDeletePill = (id) => {
    setDeleteConfirm({ type: "habit", data: { id } });
  };

  // Past entry drawer functions
  const openPastEntryDrawer = async (trackable) => {
    setPastEntryTrackable(trackable);
    const now = new Date();
    setPastEntryMonth({ year: now.getFullYear(), month: now.getMonth() });
    await loadMonthEntries(trackable.id, now.getFullYear(), now.getMonth());
  };

  const loadMonthEntries = async (trackableId, year, month) => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const entries = await getTrackingEntries(getLocalDateStr(startDate), getLocalDateStr(endDate));
    const dateMap = {};
    entries.forEach(entry => {
      if (entry.trackable_id === trackableId && entry.is_completed) {
        dateMap[entry.date] = true;
      }
    });
    const todayEntry = todayEntries[trackableId];
    if (todayEntry?.is_completed) {
      dateMap[today] = true;
    }
    setPastEntryDates(dateMap);
  };

  const handlePastEntryMonthChange = async (delta) => {
    const newMonth = pastEntryMonth.month + delta;
    let newYear = pastEntryMonth.year;
    let adjustedMonth = newMonth;
    if (newMonth < 0) {
      adjustedMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      adjustedMonth = 0;
      newYear++;
    }
    setPastEntryMonth({ year: newYear, month: adjustedMonth });
    if (pastEntryTrackable) {
      await loadMonthEntries(pastEntryTrackable.id, newYear, adjustedMonth);
    }
  };

  const handleTogglePastDate = async (dateStr) => {
    if (!pastEntryTrackable || pastEntrySaving) return;
    const todayDate = new Date();
    const selectedDate = new Date(dateStr + "T00:00:00");
    if (selectedDate > todayDate) return;

    setPastEntrySaving(true);
    const isCurrentlyCompleted = pastEntryDates[dateStr];
    try {
      await toggleTrackingEntryForDate(pastEntryTrackable.id, dateStr, !isCurrentlyCompleted);
      setPastEntryDates(prev => ({
        ...prev,
        [dateStr]: !isCurrentlyCompleted,
      }));
      queryClient.invalidateQueries(["trackingEntriesForHeatmap"]);
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
    } catch (error) {
      console.error("Error toggling past entry:", error);
    } finally {
      setPastEntrySaving(false);
    }
  };

  const getCalendarDays = () => {
    const { year, month } = pastEntryMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  };

  // Handle logging an event
  const handleLogEvent = async (forceLog = false) => {
    if (!selectedEvent) return;

    // Check for existing entry on the same date (unless force logging)
    if (!forceLog) {
      const existingEntry = await checkExistingEntry(selectedEvent.id, logDetails.date);
      if (existingEntry) {
        setPendingLogAction({
          type: 'detailed',
          eventType: selectedEvent,
          date: logDetails.date,
          notes: logDetails.notes.trim() || null,
          cost: logDetails.cost ? parseFloat(logDetails.cost) : null,
          existingEntry,
        });
        setShowDuplicateConfirm(true);
        return;
      }
    }

    try {
      await logEvent(selectedEvent.id, {
        date: logDetails.date,
        notes: logDetails.notes.trim() || null,
        cost: logDetails.cost ? parseFloat(logDetails.cost) : null,
      });

      toast.success("Event logged");
      setShowLogDrawer(false);
      setSelectedEvent(null);
      setLogDetails({
        date: new Date().toISOString().split("T")[0],
        notes: "",
        cost: "",
      });

      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
    } catch (error) {
      console.error("Error logging event:", error);
      toast.error("Something went wrong");
    }
  };

  // Quick log (log today without details)
  const handleQuickLog = async (eventType, forceLog = false) => {
    const today = new Date().toISOString().split("T")[0];
    
    // Check for existing entry on today (unless force logging)
    if (!forceLog) {
      const existingEntry = await checkExistingEntry(eventType.id, today);
      if (existingEntry) {
        setPendingLogAction({
          type: 'quick',
          eventType,
          date: today,
          existingEntry,
        });
        setShowDuplicateConfirm(true);
        return;
      }
    }

    try {
      await logEvent(eventType.id);
      toast.success("Event logged");
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
    } catch (error) {
      console.error("Error logging event:", error);
      toast.error("Something went wrong");
    }
  };

  // Open log drawer with details
  const openLogDrawer = (eventType) => {
    setSelectedEvent(eventType);
    setLogDetails({
      date: new Date().toISOString().split("T")[0],
      notes: "",
      cost: "",
    });
    setShowLogDrawer(true);
  };

  // Open history drawer
  const openHistoryDrawer = async (eventType) => {
    setSelectedEvent(eventType);
    setIsLoadingLogs(true);
    setShowHistoryDrawer(true);

    const logs = await getEventLogs(eventType.id);
    setEventLogs(logs);
    setIsLoadingLogs(false);
  };

  // Delete event type
  const handleDeleteEventType = (eventType) => {
    setDeleteConfirm({ type: "eventType", data: { eventType } });
  };

  // Handle confirming duplicate log
  const handleConfirmDuplicateLog = async () => {
    if (!pendingLogAction) return;

    try {
      if (pendingLogAction.type === 'quick') {
        await logEvent(pendingLogAction.eventType.id);
      } else {
        await logEvent(pendingLogAction.eventType.id, {
          date: pendingLogAction.date,
          notes: pendingLogAction.notes,
          cost: pendingLogAction.cost,
        });
        setShowLogDrawer(false);
        setSelectedEvent(null);
        setLogDetails({
          date: new Date().toISOString().split("T")[0],
          notes: "",
          cost: "",
        });
      }

      toast.success("Event logged");
      setShowDuplicateConfirm(false);
      setPendingLogAction(null);

      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
    } catch (error) {
      console.error("Error logging event:", error);
      toast.error("Something went wrong");
    }
  };

  // Cancel duplicate log
  const handleCancelDuplicateLog = () => {
    setShowDuplicateConfirm(false);
    setPendingLogAction(null);
  };

  // Delete a log entry
  const handleDeleteLog = (logId) => {
    if (!selectedEvent) return;
    setDeleteConfirm({ type: "log", data: { logId, eventTypeId: selectedEvent.id } });
  };

  // Execute delete based on deleteConfirm type (called from AlertDialog)
  const handleConfirmDelete = async () => {
    if (!deleteConfirm.type || !deleteConfirm.data) return;
    try {
      if (deleteConfirm.type === "habit") {
        await deleteTrackable(deleteConfirm.data.id);
        toast.success("Habit deleted");
        if (window.navigator?.vibrate) {
          window.navigator.vibrate(10);
        }
      } else if (deleteConfirm.type === "eventType") {
        await deleteEventType(deleteConfirm.data.eventType.id);
        toast.success("Event type deleted");
      } else if (deleteConfirm.type === "log") {
        const { logId, eventTypeId } = deleteConfirm.data;
        await deleteEventLog(logId, eventTypeId);
        const logs = await getEventLogs(eventTypeId);
        setEventLogs(logs);
        toast.success("Log entry deleted");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Something went wrong");
    } finally {
      setDeleteConfirm({ type: null, data: null });
    }
  };

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
            Sign in to use Life Log
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
      <div className="px-4 py-4 pb-36">
        {/* Header */}
        <div
          className={`sticky top-0 z-30 -mx-4 px-4 pb-3 pt-1 backdrop-blur-sm ${
            isDarkMode ? "bg-iron-950/95" : "bg-slate-50/95"
          }`}
        >
          <h2
            className={`text-xl font-bold ${
              isDarkMode ? "text-iron-100" : "text-slate-800"
            }`}
          >
            Log
          </h2>
          <p
            className={`text-sm mt-1 ${
              isDarkMode ? "text-iron-500" : "text-slate-500"
            }`}
          >
            {activeTab === "events" ? "Track occasional events" : "Daily habits & health"}
          </p>
        </div>

        {/* Floating bottom bar: Tab Switcher + Add button */}
        <div
          className={`fixed bottom-[4.5rem] left-0 right-0 z-30 px-4 pb-2 pt-2 backdrop-blur-md ${
            isDarkMode ? "bg-iron-950/90" : "bg-slate-50/90"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`flex-1 flex gap-1.5 p-1 rounded-xl ${
              isDarkMode ? "bg-iron-900" : "bg-slate-100"
            }`}>
              <button
                onClick={() => setActiveTab("events")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "events"
                    ? isDarkMode
                      ? "bg-iron-800 text-iron-100"
                      : "bg-white text-slate-800 shadow-sm"
                    : isDarkMode
                      ? "text-iron-500"
                      : "text-slate-500"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Events
                </div>
              </button>
              <button
                onClick={() => setActiveTab("habits")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "habits"
                    ? isDarkMode
                      ? "bg-iron-800 text-iron-100"
                      : "bg-white text-slate-800 shadow-sm"
                    : isDarkMode
                      ? "text-iron-500"
                      : "text-slate-500"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Heart className="w-4 h-4" />
                  Habits
                </div>
              </button>
            </div>
            <button
              onClick={() => activeTab === "events" ? setShowAddDrawer(true) : setShowAddHabitModal(true)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-sm ${
                isDarkMode
                  ? "bg-lift-primary text-iron-950"
                  : "bg-workout-primary text-white"
              }`}
            >
              <Plus className="w-4 h-4" />
              {activeTab === "events" ? "Add Event" : "Add Habit"}
            </button>
          </div>
        </div>

        {/* Events Tab Content */}
        {activeTab === "events" && (
        <div className="mt-4 space-y-3">
          {sortedEvents.length === 0 ? (
            <div
              className={`text-center py-12 ${
                isDarkMode ? "text-iron-500" : "text-slate-500"
              }`}
            >
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No events yet</p>
              <p className="text-sm mt-1">
                Add events like haircuts, doctor visits, etc.
              </p>
              <button
                onClick={() => setShowAddDrawer(true)}
                className={`mt-4 px-4 py-2 rounded-xl text-sm font-medium ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-300"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                Add First Event
              </button>
            </div>
          ) : (
            sortedEvents.map((eventType) => {
              const isOverdue =
                eventType.reminder_days &&
                eventType.days_since !== null &&
                eventType.days_since >= eventType.reminder_days;

              return (
                <div
                  key={eventType.id}
                  className={`rounded-2xl overflow-hidden transition-all duration-200 ${
                    isDarkMode
                      ? "bg-gradient-to-br from-iron-900 to-iron-900/80"
                      : "bg-white shadow-sm"
                  } ${isOverdue 
                    ? isDarkMode 
                      ? "ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/10" 
                      : "ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/10"
                    : isDarkMode
                      ? ""
                      : "border border-slate-200/80"
                  }`}
                >
                  {/* Main Content */}
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Icon with gradient background */}
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-lg transition-transform active:scale-95"
                        style={{ 
                          background: `linear-gradient(135deg, ${eventType.color}30 0%, ${eventType.color}50 100%)`,
                          boxShadow: `0 4px 14px ${eventType.color}25`
                        }}
                      >
                        {eventType.icon}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-bold text-lg ${
                              isDarkMode ? "text-iron-100" : "text-slate-800"
                            }`}
                          >
                            {eventType.name}
                          </h3>
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-500 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Due
                            </span>
                          )}
                        </div>

                        {/* Last occurrence with better styling */}
                        <div className="flex items-center gap-2 mt-1.5">
                          {eventType.days_since === null ? (
                            <span className={`text-sm ${
                              isDarkMode ? "text-iron-500" : "text-slate-400"
                            }`}>
                              Never logged
                            </span>
                          ) : (
                            <>
                              <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                                isOverdue
                                  ? "text-amber-500"
                                  : isDarkMode
                                    ? "text-iron-300"
                                    : "text-slate-600"
                              }`}>
                                <Clock className="w-3.5 h-3.5" />
                                {formatDaysSince(eventType.days_since)}
                              </span>
                              {eventType.last_log && (
                                <>
                                  <span className={isDarkMode ? "text-iron-700" : "text-slate-300"}>·</span>
                                  <span className={`text-sm ${
                                    isDarkMode ? "text-iron-500" : "text-slate-400"
                                  }`}>
                                    {formatDate(eventType.last_log.date)}
                                  </span>
                                </>
                              )}
                            </>
                          )}
                        </div>

                        {/* Stats pill */}
                        {eventType.total_logs > 0 && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                              isDarkMode 
                                ? "bg-iron-800/80 text-iron-400" 
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              <History className="w-3 h-3" />
                              {eventType.total_logs} time{eventType.total_logs !== 1 ? "s" : ""} logged
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quick Log Button - More prominent */}
                      <button
                        onClick={() => handleQuickLog(eventType)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                          isDarkMode
                            ? "bg-lift-primary text-iron-950 shadow-lg shadow-lift-primary/30"
                            : "bg-workout-primary text-white shadow-lg shadow-workout-primary/30"
                        }`}
                      >
                        <Check className="w-5 h-5" strokeWidth={3} />
                      </button>
                    </div>
                  </div>

                  {/* Actions - Redesigned as icon buttons */}
                  <div
                    className={`flex items-center justify-between px-4 py-2.5 ${
                      isDarkMode ? "bg-iron-950/50" : "bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openLogDrawer(eventType)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${
                          isDarkMode
                            ? "bg-iron-800/80 text-iron-300 hover:bg-iron-700"
                            : "bg-white text-slate-600 hover:bg-slate-100 shadow-sm"
                        }`}
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Log Date</span>
                      </button>
                      <button
                        onClick={() => openHistoryDrawer(eventType)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${
                          isDarkMode
                            ? "bg-iron-800/80 text-iron-300 hover:bg-iron-700"
                            : "bg-white text-slate-600 hover:bg-slate-100 shadow-sm"
                        }`}
                      >
                        <History className="w-4 h-4" />
                        <span>History</span>
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteEventType(eventType)}
                      className={`p-2 rounded-xl transition-all active:scale-90 ${
                        isDarkMode
                          ? "text-iron-600 hover:text-red-400 hover:bg-red-500/10"
                          : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        )}

        {/* Habits Tab Content */}
        {activeTab === "habits" && (
          <div className="mt-4 space-y-3">
            {trackables.filter(t => t.name !== "Body Weight").length === 0 ? (
              <div
                className={`text-center py-12 ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No habits yet</p>
                <p className="text-sm mt-1">
                  Add habits like water intake, vitamins, etc.
                </p>
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
                      active_days: null,
                    });
                    setShowAddHabitModal(true);
                  }}
                  className={`mt-4 px-4 py-2 rounded-xl text-sm font-medium ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-300"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  Add First Habit
                </button>
              </div>
            ) : (
              trackables.filter(t => t.name !== "Body Weight").map(trackable => {
                const isExpanded = expandedHabit === trackable.id;
                const streakDays = getStreakCount(trackable.id);
                const isScheduledToday = !trackable.active_days || trackable.active_days.includes(new Date().getDay());
                const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

                return (
                  <div
                    key={trackable.id}
                    className={`rounded-2xl overflow-hidden ${
                      isDarkMode ? "bg-iron-900" : "bg-white border border-slate-200 shadow-sm"
                    } ${!isScheduledToday ? "opacity-60" : ""}`}
                  >
                    {/* Habit Header */}
                    <div className="p-3 flex items-center justify-between">
                      <button
                        onClick={() => setExpandedHabit(isExpanded ? null : trackable.id)}
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
                          <div className="flex items-center gap-1.5">
                            <p
                              className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                            >
                              {streakDays} day{streakDays !== 1 ? "s" : ""} tracked
                            </p>
                            {trackable.active_days && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                isScheduledToday
                                  ? isDarkMode ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600"
                                  : isDarkMode ? "bg-iron-800 text-iron-500" : "bg-slate-100 text-slate-400"
                              }`}>
                                {isScheduledToday ? "Today" : trackable.active_days.map(d => DAY_LABELS[d]).join(", ")}
                              </span>
                            )}
                          </div>
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
                            isDarkMode ? "active:bg-iron-800" : "active:bg-slate-100"
                          } ${
                            NotificationService.getSchedule(trackable.id)?.enabled
                              ? isDarkMode
                                ? "text-lift-primary"
                                : "text-workout-primary"
                              : isDarkMode
                                ? "text-iron-500 hover:text-iron-300"
                                : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {NotificationService.getSchedule(trackable.id)?.enabled ? (
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

                    {/* Expanded Heatmap and Add Past Entries */}
                    {isExpanded && (
                      <div className="px-3 pb-3 animate-in slide-in-from-top duration-200">
                        <ActivityHeatmap
                          data={habitHeatmapData[trackable.id] || []}
                          type="habit"
                          label=""
                          color={trackable.color}
                          compact={true}
                          isDarkMode={isDarkMode}
                        />
                        <button
                          onClick={() => openPastEntryDrawer(trackable)}
                          className={`mt-3 w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
                            isDarkMode
                              ? "bg-iron-800 text-iron-300 active:bg-iron-700"
                              : "bg-slate-100 text-slate-600 active:bg-slate-200"
                          }`}
                        >
                          <CalendarPlus className="w-4 h-4" />
                          Add Past Entries
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Add Event Type Modal */}
      <Modal open={showAddDrawer} onOpenChange={setShowAddDrawer}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>Add Event Type</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {/* Name */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Name
              </label>
              <input
                type="text"
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                placeholder="e.g., Haircut, Doctor Visit"
                className={`input-field ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400"
                }`}
              />
            </div>

            {/* Reminder Days (Optional) */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Remind after days (optional)
              </label>
              <input
                type="number"
                value={newEvent.reminder_days || ""}
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    reminder_days: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="e.g., 30 for monthly"
                className={`input-field ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400"
                }`}
              />
              <p className={`text-xs mt-1 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                Event will be highlighted when overdue
              </p>
            </div>

            {/* Icon */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {EVENT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewEvent({ ...newEvent, icon })}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center ${
                      newEvent.icon === icon
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
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewEvent({ ...newEvent, color })}
                    className={`w-9 h-9 rounded-lg transition-transform ${
                      newEvent.color === color ? "ring-2 ring-white ring-offset-2 scale-110" : ""
                    }`}
                    style={{
                      backgroundColor: color,
                      ringOffsetColor: isDarkMode ? "#18181b" : "#f8fafc",
                    }}
                  />
                ))}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setShowAddDrawer(false)}
              className={`flex-1 py-3 rounded-xl font-medium ${
                isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateEvent}
              disabled={!newEvent.name.trim()}
              className={`flex-1 py-3 rounded-xl font-bold disabled:opacity-50 ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              Add Event
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Log Event Modal */}
      <Modal open={showLogDrawer} onOpenChange={setShowLogDrawer}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              <span className="mr-2">{selectedEvent?.icon}</span>
              Log {selectedEvent?.name}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {/* Date */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Date
              </label>
              <input
                type="date"
                value={logDetails.date}
                onChange={(e) => setLogDetails({ ...logDetails, date: e.target.value })}
                className={`input-field ${
                  isDarkMode ? "bg-iron-800 text-iron-100" : "bg-slate-100 text-slate-800"
                }`}
              />
            </div>

            {/* Notes (Optional) */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Notes (optional)
              </label>
              <input
                type="text"
                value={logDetails.notes}
                onChange={(e) => setLogDetails({ ...logDetails, notes: e.target.value })}
                placeholder="e.g., Short trim"
                className={`input-field ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400"
                }`}
              />
            </div>

            {/* Cost (Optional) */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Cost (optional)
              </label>
              <input
                type="number"
                value={logDetails.cost}
                onChange={(e) => setLogDetails({ ...logDetails, cost: e.target.value })}
                placeholder="e.g., 30"
                className={`input-field ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400"
                }`}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setShowLogDrawer(false)}
              className={`flex-1 py-3 rounded-xl font-medium ${
                isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleLogEvent}
              className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              <Check className="w-4 h-4" />
              Log Event
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* History Modal */}
      <Modal open={showHistoryDrawer} onOpenChange={setShowHistoryDrawer}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              <span className="mr-2">{selectedEvent?.icon}</span>
              {selectedEvent?.name} History
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            {isLoadingLogs ? (
              <div className="py-8 text-center">
                <div
                  className={`animate-spin w-6 h-6 mx-auto border-2 rounded-full ${
                    isDarkMode
                      ? "border-lift-primary border-t-transparent"
                      : "border-workout-primary border-t-transparent"
                  }`}
                />
              </div>
            ) : eventLogs.length === 0 ? (
              <div className={`py-8 text-center ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No logs yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {eventLogs.map((log, index) => {
                  const logDate = new Date(log.date);
                  const todayDate = new Date();
                  todayDate.setHours(0, 0, 0, 0);
                  logDate.setHours(0, 0, 0, 0);
                  const daysSince = Math.floor((todayDate - logDate) / (1000 * 60 * 60 * 24));

                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl ${isDarkMode ? "bg-iron-800" : "bg-slate-100"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                            {formatDate(log.date)}
                          </p>
                          <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                            {formatDaysSince(daysSince)}
                            {index > 0 && eventLogs[index - 1] && (
                              <span className={isDarkMode ? "text-iron-600" : "text-slate-400"}>
                                {" "}· {Math.floor((new Date(eventLogs[index - 1].date) - new Date(log.date)) / (1000 * 60 * 60 * 24))} days after
                              </span>
                            )}
                          </p>
                          {log.notes && (
                            <p className={`text-sm mt-1 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                              {log.notes}
                            </p>
                          )}
                          {log.cost && (
                            <p className={`text-sm ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}>
                              ₹{log.cost}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className={`p-2 rounded-lg ${
                            isDarkMode ? "text-iron-500 hover:bg-iron-700" : "text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm.type}
        onOpenChange={(open) => !open && setDeleteConfirm({ type: null, data: null })}
      >
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              {deleteConfirm.type === "habit" && "Delete Habit"}
              {deleteConfirm.type === "eventType" && "Delete Event Type"}
              {deleteConfirm.type === "log" && "Delete Log Entry"}
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : "text-slate-500"}>
              {deleteConfirm.type === "habit" &&
                "Delete this habit? This will also delete all tracking data."}
              {deleteConfirm.type === "eventType" &&
                deleteConfirm.data?.eventType &&
                `Delete "${deleteConfirm.data.eventType.name}"? This will also delete all ${deleteConfirm.data.eventType.total_logs || 0} log entries.`}
              {deleteConfirm.type === "log" && "Delete this log entry?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={isDarkMode ? "bg-iron-800 text-iron-300 hover:bg-iron-700 border-0" : ""}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white hover:bg-red-700 border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Entry Confirmation Dialog */}
      <AlertDialog open={showDuplicateConfirm} onOpenChange={setShowDuplicateConfirm}>
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle className={`flex items-center gap-2 ${isDarkMode ? "text-iron-100" : ""}`}>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Entry Already Exists
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : ""}>
              {pendingLogAction && (
                <>
                  You already have an entry for{" "}
                  <span className={`font-semibold ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                    {pendingLogAction.eventType?.name}
                  </span>{" "}
                  on{" "}
                  <span className={`font-semibold ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                    {formatDate(pendingLogAction.date)}
                  </span>
                  {pendingLogAction.existingEntry?.notes && (
                    <span className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
                      {" "}("{pendingLogAction.existingEntry.notes}")
                    </span>
                  )}
                  . Do you want to add another entry for the same date?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelDuplicateLog}
              className={isDarkMode ? "bg-iron-800 text-iron-300 border-iron-700 hover:bg-iron-700" : ""}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDuplicateLog}
              className={`${
                isDarkMode
                  ? "bg-lift-primary text-iron-950 hover:bg-lift-primary/90"
                  : "bg-workout-primary text-white hover:bg-workout-primary/90"
              }`}
            >
              Add Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Habit Modal */}
      <Modal open={showAddHabitModal} onOpenChange={setShowAddHabitModal}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              {editingTrackable ? "Edit Habit" : "Add Habit"}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {/* Name */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Name
              </label>
              <input
                type="text"
                value={newPill.name}
                onChange={(e) => setNewPill({ ...newPill, name: e.target.value })}
                placeholder="e.g., Water, Vitamins"
                className={`input-field ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400"
                }`}
              />
            </div>

            {/* Icon Selection */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {PILL_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewPill({ ...newPill, icon })}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                      newPill.icon === icon
                        ? isDarkMode
                          ? "bg-lift-primary/20 ring-2 ring-lift-primary"
                          : "bg-workout-primary/20 ring-2 ring-workout-primary"
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

            {/* Color Selection */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {PILL_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewPill({ ...newPill, color })}
                    className={`w-9 h-9 rounded-lg transition-all ${
                      newPill.color === color ? "ring-2 ring-offset-2" : ""
                    }`}
                    style={{
                      backgroundColor: color,
                      ringColor: color,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Has Value Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                  Track Value
                </p>
                <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                  e.g., glasses of water, mg of vitamin
                </p>
              </div>
              <button
                onClick={() => setNewPill({ ...newPill, has_value: !newPill.has_value })}
                className={`w-12 h-7 rounded-full transition-colors ${
                  newPill.has_value
                    ? isDarkMode ? "bg-lift-primary" : "bg-workout-primary"
                    : isDarkMode ? "bg-iron-700" : "bg-slate-200"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    newPill.has_value ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Value Unit (if has_value) */}
            {newPill.has_value && (
              <div>
                <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                  Unit
                </label>
                <input
                  type="text"
                  value={newPill.value_unit}
                  onChange={(e) => setNewPill({ ...newPill, value_unit: e.target.value })}
                  placeholder="e.g., glasses, mg, minutes"
                  className={`input-field ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                      : "bg-slate-100 text-slate-800 placeholder-slate-400"
                  }`}
                />
              </div>
            )}

            {/* Active Days */}
            <DayPicker
              value={newPill.active_days}
              onChange={(days) => setNewPill({ ...newPill, active_days: days })}
              isDarkMode={isDarkMode}
            />
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setShowAddHabitModal(false)}
              className={`flex-1 py-3 rounded-xl font-medium ${
                isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSavePill}
              disabled={!newPill.name.trim()}
              className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                newPill.name.trim()
                  ? isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
                  : isDarkMode ? "bg-iron-800 text-iron-600" : "bg-slate-200 text-slate-400"
              }`}
            >
              {editingTrackable ? "Save Changes" : "Add Habit"}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Past Entry Modal */}
      <Modal open={!!pastEntryTrackable} onOpenChange={(open) => !open && setPastEntryTrackable(null)}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={`flex items-center gap-2 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
              <span>{pastEntryTrackable?.icon}</span>
              Add Past Entries
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => handlePastEntryMonthChange(-1)}
                className={`p-2 rounded-lg ${isDarkMode ? "hover:bg-iron-800" : "hover:bg-slate-100"}`}
              >
                <ChevronLeft className={`w-5 h-5 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`} />
              </button>
              <h3 className={`font-semibold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                {MONTH_NAMES[pastEntryMonth.month]} {pastEntryMonth.year}
              </h3>
              <button
                onClick={() => handlePastEntryMonthChange(1)}
                className={`p-2 rounded-lg ${isDarkMode ? "hover:bg-iron-800" : "hover:bg-slate-100"}`}
              >
                <ChevronRight className={`w-5 h-5 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`} />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map((day, i) => (
                <div
                  key={i}
                  className={`text-center text-xs font-medium py-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {getCalendarDays().map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="aspect-square" />;
                }
                const dateStr = `${pastEntryMonth.year}-${String(pastEntryMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isCompleted = pastEntryDates[dateStr];
                const isFuture = new Date(dateStr + "T00:00:00") > new Date();
                const isToday = dateStr === today;

                return (
                  <button
                    key={day}
                    onClick={() => !isFuture && handleTogglePastDate(dateStr)}
                    disabled={isFuture || pastEntrySaving}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                      isFuture
                        ? isDarkMode
                          ? "text-iron-700 cursor-not-allowed"
                          : "text-slate-300 cursor-not-allowed"
                        : isCompleted
                          ? "text-white"
                          : isToday
                            ? isDarkMode
                              ? "bg-iron-800 text-iron-100 ring-2 ring-lift-primary"
                              : "bg-slate-100 text-slate-800 ring-2 ring-workout-primary"
                            : isDarkMode
                              ? "bg-iron-800 text-iron-300 hover:bg-iron-700"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                    style={{
                      backgroundColor: isCompleted && !isFuture ? "#22c55e" : undefined,
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className={`flex items-center justify-center gap-6 mt-4 pt-4 border-t border-dashed ${isDarkMode ? "border-iron-800" : "border-slate-200"}`}>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${isDarkMode ? "bg-iron-800" : "bg-slate-100"}`} />
                <span className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>Missed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>Completed</span>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setPastEntryTrackable(null)}
              className={`w-full py-3 rounded-xl font-bold ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              Done
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Notification Settings Drawer */}
      {notificationTrackable && (
        <NotificationSettings
          trackable={notificationTrackable}
          onClose={() => setNotificationTrackable(null)}
          isDarkMode={isDarkMode}
        />
      )}
    </Layout>
  );
}


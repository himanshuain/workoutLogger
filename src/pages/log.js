import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import DayPicker from "@/components/DayPicker";
import {
  Modal,
  NestedModal,
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
  BarChart3,
  Hash,
  FileText,
} from "lucide-react";
import NotificationSettings from "@/components/NotificationSettings";
import NotificationService from "@/lib/notifications";
import { toast } from "sonner";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { FadeIn } from "@/components/ui/fade-in";
import { motion, AnimatePresence } from "framer-motion";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

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

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
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

const EVENT_SETTINGS_KEY = "logbook_event_settings";

function getEventSettings() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(EVENT_SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

function setEventSetting(eventTypeId, settings) {
  const all = getEventSettings();
  all[eventTypeId] = { ...(all[eventTypeId] || {}), ...settings };
  localStorage.setItem(EVENT_SETTINGS_KEY, JSON.stringify(all));
}

function removeEventSetting(eventTypeId) {
  const all = getEventSettings();
  delete all[eventTypeId];
  localStorage.setItem(EVENT_SETTINGS_KEY, JSON.stringify(all));
}

export default function LifeLog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDarkMode } = useTheme();
  const {
    user,
    eventTypes: rawEventTypes,
    createEventType,
    updateEventType,
    deleteEventType,
    logEvent,
    deleteEventLog,
    updateEventLog,
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

  // Merge localStorage settings into event types
  const eventTypes = useMemo(() => {
    const settings = getEventSettings();
    return rawEventTypes.map(et => ({
      ...et,
      track_graph: settings[et.id]?.track_graph || false,
      need_value: settings[et.id]?.need_value || false,
      need_notes: settings[et.id]?.need_notes || false,
    }));
  }, [rawEventTypes]);

  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventLogs, setEventLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [expandedEventLogs, setExpandedEventLogs] = useState([]);
  const [isLoadingExpandedLogs, setIsLoadingExpandedLogs] = useState(false);
  const [graphTooltip, setGraphTooltip] = useState(null);

  const [newEvent, setNewEvent] = useState({
    name: "",
    icon: "📅",
    color: "#3b82f6",
    description: "",
    reminder_days: null,
    track_graph: false,
    need_value: false,
    need_notes: false,
  });

  /** Nested sheet for value and/or notes required (stacked on Log Event modal) */
  const [logDrawerNestedOpen, setLogDrawerNestedOpen] = useState(false);

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

  // Edit log state
  const [editingLog, setEditingLog] = useState(null);
  const [editLogDetails, setEditLogDetails] = useState({ date: "", notes: "", cost: "" });

  // Habits state
  const [activeTab, setActiveTab] = useState("events"); // "events" or "habits"

  useEffect(() => {
    if (!router.isReady) return;
    const tab = router.query.tab;
    if (tab === "habits") setActiveTab("habits");
    else if (tab === "events") setActiveTab("events");
  }, [router.isReady, router.query.tab]);

  const goToLogTab = useCallback(
    (tab) => {
      setActiveTab(tab);
      router.replace(
        { pathname: "/lifelog", query: { ...router.query, tab } },
        undefined,
        { shallow: true },
      );
    },
    [router],
  );
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
      trackables
        .filter(t => t.name !== "Body Weight")
        .forEach(trackable => {
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

  const getStreakCount = trackableId => {
    const data = habitHeatmapData[trackableId] || [];
    return data.length;
  };

  // Check if an entry exists for a specific date for an event type
  const checkExistingEntry = useCallback(
    async (eventTypeId, date) => {
      const logs = await getEventLogs(eventTypeId);
      return logs.find(log => log.date === date);
    },
    [getEventLogs]
  );

  // Sort events: those needing attention first, then by days since
  const sortedEvents = useMemo(() => {
    return [...eventTypes].sort((a, b) => {
      // Items with reminder_days that are overdue come first
      const aOverdue = a.reminder_days && a.days_since !== null && a.days_since >= a.reminder_days;
      const bOverdue = b.reminder_days && b.days_since !== null && b.days_since >= b.reminder_days;

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then sort by days_since (null = never logged = comes last)
      if (a.days_since === null && b.days_since === null) return 0;
      if (a.days_since === null) return 1;
      if (b.days_since === null) return -1;
      return b.days_since - a.days_since; // Oldest first
    });
  }, [eventTypes]);

  /** GitHub-style calendar: one cell per day with a log (count = logs that day). */
  const eventHeatmapData = useMemo(() => {
    const out = {};
    eventTypes.forEach(et => {
      const byDate = {};
      (et.event_logs || []).forEach(log => {
        const d = log.date;
        if (!d) return;
        byDate[d] = (byDate[d] || 0) + 1;
      });
      out[et.id] = Object.entries(byDate).map(([date, count]) => ({ date, count }));
    });
    return out;
  }, [eventTypes]);

  const handleEditEvent = eventType => {
    setEditingEventId(eventType.id);
    setNewEvent({
      name: eventType.name,
      icon: eventType.icon,
      color: eventType.color,
      description: eventType.description || "",
      reminder_days: eventType.reminder_days || null,
      track_graph: eventType.track_graph || false,
      need_value: eventType.need_value || false,
      need_notes: eventType.need_notes || false,
    });
    setShowAddDrawer(true);
  };

  const resetEventForm = () => {
    setEditingEventId(null);
    setNewEvent({
      name: "",
      icon: "📅",
      color: "#3b82f6",
      description: "",
      reminder_days: null,
      track_graph: false,
      need_value: false,
      need_notes: false,
    });
  };

  const handleSaveEvent = async () => {
    if (!newEvent.name.trim()) return;

    try {
      if (editingEventId) {
        await updateEventType(editingEventId, {
          name: newEvent.name.trim(),
          icon: newEvent.icon,
          color: newEvent.color,
          description: newEvent.description.trim() || null,
          reminder_days: newEvent.reminder_days || null,
        });
        setEventSetting(editingEventId, {
          track_graph: newEvent.track_graph || false,
          need_value: newEvent.need_value || false,
          need_notes: newEvent.need_notes || false,
        });
        toast.success("Event type updated");
      } else {
        const created = await createEventType({
          name: newEvent.name.trim(),
          icon: newEvent.icon,
          color: newEvent.color,
          description: newEvent.description.trim() || null,
          reminder_days: newEvent.reminder_days || null,
        });

        if (created?.id) {
          setEventSetting(created.id, {
            track_graph: newEvent.track_graph || false,
            need_value: newEvent.need_value || false,
            need_notes: newEvent.need_notes || false,
          });
        }
        toast.success("Event type created");
      }

      setShowAddDrawer(false);
      resetEventForm();

      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
    } catch (error) {
      console.error("Error saving event type:", error);
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

  const handleEditPill = trackable => {
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

  const handleDeletePill = id => {
    setDeleteConfirm({ type: "habit", data: { id } });
  };

  // Past entry drawer functions
  const openPastEntryDrawer = async trackable => {
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

  const handlePastEntryMonthChange = async delta => {
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

  const handleTogglePastDate = async dateStr => {
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

    if (selectedEvent.need_value) {
      const n = parseFloat(logDetails.cost);
      if (!Number.isFinite(n)) {
        toast.error("Enter a numeric value");
        return;
      }
    }
    if (selectedEvent.need_notes && !logDetails.notes.trim()) {
      toast.error("Notes are required for this event");
      return;
    }

    // Check for existing entry on the same date (unless force logging)
    if (!forceLog) {
      const existingEntry = await checkExistingEntry(selectedEvent.id, logDetails.date);
      if (existingEntry) {
        setPendingLogAction({
          type: "detailed",
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
      setLogDrawerNestedOpen(false);
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
    if (eventType.need_notes || eventType.need_value) {
      openLogDrawer(eventType);
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    // Check for existing entry on today (unless force logging)
    if (!forceLog) {
      const existingEntry = await checkExistingEntry(eventType.id, today);
      if (existingEntry) {
        setPendingLogAction({
          type: "quick",
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
      if (expandedEvent === eventType.id) {
        const logs = await getEventLogs(eventType.id);
        setExpandedEventLogs(logs);
      }
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
    } catch (error) {
      console.error("Error logging event:", error);
      toast.error("Something went wrong");
    }
  };

  // Open log drawer with details
  const openLogDrawer = eventType => {
    setSelectedEvent(eventType);
    setLogDetails({
      date: new Date().toISOString().split("T")[0],
      notes: "",
      cost: "",
    });
    setLogDrawerNestedOpen(Boolean(eventType.need_value || eventType.need_notes));
    setShowLogDrawer(true);
  };

  // Open history drawer
  const openHistoryDrawer = async eventType => {
    setSelectedEvent(eventType);
    setIsLoadingLogs(true);
    setShowHistoryDrawer(true);

    const logs = await getEventLogs(eventType.id);
    setEventLogs(logs);
    setIsLoadingLogs(false);
  };

  const toggleExpandEvent = async eventType => {
    setGraphTooltip(null);
    if (expandedEvent === eventType.id) {
      setExpandedEvent(null);
      return;
    }
    setExpandedEvent(eventType.id);
    setIsLoadingExpandedLogs(true);
    const logs = await getEventLogs(eventType.id);
    setExpandedEventLogs(logs);
    setIsLoadingExpandedLogs(false);
  };

  // Delete event type
  const handleDeleteEventType = eventType => {
    setDeleteConfirm({ type: "eventType", data: { eventType } });
  };

  // Handle confirming duplicate log
  const handleConfirmDuplicateLog = async () => {
    if (!pendingLogAction) return;

    try {
      if (pendingLogAction.type === "quick") {
        await logEvent(pendingLogAction.eventType.id);
      } else {
        await logEvent(pendingLogAction.eventType.id, {
          date: pendingLogAction.date,
          notes: pendingLogAction.notes,
          cost: pendingLogAction.cost,
        });
        setShowLogDrawer(false);
        setLogDrawerNestedOpen(false);
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

  const handleDeleteLog = (logId, eventTypeId) => {
    const evtId = eventTypeId || selectedEvent?.id;
    if (!evtId) return;
    setDeleteConfirm({ type: "log", data: { logId, eventTypeId: evtId } });
  };

  const handleEditLog = (log, eventTypeId) => {
    setEditingLog({ ...log, eventTypeId });
    setEditLogDetails({
      date: log.date,
      notes: log.notes || "",
      cost: log.cost || "",
    });
  };

  const handleSaveEditLog = async () => {
    if (!editingLog) return;
    const result = await updateEventLog(editingLog.id, {
      date: editLogDetails.date,
      notes: editLogDetails.notes || null,
      cost: editLogDetails.cost ? parseFloat(editLogDetails.cost) : null,
    });
    if (result) {
      toast.success("Log updated");
      if (expandedEvent === editingLog.eventTypeId) {
        const logs = await getEventLogs(editingLog.eventTypeId);
        setExpandedEventLogs(logs);
      }
      if (selectedEvent?.id === editingLog.eventTypeId) {
        const logs = await getEventLogs(editingLog.eventTypeId);
        setEventLogs(logs);
      }
    }
    setEditingLog(null);
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
        const etId = deleteConfirm.data.eventType.id;
        await deleteEventType(etId);
        removeEventSetting(etId);
        toast.success("Event type deleted");
      } else if (deleteConfirm.type === "log") {
        const { logId, eventTypeId } = deleteConfirm.data;
        await deleteEventLog(logId, eventTypeId);
        const logs = await getEventLogs(eventTypeId);
        setEventLogs(logs);
        if (expandedEvent === eventTypeId) {
          setExpandedEventLogs(logs);
        }
        toast.success("Log entry deleted");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Something went wrong");
    } finally {
      setDeleteConfirm({ type: null, data: null });
    }
  };


  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>Sign in to use Life Log</p>
          <button
            onClick={() => router.push("/auth")}
            className={`mt-4 px-6 py-2.5 rounded-xl font-bold ${
              isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
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
      <div className="px-4 py-4 pb-16">
        {/* Header */}
        <div
          className={`sticky top-0 z-30 -mx-4 px-4 pb-3 pt-1 backdrop-blur-sm ${
            isDarkMode ? "bg-iron-950/95" : "bg-slate-50/95"
          }`}
        >
          <h2 className={`text-xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
            Log
          </h2>
          <p className={`text-sm mt-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            {activeTab === "events" ? "Track occasional events" : "Daily habits & health"}
          </p>
        </div>

        {/* Floating bottom bar: Tab Switcher + Add button */}
        <div
          className={`sticky bottom-0 z-30 -mx-4 px-4 pb-2 pt-2 backdrop-blur-md ${
            isDarkMode ? "bg-iron-950/90" : "bg-slate-50/90"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`flex-1 flex gap-1.5 p-1 rounded-xl ${
                isDarkMode ? "bg-iron-900" : "bg-slate-100"
              }`}
            >
              <button
                type="button"
                onClick={() => goToLogTab("events")}
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
                type="button"
                onClick={() => goToLogTab("habits")}
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
              onClick={() => {
                if (activeTab === "events") {
                  resetEventForm();
                  setShowAddDrawer(true);
                } else {
                  setShowAddHabitModal(true);
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-sm ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              <Plus className="w-4 h-4" />
              {activeTab === "events" ? "Add Event" : "Add Habit"}
            </button>
          </div>
        </div>

        {/* Events Tab Content */}
        <AnimatePresence mode="wait">
        {activeTab === "events" && (
          <motion.div
            key="events-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-4 space-y-3"
          >
            {sortedEvents.length === 0 ? (
              <div
                className={`text-center py-12 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
              >
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No events yet</p>
                <p className="text-sm mt-1">Add events like haircuts, doctor visits, etc.</p>
                <button
                  onClick={() => {
                    resetEventForm();
                    setShowAddDrawer(true);
                  }}
                  className={`mt-4 px-4 py-2 rounded-xl text-sm font-medium ${
                    isDarkMode ? "bg-iron-800 text-iron-300" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  Add First Event
                </button>
              </div>
            ) : (
              sortedEvents.map(eventType => {
                const isOverdue =
                  eventType.reminder_days &&
                  eventType.days_since !== null &&
                  eventType.days_since >= eventType.reminder_days;

                const isExpanded = expandedEvent === eventType.id;

                return (
                  <div
                    key={eventType.id}
                    className={`rounded-2xl overflow-hidden transition-all duration-200 ${
                      isDarkMode ? "bg-iron-900" : "bg-white shadow-sm"
                    } ${
                      isOverdue
                        ? isDarkMode
                          ? "ring-1 ring-amber-500/40"
                          : "ring-1 ring-amber-400/50"
                        : isDarkMode
                          ? ""
                          : "border border-slate-200/80"
                    }`}
                  >
                    {/* Header — context menu only on this part */}
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <div className="flex items-center gap-3 p-3.5">
                          <button
                            onClick={() => toggleExpandEvent(eventType)}
                            className="flex items-center gap-3 flex-1 min-w-0"
                          >
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                              style={{ backgroundColor: `${eventType.color}25` }}
                            >
                              {eventType.icon}
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3
                                  className={`font-semibold truncate ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                                >
                                  {eventType.name}
                                </h3>
                                {isOverdue && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/20 text-amber-500 flex-shrink-0">
                                    Due
                                  </span>
                                )}
                              </div>
                              <p
                                className={`text-xs mt-0.5 ${
                                  isOverdue
                                    ? "text-amber-500"
                                    : isDarkMode
                                      ? "text-iron-500"
                                      : "text-slate-500"
                                }`}
                              >
                                {eventType.days_since === null
                                  ? "Never logged"
                                  : formatDaysSince(eventType.days_since)}
                                {eventType.total_logs > 0 && (
                                  <span className={isDarkMode ? "text-iron-600" : "text-slate-400"}>
                                    {" "}
                                    · {eventType.total_logs} time
                                    {eventType.total_logs !== 1 ? "s" : ""}
                                  </span>
                                )}
                              </p>
                            </div>
                            <ChevronDown
                              className={`w-4 h-4 flex-shrink-0 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              } ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}
                            />
                          </button>
                          <button
                            onClick={() => handleQuickLog(eventType)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 relative ${
                              isDarkMode
                                ? "bg-lift-primary text-iron-950"
                                : "bg-workout-primary text-white"
                            }`}
                          >
                            {eventType.need_value ? (
                              <Hash className="w-4 h-4" strokeWidth={3} />
                            ) : (
                              <Check className="w-4 h-4" strokeWidth={3} />
                            )}
                          </button>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent
                        className={
                          isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"
                        }
                      >
                        <ContextMenuItem
                          onClick={() => handleEditEvent(eventType)}
                          className={isDarkMode ? "text-iron-200" : "text-slate-700"}
                        >
                          <Pencil className="w-4 h-4" />
                          Edit Event
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          destructive
                          onClick={() => handleDeleteEventType(eventType)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Event
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>

                    {/* Expanded: heatmap + timeline — separate from event context menu */}
                    <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key={`event-expand-${eventType.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                        className="overflow-hidden"
                      >
                      <div
                        className={`px-3.5 pb-3.5 border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}
                      >
                        <div className="pt-3 pb-2">
                          <ActivityHeatmap
                            data={eventHeatmapData[eventType.id] || []}
                            type="habit"
                            label=""
                            color={eventType.color}
                            compact
                            mini
                            isDarkMode={isDarkMode}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => openLogDrawer(eventType)}
                          className={`mt-3 w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 ${
                            isDarkMode
                              ? "bg-iron-800 text-iron-300 active:bg-iron-700"
                              : "bg-slate-100 text-slate-600 active:bg-slate-200"
                          }`}
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                          Log with Details
                        </button>
                        {isLoadingExpandedLogs ? (
                          <div
                            className={`py-5 text-center text-sm ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                          >
                            Loading...
                          </div>
                        ) : (
                          <>
                            <p
                              className={`pt-3 text-[10px] font-semibold uppercase tracking-wider ${
                                isDarkMode ? "text-iron-500" : "text-slate-500"
                              }`}
                            >
                              Recent logs
                            </p>
                            {expandedEventLogs.length === 0 ? (
                              <div
                                className={`py-4 text-center text-sm ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
                              >
                                No history yet
                              </div>
                            ) : (
                              <>
                                <div className="pt-1 space-y-1.5">
                            {expandedEventLogs.slice(0, 10).map((log, idx) => {
                              const logDate = new Date(log.date);
                              const todayDate = new Date();
                              todayDate.setHours(0, 0, 0, 0);
                              logDate.setHours(0, 0, 0, 0);
                              const daysSince = Math.floor(
                                (todayDate - logDate) / (1000 * 60 * 60 * 24)
                              );
                              const gap =
                                idx > 0
                                  ? Math.floor(
                                      (new Date(expandedEventLogs[idx - 1].date) -
                                        new Date(log.date)) /
                                        (1000 * 60 * 60 * 24)
                                    )
                                  : null;
                              const staggerDelay = idx * 0.04;

                              return (
                                <motion.div
                                  key={log.id}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.2, delay: staggerDelay }}
                                >
                                  {gap !== null && gap > 0 && (
                                    <div className="flex justify-center py-0.5">
                                      <span
                                        className={`text-[9px] font-medium px-1.5 py-px rounded-full ${
                                          isDarkMode
                                            ? "bg-iron-800/80 text-iron-600 border border-iron-700/50"
                                            : "bg-slate-100 text-slate-400 border border-slate-200"
                                        }`}
                                      >
                                        {gap}d gap
                                      </span>
                                    </div>
                                  )}
                                  <ContextMenu>
                                    <ContextMenuTrigger asChild>
                                      <div
                                        className={`flex items-start gap-3 p-2.5 rounded-xl border transition-colors ${
                                          idx === 0
                                            ? isDarkMode
                                              ? "border-iron-700/70 bg-iron-800/40"
                                              : "border-slate-200 bg-slate-50"
                                            : isDarkMode
                                              ? "border-iron-800/50 bg-transparent"
                                              : "border-slate-100 bg-transparent"
                                        }`}
                                      >
                                        <div
                                          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                                          style={{
                                            backgroundColor:
                                              idx === 0
                                                ? eventType.color
                                                : isDarkMode
                                                  ? "#3f3f46"
                                                  : "#cbd5e1",
                                          }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <p
                                              className={`text-sm font-medium ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                                            >
                                              {formatDate(log.date)}
                                            </p>
                                            <span
                                              className={`text-[10px] flex-shrink-0 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}
                                            >
                                              {formatDaysSince(daysSince)}
                                            </span>
                                          </div>
                                          {log.notes && (
                                            <p
                                              className={`text-xs mt-0.5 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
                                            >
                                              {log.notes}
                                            </p>
                                          )}
                                          {eventType.need_value && log.cost != null && (
                                            <p
                                              className={`text-xs mt-0.5 font-semibold`}
                                              style={{ color: eventType.color }}
                                            >
                                              Value: {log.cost}
                                            </p>
                                          )}
                                        </div>
                                        <button
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleDeleteLog(log.id, eventType.id);
                                          }}
                                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors active:scale-90 ${
                                            isDarkMode
                                              ? "text-iron-600 hover:text-red-400 hover:bg-red-500/10"
                                              : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                                          }`}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent
                                      className={
                                        isDarkMode
                                          ? "bg-iron-900 border-iron-800"
                                          : "bg-white border-slate-200"
                                      }
                                    >
                                      <ContextMenuItem
                                        onClick={() => handleEditLog(log, eventType.id)}
                                        className={isDarkMode ? "text-iron-200" : "text-slate-700"}
                                      >
                                        <Pencil className="w-4 h-4" />
                                        Edit Log
                                      </ContextMenuItem>
                                      <ContextMenuSeparator />
                                      <ContextMenuItem
                                        destructive
                                        onClick={() => handleDeleteLog(log.id, eventType.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Log
                                      </ContextMenuItem>
                                    </ContextMenuContent>
                                  </ContextMenu>
                                </motion.div>
                              );
                            })}
                            {expandedEventLogs.length > 10 && (
                              <button
                                onClick={() => openHistoryDrawer(eventType)}
                                className={`mt-1 w-full text-center text-xs font-medium py-2 rounded-lg ${
                                  isDarkMode
                                    ? "text-iron-400 active:bg-iron-800"
                                    : "text-slate-500 active:bg-slate-100"
                                }`}
                              >
                                View all {expandedEventLogs.length} entries
                              </button>
                            )}
                          </div>
                                {/* Graph */}
                                {eventType.track_graph &&
                                  expandedEventLogs.length >= 2 &&
                                  (() => {
                                    const getLogValue = (l) => {
                                      if (l.cost != null) return parseFloat(l.cost);
                                      if (l.notes && !isNaN(parseFloat(l.notes)) && isFinite(l.notes.trim())) return parseFloat(l.notes);
                                      return null;
                                    };
                                    const hasValues = expandedEventLogs.some(l => getLogValue(l) != null);
                                    const sortedLogs = [...expandedEventLogs].reverse();
                                    const graphH = 80;
                                    const graphW = 280;

                                    if (hasValues) {
                                      const graphLogs = sortedLogs
                                        .filter(l => getLogValue(l) != null)
                                        .slice(-15);
                                      if (graphLogs.length < 2) return null;
                                      const values = graphLogs.map(l => getLogValue(l));
                                      const maxVal = Math.max(...values);
                                      const minVal = Math.min(...values);
                                      const range = maxVal - minVal || 1;
                                      const step = graphW / (values.length - 1);
                                      const points = values.map((v, i) => ({
                                        x: i * step,
                                        y: graphH - ((v - minVal) / range) * (graphH - 10) - 5,
                                        val: v,
                                        date: graphLogs[i].date,
                                      }));
                                      const linePath = points
                                        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                                        .join(" ");
                                      const areaPath = `${linePath} L ${points[points.length - 1].x} ${graphH} L 0 ${graphH} Z`;

                                      const activeIdx = graphTooltip?.type === "value" && graphTooltip?.eventId === eventType.id ? graphTooltip.index : null;

                                      return (
                                        <div className={`mt-3 mb-3 p-3 rounded-xl ${isDarkMode ? "bg-iron-800/40" : "bg-slate-50"}`}>
                                          <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-medium ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
                                              {activeIdx != null
                                                ? new Date(points[activeIdx].date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                : "Value Trend"}
                                            </span>
                                            <span className="text-xs font-bold" style={{ color: eventType.color }}>
                                              {activeIdx != null ? points[activeIdx].val : values[values.length - 1]}
                                            </span>
                                          </div>
                                          <svg
                                            viewBox={`0 0 ${graphW} ${graphH}`}
                                            className="w-full"
                                            style={{ height: 80 }}
                                            onMouseLeave={() => setGraphTooltip(null)}
                                          >
                                            <defs>
                                              <linearGradient id={`grad-${eventType.id}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={eventType.color} stopOpacity="0.3" />
                                                <stop offset="100%" stopColor={eventType.color} stopOpacity="0.02" />
                                              </linearGradient>
                                            </defs>
                                            <path d={areaPath} fill={`url(#grad-${eventType.id})`} />
                                            <path d={linePath} fill="none" stroke={eventType.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            {activeIdx != null && (
                                              <line x1={points[activeIdx].x} x2={points[activeIdx].x} y1={0} y2={graphH}
                                                stroke={isDarkMode ? "#555" : "#ccc"} strokeWidth="1" strokeDasharray="3 2" />
                                            )}
                                            {points.map((p, i) => (
                                              <g key={i}>
                                                <circle cx={p.x} cy={p.y}
                                                  r={activeIdx === i ? 5 : i === points.length - 1 ? 4 : 2.5}
                                                  fill={eventType.color}
                                                  stroke={isDarkMode ? "#1c1c1e" : "#fff"}
                                                  strokeWidth={activeIdx === i || i === points.length - 1 ? 2 : 0}
                                                />
                                                <circle cx={p.x} cy={p.y} r={14} fill="transparent"
                                                  onMouseEnter={() => setGraphTooltip({ type: "value", eventId: eventType.id, index: i })}
                                                  onTouchStart={(e) => { e.stopPropagation(); setGraphTooltip(prev => prev?.index === i && prev?.eventId === eventType.id ? null : { type: "value", eventId: eventType.id, index: i }); }}
                                                  style={{ cursor: "pointer" }}
                                                />
                                              </g>
                                            ))}
                                          </svg>
                                          <div className="flex justify-between mt-1">
                                            <span className={`text-[9px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                                              {new Date(graphLogs[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </span>
                                            <span className={`text-[9px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                                              {new Date(graphLogs[graphLogs.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }

                                    // Frequency line graph: days between occurrences
                                    const recentLogs = sortedLogs.slice(-15);
                                    const gaps = [];
                                    for (let i = 1; i < recentLogs.length; i++) {
                                      const d1 = new Date(recentLogs[i - 1].date);
                                      const d2 = new Date(recentLogs[i].date);
                                      gaps.push({
                                        days: Math.round((d2 - d1) / (1000 * 60 * 60 * 24)),
                                        date: recentLogs[i].date,
                                      });
                                    }
                                    if (gaps.length < 1) return null;
                                    const gapValues = gaps.map(g => g.days);
                                    const maxGap = Math.max(...gapValues);
                                    const minGap = Math.min(...gapValues);
                                    const gapRange = maxGap - minGap || 1;
                                    const avgGap = Math.round(gapValues.reduce((s, v) => s + v, 0) / gapValues.length);
                                    const step = gaps.length > 1 ? graphW / (gaps.length - 1) : graphW / 2;
                                    const points = gapValues.map((v, i) => ({
                                      x: gaps.length > 1 ? i * step : graphW / 2,
                                      y: graphH - ((v - minGap) / gapRange) * (graphH - 10) - 5,
                                      val: v,
                                    }));
                                    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                                    const areaPath = gaps.length > 1
                                      ? `${linePath} L ${points[points.length - 1].x} ${graphH} L 0 ${graphH} Z`
                                      : null;

                                    const activeIdx = graphTooltip?.type === "freq" && graphTooltip?.eventId === eventType.id ? graphTooltip.index : null;

                                    return (
                                      <div className={`mb-3 p-3 rounded-xl ${isDarkMode ? "bg-iron-800/40" : "bg-slate-50"}`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className={`text-xs font-medium ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
                                            {activeIdx != null
                                              ? new Date(gaps[activeIdx].date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                              : "Frequency (days between)"}
                                          </span>
                                          <span className="text-xs font-bold" style={{ color: eventType.color }}>
                                            {activeIdx != null ? `${gaps[activeIdx].days}d` : `avg ${avgGap}d`}
                                          </span>
                                        </div>
                                        <svg viewBox={`0 0 ${graphW} ${graphH}`} className="w-full" style={{ height: 80 }}
                                          onMouseLeave={() => setGraphTooltip(null)}
                                        >
                                          <defs>
                                            <linearGradient id={`freq-grad-${eventType.id}`} x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="0%" stopColor={eventType.color} stopOpacity="0.3" />
                                              <stop offset="100%" stopColor={eventType.color} stopOpacity="0.02" />
                                            </linearGradient>
                                          </defs>
                                          {eventType.reminder_days && (() => {
                                            const clampedY = graphH - ((eventType.reminder_days - minGap) / gapRange) * (graphH - 10) - 5;
                                            return (
                                              <line x1="0" x2={graphW} y1={clampedY} y2={clampedY}
                                                stroke={isDarkMode ? "#ef4444" : "#f87171"} strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
                                            );
                                          })()}
                                          {areaPath && <path d={areaPath} fill={`url(#freq-grad-${eventType.id})`} />}
                                          <path d={linePath} fill="none" stroke={eventType.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                          {activeIdx != null && (
                                            <line x1={points[activeIdx].x} x2={points[activeIdx].x} y1={0} y2={graphH}
                                              stroke={isDarkMode ? "#555" : "#ccc"} strokeWidth="1" strokeDasharray="3 2" />
                                          )}
                                          {points.map((p, i) => (
                                            <g key={i}>
                                              <circle cx={p.x} cy={p.y}
                                                r={activeIdx === i ? 5 : i === points.length - 1 ? 4 : 2.5}
                                                fill={eventType.color}
                                                stroke={isDarkMode ? "#1c1c1e" : "#fff"}
                                                strokeWidth={activeIdx === i || i === points.length - 1 ? 2 : 0}
                                              />
                                              <circle cx={p.x} cy={p.y} r={14} fill="transparent"
                                                onMouseEnter={() => setGraphTooltip({ type: "freq", eventId: eventType.id, index: i })}
                                                onTouchStart={(e) => { e.stopPropagation(); setGraphTooltip(prev => prev?.index === i && prev?.eventId === eventType.id ? null : { type: "freq", eventId: eventType.id, index: i }); }}
                                                style={{ cursor: "pointer" }}
                                              />
                                            </g>
                                          ))}
                                        </svg>
                                        <div className="flex justify-between mt-1">
                                          <span className={`text-[9px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                                            {new Date(recentLogs[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                          </span>
                                          <span className={`text-[9px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                                            {new Date(recentLogs[recentLogs.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                          </span>
                                        </div>
                                      </div>
                                    );

                                  })()}
                              </>
                            )}
                          </>
                        )}
                      </div>
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </motion.div>
        )}

        {/* Habits Tab Content */}
        {activeTab === "habits" && (
          <motion.div
            key="habits-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-4 space-y-3"
          >
            {trackables.filter(t => t.name !== "Body Weight").length === 0 ? (
              <div
                className={`text-center py-12 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
              >
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No habits yet</p>
                <p className="text-sm mt-1">Add habits like water intake, vitamins, etc.</p>
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
                    isDarkMode ? "bg-iron-800 text-iron-300" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  Add First Habit
                </button>
              </div>
            ) : (
              trackables
                .filter(t => t.name !== "Body Weight")
                .map(trackable => {
                  const isExpanded = expandedHabit === trackable.id;
                  const streakDays = getStreakCount(trackable.id);
                  const isScheduledToday =
                    !trackable.active_days || trackable.active_days.includes(new Date().getDay());
                  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

                  return (
                    <ContextMenu key={trackable.id}>
                      <ContextMenuTrigger asChild>
                        <div
                          className={`rounded-2xl overflow-hidden ${
                            isDarkMode
                              ? "bg-iron-900"
                              : "bg-white border border-slate-200 shadow-sm"
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
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                        isScheduledToday
                                          ? isDarkMode
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-green-100 text-green-600"
                                          : isDarkMode
                                            ? "bg-iron-800 text-iron-500"
                                            : "bg-slate-100 text-slate-400"
                                      }`}
                                    >
                                      {isScheduledToday
                                        ? "Today"
                                        : trackable.active_days.map(d => DAY_LABELS[d]).join(", ")}
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
                            </div>
                          </div>

                          {/* Expanded Heatmap and Add Past Entries */}
                          <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              key={`habit-expand-${trackable.id}`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                              className="overflow-hidden"
                            >
                            <div className="px-3 pb-3">
                              <ActivityHeatmap
                                data={habitHeatmapData[trackable.id] || []}
                                type="habit"
                                label=""
                                color={trackable.color}
                                compact={true}
                                mini
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
                            </motion.div>
                          )}
                          </AnimatePresence>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent
                        className={
                          isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"
                        }
                      >
                        <ContextMenuItem
                          onClick={() => handleEditPill(trackable)}
                          className={isDarkMode ? "text-iron-200" : "text-slate-700"}
                        >
                          <Pencil className="w-4 h-4" />
                          Edit Habit
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem destructive onClick={() => handleDeletePill(trackable.id)}>
                          <Trash2 className="w-4 h-4" />
                          Delete Habit
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </div>
      </FadeIn>

      {/* Add/Edit Event Type Modal */}
      <Modal
        open={showAddDrawer}
        onOpenChange={open => {
          setShowAddDrawer(open);
          if (!open) resetEventForm();
        }}
      >
        <ModalContent
          className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}
        >
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              {editingEventId ? "Edit Event Type" : "Add Event Type"}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {/* Name */}
            <div>
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Name
              </label>
              <input
                type="text"
                value={newEvent.name}
                onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
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
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Remind after days (optional)
              </label>
              <input
                type="number"
                value={newEvent.reminder_days || ""}
                onChange={e =>
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
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Icon
              </label>
              <EmojiPicker
                value={newEvent.icon}
                onChange={icon => setNewEvent({ ...newEvent, icon })}
                presets={EVENT_ICONS}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Color */}
            <div>
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Color
              </label>
              <ColorPicker
                value={newEvent.color}
                onChange={color => setNewEvent({ ...newEvent, color })}
                presets={EVENT_COLORS}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Need Value Toggle */}
            <div
              className={`flex items-center justify-between p-3 rounded-xl ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-iron-700" : "bg-slate-200"}`}
                >
                  <Hash className="w-4 h-4" style={{ color: newEvent.color }} />
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                  >
                    Value based event
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    Enter a numeric value when logging
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewEvent({ ...newEvent, need_value: !newEvent.need_value })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  newEvent.need_value
                    ? isDarkMode
                      ? "bg-lift-primary"
                      : "bg-workout-primary"
                    : isDarkMode
                      ? "bg-iron-700"
                      : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    newEvent.need_value ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            {/* Require notes toggle */}
            <div
              className={`flex items-center justify-between p-3 rounded-xl ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-iron-700" : "bg-slate-200"}`}
                >
                  <FileText className="w-4 h-4" style={{ color: newEvent.color }} />
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                  >
                    Require notes when logging
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    Prompt for text (e.g. details) each time you log this event
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewEvent({ ...newEvent, need_notes: !newEvent.need_notes })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  newEvent.need_notes
                    ? isDarkMode
                      ? "bg-lift-primary"
                      : "bg-workout-primary"
                    : isDarkMode
                      ? "bg-iron-700"
                      : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    newEvent.need_notes ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            {/* Track Graph Toggle */}
            <div
              className={`flex items-center justify-between p-3 rounded-xl ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-iron-700" : "bg-slate-200"}`}
                >
                  <BarChart3 className="w-4 h-4" style={{ color: newEvent.color }} />
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                  >
                    Track Graph
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    Show value graph in event history
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewEvent({ ...newEvent, track_graph: !newEvent.track_graph })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  newEvent.track_graph
                    ? isDarkMode
                      ? "bg-lift-primary"
                      : "bg-workout-primary"
                    : isDarkMode
                      ? "bg-iron-700"
                      : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    newEvent.track_graph ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => {
                setShowAddDrawer(false);
                resetEventForm();
              }}
              className={`flex-1 py-3 rounded-xl font-medium ${
                isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEvent}
              disabled={!newEvent.name.trim()}
              className={`flex-1 py-3 rounded-xl font-bold disabled:opacity-50 ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              {editingEventId ? "Save Changes" : "Add Event"}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Log Event Modal */}
      <Modal
        open={showLogDrawer}
        onOpenChange={open => {
          setShowLogDrawer(open);
          if (!open) setLogDrawerNestedOpen(false);
        }}
      >
        <ModalContent
          className={`flex max-h-[92vh] min-h-0 flex-col ${
            isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"
          }`}
        >
          <ModalHeader className="shrink-0">
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              <span className="mr-2">{selectedEvent?.icon}</span>
              Log {selectedEvent?.name}
            </ModalTitle>
          </ModalHeader>
          <ModalBody
            className={`space-y-4 ${
              selectedEvent?.need_value || selectedEvent?.need_notes
                ? "shrink-0 !max-h-none overflow-visible"
                : ""
            }`}
          >
            <div>
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Date
              </label>
              <input
                type="date"
                value={logDetails.date}
                onChange={e => setLogDetails({ ...logDetails, date: e.target.value })}
                className={`input-field ${
                  isDarkMode ? "bg-iron-800 text-iron-100" : "bg-slate-100 text-slate-800"
                }`}
              />
            </div>

            {!(selectedEvent?.need_value || selectedEvent?.need_notes) && (
              <div>
                <label
                  className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                >
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={logDetails.notes}
                  onChange={e => setLogDetails({ ...logDetails, notes: e.target.value })}
                  placeholder="e.g., Short trim"
                  className={`input-field ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                      : "bg-slate-100 text-slate-800 placeholder-slate-400"
                  }`}
                />
              </div>
            )}

            {(selectedEvent?.need_value || selectedEvent?.need_notes) && !logDrawerNestedOpen && (
              <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                Tap &ldquo;Add details&rdquo; to enter the required value or notes for this event.
              </p>
            )}
          </ModalBody>
          {!(selectedEvent?.need_value || selectedEvent?.need_notes) ? (
            <ModalFooter className="shrink-0">
              <button
                type="button"
                onClick={() => setShowLogDrawer(false)}
                className={`flex-1 py-3 rounded-xl font-medium ${
                  isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleLogEvent()}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                  isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
                }`}
              >
                <Check className="w-4 h-4" />
                Log Event
              </button>
            </ModalFooter>
          ) : !logDrawerNestedOpen ? (
            <ModalFooter className="shrink-0">
              <button
                type="button"
                onClick={() => setShowLogDrawer(false)}
                className={`flex-1 py-3 rounded-xl font-medium ${
                  isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setLogDrawerNestedOpen(true)}
                className={`flex-1 py-3 rounded-xl font-bold ${
                  isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
                }`}
              >
                Add details
              </button>
            </ModalFooter>
          ) : null}

          <NestedModal
            open={
              Boolean(showLogDrawer && logDrawerNestedOpen && selectedEvent) &&
              Boolean(selectedEvent?.need_value || selectedEvent?.need_notes)
            }
            onOpenChange={setLogDrawerNestedOpen}
          >
            <ModalContent
              className={`flex max-h-[85vh] min-h-0 flex-col ${
                isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"
              }`}
              showCloseButton
            >
              <ModalHeader className="shrink-0">
                <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
                  Details for {selectedEvent?.name}
                </ModalTitle>
                <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                  {logDetails.date}
                </p>
              </ModalHeader>
              <ModalBody className="shrink-0 space-y-4 !max-h-none overflow-visible pb-2">
                {selectedEvent?.need_value && (
                  <div>
                    <label
                      className={`mb-1.5 block text-xs font-medium uppercase tracking-wide ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                    >
                      Value <span className="text-red-400 normal-case">*</span>
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      autoFocus
                      value={logDetails.cost}
                      onChange={e => setLogDetails({ ...logDetails, cost: e.target.value })}
                      placeholder="Enter a numeric value"
                      className={`input-field py-3 text-base ${
                        isDarkMode
                          ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                          : "bg-slate-100 text-slate-800 placeholder-slate-400"
                      }`}
                    />
                  </div>
                )}
                {selectedEvent?.need_notes && (
                  <div>
                    <label
                      className={`mb-1.5 block text-xs font-medium uppercase tracking-wide ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                    >
                      Notes <span className="text-red-400 normal-case">*</span>
                    </label>
                    <textarea
                      value={logDetails.notes}
                      onChange={e => setLogDetails({ ...logDetails, notes: e.target.value })}
                      placeholder="What happened? Add any details…"
                      rows={4}
                      className={`min-h-[120px] w-full resize-none rounded-xl border px-3 py-3 text-base outline-none focus:ring-2 ${
                        isDarkMode
                          ? "border-iron-700 bg-iron-800 text-iron-100 placeholder:text-iron-600 focus:ring-lift-primary/40"
                          : "border-slate-200 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-amber-500/40"
                      }`}
                    />
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="shrink-0 pt-2">
                <button
                  type="button"
                  onClick={() => setLogDrawerNestedOpen(false)}
                  className={`flex-1 py-3 rounded-xl font-medium ${
                    isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => handleLogEvent()}
                  className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                    isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Log Event
                </button>
              </ModalFooter>
            </ModalContent>
          </NestedModal>
        </ModalContent>
      </Modal>

      {/* History Modal */}
      <Modal open={showHistoryDrawer} onOpenChange={setShowHistoryDrawer}>
        <ModalContent
          className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}
        >
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
              <div
                className={`py-8 text-center ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
              >
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
                    <ContextMenu key={log.id}>
                      <ContextMenuTrigger asChild>
                        <div
                          className={`p-3 rounded-xl ${isDarkMode ? "bg-iron-800" : "bg-slate-100"}`}
                        >
                          <div>
                            <p
                              className={`font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                            >
                              {formatDate(log.date)}
                            </p>
                            <p
                              className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                            >
                              {formatDaysSince(daysSince)}
                              {index > 0 && eventLogs[index - 1] && (
                                <span className={isDarkMode ? "text-iron-600" : "text-slate-400"}>
                                  {" "}
                                  ·{" "}
                                  {Math.floor(
                                    (new Date(eventLogs[index - 1].date) - new Date(log.date)) /
                                      (1000 * 60 * 60 * 24)
                                  )}{" "}
                                  days after
                                </span>
                              )}
                            </p>
                            {log.notes && (
                              <p
                                className={`text-sm mt-1 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                              >
                                {log.notes}
                              </p>
                            )}
                            {selectedEvent?.need_value && log.cost != null && (
                              <p
                                className={`text-sm ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
                              >
                                Value: {log.cost}
                              </p>
                            )}
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent
                        className={
                          isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"
                        }
                      >
                        <ContextMenuItem
                          onClick={() => handleEditLog(log, selectedEvent?.id)}
                          className={isDarkMode ? "text-iron-200" : "text-slate-700"}
                        >
                          <Pencil className="w-4 h-4" />
                          Edit Log
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem destructive onClick={() => handleDeleteLog(log.id)}>
                          <Trash2 className="w-4 h-4" />
                          Delete Log
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Edit Log Modal */}
      <NestedModal open={!!editingLog} onOpenChange={open => !open && setEditingLog(null)}>
        <ModalContent
          className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}
        >
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Edit Log
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                >
                  Date
                </label>
                <input
                  type="date"
                  value={editLogDetails.date}
                  onChange={e => setEditLogDetails({ ...editLogDetails, date: e.target.value })}
                  className={`w-full h-12 px-4 rounded-xl outline-none focus:ring-2 ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-100 focus:ring-lift-primary/50"
                      : "bg-slate-100 text-slate-800 focus:ring-amber-500/50"
                  }`}
                />
              </div>
              <div>
                <label
                  className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                >
                  Notes
                </label>
                <input
                  type="text"
                  value={editLogDetails.notes}
                  onChange={e => setEditLogDetails({ ...editLogDetails, notes: e.target.value })}
                  placeholder="Optional notes"
                  className={`w-full h-12 px-4 rounded-xl outline-none focus:ring-2 ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-100 placeholder-iron-600 focus:ring-lift-primary/50"
                      : "bg-slate-100 text-slate-800 placeholder-slate-400 focus:ring-amber-500/50"
                  }`}
                />
              </div>
              {eventTypes.find(et => et.id === editingLog?.eventTypeId)?.need_value && (
                <div>
                  <label
                    className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                  >
                    Value
                  </label>
                  <input
                    type="number"
                    value={editLogDetails.cost}
                    onChange={e => setEditLogDetails({ ...editLogDetails, cost: e.target.value })}
                    placeholder="Enter a numeric value"
                    min="0"
                    step="0.01"
                    className={`w-full h-12 px-4 rounded-xl outline-none focus:ring-2 ${
                      isDarkMode
                        ? "bg-iron-800 text-iron-100 placeholder-iron-600 focus:ring-lift-primary/50"
                        : "bg-slate-100 text-slate-800 placeholder-slate-400 focus:ring-amber-500/50"
                    }`}
                  />
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setEditingLog(null)}
              className={`flex-1 py-3 rounded-xl font-medium ${
                isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEditLog}
              className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              <Check className="w-4 h-4" />
              Save
            </button>
          </ModalFooter>
        </ModalContent>
      </NestedModal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm.type}
        onOpenChange={open => !open && setDeleteConfirm({ type: null, data: null })}
      >
        <AlertDialogContent
          className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}
        >
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
            <AlertDialogTitle
              className={`flex items-center gap-2 ${isDarkMode ? "text-iron-100" : ""}`}
            >
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Entry Already Exists
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : ""}>
              {pendingLogAction && (
                <>
                  You already have an entry for{" "}
                  <span
                    className={`font-semibold ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                  >
                    {pendingLogAction.eventType?.name}
                  </span>{" "}
                  on{" "}
                  <span
                    className={`font-semibold ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                  >
                    {formatDate(pendingLogAction.date)}
                  </span>
                  {pendingLogAction.existingEntry?.notes && (
                    <span className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
                      {" "}
                      ("{pendingLogAction.existingEntry.notes}")
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
              className={
                isDarkMode ? "bg-iron-800 text-iron-300 border-iron-700 hover:bg-iron-700" : ""
              }
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
        <ModalContent
          className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}
        >
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              {editingTrackable ? "Edit Habit" : "Add Habit"}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
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
                onChange={e => setNewPill({ ...newPill, name: e.target.value })}
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
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Icon
              </label>
              <EmojiPicker
                value={newPill.icon}
                onChange={icon => setNewPill({ ...newPill, icon })}
                presets={PILL_ICONS}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Color Selection */}
            <div>
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Color
              </label>
              <ColorPicker
                value={newPill.color}
                onChange={color => setNewPill({ ...newPill, color })}
                presets={PILL_COLORS}
                isDarkMode={isDarkMode}
              />
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
                    ? isDarkMode
                      ? "bg-lift-primary"
                      : "bg-workout-primary"
                    : isDarkMode
                      ? "bg-iron-700"
                      : "bg-slate-200"
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
                <label
                  className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                >
                  Unit
                </label>
                <input
                  type="text"
                  value={newPill.value_unit}
                  onChange={e => setNewPill({ ...newPill, value_unit: e.target.value })}
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
              onChange={days => setNewPill({ ...newPill, active_days: days })}
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
                  ? isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-workout-primary text-white"
                  : isDarkMode
                    ? "bg-iron-800 text-iron-600"
                    : "bg-slate-200 text-slate-400"
              }`}
            >
              {editingTrackable ? "Save Changes" : "Add Habit"}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Past Entry Modal */}
      <Modal
        open={!!pastEntryTrackable}
        onOpenChange={open => !open && setPastEntryTrackable(null)}
      >
        <ModalContent
          className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}
        >
          <ModalHeader>
            <ModalTitle
              className={`flex items-center gap-2 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
            >
              <span>{pastEntryTrackable?.icon}</span>
              Add Past Entries
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="w-full md:max-w-[min(100%,20.5rem)] lg:max-w-[22.5rem] md:mx-auto">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => handlePastEntryMonthChange(-1)}
                className={`p-2 rounded-lg ${isDarkMode ? "hover:bg-iron-800" : "hover:bg-slate-100"}`}
              >
                <ChevronLeft
                  className={`w-5 h-5 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                />
              </button>
              <h3 className={`font-semibold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                {MONTH_NAMES[pastEntryMonth.month]} {pastEntryMonth.year}
              </h3>
              <button
                onClick={() => handlePastEntryMonthChange(1)}
                className={`p-2 rounded-lg ${isDarkMode ? "hover:bg-iron-800" : "hover:bg-slate-100"}`}
              >
                <ChevronRight
                  className={`w-5 h-5 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                />
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
            <div
              className={`flex items-center justify-center gap-6 mt-4 pt-4 border-t border-dashed ${isDarkMode ? "border-iron-800" : "border-slate-200"}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${isDarkMode ? "bg-iron-800" : "bg-slate-100"}`} />
                <span className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                  Missed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                  Completed
                </span>
              </div>
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

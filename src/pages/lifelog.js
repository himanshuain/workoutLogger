import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Plus,
  Calendar,
  Clock,
  Check,
  Trash2,
  Edit3,
  ChevronRight,
  X,
  History,
  AlertCircle,
} from "lucide-react";

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

    await createEventType({
      name: newEvent.name.trim(),
      icon: newEvent.icon,
      color: newEvent.color,
      description: newEvent.description.trim() || null,
      reminder_days: newEvent.reminder_days || null,
    });

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
  };

  // Handle logging an event
  const handleLogEvent = async () => {
    if (!selectedEvent) return;

    await logEvent(selectedEvent.id, {
      date: logDetails.date,
      notes: logDetails.notes.trim() || null,
      cost: logDetails.cost ? parseFloat(logDetails.cost) : null,
    });

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
  };

  // Quick log (log today without details)
  const handleQuickLog = async (eventType) => {
    await logEvent(eventType.id);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
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
  const handleDeleteEventType = async (eventType) => {
    if (
      confirm(
        `Delete "${eventType.name}"? This will also delete all ${eventType.total_logs || 0} log entries.`,
      )
    ) {
      await deleteEventType(eventType.id);
    }
  };

  // Delete a log entry
  const handleDeleteLog = async (logId) => {
    if (!selectedEvent) return;
    if (confirm("Delete this log entry?")) {
      await deleteEventLog(logId, selectedEvent.id);
      // Refresh logs
      const logs = await getEventLogs(selectedEvent.id);
      setEventLogs(logs);
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
      <div className="px-4 py-4 pb-24">
        {/* Header */}
        <div
          className={`sticky top-0 z-30 -mx-4 px-4 pb-3 pt-1 backdrop-blur-sm ${
            isDarkMode ? "bg-iron-950/95" : "bg-slate-50/95"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                className={`text-xl font-bold ${
                  isDarkMode ? "text-iron-100" : "text-slate-800"
                }`}
              >
                Life Log
              </h2>
              <p
                className={`text-sm mt-1 ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                Track occasional events
              </p>
            </div>
            <button
              onClick={() => setShowAddDrawer(true)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDarkMode
                  ? "bg-lift-primary text-iron-950"
                  : "bg-workout-primary text-white"
              }`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Event Types List */}
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
                  className={`rounded-2xl overflow-hidden ${
                    isDarkMode
                      ? "bg-iron-900"
                      : "bg-white border border-slate-200 shadow-sm"
                  } ${isOverdue ? "ring-2 ring-amber-500/50" : ""}`}
                >
                  {/* Main Info */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ backgroundColor: `${eventType.color}20` }}
                      >
                        {eventType.icon}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-bold ${
                              isDarkMode ? "text-iron-100" : "text-slate-800"
                            }`}
                          >
                            {eventType.name}
                          </h3>
                          {isOverdue && (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>

                        {/* Last occurrence */}
                        <p
                          className={`text-sm mt-0.5 ${
                            eventType.days_since === null
                              ? isDarkMode
                                ? "text-iron-600"
                                : "text-slate-400"
                              : isOverdue
                                ? "text-amber-500 font-medium"
                                : isDarkMode
                                  ? "text-iron-400"
                                  : "text-slate-600"
                          }`}
                        >
                          {eventType.days_since === null ? (
                            "Never logged"
                          ) : (
                            <>
                              <Clock className="w-3 h-3 inline-block mr-1" />
                              {formatDaysSince(eventType.days_since)}
                              {eventType.last_log && (
                                <span
                                  className={
                                    isDarkMode
                                      ? "text-iron-600"
                                      : "text-slate-400"
                                  }
                                >
                                  {" "}
                                  · {formatDate(eventType.last_log.date)}
                                </span>
                              )}
                            </>
                          )}
                        </p>

                        {/* Total logs */}
                        {eventType.total_logs > 0 && (
                          <p
                            className={`text-xs mt-1 ${
                              isDarkMode ? "text-iron-600" : "text-slate-400"
                            }`}
                          >
                            {eventType.total_logs} time
                            {eventType.total_logs !== 1 ? "s" : ""} logged
                          </p>
                        )}
                      </div>

                      {/* Quick Log Button */}
                      <button
                        onClick={() => handleQuickLog(eventType)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isDarkMode
                            ? "bg-lift-primary/20 text-lift-primary"
                            : "bg-workout-primary/10 text-workout-primary"
                        }`}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className={`flex border-t ${
                      isDarkMode ? "border-iron-800" : "border-slate-100"
                    }`}
                  >
                    <button
                      onClick={() => openLogDrawer(eventType)}
                      className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 ${
                        isDarkMode
                          ? "text-iron-400 hover:bg-iron-800"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Log with Date
                    </button>
                    <div
                      className={`w-px ${
                        isDarkMode ? "bg-iron-800" : "bg-slate-100"
                      }`}
                    />
                    <button
                      onClick={() => openHistoryDrawer(eventType)}
                      className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 ${
                        isDarkMode
                          ? "text-iron-400 hover:bg-iron-800"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      History
                    </button>
                    <div
                      className={`w-px ${
                        isDarkMode ? "bg-iron-800" : "bg-slate-100"
                      }`}
                    />
                    <button
                      onClick={() => handleDeleteEventType(eventType)}
                      className={`px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-1 ${
                        isDarkMode
                          ? "text-red-400 hover:bg-iron-800"
                          : "text-red-500 hover:bg-slate-50"
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Event Type Drawer */}
      <Drawer open={showAddDrawer} onOpenChange={setShowAddDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add Event Type</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-4 overflow-y-auto max-h-[70vh]">
            {/* Name */}
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
                value={newEvent.name}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, name: e.target.value })
                }
                placeholder="e.g., Haircut, Doctor Visit"
                className={`input-field ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400"
                }`}
                autoFocus
              />
            </div>

            {/* Description (Optional) */}
            <div>
              <label
                className={`block text-sm mb-2 ${
                  isDarkMode ? "text-iron-400" : "text-slate-600"
                }`}
              >
                Description (optional)
              </label>
              <input
                type="text"
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, description: e.target.value })
                }
                placeholder="e.g., Every 4-6 weeks"
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
                className={`block text-sm mb-2 ${
                  isDarkMode ? "text-iron-400" : "text-slate-600"
                }`}
              >
                Remind after days (optional)
              </label>
              <input
                type="number"
                value={newEvent.reminder_days || ""}
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    reminder_days: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                placeholder="e.g., 30 for monthly"
                className={`input-field ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400"
                }`}
              />
              <p
                className={`text-xs mt-1 ${
                  isDarkMode ? "text-iron-600" : "text-slate-400"
                }`}
              >
                Event will be highlighted when overdue
              </p>
            </div>

            {/* Icon */}
            <div>
              <label
                className={`block text-sm mb-2 ${
                  isDarkMode ? "text-iron-400" : "text-slate-600"
                }`}
              >
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {EVENT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewEvent({ ...newEvent, icon })}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center ${
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
              <label
                className={`block text-sm mb-2 ${
                  isDarkMode ? "text-iron-400" : "text-slate-600"
                }`}
              >
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewEvent({ ...newEvent, color })}
                    className={`w-10 h-10 rounded-xl transition-transform ${
                      newEvent.color === color
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
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${newEvent.color}20` }}
                >
                  {newEvent.icon}
                </div>
                <div>
                  <p
                    className={`font-bold ${
                      isDarkMode ? "text-iron-100" : "text-slate-800"
                    }`}
                  >
                    {newEvent.name || "Event Name"}
                  </p>
                  <p
                    className={`text-sm ${
                      isDarkMode ? "text-iron-500" : "text-slate-500"
                    }`}
                  >
                    Never logged
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 pb-safe">
              <button
                onClick={() => setShowAddDrawer(false)}
                className={`flex-1 py-3.5 rounded-xl font-medium ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-400"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={!newEvent.name.trim()}
                className={`flex-1 py-3.5 rounded-xl font-bold disabled:opacity-50 ${
                  isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-workout-primary text-white"
                }`}
              >
                Add Event
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Log Event Drawer */}
      <Drawer open={showLogDrawer} onOpenChange={setShowLogDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              <span className="mr-2">{selectedEvent?.icon}</span>
              Log {selectedEvent?.name}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-4">
            {/* Date */}
            <div>
              <label
                className={`block text-sm mb-2 ${
                  isDarkMode ? "text-iron-400" : "text-slate-600"
                }`}
              >
                Date
              </label>
              <input
                type="date"
                value={logDetails.date}
                onChange={(e) =>
                  setLogDetails({ ...logDetails, date: e.target.value })
                }
                className={`input-field ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100"
                    : "bg-slate-100 text-slate-800"
                }`}
              />
            </div>

            {/* Notes (Optional) */}
            <div>
              <label
                className={`block text-sm mb-2 ${
                  isDarkMode ? "text-iron-400" : "text-slate-600"
                }`}
              >
                Notes (optional)
              </label>
              <input
                type="text"
                value={logDetails.notes}
                onChange={(e) =>
                  setLogDetails({ ...logDetails, notes: e.target.value })
                }
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
              <label
                className={`block text-sm mb-2 ${
                  isDarkMode ? "text-iron-400" : "text-slate-600"
                }`}
              >
                Cost (optional)
              </label>
              <input
                type="number"
                value={logDetails.cost}
                onChange={(e) =>
                  setLogDetails({ ...logDetails, cost: e.target.value })
                }
                placeholder="e.g., 30"
                className={`input-field ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400"
                }`}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 pb-safe">
              <button
                onClick={() => setShowLogDrawer(false)}
                className={`flex-1 py-3.5 rounded-xl font-medium ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-400"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleLogEvent}
                className={`flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 ${
                  isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-workout-primary text-white"
                }`}
              >
                <Check className="w-4 h-4" />
                Log Event
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* History Drawer */}
      <Drawer open={showHistoryDrawer} onOpenChange={setShowHistoryDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              <span className="mr-2">{selectedEvent?.icon}</span>
              {selectedEvent?.name} History
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto max-h-[60vh]">
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
                className={`py-8 text-center ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No logs yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {eventLogs.map((log, index) => {
                  const logDate = new Date(log.date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  logDate.setHours(0, 0, 0, 0);
                  const daysSince = Math.floor(
                    (today - logDate) / (1000 * 60 * 60 * 24),
                  );

                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl ${
                        isDarkMode ? "bg-iron-800" : "bg-slate-100"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p
                            className={`font-medium ${
                              isDarkMode ? "text-iron-100" : "text-slate-800"
                            }`}
                          >
                            {formatDate(log.date)}
                          </p>
                          <p
                            className={`text-sm ${
                              isDarkMode ? "text-iron-500" : "text-slate-500"
                            }`}
                          >
                            {formatDaysSince(daysSince)}
                            {index > 0 && eventLogs[index - 1] && (
                              <span
                                className={
                                  isDarkMode
                                    ? "text-iron-600"
                                    : "text-slate-400"
                                }
                              >
                                {" "}
                                ·{" "}
                                {Math.floor(
                                  (new Date(eventLogs[index - 1].date) -
                                    new Date(log.date)) /
                                    (1000 * 60 * 60 * 24),
                                )}{" "}
                                days after
                              </span>
                            )}
                          </p>
                          {log.notes && (
                            <p
                              className={`text-sm mt-1 ${
                                isDarkMode ? "text-iron-400" : "text-slate-600"
                              }`}
                            >
                              {log.notes}
                            </p>
                          )}
                          {log.cost && (
                            <p
                              className={`text-sm ${
                                isDarkMode
                                  ? "text-lift-primary"
                                  : "text-workout-primary"
                              }`}
                            >
                              ₹{log.cost}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className={`p-2 rounded-lg ${
                            isDarkMode
                              ? "text-iron-500 hover:bg-iron-700"
                              : "text-slate-400 hover:bg-slate-200"
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
          </div>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}


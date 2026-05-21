import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import HabitPills from "@/components/HabitPills";
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
import { toast } from "sonner";
import {
  Plus,
  Dumbbell,
  Sparkles,
  RefreshCw,
  Check,
  Play,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  History,
  Trash2,
  Pencil,
  Save,
  X,
  Target,
  Flame,
  Settings,
} from "lucide-react";
import ExerciseIcon from "@/components/ExerciseIcon";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { FadeIn, StaggerContainer, StaggerItem, PressableScale } from "@/components/ui/fade-in";
import TodayFoodLogSection from "@/components/TodayFoodLogSection";
import {
  segmentSelected,
  segmentUnselected,
  actionPrimary,
  actionSecondary,
  actionDestructive,
} from "@/lib/actionButtonStyles";
import SectionManageButton from "@/components/SectionManageButton";
import SectionHeader, { SectionHeaderLink } from "@/components/SectionHeader";
import SectionSurface from "@/components/SectionSurface";
import TodayWorkoutSection from "@/components/workout/TodayWorkoutSection";
import HorizontalDateStrip from "@/components/logging/HorizontalDateStrip";
import DayHabitsLifeLogCard from "@/components/logging/DayHabitsLifeLogCard";
import LongPressContextHint from "@/components/LongPressContextHint";
import LogDayWorkoutPanel from "@/components/logging/LogDayWorkoutPanel";
import {
  addDaysStr,
  formatChipLabel,
  STRIP_INITIAL_DAYS,
  STRIP_LOAD_MORE_DAYS,
  STRIP_MAX_PAST_DAYS,
} from "@/lib/dateLogUtils";
import { SkeletonTodaySections } from "@/components/SkeletonLoader";
import {
  mergeEventTypesWithLifelogSettings,
  LIFELOG_EVENT_SETTINGS_CHANGED,
} from "@/lib/lifelogEventSettings";

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

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDarkMode } = useTheme();
  const {
    user,
    routines,
    activeSession,
    trackables,
    todayEntries,
    today,
    toggleTrackingEntry,
    createTrackable,
    startWorkoutSession,
    loadActiveSession,
    getWorkoutSessions,
    deleteSetLog,
    deleteWorkoutSession,
    updateSetLogData,
    foodItems,
    todayFoodEntries,
    toggleFoodEntry,
    updateFoodEntryQuantity,
    getFoodEntries,
    getTrackingEntries,
    toggleTrackingEntryForDate,
    eventTypes = [],
    logEvent,
    deleteEventLog,
    getRoutineForDay,
    getWorkoutSessionsForDate,
    startWorkoutSessionForDate,
    isLoading: isBootstrapping,
  } = useWorkout();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewingDate, setViewingDate] = useState(today);
  const [stripPastDaysLoaded, setStripPastDaysLoaded] = useState(STRIP_INITIAL_DAYS);
  const [showAddHabitDrawer, setShowAddHabitDrawer] = useState(false);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [showRoutineSelector, setShowRoutineSelector] = useState(false);
  const [replaceWorkoutConfirm, setReplaceWorkoutConfirm] = useState(null);
  const [newHabit, setNewHabit] = useState({
    name: "",
    type: "habit",
    icon: "💧",
    color: "#22c55e",
    has_value: false,
    value_unit: "",
    active_days: null,
  });

  // Recent workout sessions (last 30 days)
  const recentStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const { data: allRecentSessions = [] } = useQuery({
    queryKey: ["recentSessions", user?.id, recentStart, today],
    queryFn: () => getWorkoutSessions(recentStart, today),
    enabled: !!user,
  });

  const todaySession = useMemo(
    () => allRecentSessions.find(s => s.date === viewingDate && s.status === "completed") || null,
    [allRecentSessions, viewingDate],
  );

  const recentSessions = useMemo(() =>
    allRecentSessions
      .filter((s) => s.status === "completed")
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
    [allRecentSessions],
  );

  const [expandedSession, setExpandedSession] = useState(null);
  const [editingSet, setEditingSet] = useState(null); // { id, weight, reps }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: "set"|"session", id, label }

  /** Life log on Home: sheet when selected day’s event needs value/notes (same as /lifelog). */
  const [viewingLifeLogSheet, setViewingLifeLogSheet] = useState(null);
  const [lifeSheetValue, setLifeSheetValue] = useState("");
  const [lifeSheetNotes, setLifeSheetNotes] = useState("");

  const [lifeLogSettingsNonce, setLifeLogSettingsNonce] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setLifeLogSettingsNonce(n => n + 1);
    window.addEventListener(LIFELOG_EVENT_SETTINGS_CHANGED, bump);
    return () => window.removeEventListener(LIFELOG_EVENT_SETTINGS_CHANGED, bump);
  }, []);

  const isViewingToday = viewingDate === today;

  useEffect(() => {
    if (!router.isReady || !user || !today) return;
    const d = router.query.date;
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today) {
      setViewingDate(d);
    } else if (!router.query.date) {
      setViewingDate(today);
    }
  }, [router.isReady, router.query.date, user, today]);

  const updateHomeDateUrl = useCallback(
    date => {
      const query = {};
      if (date !== today) query.date = date;
      router.replace({ pathname: "/", query }, undefined, { shallow: true });
    },
    [router, today],
  );

  const pickViewingDate = useCallback(
    iso => {
      if (!today || iso > today) return;
      setViewingDate(iso);
      updateHomeDateUrl(iso);
    },
    [today, updateHomeDateUrl],
  );

  const glanceDays = useMemo(() => {
    if (!today) return [];
    const n = stripPastDaysLoaded;
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      out.push(addDaysStr(today, -i));
    }
    return out;
  }, [today, stripPastDaysLoaded]);

  const loadMoreStripPast = useCallback(() => {
    setStripPastDaysLoaded(prev =>
      prev >= STRIP_MAX_PAST_DAYS ? prev : Math.min(prev + STRIP_LOAD_MORE_DAYS, STRIP_MAX_PAST_DAYS),
    );
  }, []);

  const stripScrollAnchorDate = today;

  const { data: foodCountByDate = {} } = useQuery({
    queryKey: ["pastModalFoodStrip", user?.id, glanceDays[0], glanceDays[glanceDays.length - 1]],
    queryFn: async () => {
      if (!user || glanceDays.length === 0) return {};
      const start = glanceDays[0];
      const end = glanceDays[glanceDays.length - 1];
      const entries = await getFoodEntries(start, end);
      const counts = {};
      for (const e of entries) {
        counts[e.date] = (counts[e.date] || 0) + 1;
      }
      return counts;
    },
    enabled: Boolean(user && glanceDays.length > 0),
  });

  const { data: viewingFoodEntries = {} } = useQuery({
    queryKey: ["foodEntriesForDate", user?.id, viewingDate],
    queryFn: async () => {
      const rows = await getFoodEntries(viewingDate, viewingDate);
      const map = {};
      for (const e of rows) map[e.food_item_id] = e;
      return map;
    },
    enabled: Boolean(user && viewingDate && !isViewingToday),
  });

  const { data: trackingForDayRaw = [] } = useQuery({
    queryKey: ["trackingEntriesForDate", user?.id, viewingDate],
    queryFn: () => getTrackingEntries(viewingDate, viewingDate),
    enabled: Boolean(user && viewingDate && !isViewingToday),
  });

  const trackingForDay = useMemo(() => {
    const map = {};
    if (isViewingToday) {
      Object.entries(todayEntries || {}).forEach(([id, entry]) => {
        map[id] = entry;
      });
    } else {
      for (const e of trackingForDayRaw) {
        map[e.trackable_id] = e;
      }
    }
    return map;
  }, [trackingForDayRaw, isViewingToday, todayEntries]);

  const habitListForViewing = useMemo(() => {
    if (!viewingDate) return [];
    const dow = new Date(viewingDate + "T12:00:00").getDay();
    return [...(trackables || [])]
      .filter(t => {
        if (t.name === "Body Weight") return false;
        if (t.active_days?.length && !t.active_days.includes(dow)) return false;
        return true;
      })
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [trackables, viewingDate]);

  const todayHabitTrackables = useMemo(() => {
    if (!isViewingToday || !viewingDate) return [];
    const dow = new Date(viewingDate + "T12:00:00").getDay();
    return (trackables || []).filter(
      t =>
        t.name !== "Body Weight" &&
        (!t.active_days || t.active_days.includes(dow)),
    );
  }, [trackables, viewingDate, isViewingToday]);

  const todayHabitsDone = useMemo(
    () => todayHabitTrackables.filter(t => todayEntries[t.id]?.is_completed).length,
    [todayHabitTrackables, todayEntries],
  );

  const todayHabitsMeta =
    todayHabitTrackables.length > 0
      ? `${todayHabitsDone}/${todayHabitTrackables.length}`
      : null;

  const mergedLifeEventTypes = useMemo(
    () => mergeEventTypesWithLifelogSettings(eventTypes || []),
    [eventTypes, lifeLogSettingsNonce],
  );

  const sortedLifeEvents = useMemo(
    () => [...mergedLifeEventTypes].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
    [mergedLifeEventTypes],
  );

  const { data: workoutSessionsForViewing = [] } = useQuery({
    queryKey: ["workoutSessionsForDate", user?.id, viewingDate],
    queryFn: () => getWorkoutSessionsForDate(viewingDate),
    enabled: Boolean(user && viewingDate && !isViewingToday),
  });

  const routineForViewingDay = useMemo(() => {
    if (!viewingDate) return null;
    const dayOfWeek = new Date(viewingDate + "T12:00:00").getDay();
    return getRoutineForDay(dayOfWeek);
  }, [viewingDate, getRoutineForDay]);

  const hasLifeLogThisDay = useCallback((et, dateStr) => (et.event_logs || []).some(l => l.date === dateStr), []);

  const getLifeLogForDay = useCallback((et, dateStr) => (et.event_logs || []).find(l => l.date === dateStr) || null, []);

  const closeViewingLifeLogSheet = useCallback(() => {
    setViewingLifeLogSheet(null);
    setLifeSheetValue("");
    setLifeSheetNotes("");
  }, []);

  const submitViewingLifeLogSheet = useCallback(async () => {
    const et = viewingLifeLogSheet;
    if (!et || !viewingDate || !logEvent) return;
    if (getLifeLogForDay(et, viewingDate)) {
      closeViewingLifeLogSheet();
      return;
    }
    let cost = null;
    if (et.need_value) {
      const n = parseFloat(lifeSheetValue);
      if (!Number.isFinite(n)) {
        toast.error("Enter a numeric value");
        return;
      }
      cost = n;
    }
    let notes = null;
    if (et.need_notes) {
      const trimmed = lifeSheetNotes.trim();
      if (!trimmed) {
        toast.error("Notes are required for this event");
        return;
      }
      notes = trimmed;
    }
    const result = await logEvent(et.id, { date: viewingDate, cost, notes });
    if (result) {
      toast.success(`Logged ${et.name}`);
      closeViewingLifeLogSheet();
    } else toast.error("Could not log");
  }, [
    viewingLifeLogSheet,
    viewingDate,
    logEvent,
    lifeSheetValue,
    lifeSheetNotes,
    getLifeLogForDay,
    closeViewingLifeLogSheet,
  ]);

  const handleQuickLifeLog = useCallback(
    async et => {
      if (!viewingDate || !logEvent || !deleteEventLog) return;
      const existing = getLifeLogForDay(et, viewingDate);
      if (existing) {
        const ok = await deleteEventLog(existing.id, et.id);
        if (ok) toast.success(`Removed ${et.name}`);
        else toast.error("Could not remove log");
        return;
      }
      if (et.need_notes || et.need_value) {
        setViewingLifeLogSheet(et);
        setLifeSheetValue("");
        setLifeSheetNotes("");
        return;
      }
      const result = await logEvent(et.id, { date: viewingDate });
      if (result) toast.success(`Logged ${et.name}`);
      else toast.error("Could not log");
    },
    [viewingDate, logEvent, deleteEventLog, getLifeLogForDay],
  );

  const handleHabitToggleList = async t => {
    if (!viewingDate) return;
    if (t.has_value) {
      toast.message("Value habits", {
        description: "Use Lifelog to enter amounts for past days.",
      });
      return;
    }
    const existing = trackingForDay[t.id];
    const completed = !!existing?.is_completed;
    await toggleTrackingEntryForDate(t.id, viewingDate, !completed, existing?.value ?? null);
    queryClient.invalidateQueries({ queryKey: ["trackingEntriesForDate", user?.id, viewingDate] });
    queryClient.invalidateQueries({ queryKey: ["trackingEntries"] });
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const navigateToWorkoutSession = useCallback(
    session => {
      if (!session?.id) return;
      if (session.status === "completed") router.push(`/workout/${session.id}/summary`);
      else router.push(`/workout/${session.id}`);
    },
    [router],
  );

  const handleStartWorkoutForViewingDate = async () => {
    if (!viewingDate || isViewingToday) return;
    try {
      const session = await startWorkoutSessionForDate(viewingDate, routineForViewingDay);
      if (!session) {
        toast.error("Could not start workout");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["workoutSessionsForDate", user?.id, viewingDate] });
      navigateToWorkoutSession(session);
    } catch (error) {
      console.error("Error starting workout:", error);
      toast.error("Could not start workout");
    }
  };

  const handleStartWithPickedRoutineForViewingDate = async routine => {
    if (!viewingDate || isViewingToday || !routine) return;
    setIsStartingWorkout(true);
    setShowRoutineSelector(false);
    try {
      const activeForDay = workoutSessionsForViewing.find(s => s.status === "active");
      if (activeForDay) {
        setReplaceWorkoutConfirm({
          type: "past",
          routine,
          activeForDay,
        });
        setIsStartingWorkout(false);
        return;
      }
      const session = await startWorkoutSessionForDate(viewingDate, routine);
      if (!session) {
        toast.error("Could not start workout");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["workoutSessionsForDate", user?.id, viewingDate],
      });
      navigateToWorkoutSession(session);
      toast.success("Workout started");
    } catch (e) {
      console.error(e);
      toast.error("Could not start workout");
    } finally {
      setIsStartingWorkout(false);
    }
  };

  const formatDate = isoOrDate => {
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate + "T12:00:00") : isoOrDate;
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
      await queryClient.invalidateQueries({ queryKey: ["pastModalFoodStrip"] });
      if (user?.id && viewingDate) {
        await queryClient.invalidateQueries({ queryKey: ["foodEntriesForDate", user.id, viewingDate] });
        await queryClient.invalidateQueries({ queryKey: ["trackingEntriesForDate", user.id, viewingDate] });
        await queryClient.invalidateQueries({ queryKey: ["workoutSessionsForDate", user.id, viewingDate] });
      }
      toast.success("Updated");
    } finally {
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Start workout (replaces an in-progress session for today if user picks another routine)
  const handleStartWorkout = async (routine) => {
    setIsStartingWorkout(true);
    setShowRoutineSelector(false);

    try {
      if (activeSession && activeSession.status === "active") {
        setReplaceWorkoutConfirm({ type: "today", routine });
        setIsStartingWorkout(false);
        return;
      }
      const session = await startWorkoutSession(routine);
      if (session) {
        await loadActiveSession();
        toast.success("Workout started");
      } else {
        toast.error("Could not start workout");
      }
      await queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
    } catch (err) {
      console.error("Error starting workout:", err);
      toast.error("Could not start workout");
    } finally {
      setIsStartingWorkout(false);
    }
  };

  const handleToggleHabit = async (trackableId, isCompleted, value) => {
    await toggleTrackingEntry(trackableId, isCompleted, value);
  };

  const handleSaveHabit = async () => {
    if (!newHabit.name.trim()) return;

    await createTrackable(newHabit);
    setShowAddHabitDrawer(false);
    setNewHabit({
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
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <div
            className="w-20 h-20 mb-6 rounded-card flex items-center justify-center"
            style={{
              background: isDarkMode
                ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                : "linear-gradient(135deg, #4F8CFF 0%, #6366f1 100%)",
            }}
          >
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <h1
            className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
          >
            Welcome to Logbook
          </h1>
          <p
            className={`text-center mb-section ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
          >
            Sign in to start tracking
          </p>
          <button
            onClick={() => router.push("/auth")}
            className={`px-8 py-3 rounded-card font-bold ${
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

  const hasActiveSession = activeSession && activeSession.status === "active";
  const hasCompletedSession =
    todaySession && todaySession.status === "completed";

  return (
    <Layout>
      <FadeIn duration={0.5}>
      <div className="px-4 py-4">
        {/* Date strip + header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="min-w-0">
            <p className={`text-metadata tracking-wide ${isDarkMode ? "text-iron-400" : ""}`}>
              {isViewingToday ? "Today" : "This day"}
            </p>
            <h2 className="text-screen-title">{viewingDate ? formatDate(viewingDate) : formatDate(new Date())}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh"
              className={`w-10 h-10 rounded-card flex items-center justify-center transition-colors ${
                isDarkMode ? "bg-iron-800 active:bg-iron-700" : "bg-slate-100 active:bg-slate-200"
              } ${isRefreshing ? "animate-spin" : ""}`}
            >
              <RefreshCw
                className={`w-5 h-5 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className={`w-10 h-10 rounded-card flex items-center justify-center transition-colors ${
                isDarkMode ? "bg-iron-800 active:bg-iron-700 text-iron-400" : "bg-slate-100 active:bg-slate-200 text-slate-500"
              }`}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isBootstrapping ? (
          <SkeletonTodaySections isDarkMode={isDarkMode} />
        ) : (
          <>
        {today && glanceDays.length > 0 ? (
          <HorizontalDateStrip
            isDarkMode={isDarkMode}
            glanceDays={glanceDays}
            selectedDate={viewingDate}
            todayStr={today}
            foodCountByDate={foodCountByDate}
            onPickDate={pickViewingDate}
            stripScrollAnchorDate={stripScrollAnchorDate}
            onNearPastEdge={loadMoreStripPast}
            canLoadMorePast={stripPastDaysLoaded < STRIP_MAX_PAST_DAYS}
            className="mb-4"
          />
        ) : null}

        {/* Today's Workout — new board, logger, and routine CTAs */}
        {isViewingToday ? (
        <section className="section-spacing">
          <TodayWorkoutSection
            completedTodaySession={
              hasCompletedSession && !hasActiveSession ? todaySession : null
            }
            onChooseRoutine={() => setShowRoutineSelector(true)}
          />
        </section>
        ) : (
        <section className="section-spacing">
          <LogDayWorkoutPanel
            isDarkMode={isDarkMode}
            pastLogDate={viewingDate}
            todayStr={today}
            workoutSessions={workoutSessionsForViewing}
            routines={routines}
            routineForSelectedDay={routineForViewingDay}
            startingRoutine={isStartingWorkout}
            onPickRoutine={() => setShowRoutineSelector(true)}
            onStartWorkout={handleStartWorkoutForViewingDate}
            onNavigateSession={navigateToWorkoutSession}
          />
        </section>
        )}

        {/* Habits */}
        {isViewingToday ? (
        <section className="section-spacing">
          <SectionSurface isDarkMode={isDarkMode}>
            <SectionHeader
              icon={Sparkles}
              label="Habits"
              meta={todayHabitsMeta}
              isDarkMode={isDarkMode}
            >
              <SectionManageButton
                isDarkMode={isDarkMode}
                onClick={() => router.push("/lifelog")}
                ariaLabel="Manage habits"
              />
            </SectionHeader>
            <HabitPills
              trackables={todayHabitTrackables}
              entries={todayEntries}
              onToggle={handleToggleHabit}
              onAddNew={() => setShowAddHabitDrawer(true)}
            />
          </SectionSurface>
        </section>
        ) : (
        <section className="section-spacing">
          <DayHabitsLifeLogCard
            isDarkMode={isDarkMode}
            selectedDate={viewingDate}
            habitList={habitListForViewing}
            trackingForDay={trackingForDay}
            onHabitToggle={handleHabitToggleList}
            sortedLifeEvents={sortedLifeEvents}
            hasLifeLogThisDay={hasLifeLogThisDay}
            onQuickLifeLog={handleQuickLifeLog}
            onManageLifelog={() => router.push("/lifelog")}
            showHabits
            showLifeLog={false}
          />
        </section>
        )}

        <TodayFoodLogSection
          isDarkMode={isDarkMode}
          foodItems={foodItems}
          todayFoodEntries={todayFoodEntries}
          toggleFoodEntry={toggleFoodEntry}
          updateFoodEntryQuantity={updateFoodEntryQuantity}
          queryClient={queryClient}
          logForDate={!isViewingToday ? viewingDate : null}
          foodEntriesMap={!isViewingToday ? viewingFoodEntries : null}
          calendarToday={today}
          userId={user?.id}
        />

        <section className="section-spacing">
          <DayHabitsLifeLogCard
            isDarkMode={isDarkMode}
            selectedDate={viewingDate}
            habitList={[]}
            trackingForDay={{}}
            onHabitToggle={() => {}}
            sortedLifeEvents={sortedLifeEvents}
            hasLifeLogThisDay={hasLifeLogThisDay}
            onQuickLifeLog={handleQuickLifeLog}
            onManageLifelog={() => router.push("/lifelog")}
            showHabits={false}
            showLifeLog
          />
        </section>
          </>
        )}

        {/* Recent Workouts */}
        {recentSessions.length > 0 && (
        <section className="mt-6">
          <SectionHeader
            icon={History}
            label="Workout history"
            meta={`${recentSessions.length} recent`}
            isDarkMode={isDarkMode}
          >
            <SectionHeaderLink isDarkMode={isDarkMode} onClick={() => router.push("/history")}>
              View all <ChevronRight className="w-3 h-3" aria-hidden />
            </SectionHeaderLink>
          </SectionHeader>

          {recentSessions.length > 0 && (
            <LongPressContextHint variant="deleteOnly" isDarkMode={isDarkMode} className="mb-2" />
          )}

          {!todaySession && isViewingToday && (
            <p
              className={`text-sm mb-3 ${isDarkMode ? "text-iron-500" : "text-slate-600"}`}
            >
              Nothing logged for this day yet.
            </p>
          )}

          {(
            <StaggerContainer className="space-y-2">
              {recentSessions.map((session) => {
                const completedSets = (session.set_logs || []).filter((s) => s.is_completed);
                const totalVolume = completedSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
                const exerciseNames = [...new Set(completedSets.map((s) => s.exercise_name))];
                const isExpanded = expandedSession === session.id;
                const dateObj = new Date(session.date + "T00:00:00");
                const todayObj = new Date();
                todayObj.setHours(0, 0, 0, 0);
                const yesterday = new Date(todayObj);
                yesterday.setDate(yesterday.getDate() - 1);
                const dateLabel =
                  dateObj.toDateString() === todayObj.toDateString()
                    ? "Today"
                    : dateObj.toDateString() === yesterday.toDateString()
                    ? "Yesterday"
                    : dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

                return (
                  <StaggerItem key={session.id}>
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <PressableScale>
                          <div className="card overflow-hidden">
                    {/* Session header */}
                    <button
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      className="w-full p-3.5 text-left active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                              {dateLabel}
                            </span>
                            {session.routine_name && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full truncate max-w-[120px] ${
                                isDarkMode ? "bg-lift-primary/15 text-lift-primary" : "bg-workout-primary/10 text-workout-primary"
                              }`}>
                                {session.routine_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                              <Target className="w-3 h-3" />
                              {exerciseNames.length} exercise{exerciseNames.length !== 1 ? "s" : ""}
                            </span>
                            <span className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                              <Flame className="w-3 h-3" />
                              {completedSets.length} sets
                            </span>
                            {totalVolume > 0 && (
                              <span className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                                <Dumbbell className="w-3 h-3" />
                                {Math.round(totalVolume).toLocaleString()} kg
                              </span>
                            )}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className={`w-4 h-4 flex-shrink-0 ml-2 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
                        ) : (
                          <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-2 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
                        )}
                      </div>
                    </button>

                    {/* Expanded exercise details */}
                    {isExpanded && (
                      <div className={`px-3.5 pb-3 space-y-2 border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>
                        <div className="pt-2.5">
                          <LongPressContextHint isDarkMode={isDarkMode} className="mb-2" />
                          {(() => {
                            const byExercise = {};
                            completedSets.forEach((s) => {
                              const name = s.exercise_name || "Exercise";
                              if (!byExercise[name]) byExercise[name] = { sets: [], volume: 0 };
                              byExercise[name].sets.push(s);
                              byExercise[name].volume += (s.weight || 0) * (s.reps || 0);
                            });
                            return Object.entries(byExercise).map(([name, { sets, volume }]) => (
                              <div key={name} className={`rounded-card p-3 mb-2 last:mb-0 ${isDarkMode ? "bg-iron-800/40" : "bg-slate-50"}`}>
                                {/* Exercise header */}
                                <div className="flex items-center gap-2.5 mb-2">
                                  <div className={`w-8 h-8 rounded-card flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-iron-700/70" : "bg-slate-100"}`}>
                                    <ExerciseIcon name={name} className="w-5 h-5" color={isDarkMode ? "#a1a1aa" : "#64748b"} />
                                  </div>
                                  <p className={`text-sm font-semibold truncate flex-1 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                                    {name}
                                  </p>
                                  <span className={`text-[11px] flex-shrink-0 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>
                                    {sets.length} set{sets.length !== 1 ? "s" : ""}
                                    {volume > 0 ? ` · ${Math.round(volume).toLocaleString()} kg` : ""}
                                  </span>
                                </div>
                                {/* Individual sets */}
                                <div className="ml-[2.625rem] space-y-0.5">
                                  {sets.map((s, idx) => (
                                    <ContextMenu key={s.id}>
                                      <ContextMenuTrigger asChild>
                                        <div
                                          className={`flex items-center gap-2 py-1.5 ${idx > 0 ? `border-t ${isDarkMode ? "border-iron-700/30" : "border-slate-100"}` : ""}`}
                                        >
                                          <span className={`w-5 text-center text-[10px] font-bold rounded-md py-0.5 flex-shrink-0 ${isDarkMode ? "bg-iron-700 text-iron-500" : "bg-slate-100 text-slate-400"}`}>
                                            {idx + 1}
                                          </span>

                                          {editingSet?.id === s.id ? (
                                            <div className="flex items-center gap-1.5 flex-1">
                                              <input
                                                type="number"
                                                step="0.5"
                                                value={editingSet.weight}
                                                onChange={(e) => setEditingSet({ ...editingSet, weight: e.target.value })}
                                                className={`w-16 px-2 py-1 rounded-lg text-xs text-center ${isDarkMode ? "bg-iron-700 text-iron-100 border border-iron-600" : "bg-white text-slate-800 border border-slate-200"}`}
                                              />
                                              <span className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>kg ×</span>
                                              <input
                                                type="number"
                                                value={editingSet.reps}
                                                onChange={(e) => setEditingSet({ ...editingSet, reps: e.target.value })}
                                                className={`w-14 px-2 py-1 rounded-lg text-xs text-center ${isDarkMode ? "bg-iron-700 text-iron-100 border border-iron-600" : "bg-white text-slate-800 border border-slate-200"}`}
                                              />
                                              <span className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>reps</span>
                                              <button
                                                onClick={async () => {
                                                  const ok = await updateSetLogData(editingSet.id, {
                                                    weight: parseFloat(editingSet.weight) || 0,
                                                    reps: parseInt(editingSet.reps) || 0,
                                                  });
                                                  if (ok) toast.success("Set updated");
                                                  setEditingSet(null);
                                                }}
                                                className={`p-1 rounded-lg ${isDarkMode ? "text-green-400 active:bg-iron-700" : "text-green-600 active:bg-slate-200"}`}
                                              >
                                                <Save className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={() => setEditingSet(null)}
                                                className={`p-1 rounded-lg ${isDarkMode ? "text-iron-500 active:bg-iron-700" : "text-slate-400 active:bg-slate-200"}`}
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                              {s.weight ? (
                                                <>
                                                  <span className={`text-sm font-semibold tabular-nums ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                                                    {s.weight} <span className={`text-xs font-normal ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>kg</span>
                                                  </span>
                                                  <span className={`text-xs ${isDarkMode ? "text-iron-600" : "text-slate-300"}`}>×</span>
                                                  <span className={`text-sm font-semibold tabular-nums ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                                                    {s.reps} <span className={`text-xs font-normal ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>reps</span>
                                                  </span>
                                                </>
                                              ) : (
                                                <span className={`text-sm font-semibold tabular-nums ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                                                  {s.reps} <span className={`text-xs font-normal ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>reps</span>
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </ContextMenuTrigger>
                                      <ContextMenuContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
                                        <ContextMenuItem
                                          onClick={() => setEditingSet({ id: s.id, weight: s.weight || "", reps: s.reps || "" })}
                                          className={isDarkMode ? "text-iron-200" : "text-slate-700"}
                                        >
                                          <Pencil className="w-4 h-4" />
                                          Edit Set
                                        </ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem
                                          destructive
                                          onClick={() => setDeleteConfirm({ type: "set", id: s.id, label: `${name} — Set ${idx + 1}` })}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          Delete Set
                                        </ContextMenuItem>
                                      </ContextMenuContent>
                                    </ContextMenu>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>

                      </div>
                    )}
                          </div>
                        </PressableScale>
                      </ContextMenuTrigger>
                    <ContextMenuContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
                      <ContextMenuItem
                        destructive
                        onClick={() => setDeleteConfirm({
                          type: "session",
                          id: session.id,
                          label: `${session.routine_name || "Workout"} on ${dateLabel}`,
                        })}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Workout
                      </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </section>
        )}
      </div>
      </FadeIn>

      {/* Routine Selector Modal */}
      <Modal open={showRoutineSelector} onOpenChange={setShowRoutineSelector}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              {isViewingToday ? "Choose a Routine" : `Choose routine for ${formatChipLabel(viewingDate, today)}`}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-2">
            {routines.map((routine) => (
              <button
                key={routine.id}
                type="button"
                onClick={() =>
                  isViewingToday ? handleStartWorkout(routine) : handleStartWithPickedRoutineForViewingDate(routine)
                }
                disabled={isStartingWorkout}
                className={`w-full p-4 rounded-card text-left transition-all disabled:opacity-50 disabled:pointer-events-none ${
                  isDarkMode ? "bg-iron-800 hover:bg-iron-700" : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-card flex items-center justify-center"
                    style={{ backgroundColor: `${routine.color}20` }}
                  >
                    <Dumbbell className="w-6 h-6" style={{ color: routine.color }} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                      {routine.name}
                    </p>
                    <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                      {routine.routine_exercises?.length || 0} exercises
                    </p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
                </div>
              </button>
            ))}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Add Habit Modal */}
      <Modal open={showAddHabitDrawer} onOpenChange={setShowAddHabitDrawer}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>Add New Habit</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {/* Name */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Name
              </label>
              <input
                type="text"
                value={newHabit.name}
                onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
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
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewHabit({ ...newHabit, type: "habit", has_value: false })}
                  className={`flex-1 py-3 rounded-card text-sm font-medium flex items-center justify-center gap-2 ${
                    newHabit.type === "habit"
                      ? segmentSelected(isDarkMode)
                      : segmentUnselected(isDarkMode)
                  }`}
                >
                  {newHabit.type === "habit" && <Check className="w-4 h-4" />}
                  Habit (Yes/No)
                </button>
                <button
                  onClick={() => setNewHabit({ ...newHabit, type: "health", has_value: true })}
                  className={`flex-1 py-3 rounded-card text-sm font-medium flex items-center justify-center gap-2 ${
                    newHabit.type === "health"
                      ? segmentSelected(isDarkMode)
                      : segmentUnselected(isDarkMode)
                  }`}
                >
                  {newHabit.type === "health" && <Check className="w-4 h-4" />}
                  Health (Value)
                </button>
              </div>
            </div>

            {/* Value Unit (for health type) */}
            {newHabit.type === "health" && (
              <div>
                <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                  Unit
                </label>
                <input
                  type="text"
                  value={newHabit.value_unit}
                  onChange={(e) => setNewHabit({ ...newHabit, value_unit: e.target.value })}
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
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Icon
              </label>
              <EmojiPicker
                value={newHabit.icon}
                onChange={(icon) => setNewHabit({ ...newHabit, icon })}
                presets={PILL_ICONS}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Color */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Color
              </label>
              <ColorPicker
                value={newHabit.color}
                onChange={(color) => setNewHabit({ ...newHabit, color })}
                presets={PILL_COLORS}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Active Days */}
            <DayPicker
              value={newHabit.active_days}
              onChange={(days) => setNewHabit({ ...newHabit, active_days: days })}
              isDarkMode={isDarkMode}
            />
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setShowAddHabitDrawer(false)}
              className={`flex-1 py-3 rounded-card font-medium ${actionSecondary(isDarkMode)}`}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveHabit}
              disabled={!newHabit.name.trim()}
              className={`flex-1 py-3 rounded-card font-bold disabled:opacity-50 flex items-center justify-center gap-2 ${actionPrimary(isDarkMode)}`}
            >
              <Check className="w-4 h-4" />
              Add Habit
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Delete {deleteConfirm?.type === "session" ? "Workout" : "Set"}
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : "text-slate-500"}>
              {deleteConfirm?.type === "session"
                ? `This will permanently delete "${deleteConfirm?.label}" and all its sets.`
                : `Delete ${deleteConfirm?.label}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDarkMode ? "bg-iron-800 text-iron-300 hover:bg-iron-700 border-0" : ""}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteConfirm) return;
                if (deleteConfirm.type === "session") {
                  const ok = await deleteWorkoutSession(deleteConfirm.id);
                  if (ok) toast.success("Workout deleted");
                } else {
                  const ok = await deleteSetLog(deleteConfirm.id);
                  if (ok) toast.success("Set deleted");
                }
                setDeleteConfirm(null);
              }}
              className={actionDestructive(isDarkMode, "border-0")}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!replaceWorkoutConfirm}
        onOpenChange={open => !open && setReplaceWorkoutConfirm(null)}
      >
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Replace in-progress workout?
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : "text-slate-500"}>
              {replaceWorkoutConfirm?.type === "past"
                ? "Replace the in-progress workout for this day with the selected routine? Unsaved progress on the current session will be removed."
                : "Replace your current in-progress workout with this routine? Progress on the current session will be lost."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDarkMode ? "bg-iron-800 text-iron-300 hover:bg-iron-700 border-0" : ""}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!replaceWorkoutConfirm) return;
                setIsStartingWorkout(true);
                try {
                  if (replaceWorkoutConfirm.type === "past") {
                    await deleteWorkoutSession(replaceWorkoutConfirm.activeForDay.id);
                    await queryClient.invalidateQueries({
                      queryKey: ["workoutSessionsForDate", user?.id, viewingDate],
                    });
                    const session = await startWorkoutSessionForDate(
                      viewingDate,
                      replaceWorkoutConfirm.routine,
                    );
                    if (!session) {
                      toast.error("Could not start workout");
                      return;
                    }
                    await queryClient.invalidateQueries({
                      queryKey: ["workoutSessionsForDate", user?.id, viewingDate],
                    });
                    navigateToWorkoutSession(session);
                    toast.success("Workout started");
                  } else {
                    await deleteWorkoutSession(activeSession.id);
                    await loadActiveSession();
                    const session = await startWorkoutSession(replaceWorkoutConfirm.routine);
                    if (session) {
                      await loadActiveSession();
                      toast.success("Workout started");
                    } else {
                      toast.error("Could not start workout");
                    }
                    await queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
                  }
                } catch (e) {
                  console.error(e);
                  toast.error("Could not start workout");
                } finally {
                  setIsStartingWorkout(false);
                  setReplaceWorkoutConfirm(null);
                }
              }}
              className={actionPrimary(isDarkMode, "border-0")}
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Life log — detail sheet for events that require value / notes (Today & past days). */}
      <Modal
        open={Boolean(viewingLifeLogSheet)}
        onOpenChange={next => {
          if (!next) closeViewingLifeLogSheet();
        }}
      >
        <ModalContent
          className={`flex max-h-[92vh] min-h-0 flex-col ${
            isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"
          }`}
          showCloseButton
        >
          <ModalHeader className="shrink-0">
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              {viewingLifeLogSheet ? (
                <>
                  <span className="mr-2">{viewingLifeLogSheet.icon || "📌"}</span>
                  Log {viewingLifeLogSheet.name}
                </>
              ) : (
                "Log event"
              )}
            </ModalTitle>
            {viewingLifeLogSheet && viewingDate ? (
              <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                {formatChipLabel(viewingDate, today)}
              </p>
            ) : null}
          </ModalHeader>
          <ModalBody className="min-h-0 shrink space-y-4 overflow-y-auto pb-2">
            {viewingLifeLogSheet?.need_value ? (
              <div>
                <label
                  className={`mb-1.5 block text-xs font-medium uppercase tracking-wide ${
                    isDarkMode ? "text-iron-400" : "text-slate-600"
                  }`}
                >
                  Value <span className="text-red-400 normal-case">*</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  value={lifeSheetValue}
                  onChange={e => setLifeSheetValue(e.target.value)}
                  placeholder="e.g. 12.5"
                  className={`w-full rounded-card border px-3 py-3 text-base outline-none focus:ring-2 ${
                    isDarkMode
                      ? "border-iron-700 bg-iron-900 text-iron-100 focus:ring-lift-primary/40"
                      : "border-slate-200 bg-white focus:ring-workout-primary/40"
                  }`}
                />
              </div>
            ) : null}
            {viewingLifeLogSheet?.need_notes ? (
              <div>
                <label
                  className={`mb-1.5 block text-xs font-medium uppercase tracking-wide ${
                    isDarkMode ? "text-iron-400" : "text-slate-600"
                  }`}
                >
                  Notes <span className="text-red-400 normal-case">*</span>
                </label>
                <textarea
                  value={lifeSheetNotes}
                  onChange={e => setLifeSheetNotes(e.target.value)}
                  placeholder="What happened? Add any details…"
                  rows={4}
                  className={`min-h-[120px] w-full resize-none rounded-card border px-3 py-3 text-base outline-none focus:ring-2 ${
                    isDarkMode
                      ? "border-iron-700 bg-iron-900 text-iron-100 placeholder:text-iron-600 focus:ring-lift-primary/40"
                      : "border-slate-200 bg-white placeholder:text-slate-400 focus:ring-workout-primary/40"
                  }`}
                  autoFocus={!viewingLifeLogSheet?.need_value}
                />
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter className="shrink-0">
            <button
              type="button"
              onClick={closeViewingLifeLogSheet}
              className={`flex-1 rounded-card py-3 text-sm font-medium ${
                isDarkMode ? "bg-iron-800 text-iron-300" : "bg-slate-100 text-slate-600"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitViewingLifeLogSheet()}
              className={`flex-1 rounded-card py-3 text-sm font-bold ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              Save log
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  );
}

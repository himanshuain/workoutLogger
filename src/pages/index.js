import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/touchFeedback";
import { actionGhost } from "@/lib/actionButtonStyles";
import HabitPills from "@/components/HabitPills";
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
  Dumbbell,
  Sparkles,
  RefreshCw,
  History,
  Settings,
} from "lucide-react";
import TodayFoodLogSection from "@/components/TodayFoodLogSection";
import {
  actionPrimary,
  actionSecondaryCompact,
  actionDestructive,
} from "@/lib/actionButtonStyles";
import {
  LazyTodayWorkoutSection,
  LazyLogDayWorkoutPanel,
  LazyHomeWorkoutHistory,
  LazyHomeRoutineSelectorModal,
  LazyHomeAddHabitModal,
} from "@/components/home/lazyHome";
import SectionManageButton from "@/components/SectionManageButton";
import SectionHeader from "@/components/SectionHeader";
import SectionSurface from "@/components/SectionSurface";
import HorizontalDateStrip from "@/components/logging/HorizontalDateStrip";
import PastDayScrollPill from "@/components/logging/PastDayScrollPill";
import DayHabitsLifeLogCard from "@/components/logging/DayHabitsLifeLogCard";
import {
  addDaysStr,
  formatChipLabel,
  formatDayHeader,
  STRIP_INITIAL_DAYS,
  STRIP_LOAD_MORE_DAYS,
  STRIP_MAX_PAST_DAYS,
} from "@/lib/dateLogUtils";
import { SkeletonTodaySections } from "@/components/SkeletonLoader";
import {
  mergeEventTypesWithLifelogSettings,
  LIFELOG_EVENT_SETTINGS_CHANGED,
} from "@/lib/lifelogEventSettings";

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
    markTodayWorkoutDone,
    undoTodayWorkoutDone,
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
  const [routineSelectorMode, setRoutineSelectorMode] = useState("start");
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
  const dateStripRef = useRef(null);
  const workoutHistoryRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setLifeLogSettingsNonce(n => n + 1);
    window.addEventListener(LIFELOG_EVENT_SETTINGS_CHANGED, bump);
    return () => window.removeEventListener(LIFELOG_EVENT_SETTINGS_CHANGED, bump);
  }, []);

  const isViewingToday = viewingDate === today;
  const dayHeader = formatDayHeader(viewingDate || today, today);

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

  /** Splits are chosen at log time, not assigned to weekdays. */
  const routineForViewingDay = null;

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

  const handleUndoTodayWorkout = async sessionId => {
    const result = await undoTodayWorkoutDone(sessionId);
    if (!result) {
      toast.error("Could not undo");
      return;
    }
    await loadActiveSession();
    setExpandedSession(null);
    toast.success(result.deleted ? "Mark done undone" : "Workout reopened");
  };

  const handleMarkDoneWithRoutine = async routine => {
    setShowRoutineSelector(false);
    setIsStartingWorkout(true);
    try {
      const session = await markTodayWorkoutDone(routine);
      if (!session) {
        toast.error("Could not mark workout done");
        return;
      }
      await loadActiveSession();
      await queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
      toast.success("Workout marked done", {
        action: {
          label: "Undo",
          onClick: () => handleUndoTodayWorkout(session.id),
        },
      });
    } catch {
      toast.error("Could not mark workout done");
    } finally {
      setIsStartingWorkout(false);
    }
  };

  const handleRoutineFromSelector = async routine => {
    if (routineSelectorMode === "markDone") {
      await handleMarkDoneWithRoutine(routine);
    } else {
      await handleStartWorkout(routine);
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

  const hasActiveSession = activeSession && activeSession.status === "active";
  const hasCompletedSession =
    todaySession && todaySession.status === "completed";

  const historySessions = useMemo(() => {
    if (isViewingToday) {
      return recentSessions;
    }
    const topPanelShowsDayWorkout = workoutSessionsForViewing.length > 0;
    return recentSessions.filter(
      session => !(session.date === viewingDate && topPanelShowsDayWorkout),
    );
  }, [recentSessions, viewingDate, isViewingToday, workoutSessionsForViewing]);

  const showHistoryScroll = historySessions.length > 0;
  const scrollToWorkoutHistory = useCallback(() => {
    hapticLight();
    workoutHistoryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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

  return (
    <Layout>
      <div className="page-enter px-4 py-4">
        {/* Date strip + header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-screen-title leading-tight truncate">{dayHeader.title}</h2>
            {dayHeader.subtitle ? (
              <p className={`text-metadata mt-0.5 truncate ${isDarkMode ? "text-iron-400" : ""}`}>
                {dayHeader.subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {showHistoryScroll ? (
              <button
                type="button"
                onClick={scrollToWorkoutHistory}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-pill px-3",
                  actionSecondaryCompact(isDarkMode),
                )}
              >
                <History className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold whitespace-nowrap">Workout history</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                hapticLight();
                handleRefresh();
              }}
              disabled={isRefreshing}
              aria-label="Refresh"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-pill disabled:opacity-50",
                actionGhost(isDarkMode),
              )}
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={() => {
                hapticLight();
                router.push("/settings");
              }}
              aria-label="Settings"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-pill",
                actionGhost(isDarkMode),
              )}
            >
              <Settings className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {isBootstrapping ? (
          <SkeletonTodaySections isDarkMode={isDarkMode} />
        ) : (
          <>
        {today && glanceDays.length > 0 ? (
          <HorizontalDateStrip
            ref={dateStripRef}
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

        <PastDayScrollPill
          stripRef={dateStripRef}
          enabled={!isViewingToday && Boolean(viewingDate)}
          selectedDate={viewingDate}
          todayStr={today}
          isDarkMode={isDarkMode}
        />

        {/* Today's Workout — new board, logger, and routine CTAs */}
        {isViewingToday ? (
        <section className="section-spacing">
          <LazyTodayWorkoutSection
            completedTodaySession={
              hasCompletedSession && !hasActiveSession ? todaySession : null
            }
            onChooseRoutine={() => {
              setRoutineSelectorMode("start");
              setShowRoutineSelector(true);
            }}
            onMarkDonePickRoutine={() => {
              setRoutineSelectorMode("markDone");
              setShowRoutineSelector(true);
            }}
          />
        </section>
        ) : (
        <section className="section-spacing">
          <LazyLogDayWorkoutPanel
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

        <LazyHomeWorkoutHistory
          ref={workoutHistoryRef}
          isDarkMode={isDarkMode}
          historySessions={historySessions}
          todaySession={todaySession}
          isViewingToday={isViewingToday}
          today={today}
          expandedSession={expandedSession}
          setExpandedSession={setExpandedSession}
          editingSet={editingSet}
          setEditingSet={setEditingSet}
          setDeleteConfirm={setDeleteConfirm}
          updateSetLogData={updateSetLogData}
          handleUndoTodayWorkout={handleUndoTodayWorkout}
        />
      </div>

      {showRoutineSelector ? (
        <LazyHomeRoutineSelectorModal
          open={showRoutineSelector}
          onOpenChange={setShowRoutineSelector}
          isDarkMode={isDarkMode}
          routineSelectorMode={routineSelectorMode}
          isViewingToday={isViewingToday}
          viewingDate={viewingDate}
          today={today}
          routines={routines}
          isStartingWorkout={isStartingWorkout}
          onSelectRoutine={routine =>
            isViewingToday
              ? handleRoutineFromSelector(routine)
              : handleStartWithPickedRoutineForViewingDate(routine)
          }
        />
      ) : null}

      {showAddHabitDrawer ? (
        <LazyHomeAddHabitModal
          open={showAddHabitDrawer}
          onOpenChange={setShowAddHabitDrawer}
          isDarkMode={isDarkMode}
          newHabit={newHabit}
          setNewHabit={setNewHabit}
          onSave={handleSaveHabit}
        />
      ) : null}

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
                  if (ok) {
                    toast.success("Workout deleted");
                    if (expandedSession === deleteConfirm.id) setExpandedSession(null);
                  }
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

import { useState, useMemo, useCallback, useRef, useLayoutEffect, useEffect } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import { FadeIn } from "@/components/ui/fade-in";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import FoodQuantityModal from "@/components/FoodQuantityModal";
import { normalizeFoodQuantity } from "@/lib/foodQuantity";
import { toast } from "sonner";
import {
  Utensils,
  Check,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Dumbbell,
  Play,
} from "lucide-react";

// Helper functions from PastDayLogModal
function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysStr(isoDate, deltaDays) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return localDateStr(dt);
}

function formatChipLabel(iso, todayRef) {
  const today = todayRef || localDateStr();
  const yest = addDaysStr(today, -1);
  const dby = addDaysStr(today, -2);
  if (iso === today) return "Today";
  if (iso === yest) return "Yesterday";
  if (iso === dby) return "Day before yesterday";
  const dt = new Date(iso + "T12:00:00");
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatShortDate(iso) {
  const dt = new Date(iso + "T12:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STRIP_WINDOW_DAYS = 35;

export default function LogPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const {
    user,
    foodItems,
    todayFoodEntries,
    today,
    toggleFoodEntry,
    updateFoodEntryQuantity,
    getFoodEntries,
    eventTypes = [],
    logEvent,
    deleteEventLog,
    trackables,
    toggleTrackingEntryForDate,
    getTrackingEntries,
    todayEntries,
    getRoutineForDay,
    getWorkoutSessionsForDate,
    startWorkoutSessionForDate,
    deleteWorkoutSession,
    routines,
  } = useWorkout();

  // Get initial date from URL or default to today
  const todayStr = localDateStr();
  const yesterdayStr = addDaysStr(todayStr, -1);
  const initialDate = router.query.date || todayStr;
  const [pastLogDate, setPastLogDate] = useState(initialDate);
  const [stripOffset, setStripOffset] = useState(0);
  
  // Food quantity modal state
  const [qtyItem, setQtyItem] = useState(null);
  const [tempQty, setTempQty] = useState(1);
  const [qtyTargetDate, setQtyTargetDate] = useState(null);
  const [showRoutinePicker, setShowRoutinePicker] = useState(false);
  const [startingRoutine, setStartingRoutine] = useState(false);

  const stripScrollRef = useRef(null);
  const stripAnchorRef = useRef(null);

  // Keep selected date in sync with ?date= when using browser back/forward
  useEffect(() => {
    if (!router.isReady) return;
    const d = router.query.date;
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= todayStr) {
      setPastLogDate(d);
    } else if (!router.query.date) {
      setPastLogDate(todayStr);
    }
  }, [router.isReady, router.query.date, todayStr]);

  // Update URL when date changes
  const updateUrl = useCallback((date) => {
    const query = {};
    if (date !== todayStr) query.date = date;
    
    router.replace(
      { pathname: "/log", query },
      undefined,
      { shallow: true }
    );
  }, [router, todayStr]);

  // Generate date strip
  const glanceDays = useMemo(() => {
    const result = [];
    const startOffset = stripOffset;
    for (let i = 0; i < STRIP_WINDOW_DAYS; i++) {
      result.push(addDaysStr(todayStr, -(startOffset + i)));
    }
    return result.reverse();
  }, [todayStr, stripOffset]);

  const stripScrollAnchorDate = todayStr; // Always anchor to today
  const stripRangeLabel = `${formatShortDate(glanceDays[0])} – ${formatShortDate(glanceDays[glanceDays.length - 1])}`;

  // Food count query for strip indicators
  const { data: foodCountByDate = {} } = useQuery({
    queryKey: ["pastModalFoodStrip", user?.id],
    queryFn: async () => {
      if (!user) return {};
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

  // Food entries for selected date
  const { data: pastFoodEntries = {} } = useQuery({
    queryKey: ["foodEntriesForDate", user?.id, pastLogDate],
    queryFn: async () => {
      const rows = await getFoodEntries(pastLogDate, pastLogDate);
      const map = {};
      for (const e of rows) map[e.food_item_id] = e;
      return map;
    },
    enabled: Boolean(user && pastLogDate),
  });

  // Tracking entries for selected date
  const { data: trackingForDayRaw = [] } = useQuery({
    queryKey: ["trackingEntriesForDate", user?.id, pastLogDate],
    queryFn: () => getTrackingEntries(pastLogDate, pastLogDate),
    enabled: Boolean(user && pastLogDate),
  });

  const trackingForDay = useMemo(() => {
    const map = {};
    for (const e of trackingForDayRaw) {
      map[e.trackable_id] = e;
    }
    if (pastLogDate === todayStr) {
      Object.entries(todayEntries || {}).forEach(([id, entry]) => {
        map[id] = entry;
      });
    }
    return map;
  }, [trackingForDayRaw, pastLogDate, todayStr, todayEntries]);

  // Auto-scroll so "today" sits toward the right edge of the strip (pick-a-day UX)
  useLayoutEffect(() => {
    const container = stripScrollRef.current;
    const anchor = stripAnchorRef.current;
    if (!container || !anchor) return;
    const anchorRight = anchor.offsetLeft + anchor.offsetWidth;
    const scrollLeft = anchorRight - container.clientWidth + 16;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    container.scrollTo({ left: Math.min(maxScroll, Math.max(0, scrollLeft)), behavior: "smooth" });
  }, [stripScrollAnchorDate, glanceDays, stripOffset]);

  const pickDate = useCallback((iso) => {
    if (iso > todayStr) return;
    setPastLogDate(iso);
    updateUrl(iso);
  }, [todayStr, updateUrl]);

  // Food handling
  const sortedItems = useMemo(() => {
    return [...(foodItems || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }, [foodItems]);

  const habitList = useMemo(() => {
    const dow = pastLogDate ? new Date(pastLogDate + "T12:00:00").getDay() : null;
    return [...(trackables || [])]
      .filter(t => {
        if (t.name === "Body Weight") return false;
        if (dow === null) return true;
        if (t.active_days?.length && !t.active_days.includes(dow)) return false;
        return true;
      })
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [trackables, pastLogDate]);

  const sortedLifeEvents = useMemo(() => {
    return [...eventTypes].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }, [eventTypes]);

  // Workout data for selected date
  const { data: workoutSessions = [] } = useQuery({
    queryKey: ["workoutSessionsForDate", user?.id, pastLogDate],
    queryFn: () => getWorkoutSessionsForDate(pastLogDate),
    enabled: Boolean(user && pastLogDate),
  });

  const routineForSelectedDay = useMemo(() => {
    if (!pastLogDate) return null;
    const dayOfWeek = new Date(pastLogDate + "T12:00:00").getDay();
    return getRoutineForDay(dayOfWeek);
  }, [pastLogDate, getRoutineForDay]);

  const navigateToWorkoutSession = useCallback(
    session => {
      if (!session?.id) return;
      const routine =
        session.routine_id != null
          ? routines.find(x => x.id === session.routine_id) ?? null
          : null;
      if (session.status === "completed") {
        router.push(`/workout/${session.id}/summary`);
        return;
      }
      const first = routine?.routine_exercises?.[0];
      if (first?.exercise_name) {
        const cat = encodeURIComponent(first.category || "other");
        router.push(
          `/workout/${session.id}/exercise/${encodeURIComponent(first.exercise_name)}?category=${cat}`
        );
        return;
      }
      router.push(`/exercises?sessionId=${encodeURIComponent(session.id)}`);
    },
    [router, routines]
  );

  const openQuantity = useCallback((item, quantity, targetDate = null) => {
    setQtyTargetDate(targetDate);
    setQtyItem(item);
    setTempQty(quantity);
  }, []);

  const closeQuantityModal = useCallback(() => {
    setQtyItem(null);
    setQtyTargetDate(null);
  }, []);

  const handleTogglePast = async item => {
    if (!pastLogDate) return;
    const consumed = !!pastFoodEntries[item.id];
    if (consumed) {
      await toggleFoodEntry(item.id, { date: pastLogDate });
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
      queryClient.invalidateQueries({ queryKey: ["foodEntriesForDate", user?.id, pastLogDate] });
      queryClient.invalidateQueries({ queryKey: ["pastModalFoodStrip", user?.id] });
    } else {
      const def = item.default_quantity ?? 1;
      const initial = item.quantity_whole_numbers
        ? Math.max(1, Math.round(Number(def)))
        : Number(def) || 1;
      openQuantity(item, initial, pastLogDate);
    }
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const handleChangeAmountPast = item => {
    if (!pastLogDate) return;
    const q = pastFoodEntries[item.id]?.quantity ?? item.default_quantity ?? 1;
    openQuantity(item, q, pastLogDate);
  };

  const handleQuantityConfirm = async () => {
    if (!qtyItem) return;
    const q = normalizeFoodQuantity(tempQty, qtyItem);
    await updateFoodEntryQuantity(qtyItem.id, q, qtyTargetDate ?? todayStr);
    queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    if (qtyTargetDate) {
      queryClient.invalidateQueries({ queryKey: ["foodEntriesForDate", user?.id, qtyTargetDate] });
    }
    queryClient.invalidateQueries({ queryKey: ["pastModalFoodStrip", user?.id] });
    setQtyItem(null);
    setQtyTargetDate(null);
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const handleHabitToggle = async t => {
    if (!pastLogDate) return;
    if (t.has_value) {
      toast.message("Value habits", {
        description: "Use the habits section below to enter amounts for past days.",
      });
      return;
    }
    const existing = trackingForDay[t.id];
    const completed = !!existing?.is_completed;
    await toggleTrackingEntryForDate(t.id, pastLogDate, !completed, existing?.value ?? null);
    queryClient.invalidateQueries({ queryKey: ["trackingEntriesForDate", user?.id, pastLogDate] });
    queryClient.invalidateQueries({ queryKey: ["trackingEntries"] });
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const hasLifeLogThisDay = useCallback(
    (et, dateStr) => (et.event_logs || []).some(l => l.date === dateStr),
    [],
  );

  const getLifeLogForDay = useCallback((et, dateStr) => {
    return (et.event_logs || []).find(l => l.date === dateStr) || null;
  }, []);

  const handleQuickLifeLog = async et => {
    if (!pastLogDate || !logEvent) return;
    const existing = getLifeLogForDay(et, pastLogDate);
    if (existing) {
      await deleteEventLog(existing.id);
      toast.success(`Removed ${et.name}`);
    } else {
      const result = await logEvent(et.id, { date: pastLogDate });
      if (result) {
        toast.success(`Logged ${et.name}`);
      } else toast.error("Could not log");
    }
  };

  const handleStartWorkout = async () => {
    if (!pastLogDate) return;
    try {
      const session = await startWorkoutSessionForDate(pastLogDate, routineForSelectedDay);
      if (!session) {
        toast.error("Could not start workout");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["workoutSessionsForDate", user?.id, pastLogDate] });
      navigateToWorkoutSession(session);
    } catch (error) {
      console.error("Error starting workout:", error);
      toast.error("Could not start workout");
    }
  };

  const handleStartWithPickedRoutine = async routine => {
    if (!pastLogDate || !routine) return;
    setStartingRoutine(true);
    setShowRoutinePicker(false);
    try {
      const activeForDay = workoutSessions.find(s => s.status === "active");
      if (activeForDay) {
        const ok =
          typeof window !== "undefined" &&
          window.confirm(
            "Replace the in-progress workout for this day with the selected routine? Unsaved progress on the current session will be removed."
          );
        if (!ok) {
          setStartingRoutine(false);
          return;
        }
        await deleteWorkoutSession(activeForDay.id);
        await queryClient.invalidateQueries({
          queryKey: ["workoutSessionsForDate", user?.id, pastLogDate],
        });
      }
      const session = await startWorkoutSessionForDate(pastLogDate, routine);
      if (!session) {
        toast.error("Could not start workout");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["workoutSessionsForDate", user?.id, pastLogDate],
      });
      navigateToWorkoutSession(session);
      toast.success("Workout started");
    } catch (e) {
      console.error(e);
      toast.error("Could not start workout");
    } finally {
      setStartingRoutine(false);
    }
  };

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
        className={`flex flex-col items-stretch rounded-2xl border text-left transition-all active:scale-[0.98] ${
          compact ? "p-2.5" : "p-3"
        } ${
          isDarkMode
            ? consumed
              ? "border-iron-700 bg-iron-900/90"
              : "border-iron-800 bg-iron-900/60"
            : consumed
              ? "border-slate-200 bg-white shadow-sm"
              : "border-slate-200/80 bg-slate-50/80"
        }`}
      >
        <div className="flex items-start gap-2">
          <span
            className={`flex shrink-0 items-center justify-center rounded-xl text-xl ${
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
              ) : (
                "Tap to log"
              )}
            </p>
          </div>
        </div>
      </button>
    );
  };

  const isAdjustingQuantity =
    qtyItem &&
    (qtyTargetDate ? !!pastFoodEntries[qtyItem.id] : !!todayFoodEntries[qtyItem.id]);

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <Calendar className="w-16 h-16 mb-4 text-iron-500" />
          <h1 className="text-xl font-bold mb-2 text-iron-100">
            Sign in to log your activities
          </h1>
          <button
            onClick={() => router.push("/auth")}
            className="px-6 py-3 rounded-xl font-bold bg-lift-primary text-iron-950"
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
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push("/")}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isDarkMode
                  ? "bg-iron-800 text-iron-300 hover:bg-iron-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              aria-label="Back to Today"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-screen-title">Log Activities</h1>
              <p className="text-body">Track your activities for any date</p>
            </div>
          </div>

          {/* Selected Date Header */}
          {pastLogDate && (
            <div className={cn(
              "flex items-center gap-3 p-4 rounded-2xl mb-6",
              isDarkMode 
                ? "bg-iron-900/50 border border-iron-800" 
                : "bg-white border border-slate-200 shadow-sm"
            )}>
              <span className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                isDarkMode ? "bg-amber-500/15 text-amber-400" : "bg-amber-100 text-amber-700"
              )}>
                <Calendar className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-section-header">Selected day</p>
                <p className="text-card-title">{formatChipLabel(pastLogDate, todayStr)}</p>
              </div>
            </div>
          )}

          {/* Quick Picks */}
          <div className="mb-6">
            <p className="text-section-header mb-3">Quick picks</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => pickDate(yesterdayStr)}
                className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] ${
                  pastLogDate === yesterdayStr
                    ? isDarkMode
                      ? "border-amber-400/50 bg-amber-500/10"
                      : "border-amber-400 bg-amber-50"
                    : isDarkMode
                      ? "border-iron-700/50 bg-iron-900/30 hover:border-iron-600"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <p className={`text-xs font-semibold ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
                  Yesterday
                </p>
                <p className={`text-sm font-bold mt-1 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                  {formatShortDate(yesterdayStr)}
                </p>
              </button>
              
              <button
                type="button"
                onClick={() => pickDate(todayStr)}
                className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] ${
                  pastLogDate === todayStr
                    ? isDarkMode
                      ? "border-amber-400/50 bg-amber-500/10"
                      : "border-amber-400 bg-amber-50"
                    : isDarkMode
                      ? "border-iron-700/50 bg-iron-900/30 hover:border-iron-600"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <p className={`text-xs font-semibold ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
                  Today
                </p>
                <p className={`text-sm font-bold mt-1 ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                  {formatShortDate(todayStr)}
                </p>
              </button>
            </div>
          </div>

          {/* Date Strip */}
          <div className={`rounded-2xl border p-4 mb-6 ${
            isDarkMode
              ? "border-iron-700/80 bg-gradient-to-b from-iron-900/90 to-iron-950 shadow-inner shadow-black/20"
              : "border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 shadow-sm"
          }`}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                isDarkMode ? "bg-amber-500/12 text-amber-400" : "bg-amber-100 text-amber-700"
              }`}>
                <Utensils className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-card-subtitle">Pick a day</p>
                <p className="text-metadata">{stripRangeLabel}</p>
              </div>
            </div>
            
            <div className={`mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] ${
              isDarkMode ? "text-iron-500" : "text-slate-500"
            }`}>
              <span className="inline-flex items-center gap-1.5">
                <span className={`inline-block h-2 w-2 rounded-full ${
                  isDarkMode ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.45)]" : "bg-amber-500"
                }`} />
                Food logged
              </span>
              <span className="inline-flex items-center gap-1.5 opacity-70">
                <span className={`inline-block h-2 w-2 rounded-full ${isDarkMode ? "bg-iron-600" : "bg-slate-300"}`} />
                None yet
              </span>
              <span className="opacity-80">Swipe row · arrows = ±1 week</span>
            </div>
            
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => setStripOffset(s => Math.min(s + 7, 370))}
                className={`flex h-[4.5rem] w-10 shrink-0 items-center justify-center self-center rounded-2xl border transition-all active:scale-95 ${
                  isDarkMode
                    ? "border-iron-700/80 bg-iron-900/50 text-iron-400 hover:border-iron-600 hover:bg-iron-800/50 hover:text-iron-200"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                }`}
                aria-label="Older days"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2} />
              </button>
              
              <div
                ref={stripScrollRef}
                className={`flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 scrollbar-hide ${
                  isDarkMode ? "[mask-image:linear-gradient(90deg,transparent,black_8px,black_calc(100%-8px),transparent)]" : ""
                }`}
              >
                {glanceDays.map((d, i) => {
                  const c = foodCountByDate[d] || 0;
                  const active = pastLogDate === d;
                  const isToday = d === todayStr;
                  const prevDay = i > 0 ? glanceDays[i - 1] : null;
                  const showMonthLabel = i === 0 || (prevDay && d.slice(0, 7) !== prevDay.slice(0, 7));
                  
                  return (
                    <div
                      key={d}
                      ref={d === todayStr ? stripAnchorRef : undefined}
                      className="flex flex-col items-center shrink-0"
                    >
                      {showMonthLabel ? (
                        <span className={`mb-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${
                          isDarkMode ? "bg-amber-500/10 text-amber-500/90" : "bg-amber-100 text-amber-800"
                        }`}>
                          {new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                        </span>
                      ) : (
                        <span className="mb-1 h-[1.125rem]" />
                      )}
                      
                      {isToday ? (
                        <span className={`mb-1 text-[8px] font-bold uppercase tracking-[0.12em] ${
                          isDarkMode ? "text-red-400" : "text-red-600"
                        }`}>
                          Today
                        </span>
                      ) : (
                        <span className="mb-1 h-4" aria-hidden />
                      )}
                      
                      <button
                        type="button"
                        onClick={() => pickDate(d)}
                        className={`flex min-w-[3.25rem] flex-col items-center rounded-2xl border px-2.5 pt-2.5 pb-2 transition-all duration-200 active:scale-[0.96] ${
                          active
                            ? isDarkMode
                              ? "border-amber-400/50 bg-gradient-to-b from-amber-500/20 via-amber-500/10 to-transparent text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_8px_24px_-4px_rgba(0,0,0,0.45)]"
                              : "border-amber-400 bg-gradient-to-b from-amber-50 to-white text-amber-950 shadow-md shadow-amber-200/40"
                            : isDarkMode
                              ? "border-iron-700/70 bg-iron-900/40 text-iron-400 hover:border-iron-600 hover:bg-iron-800/40 hover:text-iron-200"
                              : "border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <span className={`text-[10px] font-semibold uppercase ${
                          active
                            ? isDarkMode ? "text-amber-200/70" : "text-amber-700/80"
                            : isToday
                              ? isDarkMode ? "text-red-300/80" : "text-red-600/80"
                              : isDarkMode ? "text-iron-500" : "text-slate-400"
                        }`}>
                          {new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}
                        </span>
                        
                        <span className={`mt-0.5 text-base font-bold tabular-nums leading-none ${
                          active
                            ? isDarkMode ? "text-amber-50" : "text-amber-950"
                            : isToday
                              ? isDarkMode ? "text-red-200" : "text-red-700"
                              : isDarkMode ? "text-iron-300" : "text-slate-700"
                        }`}>
                          {new Date(d + "T12:00:00").getDate()}
                        </span>
                        
                        {c > 0 && (
                          <span className={`mt-1 h-1.5 w-1.5 rounded-full ${
                            isDarkMode ? "bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.6)]" : "bg-amber-500"
                          }`} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
              
              <button
                type="button"
                onClick={() => setStripOffset(s => Math.max(s - 7, 0))}
                className={`flex h-[4.5rem] w-10 shrink-0 items-center justify-center self-center rounded-2xl border transition-all active:scale-95 ${
                  isDarkMode
                    ? "border-iron-700/80 bg-iron-900/50 text-iron-400 hover:border-iron-600 hover:bg-iron-800/50 hover:text-iron-200"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                }`}
                aria-label="Newer days"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Workout Section */}
          {pastLogDate && (
            <div className={`rounded-2xl border p-3 mb-6 ${
              isDarkMode ? "border-iron-800 bg-iron-950/40" : "border-slate-200 bg-slate-50/90"
            }`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Dumbbell className={`h-4 w-4 shrink-0 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`} />
                  <p className="text-section-header truncate">
                    Workout · {formatChipLabel(pastLogDate, todayStr)}
                  </p>
                </div>
                {routines.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowRoutinePicker(true)}
                    disabled={startingRoutine}
                    className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg ${
                      isDarkMode
                        ? "bg-iron-800 text-lift-primary hover:bg-iron-700"
                        : "bg-slate-200 text-workout-primary hover:bg-slate-300"
                    } disabled:opacity-50`}
                  >
                    Pick routine
                  </button>
                ) : null}
              </div>
              
              {workoutSessions.length > 0 ? (
                <div className="space-y-2">
                  {workoutSessions.map(session => {
                    const logs = session?.set_logs || [];
                    const completedLogs = logs.filter(l => l.is_completed);
                    const exerciseNames = new Set(completedLogs.map(l => l.exercise_name));
                    const meta =
                      session.status === "completed"
                        ? `Completed · ${exerciseNames.size} exercise${exerciseNames.size !== 1 ? "s" : ""} · ${completedLogs.length} set${completedLogs.length !== 1 ? "s" : ""}`
                        : exerciseNames.size > 0 || completedLogs.length > 0
                          ? `In progress · ${exerciseNames.size} exercise${exerciseNames.size !== 1 ? "s" : ""} · ${completedLogs.length} set${completedLogs.length !== 1 ? "s" : ""}`
                          : "Started — tap to log sets";
                    return (
                    <div
                      key={session.id}
                      className={`flex items-center gap-3 rounded-xl p-3 ${
                        isDarkMode ? "bg-iron-900/60" : "bg-white ring-1 ring-slate-100"
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isDarkMode ? "bg-lift-primary/20 text-lift-primary" : "bg-workout-primary/20 text-workout-primary"
                      }`}>
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-card-subtitle">
                          {session.routine_name || "Custom workout"}
                        </p>
                        <p className="text-metadata">
                          {meta}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateToWorkoutSession(session)}
                        className={`flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                          session.status === "completed"
                            ? isDarkMode
                              ? "border border-iron-600 bg-iron-800/80 text-iron-200 hover:bg-iron-800"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            : isDarkMode
                              ? "bg-lift-primary/20 text-lift-primary hover:bg-lift-primary/30"
                              : "bg-workout-primary/20 text-workout-primary hover:bg-workout-primary/30"
                        }`}
                      >
                        {session.status === "completed" ? "Review" : "Continue"}
                      </button>
                    </div>
                  );})}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-body mb-3">
                    No workout logged for this day
                  </p>
                  {routineForSelectedDay ? (
                    <div className="mb-3">
                      <p className="text-metadata mb-2">
                        Planned: {routineForSelectedDay.name}
                      </p>
                      <p className="text-metadata">
                        {routineForSelectedDay.routine_exercises?.length || 0} exercises
                      </p>
                    </div>
                  ) : (
                    <p className="text-metadata mb-3">
                      No routine planned for this day
                    </p>
                  )}
                  <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={handleStartWorkout}
                      disabled={startingRoutine}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                        isDarkMode
                          ? "bg-lift-primary/20 text-lift-primary hover:bg-lift-primary/30"
                          : "bg-workout-primary/20 text-workout-primary hover:bg-workout-primary/30"
                      } disabled:opacity-50`}
                    >
                      <Play className="h-4 w-4" />
                      {routineForSelectedDay ? "Start with planned day" : "Start workout"}
                    </button>
                    {routines.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowRoutinePicker(true)}
                        disabled={startingRoutine}
                        className={`py-2.5 rounded-xl text-sm font-semibold border ${
                          isDarkMode
                            ? "border-iron-600 text-iron-200 hover:bg-iron-800/80"
                            : "border-slate-300 text-slate-800 hover:bg-slate-50"
                        } disabled:opacity-50`}
                      >
                        Choose another routine
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Food Section */}
          {pastLogDate && sortedItems.length > 0 && (
            <div className={`rounded-2xl border p-3 mb-6 ${
              isDarkMode ? "border-iron-800 bg-iron-950/40" : "border-slate-200 bg-slate-50/90"
            }`}>
              <p className="text-section-header mb-2">
                Food · {formatChipLabel(pastLogDate, todayStr)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {sortedItems.map(item => {
                  const consumed = !!pastFoodEntries[item.id];
                  const quantity = pastFoodEntries[item.id]?.quantity ?? item.default_quantity ?? 1;
                  return renderFoodBox(
                    item,
                    consumed,
                    quantity,
                    handleTogglePast,
                    handleChangeAmountPast,
                    true,
                  );
                })}
              </div>
            </div>
          )}

          {/* Habits & Life Log Section */}
          <div className={`rounded-2xl border p-3 ${
            isDarkMode ? "border-iron-800" : "border-slate-200"
          }`}>
            <div className="mb-2 flex items-center gap-2">
              <ListChecks className={`h-4 w-4 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
              <p className="text-card-subtitle">Habits & life log</p>
            </div>
            
            {!pastLogDate ? (
              <p className="text-body">
                Choose a day above to log habits or life events for that date.
              </p>
            ) : (
              <>
                <p className="text-section-header mb-2">Habits</p>
                {habitList.length === 0 ? (
                  <p className="text-body mb-4">
                    No habits for this weekday, or add habits from the Today section.
                  </p>
                ) : (
                  <ul className="mb-4 space-y-2">
                    {habitList.map(t => {
                      const entry = trackingForDay[t.id];
                      const done = !!entry?.is_completed;
                      return (
                        <li
                          key={t.id}
                          className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
                            isDarkMode ? "bg-iron-900/60" : "bg-white ring-1 ring-slate-100"
                          }`}
                        >
                          <button
                            type="button"
                            aria-pressed={done}
                            aria-label={
                              done ? `Mark ${t.name} not done for this day` : `Mark ${t.name} done for this day`
                            }
                            onClick={() => handleHabitToggle(t)}
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition-all ${
                              done
                                ? "shadow-md"
                                : isDarkMode
                                  ? "bg-iron-800 ring-1 ring-iron-700"
                                  : "bg-slate-100 ring-1 ring-slate-200"
                            }`}
                            style={done ? { backgroundColor: t.color } : undefined}
                          >
                            {done ? <Check className="h-5 w-5 text-white" strokeWidth={2.5} /> : t.icon}
                          </button>
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-card-subtitle truncate">{t.name}</p>
                            <p className="text-metadata">
                              {done ? "Done this day" : t.has_value ? "Needs amount — use Log → Habits" : "Tap to toggle"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <p className="text-section-header mb-2">Life log</p>
                {sortedLifeEvents.length === 0 ? (
                  <p className="text-body">
                    No event types yet. Add them on the Log tab.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {sortedLifeEvents.map(et => {
                      const done = hasLifeLogThisDay(et, pastLogDate);
                      return (
                        <li
                          key={et.id}
                          className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
                            isDarkMode ? "bg-iron-900/60" : "bg-white ring-1 ring-slate-100"
                          }`}
                        >
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
                            style={{ backgroundColor: `${et.color}30` }}
                          >
                            {et.icon || "📌"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-card-subtitle truncate">{et.name}</p>
                            {done ? (
                              <p className={`text-xs ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                                Logged · tap Undo to remove
                              </p>
                            ) : et.need_value && et.need_notes ? (
                              <p className="text-metadata">Value & notes required</p>
                            ) : et.need_value ? (
                              <p className="text-metadata">Value required</p>
                            ) : et.need_notes ? (
                              <p className="text-metadata">Notes required</p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleQuickLifeLog(et)}
                            className={`flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                              done
                                ? isDarkMode
                                  ? "border border-iron-600 bg-iron-800/80 text-iron-200 hover:bg-iron-800"
                                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                : isDarkMode
                                  ? "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
                                  : "bg-violet-100 text-violet-800 hover:bg-violet-200"
                            }`}
                          >
                            {done ? (
                              <>Undo</>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                Log
                              </>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </FadeIn>

      <Modal open={showRoutinePicker} onOpenChange={setShowRoutinePicker}>
        <ModalContent
          className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}
        >
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Choose routine for {formatChipLabel(pastLogDate || todayStr, todayStr)}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-2 max-h-[min(60vh,24rem)] overflow-y-auto">
            {routines.map(routine => (
              <button
                key={routine.id}
                type="button"
                disabled={startingRoutine}
                onClick={() => handleStartWithPickedRoutine(routine)}
                className={`w-full p-4 rounded-2xl text-left transition-all disabled:opacity-50 ${
                  isDarkMode ? "bg-iron-800 hover:bg-iron-700" : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${routine.color}20` }}
                  >
                    <Dumbbell className="w-6 h-6" style={{ color: routine.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                      {routine.name}
                    </p>
                    <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                      {routine.routine_exercises?.length || 0} exercises
                    </p>
                  </div>
                  <ChevronRight className={`w-5 h-5 shrink-0 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
                </div>
              </button>
            ))}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Food Quantity Modal */}
      <FoodQuantityModal
        open={!!qtyItem}
        onOpenChange={closeQuantityModal}
        item={qtyItem}
        quantity={tempQty}
        onQuantityChange={setTempQty}
        onConfirm={handleQuantityConfirm}
        isAdjusting={isAdjustingQuantity}
        isDarkMode={isDarkMode}
      />
    </Layout>
  );
}
import { useMemo, useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Utensils,
  Check,
  Sunset,
  MoonStar,
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import FoodQuantityModal from "@/components/FoodQuantityModal";
import { normalizeFoodQuantity } from "@/lib/foodQuantity";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from "@/components/ui/modal";
import { useWorkout } from "@/context/WorkoutContext";

const EVENT_SETTINGS_KEY = "logbook_event_settings";

function readEventSettings() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(EVENT_SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

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

export default function PastDayLogModal({ open, onOpenChange, isDarkMode }) {
  const queryClient = useQueryClient();
  const hiddenDateRef = useRef(null);
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
    trackables,
    toggleTrackingEntryForDate,
    getTrackingEntries,
    todayEntries,
  } = useWorkout();

  const [qtyItem, setQtyItem] = useState(null);
  const [tempQty, setTempQty] = useState(1);
  const [qtyTargetDate, setQtyTargetDate] = useState(null);
  const [pendingReturnToPastDialog, setPendingReturnToPastDialog] = useState(false);

  const [pastLogDate, setPastLogDate] = useState(null);
  const [stripOffset, setStripOffset] = useState(0);
  const [lifeValuePrompt, setLifeValuePrompt] = useState(null);
  const [lifeValueInput, setLifeValueInput] = useState("");

  const todayStr = today || localDateStr();
  const yesterdayStr = addDaysStr(todayStr, -1);
  const dayBeforeYesterdayStr = addDaysStr(todayStr, -2);

  const stripEnd = addDaysStr(todayStr, -stripOffset);
  const stripStart = addDaysStr(stripEnd, -(STRIP_WINDOW_DAYS - 1));

  const stripRangeLabel = useMemo(() => {
    const a = new Date(stripStart + "T12:00:00");
    const b = new Date(stripEnd + "T12:00:00");
    const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    if (sameMonth) {
      return `${a.toLocaleDateString("en-US", { month: "short" })} ${a.getDate()}–${b.getDate()}, ${b.getFullYear()}`;
    }
    return `${a.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${b.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }, [stripStart, stripEnd]);

  const mergedEventTypes = useMemo(() => {
    const settings = readEventSettings();
    return [...eventTypes].map(et => ({
      ...et,
      need_value: Boolean(settings[et.id]?.need_value),
    }));
  }, [eventTypes]);

  const sortedLifeEvents = useMemo(
    () => [...mergedEventTypes].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [mergedEventTypes],
  );

  const { data: foodGlanceEntries = [] } = useQuery({
    queryKey: ["pastModalFoodStrip", user?.id, stripStart, stripEnd],
    queryFn: () => getFoodEntries(stripStart, stripEnd),
    enabled: Boolean(open && user),
  });

  const foodCountByDate = useMemo(() => {
    const m = {};
    for (const e of foodGlanceEntries) {
      m[e.date] = (m[e.date] || 0) + 1;
    }
    return m;
  }, [foodGlanceEntries]);

  const glanceDays = useMemo(() => {
    const out = [];
    let cur = stripStart;
    for (let i = 0; i < STRIP_WINDOW_DAYS; i++) {
      out.push(cur);
      cur = addDaysStr(cur, 1);
    }
    return out;
  }, [stripStart]);

  const sortedItems = useMemo(
    () => [...foodItems].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [foodItems],
  );

  const { data: pastFoodEntries = {} } = useQuery({
    queryKey: ["foodEntriesForDate", user?.id, pastLogDate],
    queryFn: async () => {
      const rows = await getFoodEntries(pastLogDate, pastLogDate);
      const map = {};
      for (const e of rows) map[e.food_item_id] = e;
      return map;
    },
    enabled: Boolean(user && pastLogDate && (open || qtyTargetDate === pastLogDate)),
  });

  const { data: trackingForDayRaw = [] } = useQuery({
    queryKey: ["trackingEntriesForDate", user?.id, pastLogDate],
    queryFn: () => getTrackingEntries(pastLogDate, pastLogDate),
    enabled: Boolean(user && pastLogDate && open),
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

  const openQuantity = useCallback((item, quantity, targetDate = null) => {
    if (targetDate) {
      setPendingReturnToPastDialog(true);
      onOpenChange(false);
      setQtyTargetDate(targetDate);
    } else {
      setQtyTargetDate(null);
    }
    setQtyItem(item);
    setTempQty(quantity);
  }, [onOpenChange]);

  const closeQuantityModal = useCallback(() => {
    setQtyItem(null);
    setQtyTargetDate(null);
    if (pendingReturnToPastDialog) {
      onOpenChange(true);
      setPendingReturnToPastDialog(false);
    }
  }, [pendingReturnToPastDialog, onOpenChange]);

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
    if (pendingReturnToPastDialog) {
      onOpenChange(true);
      setPendingReturnToPastDialog(false);
    }
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const isAdjustingQuantity =
    qtyItem &&
    (qtyTargetDate ? !!pastFoodEntries[qtyItem.id] : !!todayFoodEntries[qtyItem.id]);

  const resetOnOpen = useCallback(() => {
    setPastLogDate(null);
    setLifeValuePrompt(null);
    setLifeValueInput("");
    setStripOffset(0);
  }, []);

  const handleOpenChange = useCallback(
    next => {
      if (next) resetOnOpen();
      onOpenChange(next);
    },
    [onOpenChange, resetOnOpen],
  );

  const pickDate = useCallback(
    iso => {
      if (iso > todayStr) return;
      setPastLogDate(iso);
    },
    [todayStr],
  );

  const openNativeDatePicker = () => {
    const el = hiddenDateRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
  };

  const handleNativeDateChange = e => {
    const v = e.target.value;
    if (v && v <= todayStr) pickDate(v);
    e.target.value = "";
  };

  const hasLifeLogThisDay = useCallback(
    (et, dateStr) => (et.event_logs || []).some(l => l.date === dateStr),
    [],
  );

  const handleQuickLifeLog = async et => {
    if (!pastLogDate || !logEvent) return;
    if (et.need_value) {
      setLifeValuePrompt(et);
      setLifeValueInput("");
      return;
    }
    if (hasLifeLogThisDay(et, pastLogDate)) {
      toast.message("Already logged", { description: `${et.name} is already on this day.` });
      return;
    }
    const result = await logEvent(et.id, { date: pastLogDate });
    if (result) toast.success(`Logged ${et.name}`);
    else toast.error("Could not log");
  };

  const submitLifeValueLog = async () => {
    if (!lifeValuePrompt || !pastLogDate || !logEvent) return;
    const n = parseFloat(lifeValueInput);
    if (!Number.isFinite(n)) {
      toast.error("Enter a number");
      return;
    }
    if (hasLifeLogThisDay(lifeValuePrompt, pastLogDate)) {
      setLifeValuePrompt(null);
      return;
    }
    const result = await logEvent(lifeValuePrompt.id, { date: pastLogDate, cost: n });
    if (result) {
      toast.success(`Logged ${lifeValuePrompt.name}`);
      setLifeValuePrompt(null);
      setLifeValueInput("");
    } else toast.error("Could not log");
  };

  const handleHabitToggle = async t => {
    if (!pastLogDate) return;
    if (t.has_value) {
      toast.message("Value habits", {
        description: "Open Log → Habits to enter amounts for past days.",
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

  const renderFoodBox = (item, consumed, quantity, onToggle, onChangeAmount, compact) => {
    const displayQty = item.quantity_whole_numbers ? Math.round(Number(quantity)) : quantity;
    return (
      <button
        key={item.id}
        type="button"
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

  if (!user) return null;

  return (
    <>
      <input
        ref={hiddenDateRef}
        type="date"
        max={todayStr}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={handleNativeDateChange}
      />

      <Modal open={open} onOpenChange={handleOpenChange}>
        <ModalContent
          className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}
          showCloseButton
        >
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Log for another day
            </ModalTitle>
            <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Pick a day, then log food, habits, or life events.
            </p>
          </ModalHeader>
          <ModalBody className="space-y-5 max-h-[75vh] overflow-y-auto">
            <div>
              <p
                className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                Quick picks
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => pickDate(yesterdayStr)}
                  className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] ${
                    pastLogDate === yesterdayStr
                      ? isDarkMode
                        ? "border-amber-400/90 bg-gradient-to-br from-amber-500/20 to-transparent shadow-lg shadow-amber-500/10"
                        : "border-amber-500 bg-gradient-to-br from-amber-50 to-white shadow-md shadow-amber-200/50"
                      : isDarkMode
                        ? "border-iron-800 bg-iron-950/60 hover:border-iron-600"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div
                    className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${
                      isDarkMode ? "bg-amber-500/15 text-amber-400" : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    <Sunset className="h-5 w-5" />
                  </div>
                  <p className={`text-sm font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>Yesterday</p>
                  <p className={`mt-0.5 text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    {formatShortDate(yesterdayStr)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => pickDate(dayBeforeYesterdayStr)}
                  className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] ${
                    pastLogDate === dayBeforeYesterdayStr
                      ? isDarkMode
                        ? "border-violet-400/80 bg-gradient-to-br from-violet-500/15 to-transparent shadow-lg shadow-violet-500/10"
                        : "border-violet-400 bg-gradient-to-br from-violet-50 to-white shadow-md"
                      : isDarkMode
                        ? "border-iron-800 bg-iron-950/60 hover:border-iron-600"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div
                    className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${
                      isDarkMode ? "bg-violet-500/15 text-violet-300" : "bg-violet-100 text-violet-700"
                    }`}
                  >
                    <MoonStar className="h-5 w-5" />
                  </div>
                  <p className={`text-sm font-bold leading-tight ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                    Day before
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>yesterday</p>
                  <p className={`mt-1 text-[11px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                    {formatShortDate(dayBeforeYesterdayStr)}
                  </p>
                </button>
              </div>
            </div>

            <div
              className={`rounded-[1.25rem] p-4 ${
                isDarkMode
                  ? "border border-iron-700/80 bg-gradient-to-b from-iron-900/90 to-iron-950 shadow-inner shadow-black/20"
                  : "border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 shadow-sm"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                        isDarkMode ? "bg-amber-500/12 text-amber-400" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <Utensils className="h-4 w-4" />
                    </span>
                    <div>
                      <p className={`text-sm font-semibold tracking-tight ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                        Pick a day
                      </p>
                      <p className={`text-[11px] ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                        {stripRangeLabel}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openNativeDatePicker}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all active:scale-[0.98] ${
                    isDarkMode
                      ? "border-amber-500/25 bg-iron-950/60 text-amber-200/90 hover:border-amber-500/40 hover:bg-iron-900"
                      : "border-amber-200 bg-amber-50/80 text-amber-900 hover:bg-amber-50"
                  }`}
                >
                  <CalendarDays className="h-4 w-4 opacity-80" />
                  More dates
                </button>
              </div>
              <div
                className={`mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      isDarkMode ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.45)]" : "bg-amber-500"
                    }`}
                  />
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
                  className={`flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 scrollbar-hide ${
                    isDarkMode ? "[mask-image:linear-gradient(90deg,transparent,black_8px,black_calc(100%-8px),transparent)]" : ""
                  }`}
                >
                  {glanceDays.map((d, i) => {
                    const c = foodCountByDate[d] || 0;
                    const active = pastLogDate === d;
                    const isToday = d === todayStr;
                    const prevDay = i > 0 ? glanceDays[i - 1] : null;
                    const showMonthLabel =
                      i === 0 || (prevDay && d.slice(0, 7) !== prevDay.slice(0, 7));

                    const todayTile =
                      isToday &&
                      !active &&
                      (isDarkMode
                        ? "border-red-500/35 bg-red-500/15 text-iron-200 hover:border-red-500/45 hover:bg-red-500/20"
                        : "border-red-200 bg-red-50 text-slate-800 hover:border-red-300 hover:bg-red-50/90");

                    return (
                      <div key={d} className="flex flex-col items-center shrink-0">
                        {showMonthLabel ? (
                          <span
                            className={`mb-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${
                              isDarkMode
                                ? "bg-amber-500/10 text-amber-500/90"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                          </span>
                        ) : (
                          <span className="mb-1 h-[1.125rem]" />
                        )}
                        {isToday ? (
                          <span
                            className={`mb-1 text-[8px] font-bold uppercase tracking-[0.12em] ${
                              isDarkMode ? "text-red-400" : "text-red-600"
                            }`}
                          >
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
                              : todayTile ||
                                (isDarkMode
                                  ? "border-iron-700/70 bg-iron-900/40 text-iron-400 hover:border-iron-600 hover:bg-iron-800/40 hover:text-iron-200"
                                  : "border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm")
                          }`}
                        >
                          <span
                            className={`text-[10px] font-semibold uppercase ${
                              active
                                ? isDarkMode
                                  ? "text-amber-200/70"
                                  : "text-amber-700/80"
                                : isToday
                                  ? isDarkMode
                                    ? "text-red-300/80"
                                    : "text-red-600/80"
                                  : isDarkMode
                                    ? "text-iron-500"
                                    : "text-slate-400"
                            }`}
                          >
                            {new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}
                          </span>
                          <span
                            className={`mt-0.5 text-base font-bold tabular-nums leading-none ${
                              active
                                ? isDarkMode
                                  ? "text-amber-50"
                                  : "text-amber-950"
                                : isToday
                                  ? isDarkMode
                                    ? "text-iron-50"
                                    : "text-slate-900"
                                  : ""
                            }`}
                          >
                            {parseInt(d.split("-")[2], 10)}
                          </span>
                          <span className="mt-2 flex h-2 w-2 items-center justify-center">
                            <span
                              className={`rounded-full transition-all ${
                                c > 0
                                  ? active
                                    ? isDarkMode
                                      ? "h-2 w-2 bg-amber-300 shadow-[0_0_10px_rgba(253,224,71,0.5)]"
                                      : "h-2 w-2 bg-amber-500"
                                    : isDarkMode
                                      ? "h-2 w-2 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                      : "h-2 w-2 bg-amber-500"
                                  : isToday && !active
                                    ? isDarkMode
                                      ? "h-1.5 w-1.5 bg-red-950/40 ring-1 ring-red-500/25"
                                      : "h-1.5 w-1.5 bg-red-100 ring-1 ring-red-200"
                                    : isDarkMode
                                      ? "h-1.5 w-1.5 bg-iron-700/80 ring-1 ring-iron-600/50"
                                      : "h-1.5 w-1.5 bg-slate-200 ring-1 ring-slate-300/80"
                              }`}
                            />
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={stripOffset === 0}
                  onClick={() => setStripOffset(s => Math.max(0, s - 7))}
                  className={`flex h-[4.5rem] w-10 shrink-0 items-center justify-center self-center rounded-2xl border transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-25 ${
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

            {pastLogDate && sortedItems.length > 0 && (
              <div
                className={`rounded-2xl border p-3 ${
                  isDarkMode ? "border-iron-800 bg-iron-950/40" : "border-slate-200 bg-slate-50/90"
                }`}
              >
                <p
                  className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${
                    isDarkMode ? "text-iron-500" : "text-slate-500"
                  }`}
                >
                  Food · {formatChipLabel(pastLogDate, todayStr)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {sortedItems.map(item => {
                    const consumed = !!pastFoodEntries[item.id];
                    const quantity =
                      pastFoodEntries[item.id]?.quantity ?? item.default_quantity ?? 1;
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

            <div
              className={`rounded-2xl border p-3 ${
                isDarkMode ? "border-iron-800" : "border-slate-200"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <ListChecks className={`h-4 w-4 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                <p className={`text-sm font-semibold ${isDarkMode ? "text-iron-200" : "text-slate-800"}`}>
                  Habits & life log
                </p>
              </div>
              {!pastLogDate ? (
                <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                  Choose a day above to log habits or life events for that date.
                </p>
              ) : (
                <>
                  <p
                    className={`mb-2 text-[10px] font-semibold uppercase tracking-wider ${
                      isDarkMode ? "text-iron-600" : "text-slate-400"
                    }`}
                  >
                    Habits
                  </p>
                  {habitList.length === 0 ? (
                    <p className={`mb-4 text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
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
                              <p
                                className={`truncate text-sm font-medium ${
                                  isDarkMode ? "text-iron-100" : "text-slate-800"
                                }`}
                              >
                                {t.name}
                              </p>
                              <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                                {done ? "Done this day" : t.has_value ? "Needs amount — use Log → Habits" : "Tap to toggle"}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <p
                    className={`mb-2 text-[10px] font-semibold uppercase tracking-wider ${
                      isDarkMode ? "text-iron-600" : "text-slate-400"
                    }`}
                  >
                    Life log
                  </p>
                  {sortedLifeEvents.length === 0 ? (
                    <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
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
                              <p
                                className={`truncate text-sm font-medium ${
                                  isDarkMode ? "text-iron-100" : "text-slate-800"
                                }`}
                              >
                                {et.name}
                              </p>
                              {done ? (
                                <p className={`text-xs ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                                  Logged this day
                                </p>
                              ) : et.need_value ? (
                                <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                                  Needs a value
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              disabled={done}
                              onClick={() => handleQuickLifeLog(et)}
                              className={`flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                isDarkMode
                                  ? "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
                                  : "bg-violet-100 text-violet-800 hover:bg-violet-200"
                              }`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Log
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {lifeValuePrompt && pastLogDate && (
                    <div
                      className={`mt-3 rounded-xl border p-3 ${
                        isDarkMode ? "border-violet-500/30 bg-violet-500/10" : "border-violet-200 bg-violet-50"
                      }`}
                    >
                      <p className={`mb-2 text-sm font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                        Value for {lifeValuePrompt.name}
                      </p>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={lifeValueInput}
                        onChange={e => setLifeValueInput(e.target.value)}
                        placeholder="e.g. 12.5"
                        className={`mb-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                          isDarkMode
                            ? "border-iron-700 bg-iron-900 text-iron-100 focus:ring-violet-500/40"
                            : "border-slate-200 bg-white focus:ring-violet-400"
                        }`}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLifeValuePrompt(null);
                            setLifeValueInput("");
                          }}
                          className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
                            isDarkMode ? "bg-iron-800 text-iron-300" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={submitLifeValueLog}
                          className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${
                            isDarkMode ? "bg-violet-500 text-white" : "bg-violet-600 text-white"
                          }`}
                        >
                          Save log
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      <FoodQuantityModal
        open={!!qtyItem}
        item={qtyItem}
        tempQuantity={tempQty}
        onTempQuantityChange={setTempQty}
        onConfirm={handleQuantityConfirm}
        onClose={closeQuantityModal}
        isDarkMode={isDarkMode}
        isAdjusting={isAdjustingQuantity}
      />
    </>
  );
}

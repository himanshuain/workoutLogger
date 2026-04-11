import { useState, useMemo, useCallback, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import { FadeIn, SpringIn, StaggerContainer, StaggerItem } from "@/components/ui/fade-in";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Dumbbell,
  Utensils,
  Heart,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
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

const STRIP_WINDOW_DAYS = 35;

// Enhanced date picker with strip from PastDayLogModal
function DatePicker({ selectedDate, onDateChange, isDarkMode }) {
  const { user, getFoodEntries } = useWorkout();
  const queryClient = useQueryClient();
  const [stripOffset, setStripOffset] = useState(0);
  const stripScrollRef = useRef(null);
  const stripAnchorRef = useRef(null);
  
  const todayStr = localDateStr();
  const yesterdayStr = addDaysStr(todayStr, -1);
  
  // Generate date strip
  const glanceDays = useMemo(() => {
    const result = [];
    const startOffset = stripOffset;
    for (let i = 0; i < STRIP_WINDOW_DAYS; i++) {
      result.push(addDaysStr(todayStr, -(startOffset + i)));
    }
    return result.reverse();
  }, [todayStr, stripOffset]);
  
  const stripScrollAnchorDate = glanceDays[Math.floor(glanceDays.length / 2)];
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
  
  // Auto-scroll to anchor
  useLayoutEffect(() => {
    if (stripAnchorRef.current && stripScrollRef.current) {
      const container = stripScrollRef.current;
      const anchor = stripAnchorRef.current;
      const containerRect = container.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const scrollLeft = anchor.offsetLeft - (containerRect.width / 2) + (anchorRect.width / 2);
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [stripScrollAnchorDate]);
  
  const pickDate = useCallback((iso) => {
    if (iso > todayStr) return;
    onDateChange(iso);
  }, [todayStr, onDateChange]);

  function formatShortDate(iso) {
    const dt = new Date(iso + "T12:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  
  return (
    <div className="space-y-4">
      {/* Selected Date Header */}
      {selectedDate && (
        <div className={cn(
          "flex items-center gap-3 p-4 rounded-2xl",
          isDarkMode ? "bg-iron-900/50 border border-iron-800" : "bg-white border border-slate-200 shadow-sm"
        )}>
          <span className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            isDarkMode ? "bg-amber-500/15 text-amber-400" : "bg-amber-100 text-amber-700"
          )}>
            <Calendar className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-section-header">Selected day</p>
            <p className="text-card-title">{formatChipLabel(selectedDate, todayStr)}</p>
          </div>
        </div>
      )}
      
      {/* Quick Picks */}
      <div>
        <p className="text-section-header mb-3">Quick picks</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => pickDate(yesterdayStr)}
            className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] ${
              selectedDate === yesterdayStr
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
              selectedDate === todayStr
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
      <div className={`rounded-2xl border p-4 ${
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
              const active = selectedDate === d;
              const isToday = d === todayStr;
              const prevDay = i > 0 ? glanceDays[i - 1] : null;
              const showMonthLabel = i === 0 || (prevDay && d.slice(0, 7) !== prevDay.slice(0, 7));
              
              return (
                <div
                  key={d}
                  ref={d === stripScrollAnchorDate ? stripAnchorRef : undefined}
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
    </div>
  );
}

// Workout logging section
function WorkoutLogSection({ selectedDate, isDarkMode }) {
  const router = useRouter();
  
  const handleAddWorkout = () => {
    // Navigate to plan page to create/edit routine for this date
    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();
    router.push(`/plan?day=${dayOfWeek}&date=${selectedDate}`);
  };
  
  return (
    <div className="space-y-4">
      <div className="card-secondary">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDarkMode ? "bg-iron-700" : "bg-slate-200"
          }`}>
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-card-title">Workout</h3>
            <p className="text-metadata">Log exercises and sets</p>
          </div>
        </div>
        
        <div className={`text-center py-8 rounded-xl border-2 border-dashed ${
          isDarkMode
            ? "border-iron-700 text-iron-500"
            : "border-slate-300 text-slate-400"
        }`}>
          <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No workout logged for this date</p>
          <button 
            onClick={handleAddWorkout}
            className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDarkMode 
                ? "bg-lift-primary text-iron-950 hover:bg-lift-secondary" 
                : "bg-workout-primary text-white hover:bg-workout-secondary"
            }`}
          >
            Add Workout
          </button>
        </div>
      </div>
    </div>
  );
}

// Food logging section  
function FoodLogSection({ selectedDate, isDarkMode }) {
  const router = useRouter();
  
  const handleAddFood = () => {
    // Navigate to food page - we'll keep the existing food functionality
    router.push("/food");
  };
  
  return (
    <div className="space-y-4">
      <div className="card-secondary">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDarkMode ? "bg-iron-700" : "bg-slate-200"
          }`}>
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-card-title">Food</h3>
            <p className="text-metadata">Track meals and nutrition</p>
          </div>
        </div>
        
        <div className={`text-center py-8 rounded-xl border-2 border-dashed ${
          isDarkMode
            ? "border-iron-700 text-iron-500"
            : "border-slate-300 text-slate-400"
        }`}>
          <Utensils className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No food logged for this date</p>
          <button 
            onClick={handleAddFood}
            className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDarkMode 
                ? "bg-lift-primary text-iron-950 hover:bg-lift-secondary" 
                : "bg-workout-primary text-white hover:bg-workout-secondary"
            }`}
          >
            Add Food
          </button>
        </div>
      </div>
    </div>
  );
}

// Habits logging section
function HabitsLogSection({ selectedDate, isDarkMode }) {
  const { trackables, createTrackable } = useWorkout();
  const [showAddHabit, setShowAddHabit] = useState(false);
  
  const handleAddHabits = () => {
    setShowAddHabit(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="card-secondary">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDarkMode ? "bg-iron-700" : "bg-slate-200"
          }`}>
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-card-title">Habits & Health</h3>
            <p className="text-metadata">Track daily habits and health metrics</p>
          </div>
        </div>
        
        {trackables.length > 0 ? (
          <div className="space-y-3">
            {trackables.filter(t => t.name !== "Body Weight").map(trackable => (
              <div key={trackable.id} className={`p-3 rounded-xl flex items-center gap-3 ${
                isDarkMode ? "bg-iron-800/40" : "bg-slate-100"
              }`}>
                <span className="text-lg">{trackable.icon}</span>
                <div className="flex-1">
                  <p className="font-medium">{trackable.name}</p>
                  {trackable.value_unit && (
                    <p className="text-xs text-metadata">Unit: {trackable.value_unit}</p>
                  )}
                </div>
                <button className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  isDarkMode 
                    ? "bg-iron-700 text-iron-300 hover:bg-iron-600" 
                    : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                }`}>
                  Log
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-center py-8 rounded-xl border-2 border-dashed ${
            isDarkMode
              ? "border-iron-700 text-iron-500"
              : "border-slate-300 text-slate-400"
          }`}>
            <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No habits configured yet</p>
            <button 
              onClick={handleAddHabits}
              className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDarkMode 
                  ? "bg-lift-primary text-iron-950 hover:bg-lift-secondary" 
                  : "bg-workout-primary text-white hover:bg-workout-secondary"
              }`}
            >
              Add Habits
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Events logging section
function EventsLogSection({ selectedDate, isDarkMode }) {
  const [showAddEvent, setShowAddEvent] = useState(false);
  
  const handleAddEvent = () => {
    setShowAddEvent(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="card-secondary">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDarkMode ? "bg-iron-700" : "bg-slate-200"
          }`}>
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-card-title">Events</h3>
            <p className="text-metadata">Log life events and activities</p>
          </div>
        </div>
        
        <div className={`text-center py-8 rounded-xl border-2 border-dashed ${
          isDarkMode
            ? "border-iron-700 text-iron-500"
            : "border-slate-300 text-slate-400"
        }`}>
          <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No events logged for this date</p>
          <button 
            onClick={handleAddEvent}
            className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDarkMode 
                ? "bg-lift-primary text-iron-950 hover:bg-lift-secondary" 
                : "bg-workout-primary text-white hover:bg-workout-secondary"
            }`}
          >
            Add Event
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LogPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { user, trackables, createTrackable, getFoodEntries } = useWorkout();
  
  // Get initial tab from URL or default to workout
  const initialTab = router.query.tab || "workout";
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Get initial date from URL or default to today
  const today = new Date().toISOString().split('T')[0];
  const initialDate = router.query.date || today;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  
  // Update URL when tab or date changes
  const updateUrl = useCallback((tab, date) => {
    const query = {};
    if (tab !== "workout") query.tab = tab;
    if (date !== today) query.date = date;
    
    router.replace(
      { pathname: "/log", query },
      undefined,
      { shallow: true }
    );
  }, [router, today]);
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    updateUrl(tab, selectedDate);
  };
  
  const handleDateChange = (date) => {
    setSelectedDate(date);
    updateUrl(activeTab, date);
  };
  
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
          <div className="mb-6">
            <h1 className="text-screen-title mb-2">Log Activities</h1>
            <p className="text-body">Track your workouts, food, habits, and events for any date</p>
          </div>
          
          {/* Date Picker */}
          <div className="section-spacing">
            <SpringIn>
              <DatePicker
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                isDarkMode={isDarkMode}
              />
            </SpringIn>
          </div>
          
          {/* Tabbed Content */}
          <div className="section-spacing">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="workout" className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  <span className="hidden sm:inline">Workout</span>
                </TabsTrigger>
                <TabsTrigger value="food" className="flex items-center gap-2">
                  <Utensils className="w-4 h-4" />
                  <span className="hidden sm:inline">Food</span>
                </TabsTrigger>
                <TabsTrigger value="habits" className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  <span className="hidden sm:inline">Habits</span>
                </TabsTrigger>
                <TabsTrigger value="events" className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden sm:inline">Events</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-6">
                <TabsContent value="workout">
                  <StaggerContainer>
                    <StaggerItem>
                      <WorkoutLogSection selectedDate={selectedDate} isDarkMode={isDarkMode} />
                    </StaggerItem>
                  </StaggerContainer>
                </TabsContent>
                
                <TabsContent value="food">
                  <StaggerContainer>
                    <StaggerItem>
                      <FoodLogSection selectedDate={selectedDate} isDarkMode={isDarkMode} />
                    </StaggerItem>
                  </StaggerContainer>
                </TabsContent>
                
                <TabsContent value="habits">
                  <StaggerContainer>
                    <StaggerItem>
                      <HabitsLogSection selectedDate={selectedDate} isDarkMode={isDarkMode} />
                    </StaggerItem>
                  </StaggerContainer>
                </TabsContent>
                
                <TabsContent value="events">
                  <StaggerContainer>
                    <StaggerItem>
                      <EventsLogSection selectedDate={selectedDate} isDarkMode={isDarkMode} />
                    </StaggerItem>
                  </StaggerContainer>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </FadeIn>
    </Layout>
  );
}
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import { FadeIn, SpringIn, StaggerContainer, StaggerItem } from "@/components/ui/fade-in";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Dumbbell,
  Utensils,
  Heart,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Date navigation component
function DatePicker({ selectedDate, onDateChange, isDarkMode }) {
  const today = new Date();
  const selected = new Date(selectedDate);
  
  const goToPrevDay = () => {
    const prev = new Date(selected);
    prev.setDate(prev.getDate() - 1);
    onDateChange(prev.toISOString().split('T')[0]);
  };
  
  const goToNextDay = () => {
    const next = new Date(selected);
    next.setDate(next.getDate() + 1);
    onDateChange(next.toISOString().split('T')[0]);
  };
  
  const goToToday = () => {
    onDateChange(today.toISOString().split('T')[0]);
  };
  
  const isToday = selectedDate === today.toISOString().split('T')[0];
  const isYesterday = (() => {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return selectedDate === yesterday.toISOString().split('T')[0];
  })();
  
  const formatSelectedDate = () => {
    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return selected.toLocaleDateString("en-US", { 
      weekday: "long", 
      month: "short", 
      day: "numeric" 
    });
  };
  
  return (
    <div className="card-hero">
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevDay}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            isDarkMode
              ? "bg-iron-600 text-iron-300 hover:bg-iron-500"
              : "bg-slate-200 text-slate-600 hover:bg-slate-300"
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <h2 className="text-screen-title">{formatSelectedDate()}</h2>
          <p className="text-metadata mt-1">
            {selected.toLocaleDateString("en-US", { 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })}
          </p>
        </div>
        
        <button
          onClick={goToNextDay}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            isDarkMode
              ? "bg-iron-600 text-iron-300 hover:bg-iron-500"
              : "bg-slate-200 text-slate-600 hover:bg-slate-300"
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      {!isToday && (
        <div className="mt-4">
          <button
            onClick={goToToday}
            className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${
              isDarkMode
                ? "bg-iron-600 text-iron-300 hover:bg-iron-500"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}
          >
            Jump to Today
          </button>
        </div>
      )}
    </div>
  );
}

// Workout logging placeholder
function WorkoutLogSection({ selectedDate, isDarkMode }) {
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
          <button className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-lift-primary text-iron-950">
            Add Workout
          </button>
        </div>
      </div>
    </div>
  );
}

// Food logging placeholder  
function FoodLogSection({ selectedDate, isDarkMode }) {
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
          <button className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-lift-primary text-iron-950">
            Add Food
          </button>
        </div>
      </div>
    </div>
  );
}

// Habits logging placeholder
function HabitsLogSection({ selectedDate, isDarkMode }) {
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
        
        <div className={`text-center py-8 rounded-xl border-2 border-dashed ${
          isDarkMode
            ? "border-iron-700 text-iron-500"
            : "border-slate-300 text-slate-400"
        }`}>
          <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No habits logged for this date</p>
          <button className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-lift-primary text-iron-950">
            Add Habits
          </button>
        </div>
      </div>
    </div>
  );
}

// Events logging placeholder
function EventsLogSection({ selectedDate, isDarkMode }) {
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
          <button className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-lift-primary text-iron-950">
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
  const { user } = useWorkout();
  
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
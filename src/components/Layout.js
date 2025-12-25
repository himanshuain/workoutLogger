import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useTheme } from "@/context/ThemeContext";
import {
  Dumbbell,
  TrendingUp,
  History,
  Settings,
  Utensils,
  ListChecks,
} from "lucide-react";

const tabs = [
  { id: "today", href: "/", icon: Dumbbell, label: "Today" },
  { id: "routines", href: "/routines", icon: ListChecks, label: "Routines" },
  { id: "food", href: "/food", icon: Utensils, label: "Food" },
  { id: "progress", href: "/progress", icon: TrendingUp, label: "Progress" },
  { id: "settings", href: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout({ children }) {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = tabs.find((t) => t.href === router.pathname);
    return tab?.id || "today";
  });

  // Swipe state
  const touchRef = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    isValidSwipe: false,
  });

  // Update active tab when route changes
  useEffect(() => {
    const tab = tabs.find((t) => t.href === router.pathname);
    if (tab) setActiveTab(tab.id);
  }, [router.pathname]);

  // Swipe configuration
  const config = {
    minSwipeDistance: 120,
    maxVerticalDistance: 80,
    minVelocity: 0.3,
    edgeZone: 50,
  };

  const onTouchStart = (e) => {
    const touch = e.touches[0];
    const screenWidth = window.innerWidth;

    const isLeftEdge = touch.clientX < config.edgeZone;
    const isRightEdge = touch.clientX > screenWidth - config.edgeZone;

    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isValidSwipe: isLeftEdge || isRightEdge,
      startedFromLeft: isLeftEdge,
      startedFromRight: isRightEdge,
    };
  };

  const onTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const {
      startX,
      startY,
      startTime,
      isValidSwipe,
      startedFromLeft,
      startedFromRight,
    } = touchRef.current;

    if (!isValidSwipe) return;

    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();

    const distanceX = endX - startX;
    const distanceY = Math.abs(endY - startY);
    const duration = endTime - startTime;
    const velocity = Math.abs(distanceX) / duration;

    const isHorizontalEnough = distanceY < config.maxVerticalDistance;
    const isLongEnough = Math.abs(distanceX) > config.minSwipeDistance;
    const isFastEnough = velocity > config.minVelocity;

    const isSwipeLeft = distanceX < 0;
    const isSwipeRight = distanceX > 0;

    const isValidLeftEdgeSwipe = startedFromLeft && isSwipeRight;
    const isValidRightEdgeSwipe = startedFromRight && isSwipeLeft;

    if (isHorizontalEnough && isLongEnough && isFastEnough) {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);

      if (isValidRightEdgeSwipe && currentIndex < tabs.length - 1) {
        const nextTab = tabs[currentIndex + 1];
        router.push(nextTab.href);

        if (window.navigator?.vibrate) {
          window.navigator.vibrate(10);
        }
      } else if (isValidLeftEdgeSwipe && currentIndex > 0) {
        const prevTab = tabs[currentIndex - 1];
        router.push(prevTab.href);

        if (window.navigator?.vibrate) {
          window.navigator.vibrate(10);
        }
      }
    }

    touchRef.current = {
      startX: 0,
      startY: 0,
      startTime: 0,
      isValidSwipe: false,
    };
  };

  const handleTabClick = (tab) => {
    router.push(tab.href);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(5);
    }
  };

  const currentIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <div
      className={`min-h-screen flex flex-col ${isDarkMode ? "bg-iron-950" : "bg-slate-50"}`}
    >
      {/* Top Header with Tabs */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl border-b ${
          isDarkMode
            ? "bg-iron-950/95 border-iron-800/50"
            : "bg-slate-50/95 border-slate-200"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="px-4 py-3">
          {/* App Title */}
          <div className="flex items-center justify-between mb-3">
            <h1
              className={`text-xl font-bold flex items-center gap-2 ${
                isDarkMode ? "text-iron-100" : "text-slate-800"
              }`}
            >
              <Dumbbell
                className={`w-5 h-5 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
              />
              Logbook
            </h1>
          </div>

          {/* Tab Bar */}
          <div
            className={`flex rounded-xl p-1 ${
              isDarkMode ? "bg-iron-900/80" : "bg-slate-200/80"
            }`}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg
                    text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? isDarkMode
                          ? "bg-lift-primary text-iron-950 shadow-lg shadow-lift-primary/20"
                          : "bg-workout-primary text-white shadow-lg shadow-workout-primary/20"
                        : isDarkMode
                          ? "text-iron-400 hover:text-iron-200 active:bg-iron-800"
                          : "text-slate-500 hover:text-slate-700 active:bg-slate-300"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Indicator Dots */}
        <div className="flex justify-center pb-2">
          <div className="flex gap-1.5">
            {tabs.map((tab, i) => (
              <div
                key={tab.id}
                className={`h-1 rounded-full transition-all duration-200 ${
                  i === currentIndex
                    ? isDarkMode
                      ? "w-6 bg-lift-primary"
                      : "w-6 bg-workout-primary"
                    : isDarkMode
                      ? "w-1.5 bg-iron-700"
                      : "w-1.5 bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className="flex-1 overflow-auto"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {children}
      </main>

      {/* Edge Swipe Indicators */}
      {currentIndex > 0 && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div
            className={`w-1 h-16 rounded-r-full ${
              isDarkMode
                ? "bg-gradient-to-r from-iron-600/30 to-transparent"
                : "bg-gradient-to-r from-slate-400/30 to-transparent"
            }`}
          />
        </div>
      )}
      {currentIndex < tabs.length - 1 && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div
            className={`w-1 h-16 rounded-l-full ${
              isDarkMode
                ? "bg-gradient-to-l from-iron-600/30 to-transparent"
                : "bg-gradient-to-l from-slate-400/30 to-transparent"
            }`}
          />
        </div>
      )}
    </div>
  );
}

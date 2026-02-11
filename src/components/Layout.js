import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Dumbbell, TrendingUp, Settings, Utensils, ListChecks, CalendarClock } from "lucide-react";

const tabs = [
  { id: "today", href: "/", icon: Dumbbell, label: "Today" },
  { id: "routines", href: "/routines", icon: ListChecks, label: "Routines" },
  { id: "food", href: "/food", icon: Utensils, label: "Food" },
  { id: "lifelog", href: "/lifelog", icon: CalendarClock, label: "Log" },
  { id: "progress", href: "/progress", icon: TrendingUp, label: "Progress" },
  { id: "settings", href: "/settings", icon: Settings, label: "Settings" },
];

// Animation variants
const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const headerVariants = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: 0.1 },
  },
};

const contentVariants = {
  initial: { opacity: 0.8, y: 5 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15, delay: 0, ease: "easeOut" },
  },
};

const previewCardVariants = {
  initial: { opacity: 0.5, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

const navItemVariants = {
  tap: { scale: 0.9 },
  hover: { scale: 1.05 },
};

export default function Layout({ children }) {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = tabs.find(t => t.href === router.pathname);
    return tab?.id || "today";
  });
  const [direction, setDirection] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  const currentIndex = tabs.findIndex(t => t.id === activeTab);

  // Detect keyboard visibility by tracking input focus (more reliable on iOS)
  useEffect(() => {
    const handleFocusIn = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        // Small delay to handle focus moving between inputs
        setTimeout(() => {
          const activeEl = document.activeElement;
          if (activeEl?.tagName !== 'INPUT' && activeEl?.tagName !== 'TEXTAREA' && activeEl?.tagName !== 'SELECT') {
            setIsKeyboardVisible(false);
          }
        }, 100);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Prefetch adjacent pages for faster navigation
  useEffect(() => {
    const prefetchAdjacent = () => {
      // Prefetch previous and next tabs
      if (currentIndex > 0) {
        router.prefetch(tabs[currentIndex - 1].href);
      }
      if (currentIndex < tabs.length - 1) {
        router.prefetch(tabs[currentIndex + 1].href);
      }
      // Also prefetch 2 tabs ahead/behind for smoother scrolling
      if (currentIndex > 1) {
        router.prefetch(tabs[currentIndex - 2].href);
      }
      if (currentIndex < tabs.length - 2) {
        router.prefetch(tabs[currentIndex + 2].href);
      }
    };
    prefetchAdjacent();
  }, [currentIndex, router]);

  // Scroll-based animations
  const { scrollYProgress } = useScroll({ container: containerRef });
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);

  // Update active tab when route changes
  useEffect(() => {
    const tab = tabs.find(t => t.href === router.pathname);
    if (tab) {
      const newIndex = tabs.findIndex(t => t.id === tab.id);
      setDirection(newIndex > currentIndex ? 1 : -1);
      setActiveTab(tab.id);
    }
  }, [router.pathname]);

  // Scroll to active card on mount and route change
  useEffect(() => {
    const container = containerRef.current;
    const card = cardRefs.current[currentIndex];
    if (container && card) {
      isScrollingRef.current = true;
      card.scrollIntoView({ behavior: "instant", block: "start" });
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 100);
    }
  }, [currentIndex]);

  // Handle scroll snap — detect which card is snapped and navigate
  const handleScroll = useCallback(() => {
    if (isScrollingRef.current) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const containerTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      // Find which card is most visible
      let bestMatch = currentIndex;
      let bestVisibility = 0;

      cardRefs.current.forEach((card, idx) => {
        if (!card) return;
        const cardTop = card.offsetTop;
        const cardHeight = card.offsetHeight;
        const cardBottom = cardTop + cardHeight;

        const visibleTop = Math.max(cardTop, containerTop);
        const visibleBottom = Math.min(cardBottom, containerTop + containerHeight);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibility = visibleHeight / containerHeight;

        if (visibility > bestVisibility) {
          bestVisibility = visibility;
          bestMatch = idx;
        }
      });

      // Navigate if snapped to a different tab
      if (bestMatch !== currentIndex && bestVisibility > 0.6) {
        const targetTab = tabs[bestMatch];
        if (targetTab) {
          if (window.navigator?.vibrate) {
            window.navigator.vibrate(10);
          }
          setDirection(bestMatch > currentIndex ? 1 : -1);
          // Update activeTab IMMEDIATELY so UI renders instantly
          setActiveTab(targetTab.id);
          // Then update the URL in background (shallow to avoid re-render)
          router.replace(targetTab.href, undefined, { shallow: true, scroll: false });
        }
      }
    }, 50); // Reduced to 50ms for even faster response
  }, [currentIndex, router]);

  const handleTabClick = useCallback(
    tab => {
      const idx = tabs.findIndex(t => t.id === tab.id);
      const card = cardRefs.current[idx];
      setDirection(idx > currentIndex ? 1 : -1);
      // Update activeTab IMMEDIATELY so UI renders instantly
      setActiveTab(tab.id);
      if (card) {
        isScrollingRef.current = true;
        card.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 200);
      }
      // Update URL in background
      router.replace(tab.href, undefined, { shallow: true, scroll: false });
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(5);
      }
    },
    [router, currentIndex]
  );

  return (
    <div
      className={`h-screen flex flex-col ${isDarkMode ? "bg-iron-950" : "bg-slate-50"}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Scrollable Tab Cards Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isPrev = idx === currentIndex - 1;
          const isNext = idx === currentIndex + 1;

          return (
            <div
              key={tab.id}
              ref={el => (cardRefs.current[idx] = el)}
              className="h-full flex flex-col"
              style={{
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                minHeight: "100%",
              }}
            >
              {/* Card Header */}

              {/* Card Content */}
              <main className="flex-1 overflow-auto">
                {isActive ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`content-${tab.id}`}
                      variants={contentVariants}
                      initial="initial"
                      animate="animate"
                      className="h-full"
                    >
                      {children}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  // Animated running person placeholder - shows briefly during navigation
                  <div className="flex flex-col items-center justify-center h-full px-6">
                    <div className="relative">
                      {/* Running track/path */}
                      <div 
                        className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full ${
                          isDarkMode ? "bg-iron-800" : "bg-slate-200"
                        }`}
                      />
                      {/* Animated runner */}
                      <div 
                        className="text-5xl animate-bounce"
                        style={{
                          animationDuration: '0.5s',
                          animationTimingFunction: 'ease-in-out',
                        }}
                      >
                        🏃
                      </div>
                      {/* Motion lines */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                        <div 
                          className={`h-0.5 rounded-full animate-pulse ${
                            isDarkMode ? "bg-lift-primary/60" : "bg-workout-primary/60"
                          }`}
                          style={{ width: '12px', animationDelay: '0ms' }}
                        />
                        <div 
                          className={`h-0.5 rounded-full animate-pulse ${
                            isDarkMode ? "bg-lift-primary/40" : "bg-workout-primary/40"
                          }`}
                          style={{ width: '18px', animationDelay: '100ms' }}
                        />
                        <div 
                          className={`h-0.5 rounded-full animate-pulse ${
                            isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/20"
                          }`}
                          style={{ width: '10px', animationDelay: '200ms' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </main>
            </div>
          );
        })}
      </div>

      {/* Fixed Bottom Navigation Bar - Hidden when keyboard is open */}
      <nav
        className={`fixed-bottom-nav flex-shrink-0 border-t z-40 ${
          isDarkMode ? "bg-iron-950 border-iron-800/50" : "bg-slate-50 border-slate-200"
        } ${isKeyboardVisible ? "keyboard-open" : ""}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around py-2 px-1">
          {tabs.map(navTab => {
            const NavIcon = navTab.icon;
            const isNavActive = navTab.id === activeTab;

            return (
              <motion.button
                key={navTab.id}
                variants={navItemVariants}
                whileTap="tap"
                whileHover="hover"
                onClick={() => handleTabClick(navTab)}
                className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-xl min-w-[3.5rem]`}
              >
                {/* Active indicator background */}
                {isNavActive && (
                  <motion.div
                    layoutId="navActiveIndicator"
                    className={`absolute inset-0 rounded-xl ${
                      isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/10"
                    }`}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <motion.div
                  animate={{
                    scale: isNavActive ? 1.1 : 1,
                    y: isNavActive ? -2 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className="relative z-10"
                >
                  <NavIcon
                    className={`w-6 h-6 mb-1 ${
                      isNavActive
                        ? isDarkMode
                          ? "text-lift-primary"
                          : "text-workout-primary"
                        : isDarkMode
                          ? "text-iron-500"
                          : "text-slate-400"
                    }`}
                  />
                </motion.div>
                <motion.span
                  animate={{
                    fontWeight: isNavActive ? 600 : 500,
                  }}
                  className={`relative z-10 text-[10px] ${
                    isNavActive
                      ? isDarkMode
                        ? "text-lift-primary"
                        : "text-workout-primary"
                      : isDarkMode
                        ? "text-iron-500"
                        : "text-slate-400"
                  }`}
                >
                  {navTab.label}
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

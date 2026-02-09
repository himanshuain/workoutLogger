import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
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
  initial: { opacity: 0, y: 15 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: 0.15, ease: "easeOut" },
  },
};

const previewCardVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
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

  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  const currentIndex = tabs.findIndex(t => t.id === activeTab);

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
      if (bestMatch !== currentIndex && bestVisibility > 0.5) {
        const targetTab = tabs[bestMatch];
        if (targetTab) {
          if (window.navigator?.vibrate) {
            window.navigator.vibrate(10);
          }
          setDirection(bestMatch > currentIndex ? 1 : -1);
          router.push(targetTab.href);
        }
      }
    }, 150);
  }, [currentIndex, router]);

  const handleTabClick = useCallback(
    tab => {
      const idx = tabs.findIndex(t => t.id === tab.id);
      const card = cardRefs.current[idx];
      setDirection(idx > currentIndex ? 1 : -1);
      if (card) {
        isScrollingRef.current = true;
        card.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          isScrollingRef.current = false;
          router.push(tab.href);
        }, 300);
      }
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
                  // Preview card for non-active tabs
                  <motion.div
                    variants={previewCardVariants}
                    initial="initial"
                    animate="animate"
                    className="flex flex-col items-center justify-center h-full px-6"
                  >
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                      className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${
                        isDarkMode ? "bg-iron-900" : "bg-slate-100"
                      }`}
                    >
                      <Icon
                        className={`w-10 h-10 ${
                          isDarkMode ? "text-lift-primary" : "text-workout-primary"
                        }`}
                      />
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.3 }}
                      className={`text-2xl font-bold mb-2 ${
                        isDarkMode ? "text-iron-100" : "text-slate-800"
                      }`}
                    >
                      {tab.label}
                    </motion.h2>
                  </motion.div>
                )}
              </main>
            </div>
          );
        })}
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`flex-shrink-0 border-t ${
          isDarkMode ? "bg-iron-950 border-iron-800/50" : "bg-slate-50 border-slate-200"
        }`}
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
      </motion.nav>
    </div>
  );
}

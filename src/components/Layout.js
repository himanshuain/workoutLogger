import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { useTheme } from "@/context/ThemeContext";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Dumbbell, TrendingUp, Settings, Utensils, ListChecks, CalendarClock } from "lucide-react";
import { SkeletonPage } from "@/components/SkeletonLoader";
import InstallPrompt from "@/components/InstallPrompt";

const DEFAULT_TABS = [
  { id: "today", href: "/", icon: Dumbbell, label: "Today" },
  { id: "routines", href: "/routines", icon: ListChecks, label: "Routines" },
  { id: "food", href: "/food", icon: Utensils, label: "Food" },
  { id: "lifelog", href: "/lifelog", icon: CalendarClock, label: "Log" },
  { id: "progress", href: "/progress", icon: TrendingUp, label: "Progress" },
  { id: "settings", href: "/settings", icon: Settings, label: "Settings" },
];

const NAV_CONFIG_KEY = "logbook_nav_config";

export function getNavConfig() {
  if (typeof window === "undefined") return { order: null, hidden: [], labels: {} };
  try {
    const stored = localStorage.getItem(NAV_CONFIG_KEY);
    return stored ? JSON.parse(stored) : { order: null, hidden: [], labels: {} };
  } catch { return { order: null, hidden: [], labels: {} }; }
}

export function saveNavConfig(config) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NAV_CONFIG_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event("nav-config-changed"));
}

export { DEFAULT_TABS };

// Animation variants
const cardVariants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.97,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const headerVariants = {
  initial: { opacity: 0, y: -8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 25, delay: 0.05 },
  },
};

const contentVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.15, ease: "easeOut" },
  },
};

const previewCardVariants = {
  initial: { opacity: 0.5, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 22 },
  },
};

const navItemVariants = {
  tap: { scale: 0.88, transition: { type: "spring", stiffness: 500, damping: 15 } },
  hover: { scale: 1.05 },
};

const DEFAULT_NAV_CONFIG = { order: null, hidden: [], labels: {} };

export default function Layout({ children }) {
  const router = useRouter();
  const { isDarkMode } = useTheme();

  // Always start with the default config to avoid SSR/hydration mismatch,
  // then sync from localStorage after mount
  const [navConfig, setNavConfig] = useState(DEFAULT_NAV_CONFIG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setNavConfig(getNavConfig());
    setMounted(true);
    const handler = () => setNavConfig(getNavConfig());
    window.addEventListener("nav-config-changed", handler);
    return () => window.removeEventListener("nav-config-changed", handler);
  }, []);

  // Build ordered tabs list from config
  const allTabs = useMemo(() => {
    let ordered = [...DEFAULT_TABS];
    if (navConfig.order && navConfig.order.length > 0) {
      ordered = navConfig.order
        .map(id => DEFAULT_TABS.find(t => t.id === id))
        .filter(Boolean);
      DEFAULT_TABS.forEach(t => { if (!ordered.find(o => o.id === t.id)) ordered.push(t); });
    }
    return ordered.map(t => ({
      ...t,
      label: navConfig.labels?.[t.id] || t.label,
    }));
  }, [navConfig]);

  // Scrollable tabs: exclude settings and hidden tabs
  const scrollableTabs = useMemo(() =>
    allTabs.filter(t => t.id !== "settings" && !(navConfig.hidden || []).includes(t.id)),
  [allTabs, navConfig.hidden]);

  // Nav bar tabs: exclude hidden tabs (settings always visible in nav)
  const navTabs = useMemo(() =>
    allTabs.filter(t => !(navConfig.hidden || []).includes(t.id)),
  [allTabs, navConfig.hidden]);

  // For matching: use all tabs including settings
  const tabs = allTabs;

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

  const isSettingsPage = activeTab === "settings";
  const currentIndex = scrollableTabs.findIndex(t => t.id === activeTab);

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
      if (currentIndex > 0) {
        router.prefetch(scrollableTabs[currentIndex - 1].href);
      }
      if (currentIndex < scrollableTabs.length - 1) {
        router.prefetch(scrollableTabs[currentIndex + 1].href);
      }
      if (currentIndex > 1) {
        router.prefetch(scrollableTabs[currentIndex - 2].href);
      }
      if (currentIndex < scrollableTabs.length - 2) {
        router.prefetch(scrollableTabs[currentIndex + 2].href);
      }
    };
    if (currentIndex >= 0) prefetchAdjacent();
  }, [currentIndex, router, scrollableTabs]);

  // Scroll-based animations (only when scroll container is active)
  const scrollTarget = isSettingsPage ? undefined : containerRef;
  const { scrollYProgress } = useScroll({ container: scrollTarget });
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);

  // Update active tab when route changes
  useEffect(() => {
    const tab = tabs.find(t => t.href === router.pathname);
    if (tab) {
      const oldIdx = scrollableTabs.findIndex(t => t.id === activeTab);
      const newIdx = scrollableTabs.findIndex(t => t.id === tab.id);
      setDirection(newIdx > oldIdx ? 1 : -1);
      setActiveTab(tab.id);
    }
  }, [router.pathname]);

  // Scroll to active card on mount and route change (only for scrollable tabs)
  useEffect(() => {
    if (isSettingsPage || currentIndex < 0) return;
    const container = containerRef.current;
    const card = cardRefs.current[currentIndex];
    if (container && card) {
      isScrollingRef.current = true;
      card.scrollIntoView({ behavior: "instant", block: "start" });
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 100);
    }
  }, [currentIndex, isSettingsPage]);

  // Detect which page the mandatory snap settled on
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

      let bestMatch = currentIndex;
      let bestVisibility = 0;

      cardRefs.current.forEach((card, idx) => {
        if (!card) return;
        const cardTop = card.offsetTop;
        const cardBottom = cardTop + card.offsetHeight;

        const visibleTop = Math.max(cardTop, containerTop);
        const visibleBottom = Math.min(cardBottom, containerTop + containerHeight);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibility = visibleHeight / containerHeight;

        if (visibility > bestVisibility) {
          bestVisibility = visibility;
          bestMatch = idx;
        }
      });

      if (bestMatch !== currentIndex && bestVisibility > 0.6) {
        const targetTab = scrollableTabs[bestMatch];
        if (targetTab) {
          if (window.navigator?.vibrate) {
            window.navigator.vibrate(10);
          }
          setDirection(bestMatch > currentIndex ? 1 : -1);
          setActiveTab(targetTab.id);
          router.replace(targetTab.href, undefined, { shallow: true, scroll: false });
        }
      }
    }, 100);
  }, [currentIndex, router, scrollableTabs]);

  const handleTabClick = useCallback(
    tab => {
      const scrollIdx = scrollableTabs.findIndex(t => t.id === tab.id);
      setActiveTab(tab.id);

      if (tab.id === "settings") {
        router.push(tab.href, undefined, { scroll: false });
      } else {
        // If coming FROM settings, do a full push to re-enter scroll mode
        if (isSettingsPage) {
          router.push(tab.href, undefined, { scroll: false });
        } else if (scrollIdx >= 0) {
          const card = cardRefs.current[scrollIdx];
          setDirection(scrollIdx > currentIndex ? 1 : -1);
          if (card) {
            isScrollingRef.current = true;
            card.scrollIntoView({ behavior: "smooth", block: "start" });
            setTimeout(() => { isScrollingRef.current = false; }, 500);
          }
          router.replace(tab.href, undefined, { shallow: true, scroll: false });
        }
      }

      if (window.navigator?.vibrate) {
        window.navigator.vibrate(5);
      }
    },
    [router, currentIndex, scrollableTabs, isSettingsPage]
  );

  return (
    <div
      className={`h-screen flex flex-col ${isDarkMode ? "bg-iron-950" : "bg-slate-50"}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Settings page: rendered directly, no scroll snap */}
      {isSettingsPage ? (
        <main className="flex-1 overflow-auto pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key="content-settings"
              variants={contentVariants}
              initial="initial"
              animate="animate"
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      ) : (
        /* Scrollable Tab Cards Container */
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
          style={{
            scrollSnapType: "y mandatory",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {scrollableTabs.map((tab, idx) => {
            const isActive = activeTab === tab.id;

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
                <main className="flex-1 overflow-auto pb-20">
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
                    <div className="p-4">
                      <SkeletonPage isDarkMode={isDarkMode} />
                    </div>
                  )}
                </main>
              </div>
            );
          })}
        </div>
      )}

      {/* PWA Install Prompt */}
      <InstallPrompt isDarkMode={isDarkMode} />

      {/* Fixed Bottom Navigation Bar - Hidden when keyboard is open */}
      <nav
        className={`fixed-bottom-nav flex-shrink-0 border-t z-40 ${
          isDarkMode ? "bg-iron-950 border-iron-800/50" : "bg-slate-50 border-slate-200"
        } ${isKeyboardVisible ? "keyboard-open" : ""}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around py-2 px-1" role="tablist" aria-label="Main navigation">
          {navTabs.map(navTab => {
            const NavIcon = navTab.icon;
            const isNavActive = navTab.id === activeTab;

            return (
              <motion.button
                key={navTab.id}
                variants={navItemVariants}
                whileTap="tap"
                whileHover="hover"
                onClick={() => handleTabClick(navTab)}
                aria-label={`Navigate to ${navTab.label}`}
                aria-current={isNavActive ? "page" : undefined}
                role="tab"
                aria-selected={isNavActive}
                className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-xl min-w-[3.5rem]`}
              >
                {/* Active indicator background */}
                {isNavActive && (
                  <motion.div
                    layoutId="navActiveIndicator"
                    className={`absolute inset-0 rounded-xl ${
                      isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/10"
                    }`}
                    transition={{ type: "spring", stiffness: 400, damping: 22, mass: 0.8 }}
                  />
                )}
                <motion.div
                  animate={{
                    scale: isNavActive ? 1.15 : 1,
                    y: isNavActive ? -2 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 450, damping: 18 }}
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

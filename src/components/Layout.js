import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { useTheme } from "@/context/ThemeContext";
import { useWorkout } from "@/context/WorkoutContext";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, TrendingUp, Settings, Utensils, ListChecks, ClipboardList } from "lucide-react";
import { cacheLocalNavConfig, readLocalNavConfig } from "@/lib/userPrefsMigration";
import { hapticLight, hapticSelect, touchPressNav } from "@/lib/touchFeedback";
import { cn } from "@/lib/utils";

const LazyInstallPrompt = dynamic(() => import("@/components/InstallPrompt"), {
  ssr: false,
});

const DEFAULT_TABS = [
  { id: "today", href: "/", icon: Dumbbell, label: "Today" },
  { id: "plan", href: "/plan", icon: ListChecks, label: "Plan" },
  { id: "checklists", href: "/checklists", icon: ClipboardList, label: "Checklists" },
  { id: "progress", href: "/progress", icon: TrendingUp, label: "Progress" },
];

const DEFAULT_NAV_CONFIG = { order: null, hidden: [], labels: {} };

export function getNavConfig(settingsNavConfig) {
  if (settingsNavConfig && Object.keys(settingsNavConfig).length > 0) {
    return settingsNavConfig;
  }
  return readLocalNavConfig();
}

export function saveNavConfig(config, updateSettings) {
  cacheLocalNavConfig(config);
  window.dispatchEvent(new Event("nav-config-changed"));
  if (updateSettings) {
    void updateSettings({ nav_config: config });
  }
}

export { DEFAULT_TABS };

const navItemVariants = {
  tap: { scale: 0.94, opacity: 0.9, transition: { duration: 0.1 } },
  hover: { scale: 1.02 },
};

export default function Layout({ children }) {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { settings } = useWorkout();

  const [navConfig, setNavConfig] = useState(DEFAULT_NAV_CONFIG);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    setNavConfig(getNavConfig(settings?.nav_config));
    const handler = () => setNavConfig(getNavConfig(settings?.nav_config));
    window.addEventListener("nav-config-changed", handler);
    return () => window.removeEventListener("nav-config-changed", handler);
  }, [settings?.nav_config]);

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

  const swipeTabs = useMemo(() =>
    allTabs.filter(t => !(navConfig.hidden || []).includes(t.id)),
  [allTabs, navConfig.hidden]);

  const navTabs = useMemo(() =>
    allTabs.filter(t => !(navConfig.hidden || []).includes(t.id)),
  [allTabs, navConfig.hidden]);

  const [activeTab, setActiveTab] = useState(() => {
    const tab = allTabs.find(t => t.href === router.pathname);
    return tab?.id || "today";
  });
  const [hoveredNavTab, setHoveredNavTab] = useState(null);

  const currentIndex = swipeTabs.findIndex(t => t.id === activeTab);

  // Detect keyboard
  useEffect(() => {
    const handleFocusIn = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        setIsKeyboardVisible(true);
      }
    };
    const handleFocusOut = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
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

  // Prefetch adjacent pages
  useEffect(() => {
    if (currentIndex >= 0) {
      if (currentIndex > 0) router.prefetch(swipeTabs[currentIndex - 1].href);
      if (currentIndex < swipeTabs.length - 1) router.prefetch(swipeTabs[currentIndex + 1].href);
    }
  }, [currentIndex, router, swipeTabs]);

  // Sync active tab when route changes
  useEffect(() => {
    const tab = allTabs.find(t => t.href === router.pathname);
    if (tab) setActiveTab(tab.id);
  }, [router.pathname, allTabs]);

  // Navbar slide/glide: visually highlight during drag, navigate on release
  const navRef = useRef(null);
  const navTouchActiveRef = useRef(false);

  const getNavTabFromTouch = useCallback((touchX, touchY) => {
    if (!navRef.current) return null;
    const buttons = navRef.current.querySelectorAll("[data-nav-id]");
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      if (touchX >= rect.left && touchX <= rect.right && touchY >= rect.top && touchY <= rect.bottom) {
        return btn.dataset.navId;
      }
    }
    return null;
  }, []);

  const handleNavTouchStart = useCallback((e) => {
    navTouchActiveRef.current = true;
    const touch = e.touches[0];
    const tabId = getNavTabFromTouch(touch.clientX, touch.clientY);
    if (tabId) setHoveredNavTab(tabId);
  }, [getNavTabFromTouch]);

  const handleNavTouchMove = useCallback((e) => {
    if (!navTouchActiveRef.current) return;
    const touch = e.touches[0];
    const tabId = getNavTabFromTouch(touch.clientX, touch.clientY);
    if (tabId && tabId !== hoveredNavTab) {
      setHoveredNavTab(tabId);
      hapticSelect();
    }
  }, [hoveredNavTab, getNavTabFromTouch]);

  const handleNavTouchEnd = useCallback(() => {
    if (navTouchActiveRef.current && hoveredNavTab) {
      const tab = navTabs.find(t => t.id === hoveredNavTab);
      if (tab && tab.id !== activeTab) {
        setActiveTab(tab.id);
        router.push(tab.href, undefined, { scroll: false });
        hapticLight();
      }
    }
    navTouchActiveRef.current = false;
    setHoveredNavTab(null);
  }, [hoveredNavTab, navTabs, activeTab, router]);

  const handleTabClick = useCallback(
    tab => {
      setActiveTab(tab.id);
      router.push(tab.href, undefined, { scroll: false });
      hapticLight();
    },
    [router]
  );

  return (
    <div
      vaul-drawer-wrapper=""
      className={`flex flex-col ${isDarkMode ? "bg-surface-page" : "bg-surface-page"}`}
      style={{
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <main
        className="flex-1 min-h-0 overflow-y-auto scrollbar-thin"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {children}
      </main>

      {/* PWA Install Prompt */}
      <LazyInstallPrompt isDarkMode={isDarkMode} />

      {/* Bottom Navigation Bar — in-flow, not fixed */}
      <nav
        ref={navRef}
        onTouchStart={handleNavTouchStart}
        onTouchMove={handleNavTouchMove}
        onTouchEnd={handleNavTouchEnd}
        className={`flex-shrink-0 border-t z-40 bg-surface-section border-surface-subtle shadow-[0_-1px_0_rgba(15,23,42,0.04)] ${isKeyboardVisible ? "hidden" : ""}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around py-2 px-1" role="tablist" aria-label="Main navigation">
          {navTabs.map(navTab => {
            const NavIcon = navTab.icon;
            const isNavActive = navTab.id === activeTab;
            const isHovered = hoveredNavTab === navTab.id;
            const isHighlighted = isHovered || (!hoveredNavTab && isNavActive);

            return (
              <motion.button
                key={navTab.id}
                data-nav-id={navTab.id}
                variants={navItemVariants}
                whileTap="tap"
                whileHover="hover"
                onClick={() => handleTabClick(navTab)}
                aria-label={`Navigate to ${navTab.label}`}
                aria-current={isNavActive ? "page" : undefined}
                role="tab"
                aria-selected={isNavActive}
                className={cn("relative flex flex-col items-center justify-center py-2 px-3 rounded-card min-w-[3.5rem] touch-none", touchPressNav)}
              >
                {isHighlighted && (
                  <motion.div
                    layoutId="navActiveIndicator"
                    className={`absolute inset-0 rounded-card ${
                      isDarkMode
                        ? "bg-lift-primary/20"
                        : "accent-soft-surface shadow-sm"
                    }`}
                    transition={{ type: "spring", stiffness: 400, damping: 22, mass: 0.8 }}
                  />
                )}
                <motion.div
                  animate={{
                    scale: isHighlighted ? 1.15 : 1,
                    y: isHighlighted ? -2 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 450, damping: 18 }}
                  className="relative z-10"
                >
                  <NavIcon
                    className={`w-6 h-6 mb-1 ${
                      isHighlighted
                        ? isDarkMode ? "text-lift-primary" : "text-red-700"
                        : isDarkMode ? "text-iron-500" : "text-[color:var(--text-secondary)]"
                    }`}
                  />
                </motion.div>
                <motion.span
                  animate={{ fontWeight: isHighlighted ? 600 : 500 }}
                  className={`relative z-10 text-[10px] ${
                    isHighlighted
                      ? isDarkMode ? "text-lift-primary" : "text-slate-800 font-semibold"
                      : isDarkMode ? "text-iron-500" : "text-[color:var(--text-secondary)]"
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

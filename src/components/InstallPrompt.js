import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "logbook_install_dismissed";

export default function InstallPrompt({ isDarkMode }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || localStorage.getItem(DISMISS_KEY)) return;
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const cardCls = isDarkMode
    ? "bg-iron-900 border-iron-800"
    : "bg-white border-slate-200 shadow-lg";
  const installBtn = isDarkMode
    ? "bg-lift-primary text-iron-950"
    : "bg-workout-primary text-white";
  const textCls = isDarkMode ? "text-iron-100" : "text-slate-800";
  const mutedCls = isDarkMode ? "text-iron-400" : "text-slate-500";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`fixed left-4 right-4 z-50 rounded-xl border ${cardCls}`}
        style={{ bottom: 80 }}
      >
        <div className="flex items-center gap-3 p-4">
          <span className="text-2xl">⚡</span>
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${textCls}`}>Add Logbook to your home screen</p>
          </div>
          <button
            onClick={handleInstall}
            className={`px-4 py-2 rounded-lg font-medium text-sm shrink-0 ${installBtn}`}
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className={`p-1 rounded-lg ${mutedCls} hover:opacity-70`}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

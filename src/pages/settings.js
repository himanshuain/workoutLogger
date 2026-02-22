import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { DEFAULT_TABS, getNavConfig, saveNavConfig } from "@/components/Layout";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import { Reorder, useDragControls } from "framer-motion";
import { toast } from "sonner";
import {
  User,
  Zap,
  Sun,
  Moon,
  Navigation,
  GripVertical,
  Eye,
  EyeOff,
  Pencil,
  Check,
  X,
  RotateCcw,
} from "lucide-react";

function NavItem({ tab, isDarkMode, config, editingId, editLabel, inputRef, setEditLabel, setEditingId, saveRename, startRename, getLabel, toggleVisibility, isHidden }) {
  const dragControls = useDragControls();
  const Icon = tab.icon;
  const hidden = isHidden(tab.id);
  const isSettings = tab.id === "settings";
  const isEditing = editingId === tab.id;

  return (
    <Reorder.Item
      value={tab.id}
      dragListener={false}
      dragControls={dragControls}
      className={`flex items-center gap-2 p-3 rounded-2xl transition-colors ${
        hidden
          ? isDarkMode ? "bg-iron-900/50 opacity-50" : "bg-slate-50 opacity-50"
          : isDarkMode ? "bg-iron-800/80" : "bg-slate-100"
      }`}
      style={{ touchAction: "none" }}
      whileDrag={{
        scale: 1.03,
        boxShadow: isDarkMode
          ? "0 8px 24px rgba(0,0,0,0.5)"
          : "0 8px 24px rgba(0,0,0,0.15)",
        zIndex: 50,
      }}
    >
      {/* Drag handle */}
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className={`touch-none cursor-grab active:cursor-grabbing p-1 rounded-lg ${
          isDarkMode ? "text-iron-500 active:text-iron-300" : "text-slate-400 active:text-slate-600"
        }`}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isDarkMode ? "bg-iron-700" : "bg-white"
        }`}
      >
        <Icon
          className={`w-4.5 h-4.5 ${
            isDarkMode ? "text-lift-primary" : "text-workout-primary"
          }`}
        />
      </div>

      {/* Label / edit */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value.slice(0, 12))}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
                if (e.key === "Escape") setEditingId(null);
              }}
              maxLength={12}
              className={`flex-1 px-2 py-1 rounded-lg text-sm font-medium outline-none ${
                isDarkMode
                  ? "bg-iron-700 text-iron-100 focus:ring-1 focus:ring-lift-primary"
                  : "bg-white text-slate-800 focus:ring-1 focus:ring-workout-primary"
              }`}
            />
            <button
              onClick={saveRename}
              className={`p-1 rounded-lg ${isDarkMode ? "text-green-400 active:bg-iron-700" : "text-green-600 active:bg-slate-200"}`}
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditingId(null)}
              className={`p-1 rounded-lg ${isDarkMode ? "text-iron-400 active:bg-iron-700" : "text-slate-400 active:bg-slate-200"}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => startRename(tab)}
            className="flex items-center gap-1.5 group"
          >
            <span className={`text-sm font-medium ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
              {getLabel(tab)}
            </span>
            <Pencil className={`w-3 h-3 opacity-0 group-active:opacity-100 transition-opacity ${
              isDarkMode ? "text-iron-500" : "text-slate-400"
            }`} />
          </button>
        )}
        {config.labels?.[tab.id] && !isEditing && (
          <p className={`text-[10px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
            Originally: {tab.label}
          </p>
        )}
      </div>

      {/* Visibility toggle */}
      <button
        onClick={() => toggleVisibility(tab.id)}
        disabled={isSettings}
        className={`p-2 rounded-xl transition-colors ${
          isSettings
            ? "opacity-30 cursor-not-allowed"
            : isDarkMode ? "active:bg-iron-700" : "active:bg-slate-200"
        }`}
      >
        {hidden ? (
          <EyeOff className={`w-4 h-4 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`} />
        ) : (
          <Eye className={`w-4 h-4 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`} />
        )}
      </button>
    </Reorder.Item>
  );
}

function NavCustomizer({ isDarkMode }) {
  const [config, setConfig] = useState(() => getNavConfig());
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const inputRef = useRef(null);

  const orderedIds = (() => {
    let ids = DEFAULT_TABS.map(t => t.id);
    if (config.order && config.order.length > 0) {
      const fromConfig = config.order.filter(id => DEFAULT_TABS.find(t => t.id === id));
      DEFAULT_TABS.forEach(t => { if (!fromConfig.includes(t.id)) fromConfig.push(t.id); });
      ids = fromConfig;
    }
    return ids;
  })();

  const tabMap = Object.fromEntries(DEFAULT_TABS.map(t => [t.id, t]));
  const isHidden = (id) => (config.hidden || []).includes(id);
  const getLabel = (tab) => config.labels?.[tab.id] || tab.label;

  const persist = useCallback((newConfig) => {
    setConfig(newConfig);
    saveNavConfig(newConfig);
  }, []);

  const handleReorder = (newOrder) => {
    persist({ ...config, order: newOrder });
  };

  const toggleVisibility = (id) => {
    if (id === "settings") return;
    const hidden = [...(config.hidden || [])];
    const idx = hidden.indexOf(id);
    if (idx >= 0) {
      hidden.splice(idx, 1);
    } else {
      const visibleCount = orderedIds.filter(tid => !hidden.includes(tid)).length;
      if (visibleCount <= 2) {
        toast.error("You need at least 2 visible tabs");
        return;
      }
      hidden.push(id);
    }
    persist({ ...config, hidden });
  };

  const startRename = (tab) => {
    setEditingId(tab.id);
    setEditLabel(getLabel(tab));
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const saveRename = () => {
    if (!editingId) return;
    const trimmed = editLabel.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const labels = { ...(config.labels || {}) };
    const original = DEFAULT_TABS.find(t => t.id === editingId);
    if (trimmed === original?.label) {
      delete labels[editingId];
    } else {
      labels[editingId] = trimmed;
    }
    persist({ ...config, labels });
    setEditingId(null);
  };

  const resetAll = () => {
    persist({ order: null, hidden: [], labels: {} });
    toast.success("Navigation reset to defaults");
  };

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  return (
    <div>
      <Reorder.Group
        axis="y"
        values={orderedIds}
        onReorder={handleReorder}
        className="space-y-2"
      >
        {orderedIds.map((id) => (
          <NavItem
            key={id}
            tab={tabMap[id]}
            isDarkMode={isDarkMode}
            config={config}
            editingId={editingId}
            editLabel={editLabel}
            inputRef={inputRef}
            setEditLabel={setEditLabel}
            setEditingId={setEditingId}
            saveRename={saveRename}
            startRename={startRename}
            getLabel={getLabel}
            toggleVisibility={toggleVisibility}
            isHidden={isHidden}
          />
        ))}
      </Reorder.Group>

      {/* Reset button */}
      <button
        onClick={resetAll}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium mt-3 transition-colors ${
          isDarkMode
            ? "bg-iron-800/50 text-iron-400 active:bg-iron-800"
            : "bg-slate-100 text-slate-500 active:bg-slate-200"
        }`}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset to Defaults
      </button>
    </div>
  );
}

export default function Settings() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  const {
    user,
    signOut,
    updateSettings,
  } = useWorkout();

  const handleToggleTheme = () => {
    toggleTheme();
    updateSettings({ dark_mode: !isDarkMode });
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
          <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
            Sign in to access settings
          </p>
          <button
            onClick={() => router.push("/auth")}
            className={`mt-4 px-6 py-2.5 rounded-xl font-bold ${
              isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
            }`}
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-4 pb-24">
        {/* Header - Sticky */}
        <div
          className={`sticky top-0 z-30 -mx-4 px-4 pb-3 pt-1 backdrop-blur-sm ${
            isDarkMode ? "bg-iron-950/95" : "bg-slate-50/95"
          }`}
        >
          <h2 className={`text-xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
            Settings
          </h2>
        </div>

        <div className="space-y-6 mt-4">
          {/* Theme Toggle */}
          <section>
            <h3
              className={`text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2 ${
                isDarkMode ? "text-iron-500" : "text-slate-500"
              }`}
            >
              {isDarkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              Appearance
            </h3>
            <div
              className={`p-4 rounded-2xl ${isDarkMode ? "bg-iron-900" : "bg-white border border-slate-200 shadow-sm"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isDarkMode ? "bg-iron-800" : "bg-slate-100"
                    }`}
                  >
                    {isDarkMode ? (
                      <Moon
                        className={`w-6 h-6 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
                      />
                    ) : (
                      <Sun
                        className={`w-6 h-6 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
                      />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                      {isDarkMode ? "Dark Mode" : "Light Mode"}
                    </p>
                    <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                      {isDarkMode ? "Easy on the eyes" : "Bright and clean"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleTheme}
                  className={`
                    relative w-14 h-8 rounded-full transition-colors duration-300
                    ${isDarkMode ? "bg-lift-primary" : "bg-workout-primary"}
                  `}
                >
                  <div
                    className={`
                      absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300
                      ${isDarkMode ? "left-7" : "left-1"}
                    `}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Navigation Customization */}
          <section>
            <h3
              className={`text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2 ${
                isDarkMode ? "text-iron-500" : "text-slate-500"
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              Navigation Bar
            </h3>
            <div
              className={`p-4 rounded-2xl ${isDarkMode ? "bg-iron-900" : "bg-white border border-slate-200 shadow-sm"}`}
            >
              <p className={`text-xs mb-3 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                Reorder, rename, or hide navigation items. Tap the name to rename.
              </p>
              <NavCustomizer isDarkMode={isDarkMode} />
            </div>
          </section>

          {/* Account */}
          <section>
            <h3
              className={`text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2 ${
                isDarkMode ? "text-iron-500" : "text-slate-500"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Account
            </h3>
            <div
              className={`p-4 rounded-2xl ${isDarkMode ? "bg-iron-900" : "bg-white border border-slate-200 shadow-sm"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className={`font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                    {user.email}
                  </p>
                  <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    Logged in
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/20"
                  }`}
                >
                  <span
                    className={`font-bold text-lg ${
                      isDarkMode ? "text-lift-primary" : "text-workout-primary"
                    }`}
                  >
                    {user.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  router.push("/auth");
                }}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-400 active:bg-iron-700"
                    : "bg-slate-100 text-slate-600 active:bg-slate-200"
                }`}
              >
                Sign Out
              </button>
            </div>
          </section>

          {/* About */}
          <section className="text-center py-8">
            <div
              className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
              style={{
                background: isDarkMode
                  ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                  : "linear-gradient(135deg, #4F8CFF 0%, #6366f1 100%)",
              }}
            >
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className={`font-bold text-lg ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
              Logbook
            </h3>
            <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Version 3.0.0
            </p>
            <p className={`text-xs mt-2 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
              Simple workout & habit tracking
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}

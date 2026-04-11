import { useState, useCallback, useRef } from "react";
import { Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function HabitPills({
  trackables = [],
  entries = {},
  onToggle,
  onAddNew,
}) {
  const { isDarkMode } = useTheme();
  const [valueModal, setValueModal] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [optimisticState, setOptimisticState] = useState({});
  const pendingRef = useRef(new Set());

  const getEffectiveEntry = useCallback((trackableId) => {
    if (optimisticState[trackableId] !== undefined) {
      return optimisticState[trackableId];
    }
    return entries[trackableId];
  }, [entries, optimisticState]);

  const handlePillClick = async (trackable) => {
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }

    const entry = entries[trackable.id];
    const isCompleted = entry?.is_completed;

    if (trackable.has_value && !isCompleted) {
      setValueModal(trackable);
      setInputValue(entry?.value?.toString() || "");
    } else {
      const newState = !isCompleted;
      setOptimisticState(prev => ({ ...prev, [trackable.id]: { is_completed: newState, value: null } }));
      try {
        await onToggle(trackable.id, newState, null);
      } catch {
        setOptimisticState(prev => { const n = { ...prev }; delete n[trackable.id]; return n; });
        toast.error("Failed to update");
      } finally {
        setOptimisticState(prev => { const n = { ...prev }; delete n[trackable.id]; return n; });
      }
    }
  };

  const handleValueSubmit = () => {
    if (valueModal && inputValue) {
      onToggle(valueModal.id, true, parseFloat(inputValue));
      setValueModal(null);
      setInputValue("");
    }
  };

  const handleValueClear = () => {
    if (valueModal) {
      onToggle(valueModal.id, false, null);
      setValueModal(null);
      setInputValue("");
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {trackables.map((trackable) => {
          const effectiveEntry = getEffectiveEntry(trackable.id);
          const entry = effectiveEntry || entries[trackable.id];
          const isCompleted = entry?.is_completed;

          return (
            <motion.button
              key={trackable.id}
              type="button"
              aria-pressed={isCompleted}
              aria-label={`${trackable.name}${isCompleted ? ", completed" : ", not completed"}`}
              onClick={() => handlePillClick(trackable)}
              whileTap={{ scale: 0.95 }}
              animate={isCompleted ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`
                relative min-h-[44px] px-4 py-2.5 rounded-xl font-medium text-sm
                transition-all duration-200 ease-out
                flex items-center gap-2
                ${
                  isCompleted
                    ? "text-iron-950 shadow-md"
                    : isDarkMode
                      ? "bg-iron-800/40 text-iron-400 active:bg-iron-700/50 border border-iron-700/30"
                      : "bg-slate-100 text-slate-500 active:bg-slate-200 border border-slate-200"
                }
              `}
              style={{
                backgroundColor: isCompleted ? trackable.color : undefined,
                boxShadow: isCompleted
                  ? `0 2px 8px ${trackable.color}30`
                  : undefined,
              }}
            >
              {trackable.icon && (
                <span className="text-lg">{trackable.icon}</span>
              )}

              {isCompleted && (
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                >
                  <Check className="w-5 h-5 shrink-0" strokeWidth={3} aria-hidden />
                </motion.div>
              )}

              <span className="font-semibold">{trackable.name}</span>

              {trackable.has_value && entry?.value && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isCompleted
                      ? "bg-black/20"
                      : isDarkMode
                        ? "bg-iron-700"
                        : "bg-slate-300"
                  }`}
                >
                  {entry.value}
                  {trackable.value_unit ? ` ${trackable.value_unit}` : ""}
                </span>
              )}
            </motion.button>
          );
        })}

        {onAddNew && (
          <button
            onClick={onAddNew}
            className={`
              min-h-[44px] px-4 py-2.5 rounded-xl font-medium text-sm
              border border-dashed transition-colors flex items-center gap-2 active:scale-95
              ${
                isDarkMode
                  ? "border-iron-700/50 text-iron-600 active:border-iron-600 active:text-iron-500"
                  : "border-slate-300 text-slate-400 active:border-slate-400 active:text-slate-500"
              }
            `}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Habit
          </button>
        )}
      </div>

      {/* Value Input Modal */}
      {valueModal && (
        <>
          <div className="modal-backdrop" onClick={() => setValueModal(null)} />
          <div
            className={`
            fixed inset-x-4 top-1/2 -translate-y-1/2 rounded-2xl p-6 z-50 max-w-sm mx-auto
            ${isDarkMode ? "bg-iron-900" : "bg-white shadow-xl"}
          `}
          >
            <div className="flex items-center gap-3 mb-4">
              {valueModal.icon && (
                <span className="text-2xl">{valueModal.icon}</span>
              )}
              <div>
                <h3
                  className={`text-lg font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                >
                  {valueModal.name}
                </h3>
                {valueModal.value_unit && (
                  <p
                    className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                  >
                    Enter value in {valueModal.value_unit}
                  </p>
                )}
              </div>
            </div>

            <div className="mb-6">
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Enter ${valueModal.value_unit || "value"}`}
                className={`
                  w-full h-14 px-4 rounded-xl text-xl text-center font-mono outline-none focus:ring-2
                  ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-100 placeholder-iron-600 focus:ring-lift-primary/50"
                      : "bg-slate-100 text-slate-800 placeholder-slate-400 focus:ring-workout-primary/50"
                  }
                `}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              {entries[valueModal.id]?.is_completed && (
                <button
                  onClick={handleValueClear}
                  className={`flex-1 min-h-[48px] py-3 rounded-xl font-medium ${
                    isDarkMode
                      ? "bg-iron-800 text-iron-400"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setValueModal(null)}
                className={`flex-1 min-h-[48px] py-3 rounded-xl font-medium ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-400"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleValueSubmit}
                disabled={!inputValue}
                className={`
                  flex-1 min-h-[48px] py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    isDarkMode
                      ? "bg-lift-primary text-iron-950"
                      : "bg-workout-primary text-white"
                  }
                `}
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

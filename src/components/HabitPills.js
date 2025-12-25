import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";

export default function HabitPills({
  trackables = [],
  entries = {},
  onToggle,
  onAddNew,
}) {
  const { isDarkMode } = useTheme();
  const [valueModal, setValueModal] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const handlePillClick = (trackable) => {
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }

    const entry = entries[trackable.id];
    const isCompleted = entry?.is_completed;

    if (trackable.has_value && !isCompleted) {
      setValueModal(trackable);
      setInputValue(entry?.value?.toString() || "");
    } else {
      onToggle(trackable.id, !isCompleted, null);
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
          const entry = entries[trackable.id];
          const isCompleted = entry?.is_completed;

          return (
            <button
              key={trackable.id}
              onClick={() => handlePillClick(trackable)}
              className={`
                relative min-h-[48px] px-5 py-3 rounded-2xl font-medium text-sm
                transition-all duration-300 ease-out
                active:scale-95 flex items-center gap-2.5
                ${
                  isCompleted
                    ? "text-iron-950 shadow-lg"
                    : isDarkMode
                      ? "bg-iron-800/70 text-iron-300 active:bg-iron-700/70"
                      : "bg-slate-200 text-slate-600 active:bg-slate-300"
                }
              `}
              style={{
                backgroundColor: isCompleted ? trackable.color : undefined,
                boxShadow: isCompleted
                  ? `0 4px 14px ${trackable.color}40`
                  : undefined,
              }}
            >
              {trackable.icon && (
                <span className="text-lg">{trackable.icon}</span>
              )}

              {isCompleted && (
                <svg
                  className="w-5 h-5 animate-scale-in"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
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
            </button>
          );
        })}

        {onAddNew && (
          <button
            onClick={onAddNew}
            className={`
              min-h-[48px] px-5 py-3 rounded-2xl font-medium text-sm
              border-2 border-dashed transition-colors flex items-center gap-2
              ${
                isDarkMode
                  ? "border-iron-700 text-iron-500 active:border-iron-600 active:text-iron-400"
                  : "border-slate-300 text-slate-500 active:border-slate-400 active:text-slate-600"
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
            Add
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

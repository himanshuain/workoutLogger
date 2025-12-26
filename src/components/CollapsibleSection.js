import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CollapsibleSection({
  title,
  icon: Icon,
  count,
  defaultOpen = false,
  children,
  isDarkMode = true,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-2xl overflow-hidden ${
        isDarkMode
          ? "bg-iron-900/50"
          : "bg-white border border-slate-200 shadow-sm"
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 transition-colors ${
          isDarkMode ? "active:bg-iron-800/50" : "active:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDarkMode ? "bg-iron-800" : "bg-slate-100"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isDarkMode ? "text-iron-400" : "text-slate-500"
                }`}
              />
            </div>
          )}
          <div className="text-left">
            <h3
              className={`font-semibold ${
                isDarkMode ? "text-iron-100" : "text-slate-800"
              }`}
            >
              {title}
            </h3>
            {count !== undefined && (
              <p
                className={`text-sm ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                {count} items
              </p>
            )}
          </div>
        </div>
        <div
          className={`
          w-10 h-10 rounded-xl flex items-center justify-center transition-colors
          ${
            isOpen
              ? isDarkMode
                ? "bg-lift-primary/20"
                : "bg-workout-primary/20"
              : isDarkMode
                ? "bg-iron-800"
                : "bg-slate-100"
          }
        `}
        >
          <ChevronDown
            className={`
              w-5 h-5 transition-transform duration-200
              ${
                isOpen
                  ? isDarkMode
                    ? "rotate-180 text-lift-primary"
                    : "rotate-180 text-workout-primary"
                  : isDarkMode
                    ? "text-iron-500"
                    : "text-slate-500"
              }
            `}
          />
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div
          className={`border-t ${
            isDarkMode ? "border-iron-800/50" : "border-slate-100"
          }`}
        >
          <div className="p-4 space-y-3">{children}</div>
        </div>
      )}
    </div>
  );
}

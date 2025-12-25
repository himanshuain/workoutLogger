import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CollapsibleSection({
  title,
  icon: Icon,
  count,
  defaultOpen = false,
  children,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl bg-iron-900/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 active:bg-iron-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-iron-800 flex items-center justify-center">
              <Icon className="w-5 h-5 text-iron-400" />
            </div>
          )}
          <div className="text-left">
            <h3 className="text-iron-100 font-semibold">{title}</h3>
            {count !== undefined && (
              <p className="text-iron-500 text-sm">{count} items</p>
            )}
          </div>
        </div>
        <div
          className={`
          w-10 h-10 rounded-xl flex items-center justify-center transition-colors
          ${isOpen ? "bg-lift-primary/20" : "bg-iron-800"}
        `}
        >
          <ChevronDown
            className={`
              w-5 h-5 transition-transform duration-200
              ${isOpen ? "rotate-180 text-lift-primary" : "text-iron-500"}
            `}
          />
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-iron-800/50">
          <div className="p-4 space-y-3">{children}</div>
        </div>
      )}
    </div>
  );
}

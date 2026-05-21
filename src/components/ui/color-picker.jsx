import { useState, useRef } from "react";
import { Palette } from "lucide-react";

export function ColorPicker({ value, onChange, presets = [], isDarkMode = true }) {
  const [showCustom, setShowCustom] = useState(false);
  const nativeRef = useRef(null);
  const offsetBg = isDarkMode ? "#18181b" : "#f8fafc";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-9 h-9 rounded-lg transition-transform ${
              value === color ? "ring-2 ring-white ring-offset-2 scale-110" : ""
            }`}
            style={{
              backgroundColor: color,
              ringOffsetColor: offsetBg,
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            showCustom
              ? isDarkMode
                ? "bg-lift-primary/20 ring-2 ring-lift-primary text-lift-primary"
                : "bg-amber-100 ring-2 ring-amber-500 text-amber-600"
              : isDarkMode
                ? "bg-iron-800 text-iron-400 hover:bg-iron-700 hover:text-iron-200"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          }`}
          title="Pick custom color"
        >
          <Palette className="w-4 h-4" />
        </button>
      </div>
      {showCustom && (
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => nativeRef.current?.click()}
            className="w-10 h-10 rounded-card border-2 overflow-hidden cursor-pointer relative"
            style={{
              backgroundColor: value,
              borderColor: isDarkMode ? "#3f3f46" : "#cbd5e1",
            }}
          >
            <input
              ref={nativeRef}
              type="color"
              value={value || "#3b82f6"}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </button>
          <input
            type="text"
            value={value || ""}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v) || v === "") {
                onChange(v);
              }
            }}
            placeholder="#hex"
            maxLength={7}
            className={`w-28 h-10 px-3 rounded-lg text-sm font-mono outline-none focus:ring-2 ${
              isDarkMode
                ? "bg-iron-800 text-iron-100 placeholder-iron-600 focus:ring-lift-primary/50"
                : "bg-slate-100 text-slate-800 placeholder-slate-400 focus:ring-amber-500/50"
            }`}
          />
          <div
            className="w-10 h-10 rounded-card border-2"
            style={{
              backgroundColor: value,
              borderColor: isDarkMode ? "#3f3f46" : "#cbd5e1",
            }}
          />
        </div>
      )}
    </div>
  );
}

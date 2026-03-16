import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";

export function EmojiPicker({ value, onChange, presets = [], isDarkMode = true }) {
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    const emojiRegex = /\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;
    const matches = text.match(emojiRegex);
    if (matches && matches.length > 0) {
      const newEmoji = matches[matches.length - 1];
      onChange(newEmoji);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {presets.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
              value === icon
                ? isDarkMode
                  ? "bg-iron-700 ring-2 ring-lift-primary"
                  : "bg-slate-200 ring-2 ring-amber-500"
                : isDarkMode
                  ? "bg-iron-800 hover:bg-iron-700"
                  : "bg-slate-100 hover:bg-slate-200"
            }`}
          >
            {icon}
          </button>
        ))}
        {/* Custom emoji that's not in presets */}
        {value && !presets.includes(value) && (
          <div className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center ring-2 ${
            isDarkMode ? "bg-iron-700 ring-lift-primary" : "bg-slate-200 ring-amber-500"
          }`}>
            {value}
          </div>
        )}
        {/* Emoji keyboard trigger — wraps a hidden input so tapping opens mobile keyboard */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowInput(true);
              setTimeout(() => inputRef.current?.focus(), 30);
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              showInput
                ? isDarkMode
                  ? "bg-lift-primary/20 ring-2 ring-lift-primary text-lift-primary"
                  : "bg-amber-100 ring-2 ring-amber-500 text-amber-600"
                : isDarkMode
                  ? "bg-iron-800 text-iron-400 hover:bg-iron-700 hover:text-iron-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            }`}
            title="Type an emoji"
          >
            <Smile className="w-4.5 h-4.5" />
          </button>
          {showInput && (
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              autoComplete="off"
              onChange={handleInputChange}
              onBlur={() => setTimeout(() => setShowInput(false), 200)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ fontSize: "16px" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

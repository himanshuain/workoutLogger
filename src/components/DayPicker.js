const DAYS = [
  { index: 0, short: "S", label: "Sun" },
  { index: 1, short: "M", label: "Mon" },
  { index: 2, short: "T", label: "Tue" },
  { index: 3, short: "W", label: "Wed" },
  { index: 4, short: "T", label: "Thu" },
  { index: 5, short: "F", label: "Fri" },
  { index: 6, short: "S", label: "Sat" },
];

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const PRESETS = [
  { id: "every", label: "Every Day", days: null },
  { id: "weekdays", label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { id: "alternate", label: "Alternate", days: [1, 3, 5] },
  { id: "twice", label: "2x / Week", days: [2, 5] },
];

function arraysEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export default function DayPicker({ value = null, onChange, isDarkMode }) {
  const selectedDays = value || ALL_DAYS;

  const activePreset = PRESETS.find(p =>
    arraysEqual(p.days, value)
  )?.id || null;

  const toggleDay = (dayIndex) => {
    if (selectedDays.includes(dayIndex)) {
      const next = selectedDays.filter((d) => d !== dayIndex);
      onChange(next.length === 0 ? [dayIndex] : next);
    } else {
      const next = [...selectedDays, dayIndex].sort();
      onChange(next.length === 7 ? null : next);
    }
  };

  const descriptionText = () => {
    if (!value || selectedDays.length === 7) return "Shows every day";
    if (activePreset === "alternate") return "Mon, Wed, Fri — every other day";
    if (activePreset === "twice") return "Tue, Fri — twice a week";
    return `Shows on ${selectedDays.map((d) => DAYS[d].label).join(", ")}`;
  };

  return (
    <div>
      <label className={`text-sm block mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
        Active Days
      </label>

      {/* Presets */}
      <div className="flex gap-1.5 mb-2.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.days)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              activePreset === preset.id
                ? isDarkMode
                  ? "bg-lift-primary/20 text-lift-primary ring-1 ring-lift-primary/40"
                  : "bg-workout-primary/10 text-workout-primary ring-1 ring-workout-primary/30"
                : isDarkMode
                  ? "bg-iron-800/60 text-iron-500 active:bg-iron-700"
                  : "bg-slate-100 text-slate-500 active:bg-slate-200"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Individual day toggles */}
      <div className="flex gap-1.5">
        {DAYS.map((day) => {
          const isSelected = selectedDays.includes(day.index);
          return (
            <button
              key={day.index}
              type="button"
              onClick={() => toggleDay(day.index)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-workout-primary text-white"
                  : isDarkMode
                    ? "bg-iron-800 text-iron-500"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {day.short}
            </button>
          );
        })}
      </div>
      <p className={`text-[10px] mt-1.5 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
        {descriptionText()}
      </p>
    </div>
  );
}

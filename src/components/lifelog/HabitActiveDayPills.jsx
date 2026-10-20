import { weekdayStripCellStyle } from "@/lib/weekdayColors";

export const WEEKDAY_LABELS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isDayEnabled(activeDays, dayIndex) {
  if (activeDays == null) return true;
  return activeDays.includes(dayIndex);
}

/**
 * Full-week schedule strip — enabled days green, others muted (same for every habit).
 * @param {number[] | null} activeDays — null = every day
 */
export default function HabitActiveDayPills({
  activeDays,
  isDarkMode = false,
  className = "",
}) {
  const trackBg = isDarkMode ? "bg-iron-950/50" : "bg-slate-200/55";
  const idleCellBg = isDarkMode ? "#18181b" : "#ffffff";
  const idleText = isDarkMode ? "#3f3f46" : "#cbd5e1";

  return (
    <span
      className={`inline-flex w-full min-w-0 rounded-lg p-0.5 ${trackBg} ${className}`}
      aria-label="Days of week schedule"
    >
      <span className="flex w-full min-w-0 overflow-hidden rounded-[6px]">
        {WEEKDAY_LABELS_SHORT.map((label, dayIndex) => {
          const enabled = isDayEnabled(activeDays, dayIndex);

          return (
            <span
              key={dayIndex}
              aria-label={`${label}${enabled ? "" : ", not scheduled"}`}
              className={`flex-1 min-w-0 px-px py-1 text-center text-[8px] sm:text-[9px] leading-none transition-colors ${
                enabled ? "font-semibold" : "font-normal"
              }`}
              style={
                enabled
                  ? weekdayStripCellStyle({ highlighted: false, isDarkMode })
                  : { backgroundColor: idleCellBg, color: idleText }
              }
            >
              {label}
            </span>
          );
        })}
      </span>
    </span>
  );
}

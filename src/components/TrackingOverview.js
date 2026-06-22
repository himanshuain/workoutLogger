import { useMemo, useState } from "react";
import { Check, Dumbbell, CalendarRange, ChevronDown } from "lucide-react";
import {
  ChartSection,
  ChartSectionHeader,
  chartSelectedColumnClass,
} from "@/components/charts/ChartChrome";
import { ChartPinSlot } from "@/components/dashboard/ChartPinContext";
import { cn } from "@/lib/utils";

function monthKeyFromDate(dateStr) {
  return dateStr.slice(0, 7);
}

function buildMonthRangeOptions(today) {
  const options = [{ id: "week", label: "Last 7 days" }];
  const anchor = new Date(`${today}T12:00:00`);
  for (let i = 0; i < 18; i += 1) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({
      id: key,
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
  }
  return options;
}

function buildTrackingDateRange({ rangeId, today, days = 7 }) {
  if (rangeId === "week" || !rangeId) {
    const dates = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(`${today}T12:00:00`);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dates.push({
        date: dateStr,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        isToday: dateStr === today,
      });
    }
    return dates.reverse();
  }

  const [year, month] = rangeId.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const endDay = monthKeyFromDate(today) === rangeId
    ? Number(today.slice(8, 10))
    : lastDay;
  const dates = [];
  for (let day = 1; day <= endDay; day += 1) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const d = new Date(`${dateStr}T12:00:00`);
    dates.push({
      date: dateStr,
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: day,
      isToday: dateStr === today,
    });
  }
  return dates;
}

export default function TrackingOverview({
  trackables = [],
  habitDataByTrackable = {},
  todayEntries = {},
  exerciseLogsByName = {},
  workoutSplitsByDate = {},
  foodItems = [],
  foodDataByItem = {},
  todayFoodEntries = {},
  today,
  days = 7,
  isDarkMode = true,
}) {
  const [rangeId, setRangeId] = useState("week");
  const rangeOptions = useMemo(() => buildMonthRangeOptions(today), [today]);
  const rangeLabel = rangeOptions.find(o => o.id === rangeId)?.label ?? "Last 7 days";

  const habits = useMemo(() => trackables.filter(t => t.name !== "Body Weight"), [trackables]);

  const dateRange = useMemo(
    () => buildTrackingDateRange({ rangeId, today, days }),
    [rangeId, today, days],
  );

  const habitsByDate = useMemo(() => {
    const result = {};
    dateRange.forEach(({ date }) => {
      result[date] = {};
      habits.forEach(t => {
        const habitDates = habitDataByTrackable[t.id] || [];
        const entry = habitDates.find(d => d.date === date);
        if (date === today && todayEntries[t.id]) {
          result[date][t.id] = todayEntries[t.id].is_completed;
        } else {
          result[date][t.id] = entry ? true : false;
        }
      });
    });
    return result;
  }, [dateRange, habits, habitDataByTrackable, todayEntries, today]);

  const workoutsByDate = useMemo(() => {
    const result = {};
    dateRange.forEach(({ date }) => {
      result[date] = workoutSplitsByDate[date] || [];
    });
    return result;
  }, [dateRange, workoutSplitsByDate]);

  const foodByDate = useMemo(() => {
    const result = {};
    dateRange.forEach(({ date }) => {
      result[date] = {};
      foodItems.forEach(item => {
        const itemDates = foodDataByItem[item.id] || [];
        const entry = itemDates.find(d => d.date === date);
        if (date === today && todayFoodEntries[item.id]) {
          result[date][item.id] = true;
        } else {
          result[date][item.id] = entry ? true : false;
        }
      });
    });
    return result;
  }, [dateRange, foodItems, foodDataByItem, todayFoodEntries, today]);

  return (
    <ChartSection isDarkMode={isDarkMode}>
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
        <ChartSectionHeader
          icon={CalendarRange}
          label="Weekly Overview"
          meta={rangeLabel}
          isDarkMode={isDarkMode}
          showPin={false}
          className="flex-1 px-0 pt-0 pb-0"
        />
        <div className="relative flex shrink-0 items-center gap-1.5 mt-0.5">
          <ChartPinSlot />
          <select
            value={rangeId}
            onChange={e => setRangeId(e.target.value)}
            className={cn(
              "appearance-none rounded-card py-1.5 pl-2.5 pr-7 text-[11px] font-semibold outline-none",
              isDarkMode
                ? "bg-iron-800 text-iron-200 border border-iron-700"
                : "bg-white text-slate-700 border border-slate-200",
            )}
            aria-label="Overview time range"
          >
            {rangeOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className={cn(
              "pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2",
              isDarkMode ? "text-iron-500" : "text-slate-400",
            )}
            aria-hidden
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto thin-scrollbar">
        <table className="w-full text-sm">
          {/* Date Header Row */}
          <thead>
            <tr className={isDarkMode ? "bg-surface-interactive/40" : "bg-surface-interactive/60"}>
              <th
                className={`sticky left-0 z-10 w-28 p-2 text-left text-section-header ${
                  isDarkMode ? "bg-surface-section" : "bg-surface-section"
                }`}
              >
                Metric
              </th>
              {dateRange.map(({ date, dayName, dayNum, isToday }) => (
                <th
                  key={date}
                  className={cn(
                    "min-w-[40px] p-1.5 text-center",
                    isToday && chartSelectedColumnClass(isDarkMode),
                  )}
                >
                  <div
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide",
                      isToday
                        ? isDarkMode
                          ? "text-lift-primary"
                          : "text-[color:var(--accent-soft-foreground)]"
                        : "text-metadata",
                    )}
                  >
                    {isToday ? "Today" : dayName}
                  </div>
                  <div
                    className={cn(
                      "text-sm font-bold",
                      isToday
                        ? isDarkMode
                          ? "text-lift-primary"
                          : "text-[color:var(--accent-soft-foreground)]"
                        : isDarkMode
                          ? "text-iron-300"
                          : "text-[color:var(--text-primary)]",
                    )}
                  >
                    {dayNum}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Workouts Row */}
            <tr className={`border-b border-surface-subtle`}>
              <td className={`sticky left-0 z-10 p-2 ${isDarkMode ? "bg-surface-section" : "bg-surface-section"}`}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/20"
                    }`}
                  >
                    <Dumbbell
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-lift-primary" : "text-workout-primary"
                      }`}
                    />
                  </div>
                  <span
                    className={`font-medium text-xs ${
                      isDarkMode ? "text-iron-200" : "text-slate-700"
                    }`}
                  >
                    Workouts
                  </span>
                </div>
              </td>
              {dateRange.map(({ date, isToday }) => {
                const splits = workoutsByDate[date] || [];
                const accent = isDarkMode ? "text-lift-primary" : "text-workout-primary";
                const accentBg = isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/20";

                return (
                  <td
                    key={date}
                    className={cn(
                      "min-w-[44px] p-1.5 text-center align-top whitespace-nowrap",
                      isToday && chartSelectedColumnClass(isDarkMode),
                    )}
                  >
                    {splits.length > 0 ? (
                      <div className="inline-flex flex-col items-center gap-0.5 px-0.5">
                        <span
                          className={cn(
                            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            accentBg,
                          )}
                        >
                          <Check className={cn("h-4 w-4", accent)} />
                        </span>
                        <span
                          className={cn(
                            "text-[7px] font-medium leading-none whitespace-nowrap",
                            isDarkMode ? "text-iron-300" : "text-slate-600",
                          )}
                          title={splits.join(", ")}
                        >
                          {splits.join(" · ")}
                        </span>
                      </div>
                    ) : (
                      <span className={isDarkMode ? "text-iron-700" : "text-slate-300"}>—</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Habits Rows */}
            {habits.map(habit => (
              <tr
                key={habit.id}
                className={`border-b border-surface-subtle`}
              >
                <td className={`sticky left-0 z-10 p-2 ${isDarkMode ? "bg-surface-section" : "bg-surface-section"}`}>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-6 h-6 min-w-[24px] rounded-lg flex items-center justify-center text-xs"
                      style={{ backgroundColor: `${habit.color}30` }}
                    >
                      {habit.icon}
                    </div>
                    <span
                      className={`font-medium leading-tight max-w-[72px] ${
                        habit.name.length > 10 ? "text-[10px]" : "text-xs"
                      } ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                      style={{ wordBreak: "break-word" }}
                    >
                      {habit.name}
                    </span>
                  </div>
                </td>
                {dateRange.map(({ date, isToday }) => (
                  <td
                    key={date}
                    className={`p-2 text-center ${
                      isToday ? (isDarkMode ? "bg-lift-primary/10" : "bg-workout-primary/10") : ""
                    }`}
                  >
                    {habitsByDate[date]?.[habit.id] ? (
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
                        style={{ backgroundColor: `${habit.color}30` }}
                      >
                        <Check className="w-4 h-4" style={{ color: habit.color }} />
                      </span>
                    ) : (
                      <span className={isDarkMode ? "text-iron-700" : "text-slate-300"}>—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}

            {/* Food Rows */}
            {foodItems.map(food => (
              <tr
                key={food.id}
                className={`border-b border-surface-subtle`}
              >
                <td className={`sticky left-0 z-10 p-2 ${isDarkMode ? "bg-surface-section" : "bg-surface-section"}`}>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-6 h-6 min-w-[24px] rounded-lg flex items-center justify-center text-xs"
                      style={{ backgroundColor: `${food.color}30` }}
                    >
                      {food.icon}
                    </div>
                    <span
                      className={`font-medium leading-tight max-w-[72px] ${
                        food.name.length > 10 ? "text-[10px]" : "text-xs"
                      } ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                      style={{ wordBreak: "break-word" }}
                    >
                      {food.name}
                    </span>
                  </div>
                </td>
                {dateRange.map(({ date, isToday }) => (
                  <td
                    key={date}
                    className={`p-2 text-center ${
                      isToday ? (isDarkMode ? "bg-lift-primary/10" : "bg-workout-primary/10") : ""
                    }`}
                  >
                    {foodByDate[date]?.[food.id] ? (
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
                        style={{ backgroundColor: `${food.color}30` }}
                      >
                        <Check className="w-4 h-4" style={{ color: food.color }} />
                      </span>
                    ) : (
                      <span className={isDarkMode ? "text-iron-700" : "text-slate-300"}>—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartSection>
  );
}

import { useMemo } from "react";
import { Check, X, Dumbbell } from "lucide-react";

export default function TrackingOverview({
  trackables = [],
  habitDataByTrackable = {},
  todayEntries = {},
  exerciseLogsByName = {},
  workoutData = [],
  foodItems = [],
  foodDataByItem = {},
  todayFoodEntries = {},
  today,
  days = 7,
  isDarkMode = true,
}) {
  const habits = useMemo(() => trackables.filter(t => t.name !== "Body Weight"), [trackables]);

  const dateRange = useMemo(() => {
    const dates = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dates.push({
        date: dateStr,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        isToday: dateStr === today,
      });
    }
    return dates;
  }, [days, today]);

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
      const dayData = workoutData.find(d => d.date === date);
      result[date] = dayData?.count || 0;
    });
    return result;
  }, [dateRange, workoutData]);

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

  const habitCompletionCounts = useMemo(() => {
    const counts = {};
    habits.forEach(t => {
      counts[t.id] = dateRange.filter(d => habitsByDate[d.date]?.[t.id]).length;
    });
    return counts;
  }, [habits, dateRange, habitsByDate]);

  const workoutDaysCount = useMemo(() => {
    return dateRange.filter(d => workoutsByDate[d.date] > 0).length;
  }, [dateRange, workoutsByDate]);

  const foodCompletionCounts = useMemo(() => {
    const counts = {};
    foodItems.forEach(item => {
      counts[item.id] = dateRange.filter(d => foodByDate[d.date]?.[item.id]).length;
    });
    return counts;
  }, [foodItems, dateRange, foodByDate]);

  return (
    <div
      className={`rounded-card overflow-hidden ${
        isDarkMode ? "bg-iron-900/50" : "bg-white border border-slate-200 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className={`p-4 border-b ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>
        <h3 className={`font-semibold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
          Weekly Overview
        </h3>
        <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
          Last {days} days at a glance. Check marks are completed days; dashes are not.
        </p>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto thin-scrollbar">
        <table className="w-full text-sm">
          {/* Date Header Row */}
          <thead>
            <tr className={isDarkMode ? "bg-iron-900/30" : "bg-slate-50"}>
              <th
                className={`sticky left-0 z-10 p-3 text-left font-medium w-32 ${
                  isDarkMode ? "bg-iron-900 text-iron-400" : "bg-white text-slate-500"
                }`}
              >
                Metric
              </th>
              {dateRange.map(({ date, dayName, dayNum, isToday }) => (
                <th
                  key={date}
                  className={`p-2 text-center min-w-[44px] ${
                    isToday ? (isDarkMode ? "bg-lift-primary/10" : "bg-workout-primary/10") : ""
                  }`}
                >
                  <div
                    className={`text-xs ${
                      isToday
                        ? isDarkMode
                          ? "text-lift-primary font-semibold"
                          : "text-workout-primary font-semibold"
                        : isDarkMode
                          ? "text-iron-500"
                          : "text-slate-500"
                    }`}
                  >
                    {isToday ? "Today" : dayName}
                  </div>
                  <div
                    className={`font-bold ${
                      isToday
                        ? isDarkMode
                          ? "text-lift-primary"
                          : "text-workout-primary"
                        : isDarkMode
                          ? "text-iron-300"
                          : "text-slate-700"
                    }`}
                  >
                    {dayNum}
                  </div>
                </th>
              ))}
              <th
                className={`p-3 text-center font-medium min-w-[50px] ${
                  isDarkMode ? "text-iron-400" : "text-slate-500"
                }`}
              >
                Done
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Workouts Row */}
            <tr className={`border-b ${isDarkMode ? "border-iron-800/30" : "border-slate-100"}`}>
              <td className={`sticky left-0 z-10 p-3 ${isDarkMode ? "bg-iron-900" : "bg-white"}`}>
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
              {dateRange.map(({ date, isToday }) => (
                <td
                  key={date}
                  className={`p-2 text-center ${
                    isToday ? (isDarkMode ? "bg-lift-primary/10" : "bg-workout-primary/10") : ""
                  }`}
                >
                  {workoutsByDate[date] > 0 ? (
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs ${
                        isDarkMode
                          ? "bg-lift-primary/20 text-lift-primary"
                          : "bg-workout-primary/20 text-workout-primary"
                      }`}
                    >
                      {workoutsByDate[date]}
                    </span>
                  ) : (
                    <span className={isDarkMode ? "text-iron-700" : "text-slate-300"}>—</span>
                  )}
                </td>
              ))}
              <td className="p-3 text-center">
                <span
                  className={`text-xs font-bold ${
                    workoutDaysCount >= Math.ceil(days * 0.7)
                      ? "text-green-400"
                      : workoutDaysCount >= Math.ceil(days * 0.4)
                        ? "text-amber-400"
                        : isDarkMode
                          ? "text-iron-500"
                          : "text-slate-500"
                  }`}
                >
                  {workoutDaysCount}/{days}
                </span>
              </td>
            </tr>

            {/* Habits Rows */}
            {habits.map(habit => (
              <tr
                key={habit.id}
                className={`border-b ${isDarkMode ? "border-iron-800/30" : "border-slate-100"}`}
              >
                <td className={`sticky left-0 z-10 p-3 ${isDarkMode ? "bg-iron-900" : "bg-white"}`}>
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
                <td className="p-3 text-center">
                  <span
                    className={`text-xs font-bold ${
                      habitCompletionCounts[habit.id] >= Math.ceil(days * 0.7)
                        ? "text-green-400"
                        : habitCompletionCounts[habit.id] >= Math.ceil(days * 0.4)
                          ? "text-amber-400"
                          : isDarkMode
                            ? "text-iron-500"
                            : "text-slate-500"
                    }`}
                  >
                    {habitCompletionCounts[habit.id]}/{days}
                  </span>
                </td>
              </tr>
            ))}

            {/* Food Rows */}
            {foodItems.map(food => (
              <tr
                key={food.id}
                className={`border-b ${isDarkMode ? "border-iron-800/30" : "border-slate-100"}`}
              >
                <td className={`sticky left-0 z-10 p-3 ${isDarkMode ? "bg-iron-900" : "bg-white"}`}>
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
                <td className="p-3 text-center">
                  <span
                    className={`text-xs font-bold ${
                      foodCompletionCounts[food.id] >= Math.ceil(days * 0.7)
                        ? "text-green-400"
                        : foodCompletionCounts[food.id] >= Math.ceil(days * 0.4)
                          ? "text-amber-400"
                          : isDarkMode
                            ? "text-iron-500"
                            : "text-slate-500"
                    }`}
                  >
                    {foodCompletionCounts[food.id]}/{days}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";

// Format date to YYYY-MM-DD in LOCAL timezone
function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format date for display
function formatDateDisplay(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Get today's date string in local timezone
function getTodayLocal() {
  return formatDateLocal(new Date());
}

// Day names - full names for clarity
const DAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Theme-aware color scales
const HEATMAP_COLORS = {
  // Batman (dark) - yellow/gold tones
  dark: {
    workout: ["#1c1c1e", "#422006", "#713f12", "#a16207", "#fbbf24"],
    habit: ["#1c1c1e", "#1e3a5f", "#1e40af", "#3b82f6", "#60a5fa"],
  },
  // Spiderman (light) - red/blue tones
  light: {
    workout: ["#f1f5f9", "#fecaca", "#f87171", "#ef4444", "#dc2626"],
    habit: ["#f1f5f9", "#dbeafe", "#60a5fa", "#3b82f6", "#2563eb"],
  },
};

// Generate grid data - current month first (reversed order)
function generateGridData(activityData, weeksToShow) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateLocal(today);

  // Create activity lookup map
  const dataMap = new Map();
  activityData.forEach((item) => {
    dataMap.set(item.date, item.count);
  });

  // Calculate the start date (oldest date)
  const startDate = new Date(today);
  startDate.setDate(
    startDate.getDate() - (weeksToShow - 1) * 7 - today.getDay(),
  );

  const grid = [];
  const monthLabels = [];
  let currentDate = new Date(startDate);
  let lastMonth = -1;

  // Build grid from oldest to newest first
  for (let week = 0; week < weeksToShow; week++) {
    const weekData = [];

    for (let day = 0; day < 7; day++) {
      const dateStr = formatDateLocal(currentDate);
      const count = dataMap.get(dateStr) || 0;
      const isFuture = currentDate > today;
      const isToday = dateStr === todayStr;

      weekData.push({
        date: new Date(currentDate),
        dateStr,
        count,
        isFuture,
        isToday,
        dayOfWeek: day,
        dayName: DAYS_FULL[day],
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    grid.push(weekData);
  }

  // Reverse the grid so current week is first (on the left)
  const reversedGrid = [...grid].reverse();

  // Calculate month labels for reversed grid
  reversedGrid.forEach((week, weekIndex) => {
    const firstDayOfWeek = week[0];
    const monthIndex = firstDayOfWeek.date.getMonth();

    // Add month label at the start of each month
    if (
      weekIndex === 0 ||
      (weekIndex > 0 &&
        reversedGrid[weekIndex - 1][0].date.getMonth() !== monthIndex)
    ) {
      monthLabels.push({ week: weekIndex, month: MONTHS[monthIndex] });
    }
  });

  return { grid: reversedGrid, monthLabels };
}

export default function ActivityHeatmap({
  data = [],
  type = "workout",
  label = "Activity",
  subtitle = "",
  color = null,
  compact = false,
  isDarkMode = true,
}) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const todayDate = new Date().getDate();
  const todayStr = getTodayLocal();

  const weeksToShow = compact ? 12 : 53;

  // Generate grid data
  const { grid, monthLabels } = useMemo(
    () => generateGridData(data, weeksToShow),
    [data, weeksToShow],
  );

  // Find max value for color scaling
  const maxValue = useMemo(() => {
    let max = 1;
    data.forEach((item) => {
      if (item.count > max) max = item.count;
    });
    return max;
  }, [data]);

  // Check if today has activity
  const todayHasActivity = data.some((d) => d.date === todayStr);

  // Color palette based on type, theme, or custom color
  const colorPalette = useMemo(() => {
    if (color) {
      const baseColor = isDarkMode ? "#1c1c1e" : "#f1f5f9";
      return [baseColor, `${color}30`, `${color}60`, `${color}90`, color];
    }
    const themeColors = isDarkMode ? HEATMAP_COLORS.dark : HEATMAP_COLORS.light;
    return themeColors[type] || themeColors.workout;
  }, [type, color, isDarkMode]);

  // Get color level
  const getColorLevel = (count) => {
    if (count === 0) return 0;
    return Math.min(4, Math.ceil((count / maxValue) * 4));
  };

  const cellSize = compact ? 12 : 13;
  const cellGap = 3;

  return (
    <div
      className={`rounded-2xl ${compact ? "p-3" : "p-4"} relative ${
        isDarkMode
          ? "bg-iron-900/50"
          : "bg-white border border-slate-200 shadow-sm"
      }`}
    >
      {/* Header with Today badge and hover info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          {label && (
            <h3
              className={`font-semibold ${compact ? "text-xs" : "text-sm"} ${
                isDarkMode ? "text-iron-100" : "text-slate-800"
              }`}
            >
              {label}
            </h3>
          )}
          {subtitle && !hoveredCell && (
            <p
              className={`text-xs mt-0.5 ${
                isDarkMode ? "text-iron-500" : "text-slate-500"
              }`}
            >
              {subtitle}
            </p>
          )}
          {/* Hovered cell info - replaces subtitle when hovering */}
          {hoveredCell && (
            <p className="text-xs mt-0.5">
              <span
                className={`font-medium ${
                  isDarkMode ? "text-iron-100" : "text-slate-800"
                }`}
              >
                {formatDateDisplay(hoveredCell.date)}
              </span>
              <span
                className={`mx-1 ${
                  isDarkMode ? "text-iron-500" : "text-slate-400"
                }`}
              >
                ·
              </span>
              <span
                className={
                  hoveredCell.count > 0
                    ? isDarkMode
                      ? "text-lift-primary"
                      : "text-workout-primary"
                    : isDarkMode
                      ? "text-iron-500"
                      : "text-slate-500"
                }
              >
                {hoveredCell.count} {type === "workout" ? "sets" : "completed"}
              </span>
            </p>
          )}
        </div>

        {/* Today indicator */}
        <TodayBadge
          date={todayDate}
          hasActivity={todayHasActivity}
          color={colorPalette[4]}
          compact={compact}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Heatmap Grid */}
      <div
        className={`overflow-x-auto scrollbar-hide ${compact ? "" : "-mx-2 px-2"}`}
      >
        <div className="inline-block">
          {/* Month labels row */}
          {!compact && (
            <div
              className="flex mb-1"
              style={{ marginLeft: `${36 + cellGap}px` }}
            >
              <div className="relative w-full" style={{ height: "14px" }}>
                {monthLabels.map(({ week, month }, i) => (
                  <span
                    key={i}
                    className={`absolute text-[10px] ${
                      isDarkMode ? "text-iron-500" : "text-slate-500"
                    }`}
                    style={{ left: `${week * (cellSize + cellGap)}px` }}
                  >
                    {month}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Grid with day labels */}
          <div className="flex">
            {/* Day labels column - aligned with each row */}
            <div
              className="flex flex-col"
              style={{ gap: `${cellGap}px`, marginRight: "4px" }}
            >
              {DAYS_FULL.map((day, i) => (
                <div
                  key={i}
                  className={`
                    flex items-center justify-end
                    ${compact ? "text-[9px]" : "text-[10px]"}
                    ${isDarkMode ? "text-iron-500" : "text-slate-500"}
                  `}
                  style={{
                    height: `${cellSize}px`,
                    width: compact ? "16px" : "28px",
                  }}
                >
                  {compact ? day[0] : i % 2 === 1 ? day : ""}
                </div>
              ))}
            </div>

            {/* Weeks grid */}
            <div className="flex" style={{ gap: `${cellGap}px` }}>
              {grid.map((week, weekIndex) => (
                <div
                  key={weekIndex}
                  className="flex flex-col"
                  style={{ gap: `${cellGap}px` }}
                >
                  {week.map((cell, dayIndex) => {
                    const level = getColorLevel(cell.count);
                    const isHovered = hoveredCell?.dateStr === cell.dateStr;

                    return (
                      <div
                        key={dayIndex}
                        className="rounded-sm cursor-pointer"
                        style={{
                          width: `${cellSize}px`,
                          height: `${cellSize}px`,
                          backgroundColor: cell.isFuture
                            ? isDarkMode
                              ? "#0d1117"
                              : "#f8fafc"
                            : colorPalette[level],
                          opacity: cell.isFuture ? 0.3 : 1,
                          outline: cell.isToday
                            ? `2px solid ${isDarkMode ? "rgba(251,191,36,0.5)" : "rgba(220,38,38,0.5)"}`
                            : isHovered
                              ? `2px solid ${isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"}`
                              : "none",
                          outlineOffset: "-1px",
                        }}
                        onMouseEnter={() =>
                          !cell.isFuture && setHoveredCell(cell)
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        onTouchStart={() =>
                          !cell.isFuture && setHoveredCell(cell)
                        }
                      >
                        {/* Show date number for today */}
                        {cell.isToday && (
                          <div
                            className="w-full h-full flex items-center justify-center text-[8px] font-bold"
                            style={{
                              color:
                                level > 0
                                  ? isDarkMode
                                    ? "#000"
                                    : "#fff"
                                  : isDarkMode
                                    ? "#666"
                                    : "#94a3b8",
                            }}
                          >
                            {cell.date.getDate()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      {!compact && (
        <div className="flex items-center justify-end gap-1 mt-3">
          <span
            className={`text-[10px] mr-1 ${
              isDarkMode ? "text-iron-600" : "text-slate-400"
            }`}
          >
            Less
          </span>
          {colorPalette.map((c, i) => (
            <div
              key={i}
              className="w-[11px] h-[11px] rounded-sm"
              style={{ backgroundColor: c }}
            />
          ))}
          <span
            className={`text-[10px] ml-1 ${
              isDarkMode ? "text-iron-600" : "text-slate-400"
            }`}
          >
            More
          </span>
        </div>
      )}
    </div>
  );
}

// Today badge showing the date number
function TodayBadge({ date, hasActivity, color, compact, isDarkMode }) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <span
        className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
      >
        Today
      </span>
      <div
        className={`
          flex items-center justify-center font-bold rounded-md
          ${hasActivity ? (isDarkMode ? "text-iron-950" : "text-white") : isDarkMode ? "text-iron-400" : "text-slate-500"}
          ${compact ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs"}
        `}
        style={{
          backgroundColor: hasActivity
            ? color
            : isDarkMode
              ? "#1c1c1e"
              : "#f1f5f9",
          border: `2px solid ${hasActivity ? color : isDarkMode ? "#27272a" : "#e2e8f0"}`,
          boxShadow: hasActivity ? `0 0 10px ${color}60` : "none",
        }}
      >
        {date}
      </div>
    </div>
  );
}

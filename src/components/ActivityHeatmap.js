import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Format date to YYYY-MM-DD in LOCAL timezone
function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get today's date string in local timezone
function getTodayLocal() {
  return formatDateLocal(new Date());
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

const DEFAULT_COLOR = "#22c55e";

export default function ActivityHeatmap({
  data = [],
  type = "workout",
  label = "Activity",
  subtitle = "",
  compact = false,
  isDarkMode = true,
  onDateClick = null,
  color = null,
}) {
  const activeColor = color || DEFAULT_COLOR;
  const todayStr = getTodayLocal();
  const today = new Date();

  // State for current view (year and month)
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [direction, setDirection] = useState(0);

  // Create activity lookup map
  const dataMap = useMemo(() => {
    const map = new Map();
    data.forEach(item => {
      map.set(item.date, item.count);
    });
    return map;
  }, [data]);

  // Get available years from data (2026 onwards)
  const availableYears = useMemo(() => {
    const years = new Set([2026]);
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    data.forEach(item => {
      const year = parseInt(item.date.split("-")[0]);
      if (year >= 2026) years.add(year);
    });
    for (let y = 2026; y <= currentYear; y++) years.add(y);
    return Array.from(years).sort((a, b) => b - a);
  }, [data]);

  // Calculate stats
  const stats = useMemo(() => {
    const completed = data.filter(d => d.count > 0).length;
    // Calculate current streak
    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    
    while (true) {
      const dateStr = formatDateLocal(checkDate);
      if (dataMap.has(dateStr) && dataMap.get(dateStr) > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr === todayStr) {
        // Today not completed yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return { completed, streak };
  }, [data, dataMap, todayStr]);

  // Get calendar days for current month view
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const count = dataMap.get(dateStr) || 0;
      days.push({
        day,
        dateStr,
        count,
        isCompleted: count > 0,
        isFuture: dateStr > todayStr,
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [viewYear, viewMonth, dataMap, todayStr]);

  // Navigation
  const canGoNext = viewYear < today.getFullYear() || 
    (viewYear === today.getFullYear() && viewMonth < today.getMonth());
  const canGoPrev = viewYear > 2026 || (viewYear === 2026 && viewMonth > 0);

  const handlePrevMonth = () => {
    setDirection(-1);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    setDirection(1);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleYearChange = year => {
    setDirection(year > viewYear ? 1 : -1);
    setViewYear(year);
    if (year === today.getFullYear() && viewMonth > today.getMonth()) {
      setViewMonth(today.getMonth());
    }
  };

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
  };

  return (
    <div
      className={`rounded-3xl overflow-hidden ${
        isDarkMode 
          ? "bg-gradient-to-br from-iron-900 to-iron-950 shadow-xl shadow-black/20" 
          : "bg-gradient-to-br from-white to-slate-50 shadow-lg shadow-slate-200/50 border border-slate-200/80"
      }`}
    >
      {/* Header */}
      <div className={`px-4 pt-4 pb-3 ${compact ? "px-3 pt-3 pb-2" : ""}`}>
        {label && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl" style={{ backgroundColor: `${activeColor}1A` }}>
                <Calendar className="w-4 h-4" style={{ color: activeColor }} />
              </div>
              <div>
                <h3 className={`font-bold ${compact ? "text-sm" : "text-base"} ${
                  isDarkMode ? "text-iron-100" : "text-slate-800"
                }`}>
                  {label}
                </h3>
                {subtitle && (
                  <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            
            {/* Stats Pills */}
            <div className="flex gap-2">
              {stats.streak > 0 && (
                <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                  isDarkMode 
                    ? "bg-orange-500/20 text-orange-400" 
                    : "bg-orange-500/10 text-orange-600"
                }`}>
                  🔥 {stats.streak}
                </div>
              )}
              <div className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: `${activeColor}33`, color: activeColor }}>
                {stats.completed} days
              </div>
            </div>
          </div>
        )}

        {/* Year Pills */}
        {!compact && availableYears.length > 1 && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
            {availableYears.map(year => (
              <motion.button
                key={year}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleYearChange(year)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  viewYear === year
                    ? "text-white shadow-lg"
                    : isDarkMode
                      ? "bg-iron-800/80 text-iron-400 hover:bg-iron-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                style={viewYear === year ? { backgroundColor: activeColor, boxShadow: `0 4px 12px ${activeColor}4D` } : {}}
              >
                {year}
              </motion.button>
            ))}
          </div>
        )}

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
            className={`p-2 rounded-xl disabled:opacity-30 transition-colors ${
              isDarkMode
                ? "bg-iron-800/50 text-iron-300 hover:bg-iron-700 active:bg-iron-600"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${viewYear}-${viewMonth}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <h4 className={`font-bold text-lg ${
                isDarkMode ? "text-iron-100" : "text-slate-800"
              }`}>
                {MONTH_NAMES[viewMonth]}
              </h4>
              <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                {viewYear}
              </p>
            </motion.div>
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleNextMonth}
            disabled={!canGoNext}
            className={`p-2 rounded-xl disabled:opacity-30 transition-colors ${
              isDarkMode
                ? "bg-iron-800/50 text-iron-300 hover:bg-iron-700 active:bg-iron-600"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Calendar */}
      <div className={`px-4 pb-4 ${compact ? "px-3 pb-3" : ""}`}>
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_NAMES.map((day, i) => (
            <div
              key={i}
              className={`text-center text-[11px] font-semibold py-2 ${
                i === 0 || i === 6
                  ? isDarkMode ? "text-iron-600" : "text-slate-400"
                  : isDarkMode ? "text-iron-500" : "text-slate-500"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="grid grid-cols-7 gap-1.5"
          >
            {calendarDays.map((dayData, i) => {
              if (!dayData) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }

              const { day, dateStr, isCompleted, isFuture, isToday } = dayData;

              return (
                <motion.button
                  key={dateStr}
                  whileTap={!isFuture && onDateClick ? { scale: 0.85 } : {}}
                  onClick={() => onDateClick && !isFuture && onDateClick(dateStr, isCompleted)}
                  disabled={isFuture || !onDateClick}
                  className={`
                    aspect-square rounded-xl flex flex-col items-center justify-center
                    font-semibold transition-all duration-200 relative
                    ${isFuture ? "opacity-30" : onDateClick ? "cursor-pointer" : ""}
                    ${isToday ? "text-[10px]" : "text-sm"}
                  `}
                  style={{
                    backgroundColor: isCompleted
                      ? activeColor
                      : isToday
                        ? isDarkMode ? "#3f3f46" : "#e2e8f0"
                        : isDarkMode ? "#27272a" : "#f1f5f9",
                    color: isCompleted
                      ? "#fff"
                      : isToday
                        ? isDarkMode ? "#fff" : "#1e293b"
                        : isDarkMode ? "#71717a" : "#94a3b8",
                    boxShadow: isCompleted 
                      ? `0 2px 8px ${activeColor}66`
                      : isToday && !isCompleted
                        ? isDarkMode 
                          ? "inset 0 0 0 2px #ef4444" 
                          : "inset 0 0 0 2px #dc2626"
                        : "none",
                  }}
                >
                  {day}
                  {isToday && (
                    <span 
                      className="text-[7px] font-bold leading-none"
                      style={{ color: isCompleted ? "#fff" : "#ef4444" }}
                    >
                      TODAY
                    </span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        {!compact && (
          <div className={`flex items-center justify-center gap-6 mt-4 pt-4 border-t ${
            isDarkMode ? "border-iron-800/50" : "border-slate-200"
          }`}>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-md"
                style={{ backgroundColor: isDarkMode ? "#27272a" : "#f1f5f9" }}
              />
              <span className={`text-xs font-medium ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                Missed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-md shadow-sm" 
                style={{ backgroundColor: activeColor, boxShadow: `0 2px 4px ${activeColor}4D` }} 
              />
              <span className={`text-xs font-medium ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                Completed
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from "lucide-react";
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
  /** Extra-dense calendar (e.g. Life log expanded rows) */
  mini = false,
  isDarkMode = true,
  onDateClick = null,
  color = null,
  progressMode = false,
  progressItems = [],
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

  // Progress mode: compute milestones and per-date totals from item creation dates
  const { getProgressTotal, milestones } = useMemo(() => {
    if (!progressMode || !progressItems.length) {
      return { getProgressTotal: () => 0, milestones: [] };
    }

    const sorted = [...progressItems]
      .map(item => ({
        ...item,
        addedDate: item.created_at ? formatDateLocal(new Date(item.created_at)) : "2020-01-01",
      }))
      .sort((a, b) => a.addedDate.localeCompare(b.addedDate));

    // Build milestones: each date where the count changed
    const ms = [];
    let runningCount = 0;
    const dateItemsMap = {};

    sorted.forEach(item => {
      const d = item.addedDate;
      if (!dateItemsMap[d]) dateItemsMap[d] = [];
      dateItemsMap[d].push(item);
    });

    Object.keys(dateItemsMap).sort().forEach(d => {
      runningCount += dateItemsMap[d].length;
      ms.push({
        date: d,
        totalAfter: runningCount,
        items: dateItemsMap[d],
      });
    });

    // Build a lookup: for any date, how many items existed
    const getTotalForDate = (dateStr) => {
      let total = 0;
      for (const m of ms) {
        if (m.date <= dateStr) total = m.totalAfter;
        else break;
      }
      return total;
    };

    return { getProgressTotal: getTotalForDate, milestones: ms };
  }, [progressMode, progressItems]);

  const [expandedMilestone, setExpandedMilestone] = useState(null);

  // Which milestones fall in the current month view
  const monthMilestones = useMemo(() => {
    if (!progressMode) return [];
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    return milestones.filter(m => m.date.startsWith(prefix));
  }, [progressMode, milestones, viewYear, viewMonth]);

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

  // Group calendar into rows with milestone headers inserted between rows
  const calendarSegments = useMemo(() => {
    if (!progressMode) return null;

    const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const priorTotal = getProgressTotal(
      // Day before this month
      new Date(viewYear, viewMonth, 0).toISOString().split("T")[0]
    );
    const priorItems = progressItems.filter(pi => {
      const piDate = pi.created_at ? formatDateLocal(new Date(pi.created_at)) : "2020-01-01";
      return piDate < monthStart;
    });

    const hasPriorItems = priorItems.length > 0;
    const hasMonthMilestones = monthMilestones.length > 0;

    if (!hasPriorItems && !hasMonthMilestones) return null;

    // Split into rows of 7
    const rows = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7));
    }

    const milestoneDateSet = new Map();
    monthMilestones.forEach(m => {
      const dayNum = parseInt(m.date.split("-")[2], 10);
      milestoneDateSet.set(dayNum, m);
    });

    const segments = [];
    const usedMilestones = new Set();

    // Show a starting-count banner if items existed before this month
    if (hasPriorItems) {
      segments.push({
        type: "milestone",
        milestone: {
          date: "__prior__",
          totalAfter: priorTotal,
          items: priorItems,
          isPrior: true,
        },
      });
    }

    rows.forEach((row, rowIdx) => {
      const rowMilestones = [];
      row.forEach(dayData => {
        if (dayData && milestoneDateSet.has(dayData.day) && !usedMilestones.has(dayData.day)) {
          rowMilestones.push(milestoneDateSet.get(dayData.day));
          usedMilestones.add(dayData.day);
        }
      });

      rowMilestones.forEach(m => {
        segments.push({ type: "milestone", milestone: m });
      });

      segments.push({ type: "row", days: row, rowIdx });
    });

    return segments;
  }, [progressMode, monthMilestones, calendarDays, getProgressTotal, progressItems, viewYear, viewMonth]);

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

  const renderProgressDay = (dayData) => {
    const { day, dateStr, count, isFuture, isToday } = dayData;
    const dayTotal = getProgressTotal(dateStr);
    const progress = dayTotal > 0 ? Math.min(count / dayTotal, 1) : 0;
    const isAllDone = progress >= 1;
    const size = mini ? 30 : 40;
    const strokeWidth = mini ? 2 : 2.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - progress * circumference;
    const ringColor = isAllDone ? "#22c55e" : activeColor;

    return (
      <motion.button
        key={dateStr}
        whileTap={!isFuture && onDateClick ? { scale: 0.85 } : {}}
        onClick={() => onDateClick && !isFuture && onDateClick(dateStr, dayData.isCompleted)}
        disabled={isFuture || !onDateClick}
        className={`aspect-square flex items-center justify-center relative ${isFuture ? "opacity-30" : onDateClick ? "cursor-pointer" : ""}`}
      >
        <svg width={size} height={size} className="absolute inset-0 m-auto -rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={isDarkMode ? "#27272a" : "#e2e8f0"}
            strokeWidth={strokeWidth}
          />
          {count > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          )}
        </svg>
        <div
          className={`relative z-10 flex flex-col items-center justify-center ${
            isToday ? (mini ? "text-[8px]" : "text-[10px]") : mini ? "text-[10px]" : "text-xs"
          }`}
        >
          <span
            className="font-semibold"
            style={{
              color: isAllDone
                ? "#22c55e"
                : count > 0
                  ? activeColor
                  : isToday
                    ? isDarkMode ? "#fff" : "#1e293b"
                    : isDarkMode ? "#52525b" : "#94a3b8",
            }}
          >
            {day}
          </span>
          {isToday && (
            <span
              className={`${mini ? "text-[5px]" : "text-[6px]"} font-bold leading-none`}
              style={{ color: isAllDone ? "#22c55e" : "#ef4444" }}
            >
              TODAY
            </span>
          )}
        </div>
      </motion.button>
    );
  };

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
  };

  const headerPad = mini ? "px-2.5 pt-2 pb-1.5" : compact ? "px-3 pt-3 pb-2" : "px-4 pt-4 pb-3";
  const calendarPad = mini ? "px-2.5 pb-2" : compact ? "px-3 pb-3" : "px-4 pb-4";
  const monthTitleClass = mini ? "text-sm" : "text-lg";
  const navBtnPad = mini ? "p-1.5" : "p-2";
  const navIconClass = mini ? "w-4 h-4" : "w-5 h-5";
  const calMaxW = mini
    ? "max-w-[15.25rem]"
    : "md:max-w-[min(100%,20.5rem)] lg:max-w-[22.5rem]";
  const dayHeaderGap = mini ? "gap-0.5" : "gap-1";
  const dayHeaderCell = mini
    ? "text-center text-[9px] font-semibold py-1"
    : "text-center text-[11px] font-semibold py-2";
  const gridGap = mini ? "gap-1" : "gap-1.5";

  return (
    <div
      className={`${mini ? "rounded-2xl" : "rounded-3xl"} overflow-hidden ${
        isDarkMode
          ? "bg-gradient-to-br from-iron-900 to-iron-950 shadow-xl shadow-black/20"
          : "bg-gradient-to-br from-white to-slate-50 shadow-lg shadow-slate-200/50 border border-slate-200/80"
      }`}
    >
      {/* Header */}
      <div className={headerPad}>
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
            className={`${navBtnPad} rounded-xl disabled:opacity-30 transition-colors ${
              isDarkMode
                ? "bg-iron-800/50 text-iron-300 hover:bg-iron-700 active:bg-iron-600"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300"
            }`}
          >
            <ChevronLeft className={navIconClass} />
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
              <h4
                className={`font-bold ${monthTitleClass} ${
                  isDarkMode ? "text-iron-100" : "text-slate-800"
                }`}
              >
                {MONTH_NAMES[viewMonth]}
              </h4>
              <p
                className={`${mini ? "text-[10px]" : "text-xs"} ${
                  isDarkMode ? "text-iron-500" : "text-slate-500"
                }`}
              >
                {viewYear}
              </p>
            </motion.div>
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleNextMonth}
            disabled={!canGoNext}
            className={`${navBtnPad} rounded-xl disabled:opacity-30 transition-colors ${
              isDarkMode
                ? "bg-iron-800/50 text-iron-300 hover:bg-iron-700 active:bg-iron-600"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300"
            }`}
          >
            <ChevronRight className={navIconClass} />
          </motion.button>
        </div>
      </div>

      {/* Calendar */}
      <div className={`${calendarPad}`}>
        <div className={`w-full ${calMaxW} md:mx-auto`}>
        {/* Day Headers */}
        <div className={`grid grid-cols-7 ${dayHeaderGap} mb-2`}>
          {DAY_NAMES.map((day, i) => (
            <div
              key={i}
              className={`${dayHeaderCell} ${
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
          >
            {progressMode && calendarSegments ? (
              calendarSegments.map((segment, segIdx) => {
                if (segment.type === "milestone") {
                  const m = segment.milestone;
                  const isExpanded = expandedMilestone === m.date;
                  return (
                    <div key={`ms-${m.date}`} className="my-1.5">
                      <button
                        onClick={() => setExpandedMilestone(isExpanded ? null : m.date)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                          isDarkMode
                            ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/15"
                            : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                        }`}
                      >
                        <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                          isDarkMode ? "bg-amber-500/20" : "bg-amber-100"
                        }`}>
                          {m.totalAfter}
                        </span>
                        <span>
                          {m.totalAfter} item{m.totalAfter !== 1 ? "s" : ""} tracked
                        </span>
                        <span className={`ml-auto text-[10px] font-normal ${isDarkMode ? "text-amber-500/60" : "text-amber-500"}`}>
                          {m.isPrior ? "start of month" : `from ${new Date(m.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className={`mt-1 ml-3 pl-3 border-l-2 space-y-1 ${
                              isDarkMode ? "border-amber-500/20" : "border-amber-200"
                            }`}>
                              {(() => {
                                const priorList = m.isPrior ? [] : progressItems.filter(pi => {
                                  const piDate = pi.created_at ? formatDateLocal(new Date(pi.created_at)) : "2020-01-01";
                                  return piDate < m.date;
                                });
                                const allItems = [
                                  ...priorList.map(it => ({ ...it, isNew: false })),
                                  ...m.items.map(it => ({ ...it, isNew: !m.isPrior })),
                                ];
                                return allItems.map((item, idx) => (
                                  <div
                                    key={item.id || idx}
                                    className={`flex items-center gap-2 py-1 text-xs ${
                                      isDarkMode ? "text-iron-400" : "text-slate-600"
                                    }`}
                                  >
                                    <span>{item.emoji || "🍽️"}</span>
                                    <span className="font-medium">{item.name}</span>
                                    {item.isNew && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                        isDarkMode ? "bg-amber-500/15 text-amber-400" : "bg-amber-100 text-amber-600"
                                      }`}>
                                        new
                                      </span>
                                    )}
                                  </div>
                                ));
                              })()}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                // Row of days
                return (
                  <div key={`row-${segment.rowIdx}`} className={`grid grid-cols-7 ${gridGap}`}>
                    {segment.days.map((dayData, di) => {
                      if (!dayData) {
                        return <div key={`empty-${segment.rowIdx}-${di}`} className="aspect-square" />;
                      }
                      return renderProgressDay(dayData);
                    })}
                  </div>
                );
              })
            ) : progressMode ? (
              <div className={`grid grid-cols-7 ${gridGap}`}>
                {calendarDays.map((dayData, i) => {
                  if (!dayData) return <div key={`empty-${i}`} className="aspect-square" />;
                  return renderProgressDay(dayData);
                })}
              </div>
            ) : (
              <div className={`grid grid-cols-7 ${gridGap}`}>
                {calendarDays.map((dayData, i) => {
                  if (!dayData) {
                    return <div key={`empty-${i}`} className="aspect-square" />;
                  }

                  const { day, dateStr, count, isCompleted, isFuture, isToday } = dayData;

                  return (
                    <motion.button
                      key={dateStr}
                      whileTap={!isFuture && onDateClick ? { scale: 0.85 } : {}}
                      onClick={() => onDateClick && !isFuture && onDateClick(dateStr, isCompleted)}
                      disabled={isFuture || !onDateClick}
                      className={`
                        aspect-square ${mini ? "rounded-lg" : "rounded-xl"} flex flex-col items-center justify-center
                        font-semibold transition-all duration-200 relative
                        ${isFuture ? "opacity-30" : onDateClick ? "cursor-pointer" : ""}
                        ${isToday ? (mini ? "text-[9px]" : "text-[10px]") : mini ? "text-xs" : "text-sm"}
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
                          className={`${mini ? "text-[5px]" : "text-[7px]"} font-bold leading-none`}
                          style={{ color: isCompleted ? "#fff" : "#ef4444" }}
                        >
                          TODAY
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        {!compact && (
          <div className={`flex items-center justify-center gap-5 mt-4 pt-4 border-t ${
            isDarkMode ? "border-iron-800/50" : "border-slate-200"
          }`}>
            {progressMode ? (
              <>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" className="-rotate-90">
                    <circle cx="8" cy="8" r="6.5" fill="none" stroke={isDarkMode ? "#27272a" : "#e2e8f0"} strokeWidth="2" />
                    <circle cx="8" cy="8" r="6.5" fill="none" stroke={activeColor} strokeWidth="2"
                      strokeDasharray={2 * Math.PI * 6.5} strokeDashoffset={2 * Math.PI * 6.5 * 0.5} strokeLinecap="round" />
                  </svg>
                  <span className={`text-xs font-medium ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    Partial
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" className="-rotate-90">
                    <circle cx="8" cy="8" r="6.5" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className={`text-xs font-medium ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    All done
                  </span>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, Play, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PacmanSprite from "@/components/heatmap/PacmanSprite";
import GhostSprite from "@/components/heatmap/GhostSprite";
import EatSplatter from "@/components/heatmap/EatSplatter";
import {
  ChartLegend,
  ChartLegendItem,
  ChartSectionHeader,
  ChartSegmentButton,
  ChartSegmentTrack,
  chartSectionClass,
} from "@/components/charts/ChartChrome";

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
const PACMAN_GAZE_MS = 3000;
const PACMAN_REPLAY_MS = 5000;
const PACMAN_STEP_MS = 520;
const PACMAN_MOVE_DURATION = 0.48;
const PACMAN_EAT_MS = 420;
const PACMAN_SPRITE_SIZE = { mini: 26, default: 34 };
const GHOST_SPRITE_SIZE = { mini: 24, default: 30 };
const GREEN_DONE = "#22c55e";

function isGreenHeatmapDay(dayData, progressMode, getProgressTotal) {
  if (!dayData || dayData.isFuture) return false;
  if (progressMode) {
    const dayTotal = getProgressTotal(dayData.dateStr);
    return dayTotal > 0 && dayData.count >= dayTotal;
  }
  return dayData.count > 0;
}

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
  const calendarGridRef = useRef(null);
  const dayCellRefs = useRef(new Map());
  const pacmanRunIdRef = useRef(0);
  const getProgressTotalRef = useRef(getProgressTotal);
  getProgressTotalRef.current = getProgressTotal;
  const startPacmanRef = useRef(() => {});
  const autoPlaySuppressedRef = useRef(false);
  const [eatenDates, setEatenDates] = useState(() => new Set());
  const [splatterDates, setSplatterDates] = useState(() => new Set());
  const [autoPlaySuppressed, setAutoPlaySuppressed] = useState(false);
  const [pacmanStarted, setPacmanStarted] = useState(false);
  const [pacmanVisible, setPacmanVisible] = useState(false);
  const [pacmanDate, setPacmanDate] = useState(null);
  const [eatingDate, setEatingDate] = useState(null);
  const [pacmanPos, setPacmanPos] = useState(null);
  const [pacmanDir, setPacmanDir] = useState("right");
  const [pacmanInstant, setPacmanInstant] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(true);
  const ghostMode = pacmanStarted || pacmanVisible;
  const pacmanSpriteSize = mini ? PACMAN_SPRITE_SIZE.mini : PACMAN_SPRITE_SIZE.default;
  const ghostSpriteSize = mini ? GHOST_SPRITE_SIZE.mini : GHOST_SPRITE_SIZE.default;
  autoPlaySuppressedRef.current = autoPlaySuppressed;

  const registerDayRef = useCallback((dateStr, el) => {
    if (el) dayCellRefs.current.set(dateStr, el);
    else dayCellRefs.current.delete(dateStr);
  }, []);

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

  const displayDayCells = useMemo(() => {
    if (progressMode && calendarSegments) {
      const cells = [];
      calendarSegments.forEach(segment => {
        if (segment.type === "row") {
          segment.days.forEach(day => {
            if (day) cells.push(day);
          });
        }
      });
      return cells;
    }
    return calendarDays.filter(Boolean);
  }, [progressMode, calendarSegments, calendarDays]);

  const pacmanRowPath = useMemo(() => {
    const rows = [];
    if (progressMode && calendarSegments) {
      calendarSegments.forEach(segment => {
        if (segment.type === "row") {
          const rowDays = segment.days.filter(Boolean);
          if (rowDays.length) rows.push(rowDays);
        }
      });
    } else {
      for (let i = 0; i < calendarDays.length; i += 7) {
        const rowDays = calendarDays.slice(i, i + 7).filter(Boolean);
        if (rowDays.length) rows.push(rowDays);
      }
    }

    const path = [];
    rows.forEach((row, rowIdx) => {
      const rowDays = row.filter(Boolean);
      if (!rowDays.length) return;

      const reverseRow = rowIdx % 2 === 1;
      const orderedDays = reverseRow ? [...rowDays].reverse() : rowDays;
      const direction = reverseRow ? "left" : "right";

      orderedDays.forEach((dayData, colIdx) => {
        path.push({
          dayData,
          direction,
          isRowJump: colIdx === 0 && rowIdx > 0,
        });
      });
    });
    return path;
  }, [calendarDays, calendarSegments, progressMode]);

  const greenDayCount = useMemo(
    () => displayDayCells.filter(d => isGreenHeatmapDay(d, progressMode, getProgressTotal)).length,
    [displayDayCells, progressMode, getProgressTotal],
  );

  useEffect(() => {
    pacmanRunIdRef.current += 1;
    setEatenDates(new Set());
    setSplatterDates(new Set());
    setPacmanStarted(false);
    setPacmanVisible(false);
    setPacmanDate(null);
    setEatingDate(null);
    setPacmanPos(null);
    setPacmanInstant(false);
    setAutoPlaySuppressed(false);
  }, [viewYear, viewMonth]);

  const resetPacmanGame = useCallback((suppressAutoPlay = false) => {
    pacmanRunIdRef.current += 1;
    setPacmanStarted(false);
    setPacmanVisible(false);
    setPacmanDate(null);
    setEatingDate(null);
    setPacmanPos(null);
    setPacmanInstant(false);
    setEatenDates(new Set());
    setSplatterDates(new Set());
    if (suppressAutoPlay) setAutoPlaySuppressed(true);
  }, []);

  const startPacman = useCallback(() => {
    if (greenDayCount === 0 || pacmanStarted) return;
    setEatenDates(new Set());
    setSplatterDates(new Set());
    setPacmanVisible(false);
    setPacmanPos(null);
    setPacmanDate(null);
    setEatingDate(null);
    setPacmanInstant(false);
    pacmanRunIdRef.current += 1;
    setPacmanStarted(true);
  }, [greenDayCount, pacmanStarted]);

  startPacmanRef.current = startPacman;

  const handleTogglePacman = useCallback(() => {
    if (pacmanStarted || pacmanVisible) {
      resetPacmanGame(true);
    } else {
      startPacman();
    }
  }, [pacmanStarted, pacmanVisible, resetPacmanGame, startPacman]);

  const isPacmanPlaying = pacmanStarted || pacmanVisible;

  useEffect(() => {
    if (autoPlaySuppressed || isPacmanPlaying || greenDayCount === 0) return undefined;

    const node = calendarGridRef.current;
    if (!node) return undefined;

    let timer = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry?.isIntersecting && entry.intersectionRatio >= 0.35;
        if (visible) {
          if (!timer) {
            timer = setTimeout(() => {
              if (!autoPlaySuppressedRef.current) startPacmanRef.current();
            }, PACMAN_GAZE_MS);
          }
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0, 0.35, 0.55] },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [autoPlaySuppressed, isPacmanPlaying, greenDayCount, viewYear, viewMonth]);

  useEffect(() => {
    if (!pacmanStarted) return undefined;

    const runId = pacmanRunIdRef.current;
    const path = pacmanRowPath;
    if (!path.length) {
      setPacmanStarted(false);
      return undefined;
    }

    let index = 0;
    let moveTimer = null;
    let eatTimer = null;
    let startTimer = null;
    let replayTimer = null;
    const mouthTimer = setInterval(() => {
      if (pacmanRunIdRef.current !== runId) return;
      setMouthOpen(open => !open);
    }, 220);

    const isActive = () => pacmanRunIdRef.current === runId;

    const finishPacman = () => {
      if (!isActive()) return;
      setPacmanVisible(false);
      setPacmanStarted(false);
      setPacmanDate(null);
      setEatingDate(null);
      setPacmanInstant(false);

      replayTimer = setTimeout(() => {
        if (!autoPlaySuppressedRef.current) {
          startPacmanRef.current();
        }
      }, PACMAN_REPLAY_MS);
    };

    const movePacmanTo = (step) => {
      if (!isActive()) return;
      const { dayData, direction, isRowJump } = step;
      setPacmanDir(direction);
      setPacmanInstant(isRowJump);
      setPacmanDate(dayData.dateStr);

      const placePacman = () => {
        if (!isActive()) return;
        const el = dayCellRefs.current.get(dayData.dateStr);
        const grid = calendarGridRef.current;
        if (!el || !grid) return false;
        const g = grid.getBoundingClientRect();
        const c = el.getBoundingClientRect();
        const half = pacmanSpriteSize / 2;
        setPacmanPos({
          left: c.left - g.left + c.width / 2 - half,
          top: c.top - g.top + c.height / 2 - half,
        });
        return true;
      };

      requestAnimationFrame(() => {
        if (!placePacman()) {
          requestAnimationFrame(placePacman);
        }
      });

      if (isGreenHeatmapDay(dayData, progressMode, getProgressTotalRef.current)) {
        setEatingDate(dayData.dateStr);
        setSplatterDates(prev => {
          const next = new Set(prev);
          next.add(dayData.dateStr);
          return next;
        });
        if (eatTimer) clearTimeout(eatTimer);
        eatTimer = setTimeout(() => {
          if (!isActive()) return;
          setEatenDates(prev => {
            if (prev.has(dayData.dateStr)) return prev;
            const next = new Set(prev);
            next.add(dayData.dateStr);
            return next;
          });
          setEatingDate(prev => (prev === dayData.dateStr ? null : prev));
        }, PACMAN_EAT_MS);
      }
    };

    const step = () => {
      if (!isActive()) return;
      if (index >= path.length) {
        finishPacman();
        return;
      }

      const current = path[index];
      setPacmanVisible(true);
      movePacmanTo(current);
      index += 1;

      const isGreen = isGreenHeatmapDay(current.dayData, progressMode, getProgressTotalRef.current);
      const rowJumpPause = current.isRowJump ? 80 : 0;
      const delay = rowJumpPause + (isGreen ? PACMAN_STEP_MS + PACMAN_EAT_MS : PACMAN_STEP_MS);

      if (index < path.length) {
        moveTimer = setTimeout(step, delay);
      } else {
        moveTimer = setTimeout(finishPacman, isGreen ? PACMAN_EAT_MS + 240 : 260);
      }
    };

    startTimer = setTimeout(step, 100);

    return () => {
      if (startTimer) clearTimeout(startTimer);
      if (moveTimer) clearTimeout(moveTimer);
      if (eatTimer) clearTimeout(eatTimer);
      if (replayTimer) clearTimeout(replayTimer);
      clearInterval(mouthTimer);
    };
  }, [pacmanStarted, pacmanRowPath, progressMode, pacmanSpriteSize]);

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

  const renderEatenPlaceholder = (dateStr) => (
    <div
      key={dateStr}
      ref={el => registerDayRef(dateStr, el)}
      className="relative aspect-square"
      aria-hidden
    >
      {splatterDates.has(dateStr) && (
        <EatSplatter size={ghostSpriteSize + 8} mini={mini} />
      )}
    </div>
  );

  const renderProgressDay = (dayData) => {
    const { day, dateStr, count, isFuture, isToday } = dayData;
    const wasEaten = eatenDates.has(dateStr);
    if (wasEaten) return renderEatenPlaceholder(dateStr);
    const dayTotal = getProgressTotal(dateStr);
    const progress = !wasEaten && dayTotal > 0 ? Math.min(count / dayTotal, 1) : 0;
    const isAllDone = !wasEaten && progress >= 1;
    const showGhost = ghostMode && isAllDone;
    const isBeingEaten = eatingDate === dateStr;
    const showSplatter = splatterDates.has(dateStr) || isBeingEaten;
    const size = mini ? 30 : 40;
    const strokeWidth = mini ? 2 : 2.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - progress * circumference;
    const ringColor = isAllDone ? GREEN_DONE : activeColor;

    return (
      <motion.button
        key={dateStr}
        ref={el => registerDayRef(dateStr, el)}
        whileTap={!isFuture && onDateClick ? { scale: 0.85 } : {}}
        onClick={() => onDateClick && !isFuture && onDateClick(dateStr, dayData.isCompleted)}
        disabled={isFuture || !onDateClick}
        className={`aspect-square flex items-center justify-center relative ${isFuture ? "opacity-30" : onDateClick ? "cursor-pointer" : ""}`}
      >
        {showSplatter && <EatSplatter size={ghostSpriteSize + 8} mini={mini} />}
        {showGhost ? (
          <GhostSprite size={ghostSpriteSize} isBeingEaten={isBeingEaten} />
        ) : (
          <svg width={size} height={size} className="absolute inset-0 m-auto -rotate-90">
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={isDarkMode ? "#27272a" : "#e2e8f0"}
              strokeWidth={strokeWidth}
            />
            {!wasEaten && count > 0 && (
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
        )}
        <div
          className={`relative z-10 flex flex-col items-center justify-center ${
            isToday ? (mini ? "text-[8px]" : "text-[10px]") : mini ? "text-[10px]" : "text-xs"
          } ${showGhost ? "opacity-0" : ""}`}
        >
          <span
            className="font-semibold transition-colors duration-200"
            style={{
              color: isAllDone
                ? GREEN_DONE
                : !wasEaten && count > 0
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
              style={{ color: isAllDone ? GREEN_DONE : "#ef4444" }}
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

  const headerPad = mini ? "px-2.5 pt-2 pb-1.5" : compact ? "px-3 pt-2.5 pb-1.5" : "px-3 pt-3 pb-2";
  const calendarPad = mini ? "px-2.5 pb-2" : compact ? "px-3 pb-2" : "px-3 pb-2.5";
  const monthTitleClass = mini ? "text-sm" : "text-lg";
  const navBtnPad = mini ? "p-1.5" : "p-2";
  const navIconClass = mini ? "w-4 h-4" : "w-5 h-5";
  /** Mini: use full container width so 7-column grid spreads evenly (avoid right-side dead space). */
  const calendarInnerClass = mini
    ? "w-full max-w-full"
    : "w-full md:max-w-[min(100%,20.5rem)] lg:max-w-[22.5rem] md:mx-auto";
  const dayHeaderGap = mini ? "gap-0.5" : "gap-1";
  const dayHeaderCell = mini
    ? "text-center text-[9px] font-semibold py-1"
    : "text-center text-[11px] font-semibold py-2";
  const gridGap = "gap-1.5";

  return (
    <div className={chartSectionClass(isDarkMode, mini ? "rounded-card" : undefined)}>
      {/* Header */}
      <div className={headerPad}>
        {label && !mini ? (
          <ChartSectionHeader
            icon={Calendar}
            label={label}
            meta={subtitle || undefined}
            isDarkMode={isDarkMode}
            className="px-0 pt-0 pb-2"
          >
            <div className="flex shrink-0 gap-1.5">
              {stats.streak > 0 && (
                <div
                  className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold ${
                    isDarkMode
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-orange-500/10 text-orange-600"
                  }`}
                >
                  🔥 {stats.streak}
                </div>
              )}
              <div
                className="rounded-pill px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: `${activeColor}22`, color: activeColor }}
              >
                {stats.completed} days
              </div>
            </div>
          </ChartSectionHeader>
        ) : label && mini ? (
          <div className="mb-2 flex items-center justify-between">
            <p className={`text-section-header ${isDarkMode ? "text-iron-200" : ""}`}>{label}</p>
          </div>
        ) : null}

        {/* Year Pills */}
        {!compact && availableYears.length > 1 && (
          <ChartSegmentTrack isDarkMode={isDarkMode} className="mb-2 flex gap-0.5 overflow-x-auto scrollbar-hide">
            {availableYears.map(year => (
              <ChartSegmentButton
                key={year}
                isDarkMode={isDarkMode}
                selected={viewYear === year}
                onClick={() => handleYearChange(year)}
                className="shrink-0"
              >
                {year}
              </ChartSegmentButton>
            ))}
          </ChartSegmentTrack>
        )}

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
            className={`${navBtnPad} rounded-card disabled:opacity-30 transition-colors ${
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
            className={`${navBtnPad} rounded-card disabled:opacity-30 transition-colors ${
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
        <div className={calendarInnerClass}>
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
        <div ref={calendarGridRef} className="relative">
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

                  const { day, dateStr, isCompleted, isFuture, isToday } = dayData;
                  const wasEaten = eatenDates.has(dateStr);
                  if (wasEaten) return renderEatenPlaceholder(dateStr);

                  const showCompleted = isCompleted;
                  const showGhost = ghostMode && showCompleted;
                  const isBeingEaten = eatingDate === dateStr;
                  const showSplatter = splatterDates.has(dateStr) || isBeingEaten;
                  const neutralBg = isDarkMode ? "#27272a" : "#f1f5f9";
                  const todayBg = isDarkMode ? "#3f3f46" : "#e2e8f0";

                  return (
                    <motion.button
                      key={dateStr}
                      ref={el => registerDayRef(dateStr, el)}
                      whileTap={!isFuture && onDateClick ? { scale: 0.85 } : {}}
                      onClick={() => onDateClick && !isFuture && onDateClick(dateStr, isCompleted)}
                      disabled={isFuture || !onDateClick}
                      className={`
                        aspect-square ${mini ? "rounded-lg" : "rounded-card"} flex flex-col items-center justify-center
                        font-semibold transition-all duration-200 relative overflow-visible
                        ${isFuture ? "opacity-30" : onDateClick ? "cursor-pointer" : ""}
                        ${isToday && !showGhost ? (mini ? "text-[9px]" : "text-[10px]") : mini ? "text-xs" : "text-sm"}
                      `}
                      style={{
                        backgroundColor: showGhost
                          ? neutralBg
                          : showCompleted
                            ? activeColor
                            : isToday
                              ? todayBg
                              : neutralBg,
                        color: showGhost
                          ? isDarkMode ? "#71717a" : "#94a3b8"
                          : showCompleted
                            ? "#fff"
                            : isToday
                              ? isDarkMode ? "#fff" : "#1e293b"
                              : isDarkMode ? "#71717a" : "#94a3b8",
                        boxShadow: showGhost
                          ? "none"
                          : showCompleted
                            ? `0 2px 8px ${activeColor}66`
                            : isToday && !showCompleted
                              ? isDarkMode
                                ? "inset 0 0 0 2px #ef4444"
                                : "inset 0 0 0 2px #dc2626"
                              : "none",
                      }}
                    >
                      {showSplatter && <EatSplatter size={ghostSpriteSize + 8} mini={mini} />}
                      {showGhost && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <GhostSprite size={ghostSpriteSize} isBeingEaten={isBeingEaten} />
                        </div>
                      )}
                      <span className={showGhost ? "opacity-0" : ""}>{day}</span>
                      {isToday && !showGhost && (
                        <span
                          className={`${mini ? "text-[5px]" : "text-[7px]"} font-bold leading-none`}
                          style={{ color: showCompleted ? "#fff" : "#ef4444" }}
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

        {pacmanVisible && pacmanPos && (
          <motion.div
            className="absolute z-30 pointer-events-none"
            animate={{ left: pacmanPos.left, top: pacmanPos.top }}
            transition={{
              type: "tween",
              duration: pacmanInstant ? 0 : PACMAN_MOVE_DURATION,
              ease: "linear",
            }}
          >
            <PacmanSprite
              direction={pacmanDir}
              mouthOpen={mouthOpen}
              size={pacmanSpriteSize}
              isRunning={!eatingDate}
              isEating={Boolean(eatingDate && pacmanDate === eatingDate)}
            />
          </motion.div>
        )}
        </div>

        {/* Legend + Pac-Man controls */}
        {!compact && (
          <div className="mt-2 border-t border-surface-subtle pt-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <ChartLegend isDarkMode={isDarkMode} className="mx-0 mb-0 flex-1 border-t-0 pt-0">
                {progressMode ? (
                  <>
                    <ChartLegendItem
                      label="Partial"
                      swatch={
                        <svg width="12" height="12" className="-rotate-90">
                          <circle cx="6" cy="6" r="5" fill="none" stroke={isDarkMode ? "#27272a" : "#e2e8f0"} strokeWidth="2" />
                          <circle cx="6" cy="6" r="5" fill="none" stroke={activeColor} strokeWidth="2"
                            strokeDasharray={2 * Math.PI * 5} strokeDashoffset={2 * Math.PI * 5 * 0.5} strokeLinecap="round" />
                        </svg>
                      }
                    />
                    <ChartLegendItem
                      label="All done"
                      swatch={
                        <svg width="12" height="12" className="-rotate-90">
                          <circle cx="6" cy="6" r="5" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      }
                    />
                  </>
                ) : (
                  <>
                    <ChartLegendItem
                      label="Missed"
                      swatch={
                        <div
                          className="h-3 w-3 rounded-md"
                          style={{ backgroundColor: isDarkMode ? "#27272a" : "#f1f5f9" }}
                        />
                      }
                    />
                    <ChartLegendItem
                      label="Completed"
                      swatch={
                        <div
                          className="h-3 w-3 rounded-md"
                          style={{ backgroundColor: activeColor }}
                        />
                      }
                    />
                  </>
                )}
              </ChartLegend>

              {greenDayCount > 0 && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={handleTogglePacman}
                  aria-label={isPacmanPlaying ? "Stop Pac-Man" : "Play Pac-Man"}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                    isPacmanPlaying
                      ? isDarkMode
                        ? "bg-iron-800/70 text-iron-300 hover:bg-iron-700"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : isDarkMode
                        ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  {isPacmanPlaying ? (
                    <>
                      <Square className="h-3 w-3" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" />
                      Play
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

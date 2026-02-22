import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ExerciseIcon from "@/components/ExerciseIcon";

function LineGraph({ data, color = "#fbbf24", height = 140, isDarkMode = true }) {
  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-sm ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  const weights = data.map((d) => d.weight);
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const range = maxWeight - minWeight || 1;

  const padding = { top: 20, bottom: 32, left: 40, right: 16 };
  const graphWidth = 300;
  const graphHeight = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * (graphWidth - padding.left - padding.right);
    const y = padding.top + graphHeight - ((d.weight - minWeight) / range) * graphHeight;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const fillPath = `${pathD} L ${points[points.length - 1].x} ${padding.top + graphHeight} L ${padding.left} ${padding.top + graphHeight} Z`;

  const gridColor = isDarkMode ? "#27272a" : "#e2e8f0";
  const textColor = isDarkMode ? "#71717a" : "#94a3b8";

  const gridCount = 3;
  const gridLines = Array.from({ length: gridCount }, (_, i) => {
    const val = minWeight + (range / (gridCount - 1)) * i;
    const y = padding.top + graphHeight - ((val - minWeight) / range) * graphHeight;
    return { y, val: Math.round(val) };
  });

  return (
    <svg viewBox={`0 0 ${graphWidth} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`pg-grad-${color.replace("#", "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines with labels */}
      {gridLines.map(({ y, val }) => (
        <g key={val}>
          <line x1={padding.left} y1={y} x2={graphWidth - padding.right} y2={y} stroke={gridColor} strokeWidth="1" strokeDasharray="3,3" />
          <text x={padding.left - 6} y={y + 3} textAnchor="end" fill={textColor} fontSize="9">{val}</text>
        </g>
      ))}

      {/* Fill area */}
      <path d={fillPath} fill={`url(#pg-grad-${color.replace("#", "")})`} />

      {/* Main line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, i) => {
        const isFirst = i === 0;
        const isLast = i === points.length - 1;
        const isMax = p.weight === maxWeight && data.length > 2;
        const showLabel = isFirst || isLast || isMax;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={showLabel ? 5 : 3} fill={isDarkMode ? "#18181b" : "#ffffff"} stroke={color} strokeWidth={showLabel ? 2.5 : 1.5} />
            {showLabel && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fill={isMax && !isLast ? (isDarkMode ? "#fbbf24" : "#dc2626") : (isDarkMode ? "#d4d4d8" : "#475569")} fontSize="10" fontWeight="600">
                {p.weight}
              </text>
            )}
          </g>
        );
      })}

      {/* X-axis date labels */}
      {points.length > 0 && (
        <>
          <text x={padding.left} y={height - 6} textAnchor="start" fill={textColor} fontSize="9">
            {formatDate(points[0].date)}
          </text>
          {points.length > 1 && (
            <text x={graphWidth - padding.right} y={height - 6} textAnchor="end" fill={textColor} fontSize="9">
              {formatDate(points[points.length - 1].date)}
            </text>
          )}
          {points.length > 4 && (
            <text x={(padding.left + graphWidth - padding.right) / 2} y={height - 6} textAnchor="middle" fill={textColor} fontSize="9">
              {formatDate(points[Math.floor(points.length / 2)].date)}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

function formatDate(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProgressGraph({
  exerciseName,
  exerciseCategory,
  data = [],
  unit = "kg",
  compact = false,
  isDarkMode = true,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const graphData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const byDate = {};
    data.forEach((log) => {
      const date = log.date;
      if (!byDate[date] || log.weight > byDate[date].weight) {
        byDate[date] = { date, weight: log.weight, reps: log.reps, sets: log.sets };
      }
    });
    return Object.values(byDate).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-12);
  }, [data]);

  const stats = useMemo(() => {
    if (graphData.length < 2) {
      return {
        trend: "neutral",
        change: 0,
        maxWeight: graphData[0]?.weight || 0,
        e1rm: graphData[0] ? Math.round(graphData[0].weight * (1 + (graphData[0].reps || 1) / 30)) : 0,
      };
    }

    const first = graphData[0].weight;
    const last = graphData[graphData.length - 1].weight;
    const change = last - first;
    const maxWeight = Math.max(...graphData.map((d) => d.weight));

    const latestEntry = graphData[graphData.length - 1];
    const e1rm = Math.round(latestEntry.weight * (1 + (latestEntry.reps || 1) / 30));

    return {
      trend: change > 0 ? "up" : change < 0 ? "down" : "neutral",
      change: Math.abs(change),
      changePercent: first > 0 ? ((change / first) * 100).toFixed(1) : 0,
      changeRaw: change,
      maxWeight,
      currentWeight: last,
      totalSessions: data.length,
      e1rm,
    };
  }, [graphData, data]);

  const TrendIcon = stats.trend === "up" ? TrendingUp : stats.trend === "down" ? TrendingDown : Minus;

  const trendColor = stats.trend === "up"
    ? isDarkMode ? "text-green-400" : "text-green-500"
    : stats.trend === "down"
      ? "text-red-400"
      : isDarkMode ? "text-iron-400" : "text-slate-400";

  const trendBg = stats.trend === "up"
    ? "bg-green-500/15"
    : stats.trend === "down"
      ? "bg-red-500/15"
      : isDarkMode ? "bg-iron-800" : "bg-slate-100";

  const accentColor = isDarkMode ? "#fbbf24" : "#dc2626";

  if (compact) {
    return (
      <div className={`rounded-2xl overflow-hidden ${isDarkMode ? "bg-iron-900/50" : "bg-white border border-slate-200 shadow-sm"}`}>
        <button onClick={() => setIsExpanded(!isExpanded)} className="w-full p-4 flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-iron-800" : "bg-slate-100"}`}>
            <ExerciseIcon name={exerciseName} className="w-7 h-7" color={isDarkMode ? "#6b7280" : "#64748b"} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className={`font-medium truncate ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
              {exerciseName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-sm font-semibold ${isDarkMode ? "text-iron-300" : "text-slate-600"}`}>
                {stats.currentWeight || stats.maxWeight}{unit}
              </span>
              {stats.change > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-medium ${trendBg} ${trendColor}`}>
                  <TrendIcon className="w-2.5 h-2.5" />
                  {stats.changeRaw > 0 ? "+" : ""}{stats.changeRaw}{unit}
                </span>
              )}
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className={`w-5 h-5 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
          )}
        </button>

        {isExpanded && (
          <div className={`px-4 pb-4 border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>
            <div className="pt-2">
              <LineGraph data={graphData} height={150} color={accentColor} isDarkMode={isDarkMode} />
            </div>

            {/* Stats row */}
            <div className={`flex gap-2 mt-3 pt-3 border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>
              <div className={`flex-1 rounded-xl p-2 text-center ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}>
                <p className={`text-[10px] ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>Current</p>
                <p className={`font-bold text-sm ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                  {stats.currentWeight || 0}{unit}
                </p>
              </div>
              <div className={`flex-1 rounded-xl p-2 text-center ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}>
                <p className={`text-[10px] ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>Best</p>
                <p className={`font-bold text-sm ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}>
                  {stats.maxWeight || 0}{unit}
                </p>
              </div>
              <div className={`flex-1 rounded-xl p-2 text-center ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}>
                <p className={`text-[10px] ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>Est. 1RM</p>
                <p className={`font-bold text-sm ${isDarkMode ? "text-orange-400" : "text-orange-600"}`}>
                  {stats.e1rm || 0}{unit}
                </p>
              </div>
              <div className={`flex-1 rounded-xl p-2 text-center ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}>
                <p className={`text-[10px] ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>Sessions</p>
                <p className={`font-bold text-sm ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                  {stats.totalSessions}
                </p>
              </div>
            </div>

            {/* Last few entries */}
            {graphData.length > 0 && (
              <div className={`mt-3 pt-3 border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>
                <p className={`text-[10px] uppercase tracking-wider font-medium mb-1.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                  Recent sessions
                </p>
                <div className="space-y-1">
                  {graphData.slice(-4).reverse().map((d) => (
                    <div key={d.date} className={`flex items-center justify-between py-1 text-xs ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
                      <span>{formatDate(d.date)}</span>
                      <span className={`font-medium ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                        {d.weight}{unit} × {d.reps} reps
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-4 ${isDarkMode ? "bg-iron-900/50" : "bg-white border border-slate-200 shadow-sm"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-iron-800" : "bg-slate-100"}`}>
            <ExerciseIcon name={exerciseName} className="w-8 h-8" color={accentColor} />
          </div>
          <div>
            <h3 className={`font-semibold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>{exerciseName}</h3>
            <p className={`text-sm capitalize ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>{exerciseCategory}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${trendBg}`}>
          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
          <span className={`font-medium ${trendColor}`}>
            {stats.changeRaw > 0 && "+"}{stats.changeRaw || 0}{unit}
          </span>
        </div>
      </div>

      <LineGraph data={graphData} height={160} color={accentColor} isDarkMode={isDarkMode} />

      <div className="grid grid-cols-4 gap-2 mt-4">
        <div className={`text-center p-2 rounded-xl ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}>
          <p className={`text-[10px] ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>Current</p>
          <p className={`font-bold text-sm ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>{stats.currentWeight || 0}{unit}</p>
        </div>
        <div className={`text-center p-2 rounded-xl ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}>
          <p className={`text-[10px] ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>Best</p>
          <p className={`font-bold text-sm ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}>{stats.maxWeight || 0}{unit}</p>
        </div>
        <div className={`text-center p-2 rounded-xl ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}>
          <p className={`text-[10px] ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>Est. 1RM</p>
          <p className={`font-bold text-sm ${isDarkMode ? "text-orange-400" : "text-orange-600"}`}>{stats.e1rm || 0}{unit}</p>
        </div>
        <div className={`text-center p-2 rounded-xl ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}>
          <p className={`text-[10px] ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>Sessions</p>
          <p className={`font-bold text-sm ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>{stats.totalSessions}</p>
        </div>
      </div>
    </div>
  );
}

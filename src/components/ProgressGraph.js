import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import ExerciseIcon from "@/components/ExerciseIcon";
import {
  ChartBody,
  ChartCollapsibleHeader,
  ChartSection,
  chartPanelInnerClass,
} from "@/components/charts/ChartChrome";
import { cn } from "@/lib/utils";

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

  const padding = { top: 12, bottom: 22, left: 32, right: 10 };
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
      : isDarkMode ? "bg-iron-800" : "chart-panel-inner";

  const accentColor = isDarkMode ? "#fbbf24" : "#2563eb";

  if (compact) {
    return (
      <ChartSection isDarkMode={isDarkMode}>
        <ChartCollapsibleHeader
          isDarkMode={isDarkMode}
          leading={
            <ExerciseIcon
              name={exerciseName}
              className="h-7 w-7 shrink-0 rounded-card"
              color={isDarkMode ? "#6b7280" : "#64748b"}
            />
          }
          label={exerciseName}
          meta={`${stats.currentWeight || stats.maxWeight}${unit}`}
          expanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
          trailing={
            stats.change > 0 ? (
              <span className={cn("flex shrink-0 items-center gap-0.5 rounded-pill px-1.5 py-0.5 text-[10px] font-semibold", trendBg, trendColor)}>
                <TrendIcon className="h-2.5 w-2.5" />
                {stats.changeRaw > 0 ? "+" : ""}{stats.changeRaw}{unit}
              </span>
            ) : null
          }
        />

        {isExpanded && (
          <ChartBody isDarkMode={isDarkMode}>
            <LineGraph data={graphData} height={132} color={accentColor} isDarkMode={isDarkMode} />

            <div className="mt-2 flex gap-1.5 border-t border-surface-subtle pt-2">
              {[
                ["Current", stats.currentWeight || 0, isDarkMode ? "text-iron-200" : "text-[color:var(--text-primary)]"],
                ["Best", stats.maxWeight || 0, isDarkMode ? "text-lift-primary" : "text-[color:var(--text-primary)]"],
                ["Est. 1RM", stats.e1rm || 0, isDarkMode ? "text-orange-400" : "text-orange-600"],
                ["Sessions", stats.totalSessions, isDarkMode ? "text-iron-200" : "text-[color:var(--text-primary)]"],
              ].map(([lbl, val, colorClass]) => (
                <div key={lbl} className={cn("flex-1 rounded-card p-1.5 text-center", chartPanelInnerClass(isDarkMode))}>
                  <p className="text-metadata">{lbl}</p>
                  <p className={cn("text-sm font-bold", colorClass)}>{val}{lbl !== "Sessions" ? unit : ""}</p>
                </div>
              ))}
            </div>

            {graphData.length > 0 && (
              <div className="mt-2 border-t border-surface-subtle pt-2">
                <p className="text-section-header mb-1">Recent sessions</p>
                <div className="space-y-0.5">
                  {graphData.slice(-4).reverse().map(d => (
                    <div key={d.date} className={`flex items-center justify-between py-0.5 text-xs ${isDarkMode ? "text-iron-400" : "text-[color:var(--text-secondary)]"}`}>
                      <span>{formatDate(d.date)}</span>
                      <span className={`font-medium ${isDarkMode ? "text-iron-200" : "text-[color:var(--text-primary)]"}`}>
                        {d.weight}{unit} × {d.reps} reps
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartBody>
        )}
      </ChartSection>
    );
  }

  return (
    <ChartSection isDarkMode={isDarkMode}>
      <div className="px-3 pt-3 pb-2">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExerciseIcon name={exerciseName} className="h-8 w-8" color={accentColor} />
            <div>
              <h3 className={`text-card-title ${isDarkMode ? "text-iron-100" : ""}`}>{exerciseName}</h3>
              <p className="text-metadata capitalize">{exerciseCategory}</p>
            </div>
          </div>
          <div className={cn("flex items-center gap-1 rounded-card px-2 py-1", trendBg)}>
            <TrendIcon className={cn("h-4 w-4", trendColor)} />
            <span className={cn("text-sm font-medium", trendColor)}>
              {stats.changeRaw > 0 && "+"}{stats.changeRaw || 0}{unit}
            </span>
          </div>
        </div>
      </div>

      <div className="px-3 pb-3">
        <LineGraph data={graphData} height={148} color={accentColor} isDarkMode={isDarkMode} />

        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {[
            ["Current", stats.currentWeight || 0],
            ["Best", stats.maxWeight || 0],
            ["Est. 1RM", stats.e1rm || 0],
            ["Sessions", stats.totalSessions],
          ].map(([lbl, val]) => (
            <div key={lbl} className={cn("rounded-card p-1.5 text-center", chartPanelInnerClass(isDarkMode))}>
              <p className="text-metadata">{lbl}</p>
              <p className={`text-sm font-bold ${isDarkMode ? "text-iron-100" : "text-[color:var(--text-primary)]"}`}>
                {val}{lbl !== "Sessions" ? unit : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </ChartSection>
  );
}

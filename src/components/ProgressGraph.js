import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ExerciseIcon from "@/components/ExerciseIcon";

// Simple line graph component
function LineGraph({ data, color = "#22c55e", height = 120 }) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-iron-600 text-sm"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  const maxWeight = Math.max(...data.map((d) => d.weight));
  const minWeight = Math.min(...data.map((d) => d.weight));
  const range = maxWeight - minWeight || 1;

  const padding = { top: 10, bottom: 30, left: 10, right: 10 };
  const graphWidth = 300;
  const graphHeight = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x =
      padding.left +
      (i / (data.length - 1 || 1)) *
        (graphWidth - padding.left - padding.right);
    const y =
      padding.top +
      graphHeight -
      ((d.weight - minWeight) / range) * graphHeight;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Create gradient fill path
  const fillPath = `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

  return (
    <svg
      viewBox={`0 0 ${graphWidth} ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={`gradient-${color}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={graphWidth - padding.right}
        y2={padding.top}
        stroke="#374151"
        strokeWidth="1"
        strokeDasharray="4"
      />
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={graphWidth - padding.right}
        y2={height - padding.bottom}
        stroke="#374151"
        strokeWidth="1"
      />

      {/* Fill area */}
      <path d={fillPath} fill={`url(#gradient-${color})`} />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#18181b"
            stroke={color}
            strokeWidth="2"
          />
          {/* Show weight on first and last points */}
          {(i === 0 || i === points.length - 1) && (
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="10"
              fontWeight="500"
            >
              {p.weight}
            </text>
          )}
        </g>
      ))}

      {/* X-axis labels */}
      {points.length > 0 && (
        <>
          <text
            x={padding.left}
            y={height - 8}
            textAnchor="start"
            fill="#6b7280"
            fontSize="9"
          >
            {formatDate(points[0].date)}
          </text>
          {points.length > 1 && (
            <text
              x={graphWidth - padding.right}
              y={height - 8}
              textAnchor="end"
              fill="#6b7280"
              fontSize="9"
            >
              {formatDate(points[points.length - 1].date)}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProgressGraph({
  exerciseName,
  exerciseCategory,
  data = [],
  unit = "kg",
  compact = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Process data for the graph
  const graphData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group by date and get max weight per day
    const byDate = {};
    data.forEach((log) => {
      const date = log.date;
      if (!byDate[date] || log.weight > byDate[date].weight) {
        byDate[date] = {
          date,
          weight: log.weight,
          reps: log.reps,
          sets: log.sets,
        };
      }
    });

    // Sort by date and take last 10 sessions
    return Object.values(byDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-10);
  }, [data]);

  // Calculate progress stats
  const stats = useMemo(() => {
    if (graphData.length < 2) {
      return {
        trend: "neutral",
        change: 0,
        maxWeight: graphData[0]?.weight || 0,
      };
    }

    const first = graphData[0].weight;
    const last = graphData[graphData.length - 1].weight;
    const change = last - first;
    const maxWeight = Math.max(...graphData.map((d) => d.weight));

    return {
      trend: change > 0 ? "up" : change < 0 ? "down" : "neutral",
      change: Math.abs(change),
      changePercent: first > 0 ? ((change / first) * 100).toFixed(1) : 0,
      maxWeight,
      currentWeight: last,
      totalSessions: data.length,
    };
  }, [graphData, data]);

  const TrendIcon =
    stats.trend === "up"
      ? TrendingUp
      : stats.trend === "down"
        ? TrendingDown
        : Minus;
  const trendColor =
    stats.trend === "up"
      ? "text-lift-primary"
      : stats.trend === "down"
        ? "text-red-400"
        : "text-iron-400";

  if (compact) {
    return (
      <div className="bg-iron-900/50 rounded-2xl overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-xl bg-iron-800 flex items-center justify-center flex-shrink-0">
            <ExerciseIcon
              name={exerciseName}
              className="w-8 h-8"
              color="#6b7280"
            />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-iron-100 font-medium truncate">{exerciseName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`flex items-center gap-1 text-sm ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                {stats.change > 0
                  ? `+${stats.change}${unit}`
                  : `${stats.change}${unit}`}
              </span>
              <span className="text-iron-600 text-sm">·</span>
              <span className="text-iron-500 text-sm">
                Max: {stats.maxWeight}
                {unit}
              </span>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-iron-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-iron-500" />
          )}
        </button>

        {isExpanded && (
          <div className="px-4 pb-4">
            <LineGraph data={graphData} height={120} />
            {graphData.length > 0 && (
              <div className="flex justify-between text-xs text-iron-500 mt-2">
                <span>{graphData.length} sessions tracked</span>
                <span>
                  Current: {stats.currentWeight}
                  {unit}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-iron-900/50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-iron-800 flex items-center justify-center">
            <ExerciseIcon
              name={exerciseName}
              className="w-8 h-8"
              color="#22c55e"
            />
          </div>
          <div>
            <h3 className="text-iron-100 font-semibold">{exerciseName}</h3>
            <p className="text-iron-500 text-sm capitalize">
              {exerciseCategory}
            </p>
          </div>
        </div>
        <div
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
            stats.trend === "up"
              ? "bg-lift-primary/20"
              : stats.trend === "down"
                ? "bg-red-500/20"
                : "bg-iron-800"
          }`}
        >
          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
          <span className={`font-medium ${trendColor}`}>
            {stats.change > 0 && "+"}
            {stats.change}
            {unit}
          </span>
        </div>
      </div>

      <LineGraph data={graphData} height={140} />

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="text-center p-2 bg-iron-800/50 rounded-xl">
          <p className="text-iron-500 text-xs">Current</p>
          <p className="text-iron-100 font-bold">
            {stats.currentWeight || 0}
            {unit}
          </p>
        </div>
        <div className="text-center p-2 bg-iron-800/50 rounded-xl">
          <p className="text-iron-500 text-xs">Max</p>
          <p className="text-lift-primary font-bold">
            {stats.maxWeight || 0}
            {unit}
          </p>
        </div>
        <div className="text-center p-2 bg-iron-800/50 rounded-xl">
          <p className="text-iron-500 text-xs">Sessions</p>
          <p className="text-iron-100 font-bold">{stats.totalSessions}</p>
        </div>
      </div>
    </div>
  );
}

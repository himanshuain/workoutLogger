import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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

const GRAPH_HEIGHT = 156;
const PADDING = { top: 18, bottom: 26, left: 36, right: 12 };

function formatDate(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildPoints(data, width) {
  const weights = data.map(d => d.weight);
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const range = maxWeight - minWeight || 1;
  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = GRAPH_HEIGHT - PADDING.top - PADDING.bottom;

  const points = data.map((d, i) => {
    const t = data.length === 1 ? 0.5 : i / (data.length - 1);
    const x = PADDING.left + t * plotWidth;
    const y = PADDING.top + plotHeight - ((d.weight - minWeight) / range) * plotHeight;
    return { x, y, ...d };
  });

  return { points, maxWeight, minWeight, range, plotHeight };
}

function LineGraph({ data, color = "#fbbf24", isDarkMode = true }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setWidth(Math.max(0, Math.floor(el.getBoundingClientRect().width)));
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nearestIndex = useCallback(
    clientX => {
      if (!containerRef.current || !data?.length || width <= 0) return null;

      const rect = containerRef.current.getBoundingClientRect();
      const plotLeft = (PADDING.left / width) * rect.width;
      const plotRight = ((width - PADDING.right) / width) * rect.width;
      const plotWidth = plotRight - plotLeft;
      if (plotWidth <= 0) return 0;

      const xInPlot = Math.min(Math.max(clientX - rect.left - plotLeft, 0), plotWidth);
      const t = xInPlot / plotWidth;
      const raw = t * (data.length - 1);
      return Math.round(raw);
    },
    [data, width],
  );

  const handlePointerMove = useCallback(
    e => {
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      if (clientX == null) return;
      const idx = nearestIndex(clientX);
      if (idx != null) setHoverIndex(idx);
    },
    [nearestIndex],
  );

  const clearHover = useCallback(() => setHoverIndex(null), []);

  if (!data || data.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`flex w-full items-center justify-center text-sm ${isDarkMode ? "text-iron-600" : "text-[color:var(--text-muted)]"}`}
        style={{ height: GRAPH_HEIGHT }}
      >
        No data yet
      </div>
    );
  }

  if (width <= 0) {
    return <div ref={containerRef} className="w-full" style={{ height: GRAPH_HEIGHT }} />;
  }

  const { points, maxWeight, minWeight, range, plotHeight } = buildPoints(data, width);
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const fillPath = `${pathD} L ${points[points.length - 1].x} ${PADDING.top + plotHeight} L ${PADDING.left} ${PADDING.top + plotHeight} Z`;

  const gridColor = isDarkMode ? "#27272a" : "#f2f2f2";
  const textColor = isDarkMode ? "#71717a" : "#8e8e93";
  const gradId = `pg-grad-${color.replace("#", "")}`;

  const gridCount = 3;
  const gridLines = Array.from({ length: gridCount }, (_, i) => {
    const val = minWeight + (range / (gridCount - 1)) * i;
    const y = PADDING.top + plotHeight - ((val - minWeight) / range) * plotHeight;
    return { y, val: Math.round(val) };
  });

  const active = hoverIndex != null ? points[hoverIndex] : null;
  const plotLeftPx = (PADDING.left / width) * 100;
  const plotWidthPx = ((width - PADDING.left - PADDING.right) / width) * 100;

  return (
    <div
      ref={containerRef}
      className="relative w-full touch-none"
      onMouseMove={handlePointerMove}
      onMouseLeave={clearHover}
      onTouchStart={handlePointerMove}
      onTouchMove={handlePointerMove}
      onTouchEnd={clearHover}
    >
      <svg
        width={width}
        height={GRAPH_HEIGHT}
        className="block w-full overflow-visible"
        role="img"
        aria-label="Weight progression chart"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridLines.map(({ y, val }) => (
          <g key={val}>
            <line
              x1={PADDING.left}
              y1={y}
              x2={width - PADDING.right}
              y2={y}
              stroke={gridColor}
              strokeWidth="1"
            />
            <text x={PADDING.left - 8} y={y + 3} textAnchor="end" fill={textColor} fontSize="10">
              {val}
            </text>
          </g>
        ))}

        <path d={fillPath} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => {
          const isHovered = hoverIndex === i;
          const isLast = i === points.length - 1;
          const showLabel = hoverIndex == null && (i === 0 || isLast || (p.weight === maxWeight && data.length > 2));
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : 4}
                fill={isDarkMode ? "#18181b" : "#ffffff"}
                stroke={color}
                strokeWidth={isHovered ? 2.5 : 2}
              />
              {showLabel && (
                <text
                  x={p.x}
                  y={p.y - 10}
                  textAnchor="middle"
                  fill={isDarkMode ? "#d4d4d8" : "#2d3436"}
                  fontSize="10"
                  fontWeight="600"
                >
                  {p.weight}
                </text>
              )}
            </g>
          );
        })}

        {active && (
          <>
            <line
              x1={active.x}
              y1={PADDING.top}
              x2={active.x}
              y2={PADDING.top + plotHeight}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="4,3"
              opacity="0.55"
            />
            <circle cx={active.x} cy={active.y} r={6} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2" />
          </>
        )}

        {points.length > 0 && (
          <>
            <text x={PADDING.left} y={GRAPH_HEIGHT - 8} textAnchor="start" fill={textColor} fontSize="10">
              {formatDate(points[0].date)}
            </text>
            {points.length > 1 && (
              <text x={width - PADDING.right} y={GRAPH_HEIGHT - 8} textAnchor="end" fill={textColor} fontSize="10">
                {formatDate(points[points.length - 1].date)}
              </text>
            )}
          </>
        )}
      </svg>

      {/* Full-width hover capture over plot area */}
      <div
        className="absolute inset-y-0 cursor-crosshair"
        style={{ left: `${plotLeftPx}%`, width: `${plotWidthPx}%` }}
        aria-hidden
      />

      {active && (
        <div
          className={cn(
            "pointer-events-none absolute z-10 rounded-card px-2.5 py-1.5 text-xs shadow-md",
            isDarkMode ? "border border-iron-700 bg-iron-900/95 text-iron-100" : "border border-surface-subtle bg-white text-[color:var(--text-primary)]",
          )}
          style={{
            left: Math.min(Math.max(active.x - 48, 4), width - 100),
            top: Math.max(active.y - 52, 4),
          }}
        >
          <p className="font-semibold">{active.weight} kg</p>
          <p className={isDarkMode ? "text-iron-400" : "text-[color:var(--text-muted)]"}>
            {formatDate(active.date)} · {active.reps} reps
          </p>
        </div>
      )}
    </div>
  );
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
    data.forEach(log => {
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
    const maxWeight = Math.max(...graphData.map(d => d.weight));

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
    ? isDarkMode ? "text-green-400" : "text-[#2e7d32]"
    : stats.trend === "down"
      ? "text-red-400"
      : isDarkMode ? "text-iron-400" : "text-[color:var(--text-muted)]";

  const trendBg = stats.trend === "up"
    ? isDarkMode ? "bg-green-500/15" : "bg-[#e8f5e9]"
    : stats.trend === "down"
      ? "bg-red-500/15"
      : isDarkMode ? "bg-iron-800" : "chart-panel-inner";

  const accentColor = isDarkMode ? "#fbbf24" : "#3b82f6";

  const statTiles = [
    ["Current", stats.currentWeight || stats.maxWeight || 0, isDarkMode ? "text-iron-200" : "text-[color:var(--text-primary)]"],
    ["Best", stats.maxWeight || 0, isDarkMode ? "text-lift-primary" : "text-[color:var(--text-primary)]"],
    ["Est. 1RM", stats.e1rm || 0, isDarkMode ? "text-orange-400" : "text-[#f97316]"],
    ["Sessions", stats.totalSessions || 0, isDarkMode ? "text-iron-200" : "text-[color:var(--text-primary)]"],
  ];

  if (compact) {
    return (
      <ChartSection isDarkMode={isDarkMode} className="w-full">
        <ChartCollapsibleHeader
          isDarkMode={isDarkMode}
          leading={
            <ExerciseIcon
              name={exerciseName}
              className="h-7 w-7 shrink-0 rounded-card"
              color={isDarkMode ? "#6b7280" : "#8e8e93"}
            />
          }
          label={exerciseName}
          meta={`${stats.currentWeight || stats.maxWeight}${unit}`}
          expanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
          trailing={
            stats.change > 0 ? (
              <span className={cn("flex shrink-0 items-center gap-0.5 rounded-pill px-2 py-0.5 text-[10px] font-semibold", trendBg, trendColor)}>
                <TrendIcon className="h-2.5 w-2.5" />
                {stats.changeRaw > 0 ? "+" : ""}{stats.changeRaw}{unit}
              </span>
            ) : null
          }
        />

        {isExpanded && (
          <ChartBody isDarkMode={isDarkMode} className="pt-3">
            <div className="-mx-1 w-[calc(100%+0.5rem)]">
              <LineGraph data={graphData} color={accentColor} isDarkMode={isDarkMode} />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 border-t border-surface-subtle pt-3">
              {statTiles.map(([lbl, val, colorClass]) => (
                <div key={lbl} className={cn("rounded-card px-1 py-2 text-center", chartPanelInnerClass(isDarkMode))}>
                  <p className="text-metadata">{lbl}</p>
                  <p className={cn("text-sm font-bold", colorClass)}>
                    {val}{lbl !== "Sessions" ? unit : ""}
                  </p>
                </div>
              ))}
            </div>

            {graphData.length > 0 && (
              <div className="mt-3 border-t border-surface-subtle pt-3">
                <p className="text-section-header mb-2">Recent sessions</p>
                <div className="space-y-1">
                  {graphData.slice(-4).reverse().map(d => (
                    <div
                      key={d.date}
                      className={`flex items-center justify-between py-0.5 text-xs ${isDarkMode ? "text-iron-400" : "text-[color:var(--text-secondary)]"}`}
                    >
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
    <ChartSection isDarkMode={isDarkMode} className="w-full">
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
        <LineGraph data={graphData} color={accentColor} isDarkMode={isDarkMode} />

        <div className="mt-3 grid grid-cols-4 gap-2">
          {statTiles.map(([lbl, val, colorClass]) => (
            <div key={lbl} className={cn("rounded-card px-1 py-2 text-center", chartPanelInnerClass(isDarkMode))}>
              <p className="text-metadata">{lbl}</p>
              <p className={cn("text-sm font-bold", colorClass)}>
                {val}{lbl !== "Sessions" ? unit : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </ChartSection>
  );
}

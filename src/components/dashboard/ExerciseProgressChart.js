import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { ChartBody, ChartSection, ChartSectionHeader } from "@/components/charts/ChartChrome";
import RichChartTooltip from "@/components/charts/RichChartTooltip";
import { getChartColors } from "@/lib/chartTheme";
import { formatFullDate } from "@/lib/chartInsights";
import { exerciseProgressSeries } from "@/lib/dashboardData";
import { exercisesForMuscleGroup, MUSCLE_GROUPS, MUSCLE_GROUP_COLORS } from "@/lib/exerciseCategories";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const LINE_COLORS_DARK = ["#fbbf24", "#22c55e", "#3b82f6", "#a78bfa", "#f472b6", "#14b8a6", "#fb923c", "#818cf8"];
const LINE_COLORS_LIGHT = ["#d91a11", "#3d8b6e", "#004236", "#7c3aed", "#db2777", "#0d9488", "#ea580c", "#4f46e5"];
const MAX_VISIBLE_LINES = 5;

function findPreviousValue(chartData, exerciseName, sessionDate) {
  const pointIndex = chartData.findIndex(d => d.date === sessionDate);
  if (pointIndex <= 0) return null;
  for (let i = pointIndex - 1; i >= 0; i -= 1) {
    const value = chartData[i][exerciseName];
    if (value != null) return value;
  }
  return null;
}

function ExerciseTooltip({ active, payload, exercises, lineColors, isDarkMode, unit = "kg", chartData = [] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const sessionDate = point?.date;
  const dateLabel = sessionDate ? formatFullDate(sessionDate) : point?.label;

  const entries = (exercises || [])
    .map((name, i) => {
      const entry = payload.find(p => p.dataKey === name);
      if (entry?.value == null) return null;
      const prev = findPreviousValue(chartData, name, sessionDate);
      const delta = prev != null ? Math.round((entry.value - prev) * 10) / 10 : null;
      return {
        name,
        value: entry.value,
        color: lineColors[i % lineColors.length],
        sub:
          delta != null && delta !== 0
            ? `${delta > 0 ? "+" : ""}${delta}${unit} vs last session`
            : delta === 0
              ? "Same as last session"
              : undefined,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.value - a.value);

  if (!entries.length) return null;

  if (entries.length === 1) {
    const entry = entries[0];
    return (
      <RichChartTooltip
        active
        isDarkMode={isDarkMode}
        title={`${dateLabel} · ${entry.value}${unit}`}
        rows={entry.sub ? [{ label: entry.name, value: entry.sub, color: entry.color }] : []}
      />
    );
  }

  return (
    <RichChartTooltip
      active
      isDarkMode={isDarkMode}
      title={dateLabel}
      rows={entries.map(entry => ({
        label: entry.name,
        value: `${entry.value}${unit}`,
        sub: entry.sub,
        color: entry.color,
      }))}
    />
  );
}

function buildExerciseStats(exercises, data) {
  return exercises.map(name => {
    const points = data.filter(d => d[name] != null).map(d => d[name]);
    if (!points.length) {
      return { name, sessions: 0, first: null, last: null, change: 0, latest: null };
    }
    const first = points[0];
    const last = points[points.length - 1];
    const change = Math.round((last - first) * 10) / 10;
    return { name, sessions: points.length, first, last, change, latest: last };
  });
}

export default function ExerciseProgressChart({ exerciseLogsByName, isDarkMode, unit = "kg" }) {
  const colors = getChartColors(isDarkMode);
  const lineColors = isDarkMode ? LINE_COLORS_DARK : LINE_COLORS_LIGHT;
  const [muscleGroup, setMuscleGroup] = useState("all");
  const [focusedExercise, setFocusedExercise] = useState(null);

  const groupExercises = useMemo(
    () => exercisesForMuscleGroup(exerciseLogsByName, muscleGroup),
    [exerciseLogsByName, muscleGroup],
  );

  const exercises = useMemo(() => groupExercises.map(e => e.name), [groupExercises]);
  const data = useMemo(() => exerciseProgressSeries(groupExercises), [groupExercises]);

  const exerciseStats = useMemo(
    () => buildExerciseStats(exercises, data),
    [exercises, data],
  );

  const statsByName = useMemo(
    () => Object.fromEntries(exerciseStats.map(stat => [stat.name, stat])),
    [exerciseStats],
  );

  const visibleExercises = useMemo(() => {
    if (focusedExercise) return [focusedExercise];
    if (exercises.length <= MAX_VISIBLE_LINES) return exercises;
    return [...exerciseStats]
      .sort((a, b) => b.sessions - a.sessions || b.last - a.last)
      .slice(0, MAX_VISIBLE_LINES)
      .map(stat => stat.name);
  }, [focusedExercise, exercises, exerciseStats]);

  const focusedStats = focusedExercise ? statsByName[focusedExercise] : null;
  const isLineSubset = !focusedExercise && exercises.length > MAX_VISIBLE_LINES;

  const focusedChartData = useMemo(() => {
    if (!focusedExercise) return data;
    return data.filter(d => d[focusedExercise] != null);
  }, [data, focusedExercise]);

  const chartData = focusedExercise ? focusedChartData : data;

  const singlePointFocus = useMemo(() => {
    if (!focusedExercise || focusedChartData.length !== 1) return null;
    const point = focusedChartData[0];
    const value = point[focusedExercise];
    if (value == null) return null;
    const colorIndex = exercises.indexOf(focusedExercise);
    return {
      point,
      value,
      color: lineColors[colorIndex % lineColors.length],
      dateLabel: formatFullDate(point.date),
    };
  }, [focusedExercise, focusedChartData, exercises, lineColors]);

  const xAxisDense = chartData.length > 7 && !singlePointFocus;

  const availableGroups = useMemo(() => {
    const grouped = exercisesForMuscleGroup(exerciseLogsByName, "all");
    const counts = Object.fromEntries(MUSCLE_GROUPS.map(g => [g.key, 0]));
    grouped.forEach(ex => {
      counts[ex.group] = (counts[ex.group] || 0) + 1;
    });
    counts.all = grouped.length;
    return MUSCLE_GROUPS.filter(g => g.key === "all" || counts[g.key] > 0);
  }, [exerciseLogsByName]);

  const handleGroupChange = key => {
    setMuscleGroup(key);
    setFocusedExercise(null);
  };

  if (!exercises.length && muscleGroup === "all") {
    const hasAny = Object.keys(exerciseLogsByName || {}).length > 0;
    if (!hasAny) {
      return (
        <ChartSection isDarkMode={isDarkMode}>
          <ChartSectionHeader icon={TrendingUp} label="Strength Progress" meta="By muscle group" isDarkMode={isDarkMode} />
          <ChartBody isDarkMode={isDarkMode}>
            <p className={`text-sm py-6 text-center ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Complete workouts to see strength trends
            </p>
          </ChartBody>
        </ChartSection>
      );
    }
  }

  const groupLabel = MUSCLE_GROUPS.find(g => g.key === muscleGroup)?.label ?? "All";
  const legend = exercises.map((name, i) => ({
    color: lineColors[i % lineColors.length],
    name,
  }));

  const groupPillClass = (key, selected) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1.5 text-[10px] font-semibold ring-1 transition-colors",
      selected
        ? isDarkMode ? "text-iron-50" : "text-slate-900"
        : isDarkMode ? "text-iron-400 hover:bg-iron-800/70" : "text-slate-600 hover:bg-slate-100",
    );

  const groupPillStyle = (key, selected) => {
    const color = MUSCLE_GROUP_COLORS[key] || MUSCLE_GROUP_COLORS.other;
    if (selected) {
      return {
        backgroundColor: color.soft,
        borderColor: color.dot,
        boxShadow: `inset 0 0 0 1px ${color.dot}`,
      };
    }
    return {
      borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    };
  };

  const exercisePillClass = selected =>
    cn(
      "inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[10px] font-medium transition-colors",
      selected
        ? isDarkMode ? "bg-iron-700 text-iron-100" : "bg-slate-200 text-slate-800"
        : isDarkMode ? "text-iron-500 hover:bg-iron-800" : "text-slate-500 hover:bg-slate-100",
    );

  return (
    <ChartSection isDarkMode={isDarkMode}>
      <ChartSectionHeader
        icon={TrendingUp}
        label="Are you getting stronger?"
        meta={focusedExercise ? "Single lift" : `${groupLabel} · heaviest ${unit} per session`}
        isDarkMode={isDarkMode}
      />
      <ChartBody isDarkMode={isDarkMode}>
        <div
          className={cn(
            "mb-4 flex flex-wrap gap-2 rounded-card px-2.5 py-3",
            isDarkMode ? "bg-iron-950/50 border border-iron-800/80" : "bg-slate-50 border border-slate-100",
          )}
        >
          {availableGroups.map(g => {
            const color = MUSCLE_GROUP_COLORS[g.key] || MUSCLE_GROUP_COLORS.other;
            const selected = muscleGroup === g.key;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => handleGroupChange(g.key)}
                className={groupPillClass(g.key, selected)}
                style={groupPillStyle(g.key, selected)}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color.dot }}
                />
                {g.label}
              </button>
            );
          })}
        </div>

        {exercises.length === 0 ? (
          <p className={`text-sm py-6 text-center ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            No exercises logged for {groupLabel.toLowerCase()}
          </p>
        ) : (
          <>
            {focusedStats && (
              <div
                className={cn(
                  "mb-3 grid grid-cols-3 gap-2 rounded-card px-3 py-2.5 text-center",
                  isDarkMode ? "bg-iron-950/50 border border-iron-800/80" : "bg-slate-50 border border-slate-100",
                )}
              >
                <div>
                  <p className={cn("text-[10px] uppercase tracking-wide", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                    Latest
                  </p>
                  <p className={cn("text-sm font-bold tabular-nums", isDarkMode ? "text-iron-100" : "text-slate-900")}>
                    {focusedStats.latest}
                    {unit}
                  </p>
                </div>
                <div>
                  <p className={cn("text-[10px] uppercase tracking-wide", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                    Change
                  </p>
                  <p
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      focusedStats.change > 0
                        ? "text-green-500"
                        : focusedStats.change < 0
                          ? "text-red-400"
                          : isDarkMode
                            ? "text-iron-300"
                            : "text-slate-600",
                    )}
                  >
                    {focusedStats.change > 0 ? "+" : ""}
                    {focusedStats.change}
                    {unit}
                  </p>
                </div>
                <div>
                  <p className={cn("text-[10px] uppercase tracking-wide", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                    Sessions
                  </p>
                  <p className={cn("text-sm font-bold tabular-nums", isDarkMode ? "text-iron-100" : "text-slate-900")}>
                    {focusedStats.sessions}
                  </p>
                </div>
              </div>
            )}

            {isLineSubset && (
              <p className={cn("mb-2 text-[10px]", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                Showing {MAX_VISIBLE_LINES} most-logged lifts · tap one below to focus
              </p>
            )}

            <div
              className={cn(
                "relative h-56 w-full overflow-hidden rounded-card",
                singlePointFocus &&
                  (isDarkMode
                    ? "border border-iron-800/80 bg-gradient-to-b from-iron-950/60 to-iron-900/20"
                    : "border border-slate-200 bg-gradient-to-b from-slate-50 to-white"),
              )}
            >
              {singlePointFocus && (
                <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
                  <div
                    className={cn(
                      "rounded-card px-4 py-2 text-center shadow-sm",
                      isDarkMode ? "bg-iron-900/90 border border-iron-700" : "bg-white border border-slate-200",
                    )}
                  >
                    <p
                      className="text-xl font-bold tabular-nums"
                      style={{ color: singlePointFocus.color }}
                    >
                      {singlePointFocus.value}
                      {unit}
                    </p>
                    <p className={cn("text-[11px] font-medium", isDarkMode ? "text-iron-300" : "text-slate-600")}>
                      {singlePointFocus.dateLabel}
                    </p>
                    <p className={cn("text-[10px] mt-0.5", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                      First logged session
                    </p>
                  </div>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: singlePointFocus ? 56 : 8,
                    right: 8,
                    left: 0,
                    bottom: xAxisDense ? 10 : 4,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: colors.axis, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    interval={singlePointFocus ? 0 : "preserveStartEnd"}
                    minTickGap={singlePointFocus ? 0 : 52}
                    angle={xAxisDense ? -32 : 0}
                    textAnchor={xAxisDense ? "end" : "middle"}
                    height={xAxisDense ? 44 : 28}
                  />
                  <YAxis
                    tick={{ fill: colors.axis, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v}${unit}`}
                    width={42}
                    domain={
                      singlePointFocus
                        ? [
                            Math.max(0, singlePointFocus.value - 7.5),
                            singlePointFocus.value + 7.5,
                          ]
                        : [
                            min => Math.max(0, Math.floor(min / 2.5) * 2.5 - 2.5),
                            max => Math.ceil(max / 2.5) * 2.5 + 2.5,
                          ]
                    }
                  />
                  {singlePointFocus && (
                    <>
                      <ReferenceLine
                        y={singlePointFocus.value}
                        stroke={singlePointFocus.color}
                        strokeDasharray="5 5"
                        strokeOpacity={0.35}
                      />
                      <ReferenceDot
                        x={singlePointFocus.point.label}
                        y={singlePointFocus.value}
                        r={14}
                        fill={singlePointFocus.color}
                        stroke={isDarkMode ? "#fafafa" : "#ffffff"}
                        strokeWidth={3}
                      />
                    </>
                  )}
                  <Tooltip
                    content={
                      <ExerciseTooltip
                        exercises={visibleExercises}
                        lineColors={lineColors}
                        isDarkMode={isDarkMode}
                        unit={unit}
                        chartData={data}
                      />
                    }
                  />
                  {visibleExercises.map(name => {
                    const i = exercises.indexOf(name);
                    const color = lineColors[i % lineColors.length];
                    const isSingleFocused = singlePointFocus && name === focusedExercise;
                    return (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        name={name}
                        stroke={color}
                        strokeWidth={isSingleFocused ? 0 : focusedExercise ? 2.5 : 2}
                        strokeOpacity={focusedExercise ? 1 : 0.9}
                        dot={
                          isSingleFocused
                            ? {
                                r: 14,
                                fill: color,
                                stroke: isDarkMode ? "#fafafa" : "#ffffff",
                                strokeWidth: 3,
                              }
                            : { r: focusedExercise ? 3.5 : 2.5, strokeWidth: 0 }
                        }
                        activeDot={{ r: isSingleFocused ? 16 : focusedExercise ? 5 : 4, strokeWidth: 0 }}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {!focusedExercise && (
                  <span className={cn("text-[10px] px-1", isDarkMode ? "text-iron-600" : "text-slate-400")}>
                    Tap exercise:
                  </span>
                )}
                {focusedExercise && (
                  <button type="button" onClick={() => setFocusedExercise(null)} className={exercisePillClass(true)}>
                    ← All in {groupLabel}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-40 overflow-y-auto pr-0.5">
                {legend.map(item => {
                  const stat = statsByName[item.name];
                  const isHiddenFromChart = isLineSubset && !visibleExercises.includes(item.name);
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setFocusedExercise(prev => (prev === item.name ? null : item.name))}
                      className={cn(
                        exercisePillClass(focusedExercise === item.name),
                        "w-full justify-between text-left gap-2 py-1.5 px-2.5",
                        isHiddenFromChart && "opacity-60",
                      )}
                    >
                      <span className="flex min-w-0 items-start gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0 mt-1"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="min-w-0 break-words leading-snug">{item.name}</span>
                      </span>
                      {stat?.latest != null && (
                        <span
                          className={cn(
                            "shrink-0 text-right text-[10px] tabular-nums leading-tight",
                            isDarkMode ? "text-iron-400" : "text-slate-500",
                          )}
                        >
                          <span className="font-semibold">
                            {stat.latest}
                            {unit}
                          </span>
                          {stat.sessions >= 2 && stat.change !== 0 && (
                            <span
                              className={cn(
                                "block font-semibold",
                                stat.change > 0 ? "text-green-500" : "text-red-400",
                              )}
                            >
                              {stat.change > 0 ? "+" : ""}
                              {stat.change}
                              {unit}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </ChartBody>
    </ChartSection>
  );
}

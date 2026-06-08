import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartBody, ChartSection, ChartSectionHeader } from "@/components/charts/ChartChrome";
import RichChartTooltip from "@/components/charts/RichChartTooltip";
import ChartInsightFooter from "@/components/charts/ChartInsightFooter";
import { getChartColors } from "@/lib/chartTheme";
import { formatFullDate } from "@/lib/chartInsights";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const LINE_COLORS_DARK = ["#fbbf24", "#22c55e", "#3b82f6", "#a78bfa", "#f472b6"];
const LINE_COLORS_LIGHT = ["#d91a11", "#3d8b6e", "#004236", "#7c3aed", "#db2777"];

function ExerciseTooltip({ active, payload, exercises, lineColors, isDarkMode }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const sessionDate = point?.date;

  const rows = (exercises || [])
    .map((name, i) => {
      const entry = payload.find(p => p.dataKey === name);
      if (entry?.value == null) return null;
      return {
        label: name.length > 22 ? `${name.slice(0, 20)}…` : name,
        value: `${entry.value}`,
        sub: "max weight that session",
        color: lineColors[i % lineColors.length],
      };
    })
    .filter(Boolean);

  if (!rows.length) return null;

  const values = rows.map(r => Number(r.value.replace(/[^\d.]/g, ""))).filter(n => !isNaN(n));
  const top = rows.reduce((a, b) => (Number(a.value) >= Number(b.value) ? a : b), rows[0]);

  return (
    <RichChartTooltip
      active
      isDarkMode={isDarkMode}
      title={sessionDate ? formatFullDate(sessionDate) : point?.label}
      rows={rows}
      insight={
        values.length > 1
          ? `Strongest lift: ${top.label} at ${top.value}`
          : "Track the same exercises regularly to see clear trends"
      }
    />
  );
}

export default function ExerciseProgressChart({ data, exercises, isDarkMode, unit = "kg" }) {
  const colors = getChartColors(isDarkMode);
  const lineColors = isDarkMode ? LINE_COLORS_DARK : LINE_COLORS_LIGHT;
  const [focusedExercise, setFocusedExercise] = useState(null);

  const visibleExercises = focusedExercise ? [focusedExercise] : exercises;

  const progressSummary = useMemo(() => {
    if (!exercises?.length || !data?.length) return null;
    const target = focusedExercise ? [focusedExercise] : exercises;
    const insights = target.map(name => {
      const points = data.filter(d => d[name] != null).map(d => d[name]);
      if (points.length < 2) return null;
      const first = points[0];
      const last = points[points.length - 1];
      const change = Math.round((last - first) * 10) / 10;
      if (change === 0) return `${name}: holding at ${last}${unit}`;
      const sign = change > 0 ? "+" : "";
      return `${name}: ${sign}${change}${unit} (${first}→${last})`;
    }).filter(Boolean);
    return insights.slice(0, 3).join(" · ");
  }, [exercises, data, unit, focusedExercise]);

  if (!exercises?.length) {
    return (
      <ChartSection isDarkMode={isDarkMode}>
        <ChartSectionHeader icon={TrendingUp} label="Strength Progress" meta="Top exercises" isDarkMode={isDarkMode} />
        <ChartBody isDarkMode={isDarkMode}>
          <p className={`text-sm py-6 text-center ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            Complete workouts to see strength trends
          </p>
        </ChartBody>
      </ChartSection>
    );
  }

  const legend = exercises.map((name, i) => ({
    color: lineColors[i % lineColors.length],
    label: name.length > 20 ? `${name.slice(0, 18)}…` : name,
    fullName: name,
  }));

  return (
    <ChartSection isDarkMode={isDarkMode}>
      <ChartSectionHeader
        icon={TrendingUp}
        label="Are you getting stronger?"
        meta={focusedExercise ? "Single lift" : `Heaviest ${unit} per lift`}
        isDarkMode={isDarkMode}
      />
      <ChartBody isDarkMode={isDarkMode}>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: colors.axis, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: colors.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}${unit}`}
              />
              <Tooltip
                content={
                  <ExerciseTooltip
                    exercises={visibleExercises}
                    lineColors={lineColors}
                    isDarkMode={isDarkMode}
                  />
                }
              />
              {visibleExercises.map(name => {
                const i = exercises.indexOf(name);
                return (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    name={name}
                    stroke={lineColors[i % lineColors.length]}
                    strokeWidth={focusedExercise ? 2.5 : 2}
                    dot={{ r: focusedExercise ? 3 : 2, strokeWidth: 0 }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ChartInsightFooter
          isDarkMode={isDarkMode}
          takeaway={progressSummary || "Log more workouts to see strength trends"}
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          <button
            type="button"
            onClick={() => setFocusedExercise(null)}
            className={cn(
              "inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[10px] font-medium transition-colors",
              !focusedExercise
                ? isDarkMode ? "bg-iron-700 text-iron-100" : "bg-slate-200 text-slate-800"
                : isDarkMode ? "text-iron-500 hover:bg-iron-800" : "text-slate-500 hover:bg-slate-100",
            )}
          >
            All
          </button>
          {legend.map(item => (
            <button
              key={item.fullName}
              type="button"
              onClick={() => setFocusedExercise(prev => (prev === item.fullName ? null : item.fullName))}
              className={cn(
                "inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[10px] font-medium transition-colors",
                focusedExercise === item.fullName
                  ? isDarkMode ? "bg-iron-700 text-iron-100" : "bg-slate-200 text-slate-800"
                  : isDarkMode ? "text-iron-500 hover:bg-iron-800" : "text-slate-500 hover:bg-slate-100",
              )}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </button>
          ))}
        </div>
      </ChartBody>
    </ChartSection>
  );
}

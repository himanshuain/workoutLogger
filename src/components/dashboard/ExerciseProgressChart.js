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
import { exerciseProgressSeries } from "@/lib/dashboardData";
import { exercisesForMuscleGroup, MUSCLE_GROUPS, MUSCLE_GROUP_COLORS } from "@/lib/exerciseCategories";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const LINE_COLORS_DARK = ["#fbbf24", "#22c55e", "#3b82f6", "#a78bfa", "#f472b6", "#14b8a6", "#fb923c", "#818cf8"];
const LINE_COLORS_LIGHT = ["#d91a11", "#3d8b6e", "#004236", "#7c3aed", "#db2777", "#0d9488", "#ea580c", "#4f46e5"];

function ExerciseTooltip({ active, payload, exercises, lineColors, isDarkMode, unit = "kg" }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const sessionDate = point?.date;
  const dateLabel = sessionDate ? formatFullDate(sessionDate) : point?.label;

  const entries = (exercises || [])
    .map((name, i) => {
      const entry = payload.find(p => p.dataKey === name);
      if (entry?.value == null) return null;
      return {
        name,
        value: entry.value,
        color: lineColors[i % lineColors.length],
      };
    })
    .filter(Boolean);

  if (!entries.length) return null;

  if (entries.length === 1) {
    return (
      <RichChartTooltip
        active
        isDarkMode={isDarkMode}
        title={`${dateLabel} · ${entries[0].value}${unit}`}
        rows={[]}
      />
    );
  }

  return (
    <RichChartTooltip
      active
      isDarkMode={isDarkMode}
      title={dateLabel}
      rows={entries.map(entry => ({
        label: entry.name.length > 22 ? `${entry.name.slice(0, 20)}…` : entry.name,
        value: `${entry.value}${unit}`,
        color: entry.color,
      }))}
    />
  );
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
  const visibleExercises = focusedExercise ? [focusedExercise] : exercises;

  const availableGroups = useMemo(() => {
    const grouped = exercisesForMuscleGroup(exerciseLogsByName, "all");
    const counts = Object.fromEntries(MUSCLE_GROUPS.map(g => [g.key, 0]));
    grouped.forEach(ex => {
      counts[ex.group] = (counts[ex.group] || 0) + 1;
    });
    counts.all = grouped.length;
    return MUSCLE_GROUPS.filter(g => g.key === "all" || counts[g.key] > 0);
  }, [exerciseLogsByName]);

  const progressSummary = useMemo(() => {
    if (!exercises.length || !data.length) return null;
    const target = focusedExercise ? [focusedExercise] : exercises.slice(0, 3);
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
    return insights.join(" · ");
  }, [exercises, data, unit, focusedExercise]);

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
    label: name.length > 24 ? `${name.slice(0, 22)}…` : name,
    fullName: name,
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
        <div className="flex flex-wrap gap-1.5 mb-3">
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
                        unit={unit}
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
              takeaway={progressSummary || "Tap an exercise below to focus on one lift"}
            />
            <div className="flex flex-wrap gap-1.5 mt-2 max-h-28 overflow-y-auto">
              {!focusedExercise && (
                <span className={cn("text-[10px] self-center px-1", isDarkMode ? "text-iron-600" : "text-slate-400")}>
                  Tap exercise:
                </span>
              )}
              {focusedExercise && (
                <button type="button" onClick={() => setFocusedExercise(null)} className={exercisePillClass(true)}>
                  ← All in {groupLabel}
                </button>
              )}
              {legend.map(item => (
                <button
                  key={item.fullName}
                  type="button"
                  onClick={() => setFocusedExercise(prev => (prev === item.fullName ? null : item.fullName))}
                  className={exercisePillClass(focusedExercise === item.fullName)}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </ChartBody>
    </ChartSection>
  );
}

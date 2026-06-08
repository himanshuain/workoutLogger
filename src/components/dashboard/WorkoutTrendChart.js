import { useMemo } from "react";
import {
  AreaChart,
  Area,
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
import {
  avgValues,
  deltaLabel,
  formatWeekRange,
  maxEntry,
  trendWord,
} from "@/lib/chartInsights";
import { Dumbbell } from "lucide-react";

function WorkoutTooltip({ active, payload, isDarkMode }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const prevIdx = point._index > 0 ? point._index - 1 : null;
  const prev = prevIdx != null ? point._prevWorkouts : null;

  return (
    <RichChartTooltip
      active
      isDarkMode={isDarkMode}
      title={`Week of ${point.week}`}
      rows={[
        {
          label: "Workout days",
          value: `${point.workouts}`,
          sub: formatWeekRange(point.weekStart),
          color: payload[0]?.color,
        },
        ...(prev != null
          ? [{
              label: "vs prior week",
              value: deltaLabel(point.workouts, prev, "")?.replace(" vs prior period", "") || "—",
              sub: deltaLabel(point.workouts, prev, " sessions") || undefined,
            }]
          : []),
      ]}
      insight={
        point.workouts >= 4
          ? "Strong week — 4+ sessions is solid frequency"
          : point.workouts >= 2
            ? "Light week — consider adding 1–2 more sessions"
            : point.workouts === 1
              ? "Minimal activity — one session logged"
              : "No workouts logged this week"
      }
    />
  );
}

export default function WorkoutTrendChart({ data, isDarkMode }) {
  const colors = getChartColors(isDarkMode);

  const enrichedData = useMemo(
    () =>
      (data || []).map((d, i, arr) => ({
        ...d,
        _index: i,
        _prevWorkouts: i > 0 ? arr[i - 1].workouts : null,
      })),
    [data],
  );

  const avg = avgValues(enrichedData, "workouts");
  const best = maxEntry(enrichedData, "workouts");
  const trend = trendWord(enrichedData.map(d => d.workouts));
  const total = enrichedData.reduce((a, d) => a + d.workouts, 0);

  const summary = [
    `${total} sessions over 12 weeks`,
    `avg ${avg}/week`,
    best ? `peak ${best.workouts} (${best.week})` : null,
    trend,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ChartSection isDarkMode={isDarkMode}>
      <ChartSectionHeader
        icon={Dumbbell}
        label="How often do you work out?"
        meta="One dot = one week"
        isDarkMode={isDarkMode}
      />
      <ChartBody isDarkMode={isDarkMode}>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={enrichedData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="workoutGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fill: colors.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: colors.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: "Days",
                  angle: -90,
                  position: "insideLeft",
                  offset: 14,
                  style: { fill: colors.axis, fontSize: 9 },
                }}
              />
              <Tooltip content={<WorkoutTooltip isDarkMode={isDarkMode} />} />
              <Area
                type="monotone"
                dataKey="workouts"
                name="Workout days"
                stroke={colors.primary}
                strokeWidth={2}
                fill="url(#workoutGrad)"
                dot={{ r: 3, fill: colors.primary, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: colors.secondary }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <ChartInsightFooter
          isDarkMode={isDarkMode}
          takeaway={summary}
          legend={[{ color: colors.primary, label: "Workout days" }]}
        />
      </ChartBody>
    </ChartSection>
  );
}

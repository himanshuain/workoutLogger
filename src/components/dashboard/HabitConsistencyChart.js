import { useMemo } from "react";
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
import {
  avgValues,
  deltaLabel,
  formatWeekRange,
  habitRateInsight,
  maxEntry,
  trendWord,
} from "@/lib/chartInsights";
import { CheckCircle2 } from "lucide-react";

function HabitTooltip({ active, payload, isDarkMode }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <RichChartTooltip
      active
      isDarkMode={isDarkMode}
      title={`Week of ${point.week}`}
      rows={[
        {
          label: "Completion rate",
          value: `${point.rate}%`,
          sub: `${point.completed} check-ins logged`,
          color: payload[0]?.stroke,
        },
        {
          label: "Date range",
          value: formatWeekRange(point.weekStart),
        },
        ...(point._prevRate != null
          ? [{
              label: "vs prior week",
              value: deltaLabel(point.rate, point._prevRate, "%")?.replace(" vs prior period", "") || "—",
            }]
          : []),
      ]}
      insight={habitRateInsight(point.rate)}
    />
  );
}

export default function HabitConsistencyChart({ data, isDarkMode }) {
  const colors = getChartColors(isDarkMode);

  const enrichedData = useMemo(
    () =>
      (data || []).map((d, i, arr) => ({
        ...d,
        _prevRate: i > 0 ? arr[i - 1].rate : null,
      })),
    [data],
  );

  const avg = avgValues(enrichedData, "rate");
  const best = maxEntry(enrichedData, "rate");
  const trend = trendWord(enrichedData.map(d => d.rate));
  const latest = enrichedData[enrichedData.length - 1];

  const summary = [
    `avg ${avg}% over 8 weeks`,
    best ? `best ${best.rate}% (${best.week})` : null,
    latest ? `this week ${latest.rate}%` : null,
    trend,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ChartSection isDarkMode={isDarkMode}>
      <ChartSectionHeader
        icon={CheckCircle2}
        label="Are you sticking to habits?"
        meta="0–100% each week"
        isDarkMode={isDarkMode}
      />
      <ChartBody isDarkMode={isDarkMode}>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={enrichedData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fill: colors.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={v => `${v}%`}
                tick={{ fill: colors.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<HabitTooltip isDarkMode={isDarkMode} />} />
              <Line
                type="monotone"
                dataKey="rate"
                name="Completion %"
                stroke={colors.success}
                strokeWidth={2.5}
                dot={{ r: 3, fill: colors.success, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ChartInsightFooter
          isDarkMode={isDarkMode}
          takeaway={summary}
          legend={[{ color: colors.success, label: "Completion %" }]}
        />
      </ChartBody>
    </ChartSection>
  );
}

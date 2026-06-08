import { useMemo } from "react";
import {
  BarChart,
  Bar,
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
  formatVolume,
  formatWeekRange,
  maxEntry,
  trendWord,
} from "@/lib/chartInsights";
import { BarChart3 } from "lucide-react";

function VolumeTooltip({ active, payload, isDarkMode }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const prev = point._prevVolume;

  return (
    <RichChartTooltip
      active
      isDarkMode={isDarkMode}
      title={`Week of ${point.week}`}
      rows={[
        {
          label: "Total volume",
          value: formatVolume(point.volume),
          sub: "weight × reps (all exercises)",
          color: payload[0]?.fill,
        },
        {
          label: "Date range",
          value: formatWeekRange(point.weekStart),
        },
        ...(prev != null
          ? [{
              label: "vs prior week",
              value: deltaLabel(point.volume, prev, "")?.replace(" vs prior period", "") || "—",
              sub: deltaLabel(point.volume, prev, " load") || undefined,
            }]
          : []),
      ]}
      insight={
        point.volume === 0
          ? "No logged sets with weight × reps this week"
          : point._prevVolume != null && point.volume > point._prevVolume * 1.15
            ? "Training load increased — watch recovery"
            : point._prevVolume != null && point.volume < point._prevVolume * 0.85
              ? "Deload week or fewer sessions"
              : "Steady training load for the week"
      }
    />
  );
}

export default function VolumeTrendChart({ data, isDarkMode }) {
  const colors = getChartColors(isDarkMode);

  const enrichedData = useMemo(
    () =>
      (data || []).map((d, i, arr) => ({
        ...d,
        _prevVolume: i > 0 ? arr[i - 1].volume : null,
      })),
    [data],
  );

  const avg = formatVolume(avgValues(enrichedData, "volume"));
  const best = maxEntry(enrichedData, "volume");
  const trend = trendWord(enrichedData.map(d => d.volume));

  const summary = [
    `avg ${avg}/week`,
    best ? `heaviest ${formatVolume(best.volume)} (${best.week})` : null,
    trend,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ChartSection isDarkMode={isDarkMode}>
      <ChartSectionHeader
        icon={BarChart3}
        label="How much work per week?"
        meta="All sets combined"
        isDarkMode={isDarkMode}
      />
      <ChartBody isDarkMode={isDarkMode}>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={enrichedData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fill: colors.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatVolume}
                tick={{ fill: colors.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<VolumeTooltip isDarkMode={isDarkMode} />} />
              <Bar
                dataKey="volume"
                name="Volume"
                fill={colors.primary}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ChartInsightFooter
          isDarkMode={isDarkMode}
          takeaway={summary}
          legend={[{ color: colors.primary, label: "Weekly volume" }]}
        />
      </ChartBody>
    </ChartSection>
  );
}

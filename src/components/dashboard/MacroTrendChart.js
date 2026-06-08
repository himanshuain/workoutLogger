import { useMemo } from "react";
import {
  ComposedChart,
  Area,
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
  formatFullDate,
  maxEntry,
  proteinInsight,
  trendWord,
} from "@/lib/chartInsights";
import { Beef } from "lucide-react";

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MacroTooltip({ active, payload, proteinTarget, calorieTarget, isDarkMode }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const protein = Math.round(point.protein_g || 0);
  const calories = Math.round(point.calories || 0);
  const carbs = Math.round(point.carbs_g || 0);
  const fat = Math.round(point.fat_g || 0);

  const rows = [
    {
      label: "Protein",
      value: `${protein}g`,
      sub: proteinTarget ? `${Math.round((protein / proteinTarget) * 100)}% of ${proteinTarget}g goal` : undefined,
      color: "#f472b6",
    },
    {
      label: "Calories",
      value: `${calories} kcal`,
      sub: calorieTarget ? `${Math.round((calories / calorieTarget) * 100)}% of ${calorieTarget} goal` : undefined,
      color: "#2dd4bf",
    },
  ];

  if (carbs > 0 || fat > 0) {
    rows.push(
      { label: "Carbs", value: `${carbs}g` },
      { label: "Fat", value: `${fat}g` },
    );
  }

  return (
    <RichChartTooltip
      active
      isDarkMode={isDarkMode}
      title={formatFullDate(point.date)}
      rows={rows}
      insight={proteinInsight(protein, proteinTarget) || (protein >= 30 ? "Solid protein day" : "Low protein — add a protein source")}
    />
  );
}

export default function MacroTrendChart({ data, isDarkMode, macroTargets }) {
  const colors = getChartColors(isDarkMode);
  const proteinTarget = macroTargets?.protein_g;
  const calorieTarget = macroTargets?.calories;

  const chartData = useMemo(
    () =>
      (data || []).slice(-30).map(d => ({
        ...d,
        label: formatDateLabel(d.date),
      })),
    [data],
  );

  const avgProtein = Math.round(avgValues(chartData, "protein_g"));
  const bestDay = maxEntry(chartData, "protein_g");
  const trend = trendWord(chartData.map(d => d.protein_g));
  const daysLogged = chartData.filter(d => d.protein_g > 0).length;

  const summary = [
    daysLogged > 0 ? `${daysLogged} days with protein logged` : null,
    avgProtein > 0 ? `avg ${avgProtein}g/day` : null,
    bestDay?.protein_g > 0 ? `best ${Math.round(bestDay.protein_g)}g (${formatDateLabel(bestDay.date)})` : null,
    trend,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!chartData.length) {
    return (
      <ChartSection isDarkMode={isDarkMode}>
        <ChartSectionHeader icon={Beef} label="Protein & calories over time" meta="Last 30 days" isDarkMode={isDarkMode} />
        <ChartBody isDarkMode={isDarkMode}>
          <p className={`text-sm py-6 text-center ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            Add protein values to food items to see trends
          </p>
        </ChartBody>
      </ChartSection>
    );
  }

  return (
    <ChartSection isDarkMode={isDarkMode}>
      <ChartSectionHeader icon={Beef} label="Protein & calories over time" meta="Last 30 days" isDarkMode={isDarkMode} />
      <ChartBody isDarkMode={isDarkMode}>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="proteinGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.pink} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colors.pink} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: colors.axis, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="protein"
                tick={{ fill: colors.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}g`}
              />
              <YAxis
                yAxisId="cal"
                orientation="right"
                tick={{ fill: colors.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}`}
              />
              <Tooltip
                content={
                  <MacroTooltip
                    proteinTarget={proteinTarget}
                    calorieTarget={calorieTarget}
                    isDarkMode={isDarkMode}
                  />
                }
              />
              <Area
                yAxisId="protein"
                type="monotone"
                dataKey="protein_g"
                name="Protein"
                stroke={colors.pink}
                strokeWidth={2}
                fill="url(#proteinGrad)"
              />
              <Line
                yAxisId="cal"
                type="monotone"
                dataKey="calories"
                name="Calories"
                stroke={colors.teal}
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 3"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <ChartInsightFooter
          isDarkMode={isDarkMode}
          takeaway={summary || "Log food to fill this chart"}
          legend={[
            { color: colors.pink, label: "Protein (g)" },
            { color: colors.teal, label: "Calories" },
          ]}
        />
      </ChartBody>
    </ChartSection>
  );
}

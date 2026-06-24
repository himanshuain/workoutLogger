import { useMemo, useState } from "react";
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
import { ChartBody, ChartSection, ChartSectionHeader, chartPanelInnerClass } from "@/components/charts/ChartChrome";
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
import { cn } from "@/lib/utils";

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TooltipValueRing({ value, target, color, isDarkMode, display, size = 40 }) {
  const strokeWidth = size <= 32 ? 2.5 : 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target ? Math.min(100, Math.max(0, (value / target) * 100)) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDarkMode ? "#3f3f46" : "#e2e8f0"}
          strokeWidth={strokeWidth}
        />
        {target ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        ) : null}
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold tabular-nums leading-none px-0.5 text-center",
          size <= 32 ? "text-[9px]" : "text-[10px]",
          isDarkMode ? "text-iron-50" : "text-slate-800",
        )}
      >
        {display}
      </span>
    </div>
  );
}

function macroRow({ label, value, target, color, isDarkMode, format }) {
  const display = format(value);
  if (target) {
    return {
      label,
      color,
      valueNode: (
        <TooltipValueRing
          value={value}
          target={target}
          color={color}
          isDarkMode={isDarkMode}
          display={display}
        />
      ),
    };
  }
  return { label, color, value: display };
}

function MacroTooltip({ active, payload, macroTargets, isDarkMode }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const protein = Math.round(point.protein_g || 0);
  const calories = Math.round(point.calories || 0);
  const carbs = Math.round(point.carbs_g || 0);
  const fat = Math.round(point.fat_g || 0);

  const rows = [
    macroRow({
      label: "Protein",
      value: protein,
      target: macroTargets?.protein_g,
      color: "#f472b6",
      isDarkMode,
      format: v => `${v}g`,
    }),
    macroRow({
      label: "Calories",
      value: calories,
      target: macroTargets?.calories,
      color: "#2dd4bf",
      isDarkMode,
      format: v => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)),
    }),
  ];

  if (carbs > 0 || fat > 0) {
    if (carbs > 0) {
      rows.push(
        macroRow({
          label: "Carbs",
          value: carbs,
          target: macroTargets?.carbs_g,
          color: "#a78bfa",
          isDarkMode,
          format: v => `${v}g`,
        }),
      );
    }
    if (fat > 0) {
      rows.push(
        macroRow({
          label: "Fat",
          value: fat,
          target: macroTargets?.fat_g,
          color: "#fbbf24",
          isDarkMode,
          format: v => `${v}g`,
        }),
      );
    }
  }

  return (
    <RichChartTooltip
      active
      isDarkMode={isDarkMode}
      title={formatFullDate(point.date)}
      rows={rows}
      insight={proteinInsight(protein, macroTargets?.protein_g) || (protein >= 30 ? "Solid protein day" : "Low protein — add a protein source")}
    />
  );
}

function MacroDailyTable({ rows, macroTargets, isDarkMode }) {
  const proteinTarget = macroTargets?.protein_g;
  const proteinColor = isDarkMode ? "#f472b6" : "#db2777";
  const sorted = useMemo(() => [...rows].reverse(), [rows]);

  if (!sorted.length) return null;

  const thClass = cn(
    "px-3 py-2 font-medium",
    isDarkMode ? "text-iron-500" : "text-slate-500",
  );

  return (
    <div className={cn("mt-4 overflow-hidden", chartPanelInnerClass(isDarkMode))}>
      <div className="max-h-52 overflow-auto">
        <table className="w-full text-xs">
          <thead className={cn("sticky top-0 z-10", isDarkMode ? "bg-iron-900/95" : "bg-white/95")}>
            <tr>
              <th className={cn(thClass, "text-left")}>Date</th>
              <th className={cn(thClass, "text-right")}>Protein</th>
              <th className={cn(thClass, "text-right")}>Calories</th>
              {proteinTarget ? <th className={cn(thClass, "text-right w-14")}>Target</th> : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => {
              const protein = Math.round(row.protein_g || 0);
              const calories = Math.round(row.calories || 0);
              const pct = proteinTarget ? Math.round((protein / proteinTarget) * 100) : null;

              return (
                <tr
                  key={row.date}
                  className={cn("border-t", isDarkMode ? "border-iron-800/50" : "border-slate-100")}
                >
                  <td className={cn("px-3 py-2 font-medium", isDarkMode ? "text-iron-200" : "text-slate-700")}>
                    {formatFullDate(row.date)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right tabular-nums font-semibold",
                      isDarkMode ? "text-pink-400" : "text-pink-600",
                    )}
                  >
                    {protein}g
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right tabular-nums",
                      isDarkMode ? "text-iron-300" : "text-slate-600",
                    )}
                  >
                    {calories.toLocaleString()}
                  </td>
                  {proteinTarget ? (
                    <td className="px-2 py-1.5">
                      <div className="flex justify-end">
                        <TooltipValueRing
                          value={protein}
                          target={proteinTarget}
                          color={proteinColor}
                          isDarkMode={isDarkMode}
                          display={`${pct}%`}
                          size={32}
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MacroTrendChart({ data, isDarkMode, macroTargets }) {
  const colors = getChartColors(isDarkMode);
  const [focusedMetric, setFocusedMetric] = useState(null);

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

  const showProtein = !focusedMetric || focusedMetric === "protein";
  const showCalories = !focusedMetric || focusedMetric === "calories";

  const legendPillClass = (key, selected) =>
    cn(
      "inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[10px] font-medium transition-colors",
      selected
        ? isDarkMode ? "bg-iron-700 text-iron-100" : "bg-slate-200 text-slate-800"
        : isDarkMode ? "text-iron-500 hover:bg-iron-800" : "text-slate-500 hover:bg-slate-100",
    );

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
                  <MacroTooltip macroTargets={macroTargets} isDarkMode={isDarkMode} />
                }
              />
              <Area
                yAxisId="protein"
                type="monotone"
                dataKey="protein_g"
                name="Protein"
                stroke={colors.pink}
                strokeWidth={focusedMetric === "protein" ? 2.5 : 2}
                fill="url(#proteinGrad)"
                hide={!showProtein}
              />
              <Line
                yAxisId="cal"
                type="monotone"
                dataKey="calories"
                name="Calories"
                stroke={colors.teal}
                strokeWidth={focusedMetric === "calories" ? 2.5 : 1.5}
                dot={false}
                strokeDasharray={focusedMetric === "calories" ? undefined : "4 3"}
                hide={!showCalories}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <MacroDailyTable rows={chartData} macroTargets={macroTargets} isDarkMode={isDarkMode} />
        <ChartInsightFooter
          isDarkMode={isDarkMode}
          takeaway={summary || undefined}
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {focusedMetric && (
            <button
              type="button"
              onClick={() => setFocusedMetric(null)}
              className={legendPillClass("all", true)}
            >
              ← Both
            </button>
          )}
          <button
            type="button"
            onClick={() => setFocusedMetric(prev => (prev === "protein" ? null : "protein"))}
            className={legendPillClass("protein", focusedMetric === "protein")}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors.pink }} />
            Protein
          </button>
          <button
            type="button"
            onClick={() => setFocusedMetric(prev => (prev === "calories" ? null : "calories"))}
            className={legendPillClass("calories", focusedMetric === "calories")}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors.teal }} />
            Calories
          </button>
        </div>
      </ChartBody>
    </ChartSection>
  );
}

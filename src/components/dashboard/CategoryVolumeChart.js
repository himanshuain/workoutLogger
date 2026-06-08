import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ChartBody, ChartSection, ChartSectionHeader } from "@/components/charts/ChartChrome";
import RichChartTooltip from "@/components/charts/RichChartTooltip";
import ChartInsightFooter from "@/components/charts/ChartInsightFooter";
import { getChartColors } from "@/lib/chartTheme";
import { formatVolume } from "@/lib/chartInsights";
import { Layers } from "lucide-react";

const SLICE_COLORS_DARK = ["#fbbf24", "#22c55e", "#3b82f6", "#a78bfa", "#f472b6", "#2dd4bf", "#fb923c"];
const SLICE_COLORS_LIGHT = ["#d91a11", "#3d8b6e", "#004236", "#7c3aed", "#db2777", "#0d9488", "#ea580c"];

function CategoryTooltip({ active, payload, total, isDarkMode }) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const value = point?.value || 0;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <RichChartTooltip
      active
      isDarkMode={isDarkMode}
      title={point?.name || "Category"}
      rows={[
        {
          label: "Volume share",
          value: `${pct}%`,
          sub: `${formatVolume(value)} total load`,
          color: point?.payload?.fill,
        },
        {
          label: "Of all-time volume",
          value: formatVolume(total),
        },
      ]}
      insight={
        pct >= 40
          ? "Dominant muscle group — consider balancing push/pull or upper/lower"
          : pct >= 20
            ? "Major contributor to your training"
            : "Smaller share — accessory or infrequent work"
      }
    />
  );
}

export default function CategoryVolumeChart({ data, isDarkMode }) {
  const colors = getChartColors(isDarkMode);
  const sliceColors = isDarkMode ? SLICE_COLORS_DARK : SLICE_COLORS_LIGHT;

  const total = useMemo(() => (data || []).reduce((a, d) => a + d.value, 0), [data]);

  const enrichedData = useMemo(
    () =>
      (data || []).map((d, i) => ({
        ...d,
        fill: sliceColors[i % sliceColors.length],
        pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
      })),
    [data, total, sliceColors],
  );

  const top = enrichedData[0];
  const summary = top
    ? `${formatVolume(total)} total · ${top.name} leads at ${top.pct}% (${formatVolume(top.value)})`
    : null;

  const legend = enrichedData.slice(0, 5).map(d => ({
    color: d.fill,
    label: `${d.name} (${d.pct}%)`,
    description: formatVolume(d.value),
  }));

  if (!data?.length) {
    return (
      <ChartSection isDarkMode={isDarkMode}>
        <ChartSectionHeader icon={Layers} label="Volume by Category" isDarkMode={isDarkMode} />
        <ChartBody isDarkMode={isDarkMode}>
          <p className={`text-sm py-6 text-center ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            No volume data yet
          </p>
        </ChartBody>
      </ChartSection>
    );
  }

  return (
    <ChartSection isDarkMode={isDarkMode}>
      <ChartSectionHeader icon={Layers} label="Which muscles do you train most?" meta="All-time split" isDarkMode={isDarkMode} />
      <ChartBody isDarkMode={isDarkMode}>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={enrichedData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                strokeWidth={0}
              >
                {enrichedData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CategoryTooltip total={total} isDarkMode={isDarkMode} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ChartInsightFooter
          isDarkMode={isDarkMode}
          takeaway={summary}
          legend={legend?.map(item => ({ color: item.color, label: item.label }))}
        />
      </ChartBody>
    </ChartSection>
  );
}

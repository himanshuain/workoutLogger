import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartBody, ChartSection, ChartSectionHeader } from "@/components/charts/ChartChrome";
import RichChartTooltip from "@/components/charts/RichChartTooltip";
import ChartInsightFooter from "@/components/charts/ChartInsightFooter";
import { getChartColors } from "@/lib/chartTheme";
import { proteinInsight } from "@/lib/chartInsights";
import { Beef } from "lucide-react";

function ProteinTooltip({ active, payload, totalProtein, proteinTarget, isDarkMode }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const pct = totalProtein > 0 ? Math.round((point.protein / totalProtein) * 100) : 0;

  return (
    <RichChartTooltip
      active
      isDarkMode={isDarkMode}
      title={point.name}
      rows={[
        {
          label: "Protein",
          value: `${point.protein}g`,
          sub: `${pct}% of today's total`,
          color: point.color,
        },
        {
          label: "Logged as",
          value: point.rawName || point.name,
        },
      ]}
      insight={
        proteinInsight(totalProtein, proteinTarget) ||
        (pct >= 40 ? "Main protein source today" : "Supporting protein source")
      }
    />
  );
}

export default function ProteinBreakdownChart({ items, isDarkMode, proteinTarget }) {
  const colors = getChartColors(isDarkMode);

  const { data, totalProtein } = useMemo(() => {
    const filtered = (items || []).filter(i => i.protein_g > 0).slice(0, 8);
    const total = filtered.reduce((a, i) => a + i.protein_g, 0);
    return {
      totalProtein: Math.round(total * 10) / 10,
      data: filtered.map(i => ({
        name: `${i.icon || ""} ${i.name}`.trim(),
        rawName: i.name,
        protein: Math.round(i.protein_g * 10) / 10,
        quantity: i.quantity,
        unit: i.unit,
        color: i.color || colors.primary,
        pct: total > 0 ? Math.round((i.protein_g / total) * 100) : 0,
      })),
    };
  }, [items, colors.primary]);

  const top = data[0];
  const summary = top
    ? `${totalProtein}g total · ${top.name} leads (${top.protein}g, ${top.pct}%)`
    : null;

  const legend = data.slice(0, 4).map(d => ({
    color: d.color,
    label: `${d.name} — ${d.protein}g`,
    description: `${d.pct}% of today`,
  }));

  if (!data.length) {
    return (
      <ChartSection isDarkMode={isDarkMode}>
        <ChartSectionHeader icon={Beef} label="Protein Sources" meta="Today" isDarkMode={isDarkMode} />
        <ChartBody isDarkMode={isDarkMode}>
          <p className={`text-sm py-6 text-center ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            Log food with protein values to see breakdown
          </p>
        </ChartBody>
      </ChartSection>
    );
  }

  return (
    <ChartSection isDarkMode={isDarkMode}>
      <ChartSectionHeader icon={Beef} label="Protein Sources" meta="Today" isDarkMode={isDarkMode} />
      <ChartBody isDarkMode={isDarkMode}>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                type="number"
                tickFormatter={v => `${v}g`}
                tick={{ fill: colors.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fill: colors.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={
                  <ProteinTooltip
                    totalProtein={totalProtein}
                    proteinTarget={proteinTarget}
                    isDarkMode={isDarkMode}
                  />
                }
              />
              <Bar dataKey="protein" name="Protein" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
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

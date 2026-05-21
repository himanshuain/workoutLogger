/**
 * Value or frequency mini-chart for expanded Life Log event cards (Insights tab).
 */
export default function EventExpandedInsightsGraph({
  eventType,
  expandedEventLogs,
  isDarkMode,
  graphTooltip,
  setGraphTooltip,
}) {
  if (
    !eventType?.track_graph ||
    !expandedEventLogs ||
    expandedEventLogs.length < 2
  ) {
    return null;
  }

  const getLogValue = l => {
    if (l.cost != null) return parseFloat(l.cost);
    if (l.notes) {
      const n = parseFloat(String(l.notes).trim());
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  const hasValues = expandedEventLogs.some(l => getLogValue(l) != null);
  const sortedLogs = [...expandedEventLogs].reverse();
  const graphH = 80;
  const graphW = 280;

  if (hasValues) {
    const graphLogs = sortedLogs.filter(l => getLogValue(l) != null).slice(-15);
    if (graphLogs.length < 2) return null;
    const values = graphLogs.map(l => getLogValue(l));
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const range = maxVal - minVal || 1;
    const step = graphW / (values.length - 1);
    const points = values.map((v, i) => ({
      x: i * step,
      y: graphH - ((v - minVal) / range) * (graphH - 10) - 5,
      val: v,
      date: graphLogs[i].date,
    }));
    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${graphH} L 0 ${graphH} Z`;

    const activeIdx =
      graphTooltip?.type === "value" && graphTooltip?.eventId === eventType.id
        ? graphTooltip.index
        : null;

    return (
      <div
        className={`p-3 rounded-card ${isDarkMode ? "bg-iron-800/40" : "bg-slate-50"}`}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-xs font-medium ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
          >
            {activeIdx != null
              ? new Date(points[activeIdx].date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Value Trend"}
          </span>
          <span className="text-xs font-bold" style={{ color: eventType.color }}>
            {activeIdx != null ? points[activeIdx].val : values[values.length - 1]}
          </span>
        </div>
        <svg
          viewBox={`0 0 ${graphW} ${graphH}`}
          className="w-full"
          style={{ height: 80 }}
          onMouseLeave={() => setGraphTooltip(null)}
        >
          <defs>
            <linearGradient id={`grad-${eventType.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={eventType.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={eventType.color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#grad-${eventType.id})`} />
          <path
            d={linePath}
            fill="none"
            stroke={eventType.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {activeIdx != null && (
            <line
              x1={points[activeIdx].x}
              x2={points[activeIdx].x}
              y1={0}
              y2={graphH}
              stroke={isDarkMode ? "#555" : "#ccc"}
              strokeWidth="1"
              strokeDasharray="3 2"
            />
          )}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={activeIdx === i ? 5 : i === points.length - 1 ? 4 : 2.5}
                fill={eventType.color}
                stroke={isDarkMode ? "#1c1c1e" : "#fff"}
                strokeWidth={activeIdx === i || i === points.length - 1 ? 2 : 0}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={14}
                fill="transparent"
                onMouseEnter={() =>
                  setGraphTooltip({ type: "value", eventId: eventType.id, index: i })
                }
                onTouchStart={e => {
                  e.stopPropagation();
                  setGraphTooltip(prev =>
                    prev?.index === i && prev?.eventId === eventType.id
                      ? null
                      : { type: "value", eventId: eventType.id, index: i }
                  );
                }}
                style={{ cursor: "pointer" }}
              />
            </g>
          ))}
        </svg>
        <div className="flex justify-between mt-1">
          <span className={`text-[9px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
            {new Date(graphLogs[0].date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className={`text-[9px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
            {new Date(graphLogs[graphLogs.length - 1].date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    );
  }

  const recentLogs = sortedLogs.slice(-15);
  const gaps = [];
  for (let i = 1; i < recentLogs.length; i++) {
    const d1 = new Date(recentLogs[i - 1].date);
    const d2 = new Date(recentLogs[i].date);
    gaps.push({
      days: Math.round((d2 - d1) / (1000 * 60 * 60 * 24)),
      date: recentLogs[i].date,
    });
  }
  if (gaps.length < 1) return null;
  const gapValues = gaps.map(g => g.days);
  const maxGap = Math.max(...gapValues);
  const minGap = Math.min(...gapValues);
  const gapRange = maxGap - minGap || 1;
  const avgGap = Math.round(gapValues.reduce((s, v) => s + v, 0) / gapValues.length);
  const step = gaps.length > 1 ? graphW / (gaps.length - 1) : graphW / 2;
  const points = gapValues.map((v, i) => ({
    x: gaps.length > 1 ? i * step : graphW / 2,
    y: graphH - ((v - minGap) / gapRange) * (graphH - 10) - 5,
    val: v,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    gaps.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${graphH} L 0 ${graphH} Z`
      : null;

  const activeIdx =
    graphTooltip?.type === "freq" && graphTooltip?.eventId === eventType.id
      ? graphTooltip.index
      : null;

  return (
    <div className={`p-3 rounded-card ${isDarkMode ? "bg-iron-800/40" : "bg-slate-50"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
          {activeIdx != null
            ? new Date(gaps[activeIdx].date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Frequency (days between)"}
        </span>
        <span className="text-xs font-bold" style={{ color: eventType.color }}>
          {activeIdx != null ? `${gaps[activeIdx].days}d` : `avg ${avgGap}d`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${graphW} ${graphH}`}
        className="w-full"
        style={{ height: 80 }}
        onMouseLeave={() => setGraphTooltip(null)}
      >
        <defs>
          <linearGradient id={`freq-grad-${eventType.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={eventType.color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={eventType.color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {eventType.reminder_days &&
          (() => {
            const clampedY =
              graphH - ((eventType.reminder_days - minGap) / gapRange) * (graphH - 10) - 5;
            return (
              <line
                x1="0"
                x2={graphW}
                y1={clampedY}
                y2={clampedY}
                stroke={isDarkMode ? "#ef4444" : "#f87171"}
                strokeWidth="1"
                strokeDasharray="4 3"
                opacity="0.5"
              />
            );
          })()}
        {areaPath && <path d={areaPath} fill={`url(#freq-grad-${eventType.id})`} />}
        <path
          d={linePath}
          fill="none"
          stroke={eventType.color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {activeIdx != null && (
          <line
            x1={points[activeIdx].x}
            x2={points[activeIdx].x}
            y1={0}
            y2={graphH}
            stroke={isDarkMode ? "#555" : "#ccc"}
            strokeWidth="1"
            strokeDasharray="3 2"
          />
        )}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={activeIdx === i ? 5 : i === points.length - 1 ? 4 : 2.5}
              fill={eventType.color}
              stroke={isDarkMode ? "#1c1c1e" : "#fff"}
              strokeWidth={activeIdx === i || i === points.length - 1 ? 2 : 0}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={14}
              fill="transparent"
              onMouseEnter={() =>
                setGraphTooltip({ type: "freq", eventId: eventType.id, index: i })
              }
              onTouchStart={e => {
                e.stopPropagation();
                setGraphTooltip(prev =>
                  prev?.index === i && prev?.eventId === eventType.id
                    ? null
                    : { type: "freq", eventId: eventType.id, index: i }
                );
              }}
              style={{ cursor: "pointer" }}
            />
          </g>
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className={`text-[9px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
          {new Date(recentLogs[0].date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span className={`text-[9px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
          {new Date(recentLogs[recentLogs.length - 1].date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

function getWeekLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
  return sun.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatVolume(vol) {
  if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`;
  return `${Math.round(vol)}`;
}

export default function VolumeChart({
  exerciseLogsByName = {},
  workoutHeatmapData = [],
  isDarkMode,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const { weeklyVolumes, volumeByCategory, thisWeekVolume, lastWeekVolume, totalVolume, weeklyChange } =
    useMemo(() => {
      const byDate = {};
      const byCategory = {};
      let total = 0;

      Object.values(exerciseLogsByName).flat().forEach((log) => {
        const vol = (log.weight || 0) * (log.reps || 0);
        if (vol > 0) {
          byDate[log.date] = (byDate[log.date] || 0) + vol;
          const cat = log.category || "Other";
          byCategory[cat] = (byCategory[cat] || 0) + vol;
          total += vol;
        }
      });

      const now = new Date();
      const weekStarts = [];
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - now.getDay() - i * 7);
        weekStarts.push(d);
      }

      const weekMap = {};
      weekStarts.forEach((d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        weekMap[`${y}-${m}-${day}`] = 0;
      });

      Object.entries(byDate).forEach(([date, vol]) => {
        const d = new Date(date + "T00:00:00");
        const sun = new Date(d);
        sun.setDate(d.getDate() - d.getDay());
        const key = `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, "0")}-${String(sun.getDate()).padStart(2, "0")}`;
        if (weekMap.hasOwnProperty(key)) weekMap[key] += vol;
      });

      const weekly = weekStarts.map((d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const key = `${y}-${m}-${day}`;
        return {
          label: getWeekLabel(key),
          volume: weekMap[key] || 0,
        };
      });

      const thisWeek = weekly[3]?.volume || 0;
      const lastWeek = weekly[2]?.volume || 0;
      const change = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

      return {
        weeklyVolumes: weekly,
        volumeByCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
        thisWeekVolume: thisWeek,
        lastWeekVolume: lastWeek,
        totalVolume: total,
        weeklyChange: change,
      };
    }, [exerciseLogsByName]);

  const maxWeekly = Math.max(...weeklyVolumes.map((w) => w.volume), 1);
  const maxCategory = Math.max(...volumeByCategory.map(([, v]) => v), 1);
  const barColor = isDarkMode ? "#fbbf24" : "#dc2626";

  const changeDirection = thisWeekVolume > lastWeekVolume ? "up" : thisWeekVolume < lastWeekVolume ? "down" : "same";
  const ChangeIcon = changeDirection === "up" ? TrendingUp : changeDirection === "down" ? TrendingDown : Minus;

  const insight = useMemo(() => {
    if (thisWeekVolume === 0 && lastWeekVolume === 0) return "Start logging workouts to see your volume trends.";
    if (thisWeekVolume === 0) return "No volume logged this week yet. Get after it!";
    if (lastWeekVolume === 0) return "Great start! Keep it consistent to build a trend.";
    if (weeklyChange > 10) return "Volume is up — you're pushing harder. Watch for recovery needs.";
    if (weeklyChange > 0) return "Slight increase — steady progressive overload. Keep it up!";
    if (weeklyChange === 0) return "Same as last week — consistency is great for maintenance.";
    if (weeklyChange > -10) return "Small dip — could be a deload or rest week. That's normal.";
    return "Volume is lower this week. Deload weeks help recovery and long-term gains.";
  }, [thisWeekVolume, lastWeekVolume, weeklyChange]);

  return (
    <div
      className={`rounded-card overflow-hidden ${
        isDarkMode
          ? "bg-iron-900/50"
          : "bg-white border border-slate-200 shadow-sm"
      }`}
    >
      <div
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-card flex items-center justify-center ${
              isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/20"
            }`}
          >
            <BarChart3
              className={`w-5 h-5 ${
                isDarkMode ? "text-lift-primary" : "text-workout-primary"
              }`}
            />
          </div>
          <div>
            <h3
              className={`font-semibold ${
                isDarkMode ? "text-iron-100" : "text-slate-800"
              }`}
            >
              Training Volume
            </h3>
            <div className="flex items-center gap-2">
              <p className={`text-sm font-bold ${
                isDarkMode ? "text-lift-primary" : "text-workout-primary"
              }`}>
                {formatVolume(thisWeekVolume)} kg this week
              </p>
              {lastWeekVolume > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-medium ${
                  changeDirection === "up"
                    ? "bg-green-500/15 text-green-500"
                    : changeDirection === "down"
                    ? "bg-orange-500/15 text-orange-400"
                    : isDarkMode ? "bg-iron-800 text-iron-500" : "bg-slate-100 text-slate-500"
                }`}>
                  <ChangeIcon className="w-2.5 h-2.5" />
                  {weeklyChange !== 0 ? `${Math.abs(weeklyChange)}%` : "Same"}
                </span>
              )}
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className={`w-5 h-5 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
        ) : (
          <ChevronDown className={`w-5 h-5 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
        )}
      </div>

      {isExpanded && (
        <div className={`px-4 pb-4 border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>

          {/* What is training volume? */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
            className={`flex items-center gap-1.5 mt-3 mb-2 text-[11px] ${
              isDarkMode ? "text-iron-500 hover:text-iron-400" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Info className="w-3 h-3" />
            {showInfo ? "Hide explanation" : "What is training volume?"}
          </button>
          {showInfo && (
            <div className={`rounded-card p-3 mb-3 text-xs leading-relaxed ${
              isDarkMode ? "bg-iron-800/60 text-iron-400" : "bg-slate-50 text-slate-600"
            }`}>
              <p className="font-semibold mb-1">Volume = Weight × Reps (per set)</p>
              <p>
                Training volume measures your total workload. Gradually increasing it over weeks 
                (progressive overload) is how muscles grow stronger. A steady upward trend means 
                you&apos;re pushing harder. Dips are normal during deload/rest weeks.
              </p>
            </div>
          )}

          {/* Insight */}
          <p className={`text-xs mb-3 italic ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            {insight}
          </p>

          {/* 4-week bar chart with value labels */}
          <div className="pt-1">
            <h4 className={`text-xs font-medium mb-2 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Last 4 weeks
            </h4>
            <div className="flex items-end gap-2 h-[100px]">
              {weeklyVolumes.map((w, i) => {
                const pct = maxWeekly > 0 ? (w.volume / maxWeekly) * 100 : 0;
                const isThisWeek = i === 3;
                return (
                  <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-[10px] font-medium ${
                      w.volume > 0
                        ? isDarkMode ? "text-iron-300" : "text-slate-600"
                        : isDarkMode ? "text-iron-700" : "text-slate-300"
                    }`}>
                      {w.volume > 0 ? formatVolume(w.volume) : "—"}
                    </span>
                    <div className={`w-full rounded-lg ${isDarkMode ? "bg-iron-800" : "bg-slate-100"}`} style={{ height: "60px" }}>
                      <div
                        className="w-full rounded-lg transition-all duration-500"
                        style={{
                          height: `${Math.max(pct, w.volume > 0 ? 8 : 0)}%`,
                          backgroundColor: barColor,
                          opacity: isThisWeek ? 1 : 0.6,
                          marginTop: "auto",
                          position: "relative",
                          top: `${100 - Math.max(pct, w.volume > 0 ? 8 : 0)}%`,
                        }}
                      />
                    </div>
                    <span className={`text-[10px] ${
                      isThisWeek
                        ? isDarkMode ? "text-lift-primary font-semibold" : "text-workout-primary font-semibold"
                        : isDarkMode ? "text-iron-600" : "text-slate-400"
                    }`}>
                      {w.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary stats */}
          <div className={`flex gap-2 mt-4 pt-3 border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>
            <div className={`flex-1 rounded-card p-2.5 text-center ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}>
              <p className={`text-[10px] ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>This Week</p>
              <p className={`text-sm font-bold ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>{formatVolume(thisWeekVolume)}</p>
            </div>
            <div className={`flex-1 rounded-card p-2.5 text-center ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}>
              <p className={`text-[10px] ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>Last Week</p>
              <p className={`text-sm font-bold ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>{formatVolume(lastWeekVolume)}</p>
            </div>
            <div className={`flex-1 rounded-card p-2.5 text-center ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}>
              <p className={`text-[10px] ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>All Time</p>
              <p className={`text-sm font-bold ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>{formatVolume(totalVolume)}</p>
            </div>
          </div>

          {/* Volume by muscle group */}
          {volumeByCategory.length > 0 && (
            <div className={`mt-3 pt-3 border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>
              <h4 className={`text-xs font-medium mb-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                Volume by muscle group
              </h4>
              <p className={`text-[10px] mb-2.5 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                Shows which muscles are getting the most work. Balance these for well-rounded training.
              </p>
              <div className="space-y-2">
                {volumeByCategory.slice(0, 6).map(([cat, vol]) => {
                  const pct = (vol / maxCategory) * 100;
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <span className={`text-xs w-20 truncate ${isDarkMode ? "text-iron-300" : "text-slate-700"}`}>{cat}</span>
                      <div className={`flex-1 h-5 rounded-lg overflow-hidden ${isDarkMode ? "bg-iron-800" : "bg-slate-200"}`}>
                        <div
                          className={`h-full rounded-lg transition-all duration-500 ${isDarkMode ? "bg-lift-primary" : "bg-workout-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-xs w-14 text-right font-medium ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
                        {formatVolume(vol)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

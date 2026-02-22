import { useMemo } from "react";
import { Dumbbell, Flame, Target, Calendar, TrendingUp, TrendingDown } from "lucide-react";

function getWeekRanges() {
  const now = new Date();
  const day = now.getDay();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - day);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);

  const toStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fmtShort = (d) => `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}`;
  const inRange = (dateStr, start, end) => dateStr >= toStr(start) && dateStr <= toStr(end);

  return {
    subtitle: `${fmtShort(thisWeekStart)} - ${fmtShort(thisWeekEnd)}`,
    inThisWeek: (d) => inRange(d, thisWeekStart, thisWeekEnd),
    inLastWeek: (d) => inRange(d, lastWeekStart, lastWeekEnd),
  };
}

function StatCard({ icon: Icon, label, value, compare, isDarkMode }) {
  const improved = compare != null && compare > 0;
  const declined = compare != null && compare < 0;
  return (
    <div className={`rounded-xl p-4 ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`} />
        <span className={`text-xs font-medium ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>{value}</p>
      {compare != null && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${improved ? "text-green-400" : declined ? "text-red-400" : isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
          {improved ? <TrendingUp className="w-3 h-3" /> : declined ? <TrendingDown className="w-3 h-3" /> : null}
          {improved ? "+" : ""}{compare} vs last week
        </p>
      )}
    </div>
  );
}

export default function WeeklyRecap({
  workoutHeatmapData = [],
  habitHeatmapData = [],
  trackables = [],
  todayEntries = {},
  exerciseLogsByName = {},
  isDarkMode = false,
}) {
  const { subtitle, inThisWeek, inLastWeek } = useMemo(() => getWeekRanges(), []);

  const stats = useMemo(() => {
    const workoutThis = workoutHeatmapData.filter((d) => inThisWeek(d.date)).length;
    const workoutLast = workoutHeatmapData.filter((d) => inLastWeek(d.date)).length;

    let volumeThis = 0;
    let volumeLast = 0;
    let bestExercise = null;
    let bestWeight = 0;
    Object.entries(exerciseLogsByName).forEach(([name, logs]) => {
      logs.forEach((log) => {
        const w = parseFloat(log.weight) || 0;
        const r = parseInt(log.reps, 10) || 0;
        const vol = w * r;
        if (inThisWeek(log.date)) {
          volumeThis += vol;
          if (w > bestWeight) {
            bestWeight = w;
            bestExercise = { name, weight: w };
          }
        } else if (inLastWeek(log.date)) volumeLast += vol;
      });
    });

    const habitThis = habitHeatmapData.filter((d) => inThisWeek(d.date)).reduce((s, d) => s + (d.count || 0), 0);
    const habitLast = habitHeatmapData.filter((d) => inLastWeek(d.date)).reduce((s, d) => s + (d.count || 0), 0);
    const maxPerWeek = trackables.length * 7;
    const rateThis = maxPerWeek > 0 ? Math.round((habitThis / maxPerWeek) * 100) : 0;
    const rateLast = maxPerWeek > 0 ? Math.round((habitLast / maxPerWeek) * 100) : 0;

    return {
      workouts: { thisWeek: workoutThis, lastWeek: workoutLast, diff: workoutThis - workoutLast },
      volume: { thisWeek: Math.round(volumeThis), lastWeek: Math.round(volumeLast), diff: Math.round(volumeThis - volumeLast) },
      habits: { thisWeek: rateThis, lastWeek: rateLast, diff: rateThis - rateLast },
      bestExercise,
    };
  }, [workoutHeatmapData, habitHeatmapData, trackables.length, exerciseLogsByName, inThisWeek, inLastWeek]);

  return (
    <div className={`rounded-2xl overflow-hidden ${isDarkMode ? "bg-iron-900/50" : "bg-white border border-slate-200 shadow-sm"}`}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/20"}`}>
            <Calendar className={`w-5 h-5 ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`} />
          </div>
          <div>
            <h3 className={`font-semibold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>Weekly Recap</h3>
            <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>{subtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Dumbbell}
            label="Workouts"
            value={`${stats.workouts.thisWeek} days`}
            compare={stats.workouts.diff}
            isDarkMode={isDarkMode}
          />
          <StatCard
            icon={Target}
            label="Total Volume"
            value={stats.volume.thisWeek.toLocaleString()}
            compare={stats.volume.diff}
            isDarkMode={isDarkMode}
          />
          <StatCard
            icon={Flame}
            label="Habits"
            value={`${stats.habits.thisWeek}%`}
            compare={stats.habits.diff}
            isDarkMode={isDarkMode}
          />
          <div className={`rounded-xl p-4 ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className={`w-4 h-4 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`} />
              <span className={`text-xs font-medium ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>Best Exercise</span>
            </div>
            <p className={`text-lg font-bold truncate ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
              {stats.bestExercise ? `${stats.bestExercise.name} @ ${stats.bestExercise.weight} kg` : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

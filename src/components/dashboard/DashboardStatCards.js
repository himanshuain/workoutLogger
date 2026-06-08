import { Flame, Dumbbell, Target, Beef } from "lucide-react";
import { cn } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, sub, accent, isDarkMode, highlight }) {
  return (
    <div
      className={cn(
        "rounded-card p-3.5 min-w-0",
        highlight
          ? isDarkMode
            ? "bg-gradient-to-br from-lift-primary/20 to-transparent border border-lift-primary/30"
            : "bg-gradient-to-br from-red-50 to-transparent border border-red-200"
          : isDarkMode
            ? "bg-iron-900/60 border border-iron-800"
            : "bg-white border border-slate-200 shadow-sm",
      )}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={cn("w-3.5 h-3.5", accent)} />
        <p className={cn("text-[11px] font-medium", isDarkMode ? "text-iron-500" : "text-slate-500")}>
          {label}
        </p>
      </div>
      <p className={cn("text-2xl font-bold tabular-nums", isDarkMode ? "text-iron-50" : "text-slate-900")}>
        {value}
      </p>
      {sub && (
        <p className={cn("text-[11px] mt-0.5", isDarkMode ? "text-iron-500" : "text-slate-500")}>{sub}</p>
      )}
    </div>
  );
}

export default function DashboardStatCards({ stats, isDarkMode }) {
  const accent = isDarkMode ? "text-lift-primary" : "text-workout-primary";
  const monthDelta = stats.workoutsThisMonth - stats.workoutsLastMonth;
  const monthSub =
    monthDelta > 0
      ? `+${monthDelta} vs last month`
      : monthDelta < 0
        ? `${monthDelta} vs last month`
        : "Same as last month";

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        icon={Flame}
        label="Workout streak"
        value={`${stats.currentStreak}d`}
        sub={`${stats.totalWorkouts} workouts logged ever`}
        accent={accent}
        isDarkMode={isDarkMode}
        highlight
      />
      <StatCard
        icon={Dumbbell}
        label="Workouts this month"
        value={stats.workoutsThisMonth}
        sub={monthSub}
        accent={accent}
        isDarkMode={isDarkMode}
      />
      <StatCard
        icon={Target}
        label="Habits done today"
        value={`${stats.habitsCompletedToday}/${stats.habitsTotal}`}
        sub={stats.habitsTotal === 0 ? "No habits set up" : "Checked off on Today tab"}
        accent={isDarkMode ? "text-green-400" : "text-green-600"}
        isDarkMode={isDarkMode}
      />
      <StatCard
        icon={Beef}
        label="Protein eaten today"
        value={`${stats.proteinToday}g`}
        sub={stats.caloriesToday > 0 ? `${stats.caloriesToday} kcal` : "Add food with macros"}
        accent={isDarkMode ? "text-pink-400" : "text-pink-600"}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

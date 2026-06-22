import { Flame, Dumbbell, Target, Beef } from "lucide-react";
import { cn } from "@/lib/utils";

function StatCell({ icon: Icon, label, value, accent, isDarkMode, highlight }) {
  return (
    <div
      className={cn(
        "min-w-0 px-2 py-2.5 text-center sm:px-3",
        highlight && (isDarkMode ? "bg-lift-primary/10" : "bg-red-50/80"),
      )}
    >
      <div className="mb-1 flex items-center justify-center gap-1">
        <Icon className={cn("h-3 w-3 shrink-0", accent)} />
        <p className={cn("truncate text-[10px] font-medium leading-none", isDarkMode ? "text-iron-500" : "text-slate-500")}>
          {label}
        </p>
      </div>
      <p className={cn("text-base font-bold tabular-nums leading-tight sm:text-lg", isDarkMode ? "text-iron-50" : "text-slate-900")}>
        {value}
      </p>
    </div>
  );
}

export default function DashboardStatCards({ stats, isDarkMode }) {
  const accent = isDarkMode ? "text-lift-primary" : "text-workout-primary";
  const monthDelta = stats.workoutsThisMonth - stats.workoutsLastMonth;
  const monthValue =
    monthDelta > 0
      ? `${stats.workoutsThisMonth} (+${monthDelta})`
      : monthDelta < 0
        ? `${stats.workoutsThisMonth} (${monthDelta})`
        : String(stats.workoutsThisMonth);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border",
        isDarkMode ? "border-iron-800 bg-iron-900/60" : "border-slate-200 bg-white shadow-sm",
      )}
    >
      <div
        className={cn(
          "grid grid-cols-2 sm:grid-cols-4",
          isDarkMode ? "divide-iron-800 sm:divide-x" : "divide-slate-200 sm:divide-x",
          "divide-y sm:divide-y-0",
        )}
      >
        <StatCell
          icon={Flame}
          label="Streak"
          value={`${stats.currentStreak}d`}
          accent={accent}
          isDarkMode={isDarkMode}
          highlight
        />
        <StatCell
          icon={Dumbbell}
          label="This month"
          value={monthValue}
          accent={accent}
          isDarkMode={isDarkMode}
        />
        <StatCell
          icon={Target}
          label="Habits today"
          value={stats.habitsTotal === 0 ? "—" : `${stats.habitsCompletedToday}/${stats.habitsTotal}`}
          accent={isDarkMode ? "text-green-400" : "text-green-600"}
          isDarkMode={isDarkMode}
        />
        <StatCell
          icon={Beef}
          label="Protein today"
          value={`${stats.proteinToday}g`}
          accent={isDarkMode ? "text-pink-400" : "text-pink-600"}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}

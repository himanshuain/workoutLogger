import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { Flame, CalendarCheck } from "lucide-react";

export default function QuickStats({
  streak = 0,
  weekWorkouts = 0,
  weekTotal = 7,
}) {
  const { isDarkMode } = useTheme();

  return (
    <Link href="/progress" className="block">
      <div className="flex gap-3">
        <div
          className={`
          flex-1 rounded-card p-3 flex items-center gap-3 transition-colors
          ${
            isDarkMode
              ? "bg-iron-900/50 active:bg-iron-800/50"
              : "bg-white border border-slate-200 shadow-sm active:bg-slate-50"
          }
        `}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            streak > 0
              ? "bg-orange-500/20"
              : isDarkMode ? "bg-iron-800" : "bg-slate-100"
          }`}>
            <Flame className={`w-5 h-5 ${
              streak > 0
                ? "text-orange-500"
                : isDarkMode ? "text-iron-600" : "text-slate-400"
            }`} />
          </div>
          <div>
            <p
              className={`text-xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
            >
              {streak}
              <span
                className={`text-sm font-normal ml-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
              >
                {streak === 1 ? "day" : "days"}
              </span>
            </p>
            <p
              className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
            >
              streak
            </p>
          </div>
        </div>

        <div
          className={`
          flex-1 rounded-card p-3 flex items-center gap-3 transition-colors
          ${
            isDarkMode
              ? "bg-iron-900/50 active:bg-iron-800/50"
              : "bg-white border border-slate-200 shadow-sm active:bg-slate-50"
          }
        `}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            weekWorkouts > 0
              ? isDarkMode ? "bg-lift-primary/20" : "bg-workout-primary/20"
              : isDarkMode ? "bg-iron-800" : "bg-slate-100"
          }`}>
            <CalendarCheck className={`w-5 h-5 ${
              weekWorkouts > 0
                ? isDarkMode ? "text-lift-primary" : "text-workout-primary"
                : isDarkMode ? "text-iron-600" : "text-slate-400"
            }`} />
          </div>
          <div>
            <p
              className={`text-xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
            >
              {weekWorkouts}
            </p>
            <p
              className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
            >
              this week
            </p>
          </div>
        </div>
      </div>
      <p
        className={`text-xs text-center mt-2 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}
      >
        Tap to view progress
      </p>
    </Link>
  );
}

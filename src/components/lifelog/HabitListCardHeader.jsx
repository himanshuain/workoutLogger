import {
  CalendarCheck,
  CalendarOff,
  ChevronDown,
  Check,
  History,
  Repeat,
} from "lucide-react";
import HabitActiveDayPills from "@/components/lifelog/HabitActiveDayPills";
import { isDailyHabit } from "@/lib/habitSchedule";

function HabitListMeta({
  streakDays,
  scheduledForViewDay,
  doneForDay,
  isDarkMode,
  daily,
}) {
  const muted = isDarkMode ? "text-iron-500" : "text-slate-500";
  const mutedFaint = isDarkMode ? "text-iron-500" : "text-slate-400";
  const green = isDarkMode ? "text-green-400" : "text-green-600";

  return (
    <div className={`mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${muted}`}>
      <span className="inline-flex items-center gap-1">
        <History className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        {streakDays} day{streakDays !== 1 ? "s" : ""} tracked
      </span>
      {daily ? (
        <span className={`inline-flex items-center gap-1 font-medium ${muted}`}>
          <Repeat className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          Daily habit
        </span>
      ) : scheduledForViewDay ? (
        <span className={`inline-flex items-center gap-1 font-medium ${green}`}>
          <CalendarCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {doneForDay ? "Done today" : "Log today"}
        </span>
      ) : (
        <span className={`inline-flex items-center gap-1 ${mutedFaint}`}>
          <CalendarOff className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          Not scheduled today
        </span>
      )}
    </div>
  );
}

/**
 * Shared habit row header (Today Life log + Lifelog habits tab).
 */
export default function HabitListCardHeader({
  trackable,
  streakDays,
  isDarkMode,
  scheduledForViewDay,
  doneForDay,
  onToggleDone,
  isExpanded,
  onToggleExpand,
  trailingActions = null,
}) {
  const daily = isDailyHabit(trackable.active_days);
  const canLogToday = daily || scheduledForViewDay;

  const iconTileStyle = {
    backgroundColor:
      doneForDay && canLogToday ? trackable.color : `${trackable.color}30`,
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-pressed={doneForDay}
          aria-label={
            canLogToday
              ? doneForDay
                ? `Mark ${trackable.name} not done for this day`
                : `Mark ${trackable.name} done for this day`
              : `${trackable.name} is not scheduled today`
          }
          disabled={!canLogToday || !onToggleDone}
          onClick={canLogToday && onToggleDone ? onToggleDone : undefined}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card text-lg transition-colors disabled:cursor-default disabled:opacity-100"
          style={iconTileStyle}
        >
          {doneForDay && canLogToday ? (
            <Check className="h-5 w-5 text-white" strokeWidth={2.5} />
          ) : (
            trackable.icon
          )}
        </button>

        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <p
              className={`font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
            >
              {trackable.name}
            </p>
            <HabitListMeta
              streakDays={streakDays}
              scheduledForViewDay={scheduledForViewDay}
              doneForDay={doneForDay}
              isDarkMode={isDarkMode}
              daily={daily}
            />
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 transition-transform ${
              isExpanded ? "rotate-180" : ""
            } ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
          />
        </button>

        {trailingActions}
      </div>

      {!daily ? (
        <HabitActiveDayPills
          activeDays={trackable.active_days}
          isDarkMode={isDarkMode}
        />
      ) : null}
    </div>
  );
}

import { ListChecks, Check, Plus } from "lucide-react";
import SectionManageButton from "@/components/SectionManageButton";
import { sectionSurfaceClass } from "@/components/SectionSurface";

/**
 * Habits list + Life log quick actions (shared by Log page and Today).
 * @param {{ showHabits?: boolean; showLifeLog?: boolean }} props — omit life block with showLifeLog={false}.
 */
export default function DayHabitsLifeLogCard({
  isDarkMode,
  selectedDate,
  habitList,
  trackingForDay,
  onHabitToggle,
  sortedLifeEvents,
  hasLifeLogThisDay,
  onQuickLifeLog,
  onManageLifelog,
  showHabits = true,
  showLifeLog = true,
}) {
  const cardTitle =
    showHabits && showLifeLog ? "Habits & life log" : showHabits ? "Habits" : "Life log";

  return (
    <div className={sectionSurfaceClass(isDarkMode)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ListChecks className={`h-4 w-4 shrink-0 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
          <p className="text-card-subtitle">{cardTitle}</p>
        </div>
        <SectionManageButton isDarkMode={isDarkMode} onClick={onManageLifelog} ariaLabel="Manage habits and life log" />
      </div>

      {!selectedDate ? (
        <p className="text-body">Choose a day above to log habits or life events for that date.</p>
      ) : (
        <>
          {showHabits ? (
            <>
              <p className="text-section-header mb-2">Habits</p>
              {habitList.length === 0 ? (
                <p className="text-body mb-4">
                  No habits for this weekday. Add habits on Today, or open{" "}
                  <button
                    type="button"
                    onClick={onManageLifelog}
                    className={`font-semibold underline underline-offset-2 ${
                      isDarkMode ? "text-lift-primary" : "text-workout-primary"
                    }`}
                  >
                    Lifelog
                  </button>{" "}
                  to create and schedule them.
                </p>
              ) : (
                <ul className="mb-4 space-y-2">
                  {habitList.map(t => {
                    const entry = trackingForDay[t.id];
                    const done = !!entry?.is_completed;
                    return (
                      <li
                        key={t.id}
                        className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
                          isDarkMode ? "bg-iron-900/60" : "bg-white ring-1 ring-slate-100"
                        }`}
                      >
                        <button
                          type="button"
                          aria-pressed={done}
                          aria-label={done ? `Mark ${t.name} not done for this day` : `Mark ${t.name} done for this day`}
                          onClick={() => onHabitToggle(t)}
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition-all ${
                            done
                              ? "shadow-md"
                              : isDarkMode
                                ? "bg-iron-800 ring-1 ring-iron-700"
                                : "bg-slate-100 ring-1 ring-slate-200"
                          }`}
                          style={done ? { backgroundColor: t.color } : undefined}
                        >
                          {done ? <Check className="h-5 w-5 text-white" strokeWidth={2.5} /> : t.icon}
                        </button>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-card-subtitle truncate">{t.name}</p>
                          <p className="text-metadata">
                            {done
                              ? "Done this day"
                              : t.has_value
                                ? "Needs amount — log in Lifelog"
                                : "Tap to toggle"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : null}

          {showLifeLog ? (
            <>
              {showHabits && showLifeLog && <p className="text-section-header mb-2">Life log</p>}
              {sortedLifeEvents.length === 0 ? (
                <p className="text-body">
                  No event types yet.{" "}
                  <button
                    type="button"
                    onClick={onManageLifelog}
                    className={`font-semibold underline underline-offset-2 ${
                      isDarkMode ? "text-lift-primary" : "text-workout-primary"
                    }`}
                  >
                    Open Lifelog
                  </button>{" "}
                  to create life events, reminders, and habit details.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sortedLifeEvents.map(et => {
                    const done = hasLifeLogThisDay(et, selectedDate);
                    return (
                      <li
                        key={et.id}
                        className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
                          isDarkMode ? "bg-iron-900/60" : "bg-white ring-1 ring-slate-100"
                        }`}
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
                          style={{ backgroundColor: `${et.color}30` }}
                        >
                          {et.icon || "📌"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-card-subtitle truncate">{et.name}</p>
                          {done ? (
                            <p className={`text-xs ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                              Logged · tap Undo to remove
                            </p>
                          ) : et.need_value && et.need_notes ? (
                            <p className="text-metadata">Value & notes required</p>
                          ) : et.need_value ? (
                            <p className="text-metadata">Value required</p>
                          ) : et.need_notes ? (
                            <p className="text-metadata">Notes required</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => onQuickLifeLog(et)}
                          className={`flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                            done
                              ? isDarkMode
                                ? "border border-iron-600 bg-iron-800/80 text-iron-200 hover:bg-iron-800"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              : isDarkMode
                                ? "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
                                : "bg-violet-100 text-violet-800 hover:bg-violet-200"
                          }`}
                        >
                          {done ? (
                            <>Undo</>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              Log
                            </>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

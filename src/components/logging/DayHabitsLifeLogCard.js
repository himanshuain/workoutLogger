import { ListChecks, Check } from "lucide-react";
import SectionManageButton from "@/components/SectionManageButton";
import { sectionSurfaceClass } from "@/components/SectionSurface";
import LifeLogEventQuickGlyph from "@/components/logging/LifeLogEventQuickGlyph";

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
                        className={`flex items-center gap-3 rounded-card px-2 py-2 ${
                          isDarkMode ? "bg-iron-900/60" : "bg-white ring-1 ring-slate-100"
                        }`}
                      >
                        <button
                          type="button"
                          aria-pressed={done}
                          aria-label={done ? `Mark ${t.name} not done for this day` : `Mark ${t.name} done for this day`}
                          onClick={() => onHabitToggle(t)}
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-card text-lg transition-all ${
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
                        className={`flex items-center gap-3 rounded-card px-2 py-2 ${
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
                              Logged · tap icon to remove
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
                          aria-label={
                            done
                              ? `Remove log for ${et.name}`
                              : et.need_notes || et.need_value
                                ? `Log ${et.name} with details`
                                : `Quick log ${et.name}`
                          }
                          onClick={() => onQuickLifeLog(et)}
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-card transition-all active:scale-90 ${
                            done
                              ? isDarkMode
                                ? "bg-lift-primary text-iron-950 shadow-inner"
                                : "bg-workout-primary text-white shadow-sm"
                              : isDarkMode
                                ? "bg-iron-800/85 text-lift-primary ring-1 ring-iron-600 shadow-inner shadow-black/10"
                                : "bg-white text-workout-primary ring-1 ring-slate-300 shadow-sm"
                          }`}
                        >
                          <LifeLogEventQuickGlyph
                            isLoggedToday={done}
                            needValue={Boolean(et.need_value)}
                            needNotes={Boolean(et.need_notes)}
                            loggedIconClass={isDarkMode ? "text-iron-950" : "text-white"}
                          />
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

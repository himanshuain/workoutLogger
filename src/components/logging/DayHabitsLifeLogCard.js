import { ListChecks, Sparkles, Check } from "lucide-react";
import SectionManageButton from "@/components/SectionManageButton";
import SectionHeader from "@/components/SectionHeader";
import { sectionSurfaceClass } from "@/components/SectionSurface";
import LifeLogEventQuickGlyph from "@/components/logging/LifeLogEventQuickGlyph";
import {
  actionSuccess,
  actionNeutralIcon,
} from "@/lib/actionButtonStyles";

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
  const habitsDone = habitList.filter(t => trackingForDay[t.id]?.is_completed).length;
  const habitsMeta = habitList.length > 0 ? `${habitsDone}/${habitList.length}` : null;

  const lifeLoggedCount = selectedDate
    ? sortedLifeEvents.filter(et => hasLifeLogThisDay(et, selectedDate)).length
    : 0;
  const lifeMeta =
    sortedLifeEvents.length > 0 ? `${lifeLoggedCount} logged` : null;

  const showCombinedHeader = showHabits && showLifeLog;

  return (
    <div className={sectionSurfaceClass(isDarkMode)}>
      {showCombinedHeader ? (
        <SectionHeader
          icon={ListChecks}
          label="Habits & life log"
          isDarkMode={isDarkMode}
        >
          <SectionManageButton
            isDarkMode={isDarkMode}
            onClick={onManageLifelog}
            ariaLabel="Manage habits and life log"
          />
        </SectionHeader>
      ) : showHabits ? (
        <SectionHeader
          icon={Sparkles}
          label="Habits"
          meta={habitsMeta}
          isDarkMode={isDarkMode}
        >
          <SectionManageButton
            isDarkMode={isDarkMode}
            onClick={onManageLifelog}
            ariaLabel="Manage habits"
          />
        </SectionHeader>
      ) : (
        <SectionHeader
          icon={ListChecks}
          label="Life log"
          meta={lifeMeta}
          isDarkMode={isDarkMode}
        >
          <SectionManageButton
            isDarkMode={isDarkMode}
            onClick={onManageLifelog}
            ariaLabel="Manage life log"
          />
        </SectionHeader>
      )}

      {!selectedDate ? (
        <p className="text-body">Choose a day above to log habits or life events for that date.</p>
      ) : (
        <>
          {showHabits ? (
            <>
              {showCombinedHeader ? (
                <SectionHeader
                  as="p"
                  icon={Sparkles}
                  label="Habits"
                  meta={habitsMeta}
                  isDarkMode={isDarkMode}
                  className="mb-2"
                />
              ) : null}
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
                <ul className={`space-y-2 ${showLifeLog ? "mb-4" : ""}`}>
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
              {showCombinedHeader ? (
                <SectionHeader
                  as="p"
                  icon={ListChecks}
                  label="Life log"
                  meta={lifeMeta}
                  isDarkMode={isDarkMode}
                  className="mb-2"
                />
              ) : null}
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
                              ? actionSuccess(isDarkMode)
                              : actionNeutralIcon(isDarkMode)
                          }`}
                        >
                          <LifeLogEventQuickGlyph
                            isLoggedToday={done}
                            needValue={Boolean(et.need_value)}
                            needNotes={Boolean(et.need_notes)}
                            loggedIconClass={isDarkMode ? "text-green-400" : "text-green-700"}
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

import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronDown, Heart } from "lucide-react";
import { LazyBodyWeightTracker } from "@/components/charts/lazyCharts";
import { useWorkout } from "@/context/WorkoutContext";
import EmptyState, { EmptyInline } from "@/components/EmptyState";
import { SkeletonList } from "@/components/SkeletonLoader";
import { LazyActivityHeatmap } from "@/components/charts/lazyCharts";
import { LazyExpandedLogInsightsTabs } from "@/components/lifelog/lazyLifelog";
import LifeLogEventQuickGlyph from "@/components/logging/LifeLogEventQuickGlyph";
import LifeLogGapPill from "@/components/lifelog/LifeLogGapPill";
import SectionManageButton from "@/components/SectionManageButton";
import SectionHeader from "@/components/SectionHeader";
import { sectionSurfaceClass } from "@/components/SectionSurface";
import { formatDaysSince, formatDate } from "@/lib/lifelogUtils";
import {
  actionSuccess,
  actionNeutralIcon,
} from "@/lib/actionButtonStyles";
import { toast } from "sonner";
import { LIFELOG_TAB_EVENTS, LIFELOG_TAB_HABITS } from "@/lib/lifelogNav";
import HabitListCardHeader from "@/components/lifelog/HabitListCardHeader";

function getLocalDateStr(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Events + Habits sub-tabs with expandable history (same interaction model as /lifelog).
 */
export default function TodayLifeLogPanel({
  isDarkMode,
  viewingDate,
  today,
  sortedLifeEvents,
  hasLifeLogThisDay,
  onQuickLifeLog,
  onManage,
  onInvalidateStrip,
}) {
  const queryClient = useQueryClient();
  const {
    user,
    trackables,
    todayEntries,
    getEventLogs,
    getTrackingEntries,
    toggleTrackingEntryForDate,
  } = useWorkout();

  const [activeTab, setActiveTab] = useState("events");
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [expandedEventLogs, setExpandedEventLogs] = useState([]);
  const [isLoadingExpandedLogs, setIsLoadingExpandedLogs] = useState(false);
  const [expandedHabit, setExpandedHabit] = useState(null);

  const eventHeatmapData = useMemo(() => {
    const out = {};
    sortedLifeEvents.forEach(et => {
      const byDate = {};
      (et.event_logs || []).forEach(log => {
        const d = log.date;
        if (!d) return;
        byDate[d] = (byDate[d] || 0) + 1;
      });
      out[et.id] = Object.entries(byDate).map(([date, count]) => ({ date, count }));
    });
    return out;
  }, [sortedLifeEvents]);

  const dateRange = useMemo(() => {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    return { start: getLocalDateStr(startDate), end: today };
  }, [today]);

  const { data: habitHeatmapData = {} } = useQuery({
    queryKey: [
      "trackingEntriesForHeatmap",
      user?.id,
      dateRange.start,
      dateRange.end,
      trackables.length,
      "todayPanel",
    ],
    queryFn: async () => {
      if (!user || trackables.length === 0) return {};
      const entries = await getTrackingEntries(dateRange.start, dateRange.end);
      const dataByTrackable = {};
      entries.forEach(entry => {
        if (!dataByTrackable[entry.trackable_id]) {
          dataByTrackable[entry.trackable_id] = {};
        }
        if (entry.is_completed) {
          dataByTrackable[entry.trackable_id][entry.date] =
            (dataByTrackable[entry.trackable_id][entry.date] || 0) + 1;
        }
      });
      const heatmapData = {};
      trackables
        .filter(t => t.name !== "Body Weight")
        .forEach(trackable => {
          const trackableData = { ...(dataByTrackable[trackable.id] || {}) };
          const todayEntry = todayEntries[trackable.id];
          if (todayEntry?.is_completed) {
            trackableData[today] = 1;
          }
          heatmapData[trackable.id] = Object.entries(trackableData).map(([date, count]) => ({
            date,
            count,
          }));
        });
      return heatmapData;
    },
    enabled: !!user && trackables.length > 0 && activeTab === "habits",
  });

  const { data: trackingForDayRaw = [] } = useQuery({
    queryKey: ["trackingEntriesForDate", user?.id, viewingDate, "todayLifeLogPanel"],
    queryFn: () => getTrackingEntries(viewingDate, viewingDate),
    enabled: Boolean(user && viewingDate && viewingDate !== today),
  });

  const trackingForDay = useMemo(() => {
    const map = {};
    if (viewingDate === today) {
      Object.entries(todayEntries || {}).forEach(([id, entry]) => {
        map[id] = entry;
      });
    } else {
      for (const e of trackingForDayRaw) {
        map[e.trackable_id] = e;
      }
    }
    return map;
  }, [trackingForDayRaw, viewingDate, today, todayEntries]);

  const habitTrackables = useMemo(
    () =>
      [...(trackables || [])]
        .filter(t => t.name !== "Body Weight")
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [trackables],
  );

  const getStreakCount = trackableId => (habitHeatmapData[trackableId] || []).length;

  const toggleExpandEvent = useCallback(
    async eventType => {
      if (expandedEvent === eventType.id) {
        setExpandedEvent(null);
        return;
      }
      setExpandedEvent(eventType.id);
      setIsLoadingExpandedLogs(true);
      const logs = await getEventLogs(eventType.id);
      setExpandedEventLogs(logs);
      setIsLoadingExpandedLogs(false);
    },
    [expandedEvent, getEventLogs],
  );

  const handleHabitToggleForDay = async trackable => {
    if (!viewingDate) return;
    if (trackable.has_value) {
      toast.message("Value habits", {
        description: "Open Lifelog to enter amounts for past days.",
      });
      return;
    }
    const existing = trackingForDay[trackable.id];
    const completed = !!existing?.is_completed;
    await toggleTrackingEntryForDate(
      trackable.id,
      viewingDate,
      !completed,
      existing?.value ?? null,
    );
    queryClient.invalidateQueries({
      queryKey: ["trackingEntriesForDate", user?.id, viewingDate],
    });
    queryClient.invalidateQueries({ queryKey: ["trackingEntries"] });
    queryClient.invalidateQueries({ queryKey: ["trackingEntriesForHeatmap"] });
    onInvalidateStrip?.();
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const tabBtn = (tab, label, Icon) => {
    const active = activeTab === tab;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(tab)}
        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
          active
            ? isDarkMode
              ? "bg-iron-800 text-iron-100"
              : "bg-white text-slate-800 shadow-sm"
            : isDarkMode
              ? "text-iron-500"
              : "text-slate-500"
        }`}
      >
        <div className="flex items-center justify-center gap-1.5">
          <Icon className="w-4 h-4" />
          {label}
        </div>
      </button>
    );
  };

  const allLifelogTab = activeTab === "habits" ? LIFELOG_TAB_HABITS : LIFELOG_TAB_EVENTS;

  return (
    <div className={sectionSurfaceClass(isDarkMode)}>
      <SectionHeader icon={Calendar} label="Life log" isDarkMode={isDarkMode}>
        <SectionManageButton
          isDarkMode={isDarkMode}
          variant="all"
          onClick={() => onManage(allLifelogTab)}
          ariaLabel={activeTab === "habits" ? "All habits" : "All events"}
        />
      </SectionHeader>

      <div className="mb-4">
        <LazyBodyWeightTracker isDarkMode={isDarkMode} preferredLogDate={viewingDate} />
      </div>

      <div
        className={`flex gap-1.5 p-1 rounded-card mb-4 ${
          isDarkMode ? "bg-iron-900" : "bg-slate-100"
        }`}
      >
        {tabBtn("events", "Events", Calendar)}
        {tabBtn("habits", "Habits", Heart)}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "events" ? (
          <motion.div
            key="events"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-3"
          >
            {sortedLifeEvents.length === 0 ? (
              <EmptyState
                isDarkMode={isDarkMode}
                message="No events yet"
                hint="Track haircuts, doctor visits, and other life events."
                actionLabel="Open Lifelog"
                onAction={() => onManage(LIFELOG_TAB_EVENTS)}
              />
            ) : (
              sortedLifeEvents.map(eventType => {
                const isExpanded = expandedEvent === eventType.id;
                const loggedForDay = viewingDate
                  ? hasLifeLogThisDay(eventType, viewingDate)
                  : false;
                const isOverdue =
                  eventType.reminder_days &&
                  eventType.days_since !== null &&
                  eventType.days_since >= eventType.reminder_days;

                return (
                  <div
                    key={eventType.id}
                    className={`rounded-card overflow-hidden ${
                      isDarkMode ? "bg-iron-900" : "bg-white shadow-sm border border-slate-200/80"
                    } ${isOverdue ? (isDarkMode ? "ring-1 ring-amber-500/40" : "ring-1 ring-amber-400/50") : ""}`}
                  >
                    <div className="flex items-center gap-3 p-3.5">
                      <button
                        type="button"
                        onClick={() => toggleExpandEvent(eventType)}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div
                          className="w-11 h-11 rounded-card flex items-center justify-center text-xl flex-shrink-0"
                          style={{ backgroundColor: `${eventType.color}25` }}
                        >
                          {eventType.icon}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <h3
                              className={`min-w-0 truncate font-semibold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                            >
                              {eventType.name}
                            </h3>
                            {isOverdue ? (
                              <span
                                className="shrink-0 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-500"
                              >
                                Due
                              </span>
                            ) : null}
                          </div>
                          <p
                            className={`mt-0.5 text-xs ${
                              isOverdue
                                ? "text-amber-500"
                                : isDarkMode
                                  ? "text-iron-500"
                                  : "text-slate-500"
                            }`}
                          >
                            {eventType.days_since === null
                              ? "Never logged"
                              : formatDaysSince(eventType.days_since)}
                            {eventType.total_logs > 0 && (
                              <span className={isDarkMode ? "text-iron-600" : "text-slate-400"}>
                                {" "}
                                · {eventType.total_logs} time
                                {eventType.total_logs !== 1 ? "s" : ""}
                              </span>
                            )}
                          </p>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 flex-shrink-0 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          } ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}
                        />
                      </button>
                      <button
                        type="button"
                        aria-pressed={loggedForDay}
                        onClick={() => onQuickLifeLog(eventType)}
                        className={`w-10 h-10 rounded-card flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                          loggedForDay ? actionSuccess(isDarkMode) : actionNeutralIcon(isDarkMode)
                        }`}
                      >
                        <LifeLogEventQuickGlyph
                          isLoggedToday={loggedForDay}
                          needValue={Boolean(eventType.need_value)}
                          needNotes={Boolean(eventType.need_notes)}
                          loggedIconClass={isDarkMode ? "text-green-400" : "text-green-700"}
                        />
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key={`expand-${eventType.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3.5 pb-3.5">
                            <LazyExpandedLogInsightsTabs
                              isDarkMode={isDarkMode}
                              insightsChildren={
                                <LazyActivityHeatmap
                                  data={eventHeatmapData[eventType.id] || []}
                                  type="habit"
                                  label=""
                                  color={eventType.color}
                                  compact
                                  mini
                                  isDarkMode={isDarkMode}
                                />
                              }
                              logsChildren={
                                isLoadingExpandedLogs ? (
                                  <SkeletonList
                                    isDarkMode={isDarkMode}
                                    count={3}
                                    className="border-0 bg-transparent shadow-none"
                                  />
                                ) : expandedEventLogs.length === 0 ? (
                                  <EmptyInline
                                    isDarkMode={isDarkMode}
                                    message="No history yet — log this event to start."
                                  />
                                ) : (
                                  <>
                                    <p
                                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                                        isDarkMode ? "text-iron-500" : "text-slate-500"
                                      }`}
                                    >
                                      Recent logs
                                    </p>
                                    <div className="pt-1 space-y-1.5">
                                      {expandedEventLogs.slice(0, 10).map((log, idx) => {
                                        const logDate = new Date(log.date);
                                        const todayDate = new Date();
                                        todayDate.setHours(0, 0, 0, 0);
                                        logDate.setHours(0, 0, 0, 0);
                                        const daysSince = Math.floor(
                                          (todayDate - logDate) / (1000 * 60 * 60 * 24),
                                        );
                                        const gap =
                                          idx > 0
                                            ? Math.floor(
                                                (new Date(expandedEventLogs[idx - 1].date) -
                                                  new Date(log.date)) /
                                                  (1000 * 60 * 60 * 24),
                                              )
                                            : null;
                                        return (
                                          <div key={log.id}>
                                            {gap !== null && gap > 0 && idx > 0 && (
                                              <div className="flex justify-center py-0.5">
                                                <LifeLogGapPill
                                                  gapDays={gap}
                                                  newerDateStr={expandedEventLogs[idx - 1].date}
                                                  olderDateStr={log.date}
                                                  kind="logs"
                                                  isDarkMode={isDarkMode}
                                                />
                                              </div>
                                            )}
                                            <div
                                              className={`flex items-start gap-3 p-2.5 rounded-card border ${
                                                idx === 0
                                                  ? isDarkMode
                                                    ? "border-iron-700/70 bg-iron-800/40"
                                                    : "border-slate-200 bg-slate-50"
                                                  : isDarkMode
                                                    ? "border-iron-800/50"
                                                    : "border-slate-100"
                                              }`}
                                            >
                                              <div
                                                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                                                style={{
                                                  backgroundColor:
                                                    idx === 0
                                                      ? eventType.color
                                                      : isDarkMode
                                                        ? "#3f3f46"
                                                        : "#cbd5e1",
                                                }}
                                              />
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                  <p
                                                    className={`text-sm font-medium ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                                                  >
                                                    {formatDate(log.date)}
                                                  </p>
                                                  <span
                                                    className={`text-[10px] flex-shrink-0 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}
                                                  >
                                                    {formatDaysSince(daysSince)}
                                                  </span>
                                                </div>
                                                {log.notes && (
                                                  <p
                                                    className={`text-xs mt-0.5 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
                                                  >
                                                    {log.notes}
                                                  </p>
                                                )}
                                                {eventType.need_value && log.cost != null && (
                                                  <p
                                                    className="text-xs mt-0.5 font-semibold"
                                                    style={{ color: eventType.color }}
                                                  >
                                                    Value: {log.cost}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </>
                                )
                              }
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </motion.div>
        ) : (
          <motion.div
            key="habits"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-3"
          >
            {habitTrackables.length === 0 ? (
              <EmptyState
                isDarkMode={isDarkMode}
                message="No habits yet"
                hint="Track water, vitamins, and daily routines."
                actionLabel="Open Lifelog"
                onAction={() => onManage(LIFELOG_TAB_HABITS)}
              />
            ) : (
              habitTrackables.map(trackable => {
                const isExpanded = expandedHabit === trackable.id;
                const streakDays = getStreakCount(trackable.id);
                const dow = viewingDate
                  ? new Date(viewingDate + "T12:00:00").getDay()
                  : new Date().getDay();
                const isScheduledForViewing =
                  !trackable.active_days || trackable.active_days.includes(dow);
                const doneForDay = !!trackingForDay[trackable.id]?.is_completed;

                return (
                  <div
                    key={trackable.id}
                    className={`rounded-card overflow-hidden ${
                      isDarkMode ? "bg-iron-900" : "bg-white border border-slate-200 shadow-sm"
                    }`}
                  >
                    <HabitListCardHeader
                      trackable={trackable}
                      streakDays={streakDays}
                      isDarkMode={isDarkMode}
                      scheduledForViewDay={isScheduledForViewing}
                      doneForDay={doneForDay}
                      onToggleDone={() => handleHabitToggleForDay(trackable)}
                      isExpanded={isExpanded}
                      onToggleExpand={() =>
                        setExpandedHabit(isExpanded ? null : trackable.id)
                      }
                    />

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key={`habit-${trackable.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3.5 pb-3">
                            <LazyExpandedLogInsightsTabs
                              isDarkMode={isDarkMode}
                              insightsChildren={
                                <LazyActivityHeatmap
                                  data={habitHeatmapData[trackable.id] || []}
                                  type="habit"
                                  label=""
                                  color={trackable.color}
                                  compact
                                  mini
                                  isDarkMode={isDarkMode}
                                />
                              }
                              logsChildren={(() => {
                                const habitLogRows = (habitHeatmapData[trackable.id] || [])
                                  .filter(d => d.count > 0)
                                  .sort((a, b) => b.date.localeCompare(a.date))
                                  .slice(0, 40);
                                if (!habitLogRows.length) {
                                  return (
                                    <EmptyInline
                                      isDarkMode={isDarkMode}
                                      message="No completed days in your history window yet."
                                    />
                                  );
                                }
                                return (
                                  <>
                                    <p
                                      className={`text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                                    >
                                      Completed days
                                    </p>
                                    <div className="space-y-1.5 pt-1">
                                      {habitLogRows.map((row, idx) => {
                                        const dateRow = new Date(row.date + "T12:00:00");
                                        const todayDate = new Date();
                                        todayDate.setHours(0, 0, 0, 0);
                                        dateRow.setHours(0, 0, 0, 0);
                                        const daysSince = Math.floor(
                                          (todayDate - dateRow) / (1000 * 60 * 60 * 24),
                                        );
                                        const prevRow = idx > 0 ? habitLogRows[idx - 1] : null;
                                        const gapDays =
                                          prevRow != null
                                            ? Math.floor(
                                                (new Date(prevRow.date + "T12:00:00").getTime() -
                                                  new Date(row.date + "T12:00:00").getTime()) /
                                                  (1000 * 60 * 60 * 24),
                                              )
                                            : null;
                                        const isAccentRow = idx === 0;
                                        return (
                                          <div key={row.date}>
                                            {gapDays != null && gapDays > 0 && prevRow != null && (
                                              <div className="flex justify-center py-0.5">
                                                <LifeLogGapPill
                                                  gapDays={gapDays}
                                                  newerDateStr={prevRow.date}
                                                  olderDateStr={row.date}
                                                  kind="completions"
                                                  isDarkMode={isDarkMode}
                                                />
                                              </div>
                                            )}
                                            <div
                                              className={`flex items-start justify-between gap-3 p-2.5 rounded-card border ${
                                                isAccentRow
                                                  ? isDarkMode
                                                    ? "border-iron-700/70 bg-iron-800/40"
                                                    : "border-slate-200 bg-slate-50"
                                                  : isDarkMode
                                                    ? "border-iron-800/50"
                                                    : "border-slate-100"
                                              }`}
                                            >
                                              <div className="flex items-start gap-3 min-w-0">
                                                <div
                                                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                                                  style={{
                                                    backgroundColor: isAccentRow
                                                      ? trackable.color
                                                      : isDarkMode
                                                        ? "#3f3f46"
                                                        : "#cbd5e1",
                                                  }}
                                                />
                                                <div>
                                                  <p
                                                    className={`text-sm font-medium ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}
                                                  >
                                                    {formatDate(row.date)}
                                                  </p>
                                                  <p
                                                    className={`text-[10px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}
                                                  >
                                                    {formatDaysSince(daysSince)}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </>
                                );
                              })()}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

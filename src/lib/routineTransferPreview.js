import { PLANNER_DAYS, routineSubtitleForDay } from "@/lib/routinePlanner";

const EMPTY = "Not planned";

function dayMeta(dayValue) {
  return PLANNER_DAYS.find(d => d.value === dayValue) ?? { label: "Day", short: "?" };
}

function planLabel(dayValue, restMap, getRoutineForDay) {
  return routineSubtitleForDay({
    markedRest: !!restMap[dayValue],
    routine: getRoutineForDay(dayValue),
  });
}

/**
 * Describes the outcome of moving or copying a routine between weekdays.
 * @param {"move"|"copy"} mode
 */
export function describeRoutineTransfer({
  mode,
  fromDay,
  toDay,
  restMap,
  getRoutineForDay,
}) {
  const from = dayMeta(fromDay);
  const to = dayMeta(toDay);
  const sourceLabel = planLabel(fromDay, restMap, getRoutineForDay);
  const targetLabel = planLabel(toDay, restMap, getRoutineForDay);
  const targetRoutine = getRoutineForDay(toDay);
  const targetHasRoutine = !!targetRoutine;
  const targetOccupied = targetHasRoutine || !!restMap[toDay];

  if (mode === "copy") {
    return {
      mode: "copy",
      action: targetHasRoutine ? "replace" : "copy",
      headline: targetHasRoutine ? "Replace workout on target day" : "Copy workout to empty day",
      from: {
        short: from.short,
        label: from.label,
        before: sourceLabel,
        after: sourceLabel,
        note: "Unchanged",
      },
      to: {
        short: to.short,
        label: to.label,
        before: targetLabel,
        after: sourceLabel,
        note: targetHasRoutine ? "Replaced" : "Receives copy",
      },
      confirmLabel: targetHasRoutine ? "Replace workout" : "Copy workout",
    };
  }

  if (targetHasRoutine) {
    return {
      mode: "move",
      action: "swap",
      headline: "Swap workouts between days",
      from: {
        short: from.short,
        label: from.label,
        before: sourceLabel,
        after: targetLabel,
        note: "Gets other day’s workout",
      },
      to: {
        short: to.short,
        label: to.label,
        before: targetLabel,
        after: sourceLabel,
        note: "Gets this workout",
      },
      confirmLabel: "Swap workouts",
    };
  }

  return {
    mode: "move",
    action: "move",
    headline: "Move workout to empty day",
    from: {
      short: from.short,
      label: from.label,
      before: sourceLabel,
      after: EMPTY,
      note: "Becomes empty",
    },
    to: {
      short: to.short,
      label: to.label,
      before: targetOccupied ? targetLabel : EMPTY,
      after: sourceLabel,
      note: "Receives workout",
    },
    confirmLabel: "Move workout",
  };
}

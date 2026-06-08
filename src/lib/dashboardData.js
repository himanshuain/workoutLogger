import { buildWorkoutHeatmapFromSessions } from "@/lib/workoutHeatmapData";

export function getLocalDateStr(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Merge exercise logs from sessions + legacy logs. */
export function mergeExerciseLogs(sessionData, legacyData) {
  const merged = { ...(legacyData?.exerciseLogsByName || {}) };
  Object.entries(sessionData?.exerciseLogsByName || {}).forEach(([name, logs]) => {
    if (!merged[name]) merged[name] = [];
    merged[name] = [...merged[name], ...logs];
  });
  return merged;
}

/** Transform sessions into heatmap + exercise logs. */
export function transformSessionData(sessions) {
  const exerciseLogsByName = {};
  sessions.forEach(session => {
    if (session.status !== "completed") return;
    (session.set_logs || [])
      .filter(log => log.is_completed)
      .forEach(log => {
        if (!exerciseLogsByName[log.exercise_name]) {
          exerciseLogsByName[log.exercise_name] = [];
        }
        exerciseLogsByName[log.exercise_name].push({
          date: session.date,
          weight: log.weight,
          reps: log.reps,
          exercise_name: log.exercise_name,
          category: log.category,
        });
      });
  });
  return {
    workoutData: buildWorkoutHeatmapFromSessions(sessions),
    exerciseLogsByName,
    allSessions: sessions,
  };
}

/** Weekly workout counts for the last N weeks. */
export function weeklyWorkoutSeries(workoutHeatmapData, weeks = 12) {
  const now = new Date();
  const series = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = getLocalDateStr(weekStart);
    const endStr = getLocalDateStr(weekEnd);

    const count = (workoutHeatmapData || []).filter(
      d => d.date >= startStr && d.date <= endStr,
    ).length;

    series.push({
      week: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      workouts: count,
      weekStart: startStr,
    });
  }
  return series;
}

/** Weekly volume totals from exercise logs. */
export function weeklyVolumeSeries(exerciseLogsByName, weeks = 12) {
  const allLogs = Object.values(exerciseLogsByName || {}).flat();
  const now = new Date();
  const series = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const startStr = getLocalDateStr(weekStart);
    const endStr = getLocalDateStr(weekEnd);

    let volume = 0;
    allLogs.forEach(log => {
      if (log.date >= startStr && log.date <= endStr) {
        volume += (log.weight || 0) * (log.reps || 0);
      }
    });

    series.push({
      week: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      volume: Math.round(volume),
      weekStart: startStr,
    });
  }
  return series;
}

/** Top exercises by total sets for progress lines. */
export function topExercisesForChart(exerciseLogsByName, limit = 5) {
  const counts = Object.entries(exerciseLogsByName || {}).map(([name, logs]) => ({
    name,
    count: logs.length,
    logs: [...logs].sort((a, b) => a.date.localeCompare(b.date)),
  }));
  counts.sort((a, b) => b.count - a.count);
  return counts.slice(0, limit);
}

/** Build multi-series data for top exercise weight progression. */
export function exerciseProgressSeries(topExercises) {
  const dateSet = new Set();
  topExercises.forEach(({ logs }) => logs.forEach(l => dateSet.add(l.date)));
  const dates = [...dateSet].sort();

  return dates.map(date => {
    const point = { date, label: formatShortDate(date) };
    topExercises.forEach(({ name, logs }) => {
      const dayLogs = logs.filter(l => l.date === date);
      if (dayLogs.length > 0) {
        const maxWeight = Math.max(...dayLogs.map(l => l.weight || 0));
        point[name] = maxWeight;
      }
    });
    return point;
  });
}

/** Habit completion rate per week (last N weeks). */
export function weeklyHabitSeries(trackingEntries, trackables, weeks = 8) {
  const habitTrackables = (trackables || []).filter(t => t.name !== "Body Weight");
  const totalHabits = habitTrackables.length || 1;
  const now = new Date();
  const series = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const startStr = getLocalDateStr(weekStart);
    const endStr = getLocalDateStr(weekEnd);

    const completedByDate = {};
    (trackingEntries || []).forEach(entry => {
      if (entry.date >= startStr && entry.date <= endStr && entry.is_completed) {
        completedByDate[entry.date] = (completedByDate[entry.date] || 0) + 1;
      }
    });

    const daysInWeek = 7;
    let totalCompleted = 0;
    for (let d = 0; d < daysInWeek; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const ds = getLocalDateStr(day);
      totalCompleted += completedByDate[ds] || 0;
    }

    const maxPossible = totalHabits * daysInWeek;
    series.push({
      week: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rate: Math.round((totalCompleted / maxPossible) * 100),
      completed: totalCompleted,
      weekStart: startStr,
    });
  }
  return series;
}

/** Volume by muscle category for pie/donut chart. */
export function volumeByCategory(exerciseLogsByName) {
  const byCategory = {};
  Object.values(exerciseLogsByName || {})
    .flat()
    .forEach(log => {
      const vol = (log.weight || 0) * (log.reps || 0);
      if (vol <= 0) return;
      const cat = log.category || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + vol;
    });

  return Object.entries(byCategory)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Dashboard headline stats. */
export function computeDashboardStats({
  workoutHeatmapData,
  todayEntries,
  habitTrackables,
  todayFoodEntries,
  foodItems,
  macroTotals,
}) {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

  const workoutsThisMonth = (workoutHeatmapData || []).filter(d => d.date.startsWith(thisMonth)).length;
  const workoutsLastMonth = (workoutHeatmapData || []).filter(d => d.date.startsWith(lastMonthStr)).length;

  let streak = 0;
  const sortedDates = [...(workoutHeatmapData || [])].sort((a, b) => b.date.localeCompare(a.date));
  let checkDate = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = getLocalDateStr(checkDate);
    const hasActivity = sortedDates.some(d => d.date === dateStr);
    if (hasActivity) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i > 0) {
      break;
    } else {
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  const habitsCompletedToday = Object.values(todayEntries || {}).filter(e => e.is_completed).length;
  const habitsTotal = (habitTrackables || []).length;

  return {
    workoutsThisMonth,
    workoutsLastMonth,
    currentStreak: streak,
    totalWorkouts: (workoutHeatmapData || []).length,
    habitsCompletedToday,
    habitsTotal,
    foodLoggedToday: Object.keys(todayFoodEntries || {}).length,
    foodTotal: (foodItems || []).length,
    proteinToday: Math.round(macroTotals?.protein_g || 0),
    caloriesToday: Math.round(macroTotals?.calories || 0),
  };
}

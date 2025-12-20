import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useWorkout } from '@/context/WorkoutContext';
import Layout from '@/components/Layout';
import ActivityHeatmap from '@/components/ActivityHeatmap';

export default function Progress() {
  const router = useRouter();
  const {
    user,
    trackables,
    todayEntries,
    isLoading,
    today,
    getExerciseLogs,
    getTrackingEntries,
    getTodayExerciseLogs,
  } = useWorkout();

  const [workoutData, setWorkoutData] = useState([]);
  const [habitData, setHabitData] = useState([]);
  const [habitDataByTrackable, setHabitDataByTrackable] = useState({});
  const [todayLogs, setTodayLogs] = useState([]);
  const [expandedHabit, setExpandedHabit] = useState(null);

  // Helper function for local date formatting
  const getLocalDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load all heatmap data
  useEffect(() => {
    async function loadData() {
      if (!user) return;

      const endDate = today;
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      const startStr = getLocalDateStr(startDate);

      // Get exercise logs
      const exerciseLogs = await getExerciseLogs(startStr, endDate);
      const workoutByDate = {};
      exerciseLogs.forEach(log => {
        workoutByDate[log.date] = (workoutByDate[log.date] || 0) + 1;
      });
      setWorkoutData(
        Object.entries(workoutByDate).map(([date, count]) => ({ date, count }))
      );

      // Get tracking entries
      const trackingEntries = await getTrackingEntries(startStr, endDate);
      
      // Aggregate all habits
      const habitByDate = {};
      trackingEntries.forEach(entry => {
        if (entry.is_completed) {
          habitByDate[entry.date] = (habitByDate[entry.date] || 0) + 1;
        }
      });
      setHabitData(
        Object.entries(habitByDate).map(([date, count]) => ({ date, count }))
      );

      // Group by trackable for individual heatmaps
      const byTrackable = {};
      trackingEntries.forEach(entry => {
        if (!byTrackable[entry.trackable_id]) {
          byTrackable[entry.trackable_id] = {};
        }
        if (entry.is_completed) {
          byTrackable[entry.trackable_id][entry.date] = 1;
        }
      });

      // Include today's local state
      trackables.forEach(t => {
        const todayEntry = todayEntries[t.id];
        if (todayEntry?.is_completed) {
          if (!byTrackable[t.id]) byTrackable[t.id] = {};
          byTrackable[t.id][today] = 1;
        }
      });

      const formatted = {};
      Object.keys(byTrackable).forEach(id => {
        formatted[id] = Object.entries(byTrackable[id]).map(
          ([date, count]) => ({ date, count })
        );
      });
      setHabitDataByTrackable(formatted);
    }

    loadData();
  }, [user, today, trackables, todayEntries, getExerciseLogs, getTrackingEntries]);

  // Load today's exercise logs
  useEffect(() => {
    async function loadTodayLogs() {
      if (!user) return;
      const logs = await getTodayExerciseLogs();
      setTodayLogs(logs);
    }
    loadTodayLogs();
  }, [user, getTodayExerciseLogs]);

  // Include today's logs in workout data
  const workoutHeatmapData = useMemo(() => {
    const dataMap = new Map();
    workoutData.forEach(item => {
      if (item.date !== today) {
        dataMap.set(item.date, item.count);
      }
    });
    if (todayLogs.length > 0) {
      dataMap.set(today, todayLogs.length);
    }
    return Array.from(dataMap.entries()).map(([date, count]) => ({ date, count }));
  }, [workoutData, todayLogs, today]);

  // Include today in habit data
  const habitHeatmapData = useMemo(() => {
    const dataMap = new Map();
    habitData.forEach(item => {
      if (item.date !== today) {
        dataMap.set(item.date, item.count);
      }
    });
    const todayCount = Object.values(todayEntries).filter(e => e.is_completed).length;
    if (todayCount > 0) {
      dataMap.set(today, todayCount);
    }
    return Array.from(dataMap.entries()).map(([date, count]) => ({ date, count }));
  }, [habitData, todayEntries, today]);

  // Stats calculations
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    const workoutsThisMonth = workoutHeatmapData.filter(d => d.date.startsWith(thisMonth)).length;
    const workoutsLastMonth = workoutHeatmapData.filter(d => d.date.startsWith(lastMonthStr)).length;
    
    const habitsThisMonth = habitHeatmapData.filter(d => d.date.startsWith(thisMonth))
      .reduce((sum, d) => sum + d.count, 0);
    
    // Current streak calculation
    let streak = 0;
    const sortedDates = [...workoutHeatmapData].sort((a, b) => b.date.localeCompare(a.date));
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

    return {
      workoutsThisMonth,
      workoutsLastMonth,
      habitsThisMonth,
      currentStreak: streak,
      totalWorkouts: workoutHeatmapData.length,
    };
  }, [workoutHeatmapData, habitHeatmapData]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-2 border-lift-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
          <p className="text-iron-500 mb-4">Sign in to view progress</p>
          <button
            onClick={() => router.push('/auth')}
            className="px-6 py-2.5 rounded-xl bg-lift-primary text-iron-950 font-bold"
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-enter">
        {/* Header */}
        <header className="px-4 py-4 border-b border-iron-900">
          <h1 className="text-2xl font-bold text-iron-100">Progress</h1>
          <p className="text-iron-500 text-sm mt-1">Your activity over time</p>
        </header>

        <main className="px-4 py-4 pb-24 space-y-6">
          {/* Quick Stats */}
          <section className="grid grid-cols-2 gap-3">
            <div className="bg-iron-900/50 rounded-xl p-4">
              <p className="text-iron-500 text-xs uppercase tracking-wider mb-1">This Month</p>
              <p className="text-2xl font-bold text-iron-100">{stats.workoutsThisMonth}</p>
              <p className="text-iron-500 text-sm">workouts</p>
            </div>
            <div className="bg-iron-900/50 rounded-xl p-4">
              <p className="text-iron-500 text-xs uppercase tracking-wider mb-1">Current Streak</p>
              <p className="text-2xl font-bold text-lift-primary">{stats.currentStreak}</p>
              <p className="text-iron-500 text-sm">days</p>
            </div>
            <div className="bg-iron-900/50 rounded-xl p-4">
              <p className="text-iron-500 text-xs uppercase tracking-wider mb-1">Last Month</p>
              <p className="text-2xl font-bold text-iron-100">{stats.workoutsLastMonth}</p>
              <p className="text-iron-500 text-sm">workouts</p>
            </div>
            <div className="bg-iron-900/50 rounded-xl p-4">
              <p className="text-iron-500 text-xs uppercase tracking-wider mb-1">Total</p>
              <p className="text-2xl font-bold text-iron-100">{stats.totalWorkouts}</p>
              <p className="text-iron-500 text-sm">workout days</p>
            </div>
          </section>

          {/* Workout Heatmap */}
          <ActivityHeatmap
            data={workoutHeatmapData}
            type="workout"
            label="Workout Activity"
            subtitle={`${stats.workoutsThisMonth} workout${stats.workoutsThisMonth !== 1 ? 's' : ''} this month`}
          />

          {/* Habits Heatmap */}
          <ActivityHeatmap
            data={habitHeatmapData}
            type="habit"
            label="Daily Habits"
            subtitle={`${Object.values(todayEntries).filter(e => e.is_completed).length}/${trackables.length} completed today`}
          />

          {/* Individual Habit Heatmaps */}
          {trackables.length > 0 && (
            <section>
              <h2 className="text-iron-400 text-sm font-medium mb-3 uppercase tracking-wider">
                Habit Breakdown
              </h2>
              <div className="space-y-3">
                {trackables.map(trackable => {
                  const isExpanded = expandedHabit === trackable.id;
                  const data = habitDataByTrackable[trackable.id] || [];
                  const daysTracked = data.length;

                  return (
                    <div key={trackable.id} className="bg-iron-900/50 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedHabit(isExpanded ? null : trackable.id)}
                        className="w-full p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                            style={{ backgroundColor: `${trackable.color}30` }}
                          >
                            {trackable.icon}
                          </div>
                          <div className="text-left">
                            <p className="text-iron-100 font-medium">{trackable.name}</p>
                            <p className="text-iron-500 text-xs">{daysTracked} days tracked</p>
                          </div>
                        </div>
                        <svg 
                          className={`w-5 h-5 text-iron-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <ActivityHeatmap
                            data={data}
                            type="habit"
                            label=""
                            color={trackable.color}
                            compact={true}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </div>
    </Layout>
  );
}


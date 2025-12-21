import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { useWorkout } from '@/context/WorkoutContext';
import Layout from '@/components/Layout';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import ProgressGraph from '@/components/ProgressGraph';
import CollapsibleSection from '@/components/CollapsibleSection';
import { TrendingUp, Calendar, Flame, Target, ChevronDown, Dumbbell, BarChart3 } from 'lucide-react';

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

  const [expandedHabit, setExpandedHabit] = useState(null);

  // Helper function for local date formatting
  const getLocalDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get date range for queries
  const startDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return getLocalDateStr(d);
  }, []);

  // TanStack Query for exercise logs
  const { data: exerciseData } = useQuery({
    queryKey: ['exerciseLogs', user?.id, startDate, today],
    queryFn: async () => {
      const logs = await getExerciseLogs(startDate, today);
      const workoutByDate = {};
      const byExerciseName = {};
      
      logs.forEach(log => {
        workoutByDate[log.date] = (workoutByDate[log.date] || 0) + 1;
        if (!byExerciseName[log.exercise_name]) {
          byExerciseName[log.exercise_name] = [];
        }
        byExerciseName[log.exercise_name].push(log);
      });
      
      return {
        workoutData: Object.entries(workoutByDate).map(([date, count]) => ({ date, count })),
        exerciseLogsByName: byExerciseName,
      };
    },
    enabled: !!user,
  });

  // TanStack Query for tracking entries
  const { data: habitData } = useQuery({
    queryKey: ['trackingEntries', user?.id, startDate, today],
    queryFn: async () => {
      const entries = await getTrackingEntries(startDate, today);
      const habitByDate = {};
      const byTrackable = {};

      entries.forEach(entry => {
        if (entry.is_completed) {
          habitByDate[entry.date] = (habitByDate[entry.date] || 0) + 1;
        }
        if (!byTrackable[entry.trackable_id]) {
          byTrackable[entry.trackable_id] = {};
        }
        if (entry.is_completed) {
          byTrackable[entry.trackable_id][entry.date] = 1;
        }
      });

      return {
        habitByDate: Object.entries(habitByDate).map(([date, count]) => ({ date, count })),
        habitDataByTrackable: Object.fromEntries(
          Object.entries(byTrackable).map(([id, dates]) => [
            id,
            Object.entries(dates).map(([date, count]) => ({ date, count }))
          ])
        ),
      };
    },
    enabled: !!user,
  });

  // TanStack Query for today's logs
  const { data: todayLogs = [] } = useQuery({
    queryKey: ['todayExerciseLogs', user?.id, today],
    queryFn: () => getTodayExerciseLogs(),
    enabled: !!user,
  });

  // Computed values
  const workoutHeatmapData = useMemo(() => {
    const dataMap = new Map();
    (exerciseData?.workoutData || []).forEach(item => {
      if (item.date !== today) {
        dataMap.set(item.date, item.count);
      }
    });
    if (todayLogs.length > 0) {
      dataMap.set(today, todayLogs.length);
    }
    return Array.from(dataMap.entries()).map(([date, count]) => ({ date, count }));
  }, [exerciseData?.workoutData, todayLogs, today]);

  const habitHeatmapData = useMemo(() => {
    const dataMap = new Map();
    (habitData?.habitByDate || []).forEach(item => {
      if (item.date !== today) {
        dataMap.set(item.date, item.count);
      }
    });
    const todayCount = Object.values(todayEntries).filter(e => e.is_completed).length;
    if (todayCount > 0) {
      dataMap.set(today, todayCount);
    }
    return Array.from(dataMap.entries()).map(([date, count]) => ({ date, count }));
  }, [habitData?.habitByDate, todayEntries, today]);

  // Add today's entries to habit data by trackable
  const habitDataByTrackable = useMemo(() => {
    const data = { ...(habitData?.habitDataByTrackable || {}) };
    trackables.forEach(t => {
      const todayEntry = todayEntries[t.id];
      if (todayEntry?.is_completed) {
        if (!data[t.id]) data[t.id] = [];
        const existing = data[t.id].find(d => d.date === today);
        if (!existing) {
          data[t.id] = [...data[t.id], { date: today, count: 1 }];
        }
      }
    });
    return data;
  }, [habitData?.habitDataByTrackable, todayEntries, trackables, today]);

  const exerciseLogsByName = exerciseData?.exerciseLogsByName || {};

  // Stats calculations
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    const workoutsThisMonth = workoutHeatmapData.filter(d => d.date.startsWith(thisMonth)).length;
    const workoutsLastMonth = workoutHeatmapData.filter(d => d.date.startsWith(lastMonthStr)).length;
    
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
      currentStreak: streak,
      totalWorkouts: workoutHeatmapData.length,
    };
  }, [workoutHeatmapData]);

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
      <div className="px-4 py-4 pb-24">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-30 bg-iron-950/95 backdrop-blur-sm -mx-4 px-4 pb-3 pt-1">
          <h2 className="text-xl font-bold text-iron-100">Progress</h2>
          <p className="text-iron-500 text-sm mt-1">Your activity over time</p>
        </div>

        <div className="space-y-6 mt-4">
          {/* Quick Stats */}
          <section className="grid grid-cols-2 gap-3">
            <div className="bg-iron-900/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-iron-500" />
                <p className="text-iron-500 text-xs uppercase tracking-wider">This Month</p>
              </div>
              <p className="text-2xl font-bold text-iron-100">{stats.workoutsThisMonth}</p>
              <p className="text-iron-500 text-sm">workouts</p>
            </div>
            <div className="bg-gradient-to-br from-lift-primary/20 to-transparent rounded-2xl p-4 border border-lift-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-lift-primary" />
                <p className="text-lift-primary/80 text-xs uppercase tracking-wider">Streak</p>
              </div>
              <p className="text-2xl font-bold text-lift-primary">{stats.currentStreak}</p>
              <p className="text-iron-500 text-sm">days</p>
            </div>
            <div className="bg-iron-900/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-iron-500" />
                <p className="text-iron-500 text-xs uppercase tracking-wider">Last Month</p>
              </div>
              <p className="text-2xl font-bold text-iron-100">{stats.workoutsLastMonth}</p>
              <p className="text-iron-500 text-sm">workouts</p>
            </div>
            <div className="bg-iron-900/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-iron-500" />
                <p className="text-iron-500 text-xs uppercase tracking-wider">Total</p>
              </div>
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

          {/* Exercise Progress Graphs - Collapsible */}
          {Object.keys(exerciseLogsByName).length > 0 && (
            <CollapsibleSection
              title="Progressive Overload"
              icon={Dumbbell}
              count={Object.keys(exerciseLogsByName).length}
              defaultOpen={false}
            >
              {Object.entries(exerciseLogsByName)
                .sort((a, b) => b[1].length - a[1].length)
                .slice(0, 10)
                .map(([exerciseName, logs]) => (
                  <ProgressGraph
                    key={exerciseName}
                    exerciseName={exerciseName}
                    exerciseCategory={logs[0]?.category}
                    data={logs}
                    unit="kg"
                    compact={true}
                  />
                ))
              }
            </CollapsibleSection>
          )}

          {/* Individual Habit Heatmaps - Collapsible */}
          {trackables.length > 0 && (
            <CollapsibleSection
              title="Habit Breakdown"
              icon={BarChart3}
              count={trackables.length}
              defaultOpen={false}
            >
              {trackables.map(trackable => {
                const isExpanded = expandedHabit === trackable.id;
                const data = habitDataByTrackable[trackable.id] || [];
                const daysTracked = data.length;

                return (
                  <div key={trackable.id} className="bg-iron-900/30 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedHabit(isExpanded ? null : trackable.id)}
                      className="w-full p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
                          style={{ backgroundColor: `${trackable.color}30` }}
                        >
                          {trackable.icon}
                        </div>
                        <div className="text-left">
                          <p className="text-iron-100 font-medium text-sm">{trackable.name}</p>
                          <p className="text-iron-500 text-xs">{daysTracked} days</p>
                        </div>
                      </div>
                      <ChevronDown 
                        className={`w-4 h-4 text-iron-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3">
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
            </CollapsibleSection>
          )}
        </div>
      </div>
    </Layout>
  );
}

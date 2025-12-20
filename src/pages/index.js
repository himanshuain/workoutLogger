import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useWorkout } from '@/context/WorkoutContext';
import Layout from '@/components/Layout';
import HabitPills from '@/components/HabitPills';
import ExerciseLogModal from '@/components/ExerciseLogModal';
import QuickStats from '@/components/QuickStats';
import FAB from '@/components/FAB';
import LogCard from '@/components/LogCard';

export default function Home() {
  const router = useRouter();
  const {
    user,
    exercises,
    exerciseHistory,
    trackables,
    todayEntries,
    settings,
    isLoading,
    today,
    toggleTrackingEntry,
    logExercise,
    getTodayExerciseLogs,
    deleteExerciseLog,
  } = useWorkout();

  const [todayLogs, setTodayLogs] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [editingLog, setEditingLog] = useState(null);

  // Pull to refresh handling
  const pullStartY = useState(0);
  const isPulling = useState(false);

  // Load today's exercise logs
  const loadTodayLogs = useCallback(async () => {
    if (!user) return;
    const logs = await getTodayExerciseLogs();
    setTodayLogs(logs || []);
  }, [user, getTodayExerciseLogs]);

  useEffect(() => {
    loadTodayLogs();
  }, [loadTodayLogs]);

  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTodayLogs();
    // Haptic feedback
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Pull to refresh handlers
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      pullStartY[1](e.touches[0].clientY);
      isPulling[1](true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling[0] || window.scrollY > 0) return;
    const diff = e.touches[0].clientY - pullStartY[0];
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 80));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      handleRefresh();
    }
    setPullDistance(0);
    isPulling[1](false);
  };

  // Group logs by exercise name
  const groupedLogs = useMemo(() => {
    const groups = {};
    todayLogs.forEach(log => {
      if (!groups[log.exercise_name]) {
        groups[log.exercise_name] = {
          exerciseName: log.exercise_name,
          logs: [],
          totalSets: 0,
          totalReps: 0,
          minWeight: Infinity,
          maxWeight: 0,
        };
      }
      groups[log.exercise_name].logs.push(log);
      groups[log.exercise_name].totalSets += log.sets;
      groups[log.exercise_name].totalReps += log.sets * log.reps;
      groups[log.exercise_name].minWeight = Math.min(groups[log.exercise_name].minWeight, log.weight);
      groups[log.exercise_name].maxWeight = Math.max(groups[log.exercise_name].maxWeight, log.weight);
    });
    return Object.values(groups).map(g => ({
      ...g,
      weightRange: g.minWeight === g.maxWeight 
        ? `${g.minWeight}` 
        : `${g.minWeight}-${g.maxWeight}`,
    }));
  }, [todayLogs]);

  // Filter exercises by category
  const filteredExercises = useMemo(() => {
    if (selectedCategory === 'all') return exercises;
    return exercises.filter(e => e.category === selectedCategory);
  }, [exercises, selectedCategory]);

  // Get unique categories with counts
  const categories = useMemo(() => {
    const catCounts = {};
    exercises.forEach(e => {
      const cat = e.category || 'other';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    return [
      { name: 'all', count: exercises.length },
      ...Object.entries(catCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, count]) => ({ name, count }))
    ];
  }, [exercises]);

  // Get today's logged exercise names
  const todayLoggedExercises = useMemo(() => {
    return new Set(todayLogs.map(l => l.exercise_name));
  }, [todayLogs]);

  // Stats
  const habitsCompletedToday = useMemo(() => {
    return Object.values(todayEntries).filter(e => e.is_completed).length;
  }, [todayEntries]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleExerciseClick = (exercise) => {
    setSelectedExercise(exercise);
    // Haptic feedback
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handleLogExercise = async ({ weight, reps, sets }) => {
    if (!selectedExercise) return;
    
    const log = await logExercise(selectedExercise, { weight, reps, sets });
    if (log) {
      setTodayLogs(prev => [log, ...prev]);
    }
    setSelectedExercise(null);
  };

  const handleToggleHabit = async (trackableId, isCompleted, value) => {
    await toggleTrackingEntry(trackableId, isCompleted, value);
  };

  const handleDeleteLog = async (exerciseName) => {
    // Delete all logs for this exercise today
    const logsToDelete = todayLogs.filter(l => l.exercise_name === exerciseName);
    for (const log of logsToDelete) {
      await deleteExerciseLog?.(log.id);
    }
    setTodayLogs(prev => prev.filter(l => l.exercise_name !== exerciseName));
  };

  const handleFABClick = () => {
    // Scroll to exercise section or show picker
    setShowAllExercises(true);
    // Scroll to log exercise section
    document.getElementById('log-exercise')?.scrollIntoView({ behavior: 'smooth' });
  };

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
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-lift-primary to-lift-secondary flex items-center justify-center">
            <svg className="w-10 h-10 text-iron-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-iron-100 mb-2">Welcome to Logbook</h1>
          <p className="text-iron-500 text-center mb-8">Sign in to start tracking</p>
          <button
            onClick={() => router.push('/auth')}
            className="px-8 py-3 rounded-xl bg-lift-primary text-iron-950 font-bold"
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div 
        className="page-enter"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull to refresh indicator */}
        <div 
          className="flex justify-center overflow-hidden transition-all duration-200"
          style={{ height: pullDistance > 0 ? pullDistance : 0 }}
        >
          <div className={`flex items-center gap-2 text-iron-500 ${isRefreshing ? 'animate-pulse' : ''}`}>
            <svg 
              className={`w-5 h-5 ${pullDistance > 60 ? 'text-lift-primary' : ''} ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pullDistance * 2}deg)` }}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm">{isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}</span>
          </div>
        </div>

        {/* Header */}
        <header className="px-4 py-4">
          <p className="text-iron-500 text-sm">Today</p>
          <h1 className="text-2xl font-bold text-iron-100">{formatDate(new Date())}</h1>
        </header>

        <main className="px-4 pb-32 space-y-6">
          {/* Quick Stats */}
          <QuickStats
            exerciseCount={groupedLogs.length}
            habitsCompleted={habitsCompletedToday}
            habitsTotal={trackables.length}
          />

          {/* Today's Habits Section */}
          <section>
            <h2 className="text-iron-400 text-xs font-medium mb-3 uppercase tracking-wider">
              Today's Habits
            </h2>
            <HabitPills
              trackables={trackables}
              entries={todayEntries}
              onToggle={handleToggleHabit}
              onAddNew={() => router.push('/settings#habits')}
            />
          </section>

          {/* Log Exercise Section */}
          <section id="log-exercise">
            <h2 className="text-iron-400 text-xs font-medium mb-3 uppercase tracking-wider">
              Log Exercise
            </h2>

            {/* Category filters - sticky */}
            <div className="sticky top-0 z-10 bg-iron-950 -mx-4 px-4 py-2">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(({ name, count }) => (
                  <button
                    key={name}
                    onClick={() => setSelectedCategory(name)}
                    className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedCategory === name
                        ? 'bg-lift-primary text-iron-950'
                        : 'bg-iron-800/70 text-iron-400 active:bg-iron-700'
                    }`}
                  >
                    {name === 'all' ? 'All' : name.charAt(0).toUpperCase() + name.slice(1)}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      selectedCategory === name ? 'bg-iron-950/20' : 'bg-iron-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise pills */}
            <div className="flex flex-wrap gap-2 mt-2">
              {filteredExercises.slice(0, showAllExercises ? undefined : 12).map(exercise => {
                const isLogged = todayLoggedExercises.has(exercise.name);
                
                return (
                  <button
                    key={exercise.id}
                    onClick={() => handleExerciseClick(exercise)}
                    className={`
                      min-h-[48px] px-4 py-3 rounded-2xl font-medium text-sm
                      transition-all duration-200 active:scale-95
                      flex items-center gap-2
                      ${isLogged 
                        ? 'bg-lift-primary text-iron-950 shadow-lg shadow-lift-primary/30' 
                        : 'bg-iron-800/70 text-iron-300 active:bg-iron-700/70'
                      }
                    `}
                  >
                    {isLogged && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {exercise.name}
                  </button>
                );
              })}
              
              {!showAllExercises && filteredExercises.length > 12 && (
                <button
                  onClick={() => setShowAllExercises(true)}
                  className="min-h-[48px] px-4 py-3 rounded-2xl font-medium text-sm
                           bg-iron-800/50 text-iron-400
                           active:bg-iron-700/50 transition-colors"
                >
                  + {filteredExercises.length - 12} more
                </button>
              )}
            </div>
          </section>

          {/* Today's Log */}
          {groupedLogs.length > 0 && (
            <section>
              <h2 className="text-iron-400 text-xs font-medium mb-3 uppercase tracking-wider">
                Today's Log
              </h2>
              <div className="space-y-2">
                {groupedLogs.map(group => (
                  <LogCard
                    key={group.exerciseName}
                    exerciseName={group.exerciseName}
                    sets={group.totalSets}
                    totalReps={group.totalReps}
                    weightRange={group.weightRange}
                    unit={settings.unit}
                    onEdit={() => {
                      const exercise = exercises.find(e => e.name === group.exerciseName);
                      if (exercise) setSelectedExercise(exercise);
                    }}
                    onDelete={() => handleDeleteLog(group.exerciseName)}
                  />
                ))}
              </div>
            </section>
          )}
        </main>

        {/* Floating Action Button */}
        <FAB onClick={handleFABClick} />

        {/* Exercise Log Modal */}
        <ExerciseLogModal
          isOpen={!!selectedExercise}
          exercise={selectedExercise}
          history={selectedExercise ? exerciseHistory[selectedExercise.name] : null}
          unit={settings.unit}
          onClose={() => setSelectedExercise(null)}
          onLog={handleLogExercise}
        />
      </div>
    </Layout>
  );
}

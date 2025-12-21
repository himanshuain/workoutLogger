import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkout } from '@/context/WorkoutContext';
import Layout from '@/components/Layout';
import HabitPills from '@/components/HabitPills';
import ExerciseLogModal from '@/components/ExerciseLogModal';
import ExerciseAutocomplete from '@/components/ExerciseAutocomplete';
import QuickStats from '@/components/QuickStats';
import LogCard from '@/components/LogCard';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Plus, Dumbbell, Sparkles, RefreshCw } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    user,
    exercises,
    exerciseHistory,
    trackables,
    todayEntries,
    isLoading,
    today,
    toggleTrackingEntry,
    logExercise,
    getTodayExerciseLogs,
    deleteExerciseLog,
  } = useWorkout();

  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // TanStack Query for today's logs
  const { data: todayLogs = [], refetch: refetchTodayLogs } = useQuery({
    queryKey: ['todayLogs', user?.id, today],
    queryFn: () => getTodayExerciseLogs(),
    enabled: !!user,
  });

  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchTodayLogs();
    queryClient.invalidateQueries(['exerciseLogs']);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
    setTimeout(() => setIsRefreshing(false), 500);
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

  // Get today's logged exercise names
  const todayLoggedExercises = useMemo(() => {
    return new Set(todayLogs.map(l => l.exercise_name));
  }, [todayLogs]);

  // Get recent exercises from history
  const recentExercises = useMemo(() => {
    const recentNames = Object.keys(exerciseHistory || {}).slice(0, 10);
    return exercises.filter(e => recentNames.includes(e.name));
  }, [exercises, exerciseHistory]);

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

  const handleExerciseSelect = (exercise) => {
    setShowExercisePicker(false);
    setSelectedExercise(exercise);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handleLogExercise = async ({ weight, reps, sets }) => {
    if (!selectedExercise) return;
    
    await logExercise(selectedExercise, { weight, reps, sets });
    // Invalidate and refetch
    queryClient.invalidateQueries(['todayLogs']);
    queryClient.invalidateQueries(['exerciseLogs']);
    queryClient.invalidateQueries(['todayExerciseLogs']);
    setSelectedExercise(null);
  };

  const handleToggleHabit = async (trackableId, isCompleted, value) => {
    await toggleTrackingEntry(trackableId, isCompleted, value);
  };

  const handleDeleteLog = async (exerciseName) => {
    const logsToDelete = todayLogs.filter(l => l.exercise_name === exerciseName);
    for (const log of logsToDelete) {
      await deleteExerciseLog?.(log.id);
    }
    // Invalidate and refetch
    queryClient.invalidateQueries(['todayLogs']);
    queryClient.invalidateQueries(['exerciseLogs']);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin w-8 h-8 border-2 border-lift-primary border-t-transparent rounded-full" />
            <p className="text-iron-500 text-sm">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-lift-primary to-lift-secondary flex items-center justify-center">
            <Dumbbell className="w-10 h-10 text-iron-950" />
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
      <div className="px-4 py-4 pb-24">
        {/* Date Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-iron-500 text-sm">Today</p>
            <h2 className="text-xl font-bold text-iron-100">{formatDate(new Date())}</h2>
          </div>
          <button
            onClick={handleRefresh}
            className={`w-10 h-10 rounded-xl bg-iron-800 flex items-center justify-center
                       active:bg-iron-700 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-5 h-5 text-iron-400" />
          </button>
        </div>

        {/* Quick Stats */}
        <QuickStats
          exerciseCount={groupedLogs.length}
          habitsCompleted={habitsCompletedToday}
          habitsTotal={trackables.length}
        />

        {/* Today's Habits */}
        <section className="mt-6">
          <h3 className="text-iron-400 text-xs font-medium mb-3 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Habits
          </h3>
          <HabitPills
            trackables={trackables}
            entries={todayEntries}
            onToggle={handleToggleHabit}
            onAddNew={() => router.push('/settings#habits')}
          />
        </section>

        {/* Today's Log */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-iron-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <Dumbbell className="w-3.5 h-3.5" />
              Today's Exercises
            </h3>
            <button
              onClick={() => setShowExercisePicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lift-primary/20 text-lift-primary text-sm font-medium active:bg-lift-primary/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {groupedLogs.length > 0 ? (
            <div className="space-y-2">
              {groupedLogs.map(group => (
                <LogCard
                  key={group.exerciseName}
                  exerciseName={group.exerciseName}
                  sets={group.totalSets}
                  totalReps={group.totalReps}
                  weightRange={group.weightRange}
                  unit="kg"
                  onEdit={() => {
                    const exercise = exercises.find(e => e.name === group.exerciseName);
                    if (exercise) setSelectedExercise(exercise);
                  }}
                  onDelete={() => handleDeleteLog(group.exerciseName)}
                />
              ))}
            </div>
          ) : (
            <button
              onClick={() => setShowExercisePicker(true)}
              className="w-full p-6 rounded-2xl border-2 border-dashed border-iron-800 
                       flex flex-col items-center justify-center gap-2
                       hover:border-iron-700 active:bg-iron-900/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-iron-800 flex items-center justify-center">
                <Plus className="w-6 h-6 text-iron-400" />
              </div>
              <p className="text-iron-400 font-medium">Log your first exercise</p>
              <p className="text-iron-600 text-sm">Tap to get started</p>
            </button>
          )}
        </section>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowExercisePicker(true)}
        className="fixed z-40 w-14 h-14 rounded-full bg-lift-primary text-iron-950 
                   flex items-center justify-center shadow-lg shadow-lift-primary/30
                   active:scale-95 transition-transform"
        style={{
          right: '1rem',
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        }}
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </button>

      {/* Exercise Picker Drawer */}
      <Drawer open={showExercisePicker} onOpenChange={setShowExercisePicker}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Select Exercise</DrawerTitle>
          </DrawerHeader>
          <ExerciseAutocomplete
            exercises={exercises}
            recentExercises={recentExercises}
            loggedToday={todayLoggedExercises}
            onSelect={handleExerciseSelect}
            onClose={() => setShowExercisePicker(false)}
          />
        </DrawerContent>
      </Drawer>

      {/* Exercise Log Modal */}
      <ExerciseLogModal
        isOpen={!!selectedExercise}
        exercise={selectedExercise}
        history={selectedExercise ? exerciseHistory[selectedExercise.name] : null}
        unit="kg"
        onClose={() => setSelectedExercise(null)}
        onLog={handleLogExercise}
      />
    </Layout>
  );
}

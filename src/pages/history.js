import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useWorkout } from '@/context/WorkoutContext';

export default function History() {
  const router = useRouter();
  const { settings, user, getExerciseLogs } = useWorkout();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    async function loadLogs() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3); // Last 3 months
        const data = await getExerciseLogs(startDate.toISOString().split('T')[0], endDate);
        setLogs(data);
      } catch (err) {
        console.error('Error loading logs:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadLogs();
  }, [user, getExerciseLogs]);

  // Group logs by date
  const logsByDate = useMemo(() => {
    const grouped = {};
    logs.forEach(log => {
      if (!grouped[log.date]) {
        grouped[log.date] = [];
      }
      grouped[log.date].push(log);
    });
    return grouped;
  }, [logs]);

  // Get sorted dates
  const sortedDates = useMemo(() => {
    return Object.keys(logsByDate).sort((a, b) => new Date(b) - new Date(a));
  }, [logsByDate]);

  const formatDate = (date) => {
    const d = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFullDate = (date) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate stats for a date
  const getDateStats = (date) => {
    const dateLogs = logsByDate[date] || [];
    const totalVolume = dateLogs.reduce((acc, log) => {
      return acc + (log.weight * log.reps * log.sets);
    }, 0);
    return {
      exercises: dateLogs.length,
      totalVolume: Math.round(totalVolume),
    };
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
          <p className="text-iron-500 mb-4">Sign in to view your history</p>
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
        <header className="sticky top-0 z-20 bg-iron-950/95 backdrop-blur-lg px-4 py-4 border-b border-iron-900">
          <h1 className="text-2xl font-bold text-iron-100">History</h1>
          <p className="text-iron-500 text-sm">{sortedDates.length} days logged</p>
        </header>

        <main className="px-4 py-4 pb-24">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-lift-primary border-t-transparent rounded-full" />
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-iron-900 flex items-center justify-center">
                <svg className="w-10 h-10 text-iron-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-iron-500">No exercises logged yet</p>
              <p className="text-iron-600 text-sm mt-1">Start logging to see your history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDates.map((date) => {
                const stats = getDateStats(date);
                const dateLogs = logsByDate[date];
                const isSelected = selectedDate === date;

                return (
                  <div key={date}>
                    <button
                      onClick={() => setSelectedDate(isSelected ? null : date)}
                      className="w-full p-4 rounded-xl bg-iron-900 text-left active:bg-iron-800 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-iron-100 font-semibold">
                            {formatDate(date)}
                          </h3>
                          <p className="text-iron-500 text-sm">
                            {stats.exercises} exercise{stats.exercises !== 1 ? 's' : ''} · {stats.totalVolume.toLocaleString()} {settings.unit}
                          </p>
                        </div>
                        <svg 
                          className={`w-5 h-5 text-iron-500 transition-transform ${isSelected ? 'rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded view */}
                    {isSelected && (
                      <div className="mt-2 p-4 rounded-xl bg-iron-900/50 space-y-3 animate-in slide-in-from-top duration-200">
                        <p className="text-iron-500 text-xs">{formatFullDate(date)}</p>
                        {dateLogs.map(log => (
                          <div 
                            key={log.id}
                            className="flex items-center justify-between py-2 border-b border-iron-800 last:border-0"
                          >
                            <span className="text-iron-100">{log.exercise_name}</span>
                            <span className="text-iron-400 font-mono text-sm">
                              {log.sets}×{log.reps} @ {log.weight}{settings.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}

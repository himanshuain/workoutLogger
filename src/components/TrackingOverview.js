import { useMemo } from 'react';
import { Check, X, Dumbbell, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Mini sparkline component
function Sparkline({ data, color = '#22c55e', height = 24, width = 60 }) {
  if (!data || data.length < 2) return null;
  
  const values = data.map(d => d.value || d.count || 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  
  const points = values.map((val, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Trend indicator
function TrendIndicator({ current, previous }) {
  if (current === undefined || previous === undefined) return null;
  
  const diff = current - previous;
  const percentage = previous > 0 ? Math.round((diff / previous) * 100) : 0;
  
  if (diff > 0) {
    return (
      <span className="flex items-center gap-0.5 text-green-400 text-xs">
        <TrendingUp className="w-3 h-3" />
        {percentage > 0 && `+${percentage}%`}
      </span>
    );
  } else if (diff < 0) {
    return (
      <span className="flex items-center gap-0.5 text-red-400 text-xs">
        <TrendingDown className="w-3 h-3" />
        {percentage}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-iron-500 text-xs">
      <Minus className="w-3 h-3" />
    </span>
  );
}

export default function TrackingOverview({
  trackables = [],
  habitDataByTrackable = {},
  todayEntries = {},
  exerciseLogsByName = {},
  workoutData = [],
  foodItems = [],
  foodDataByItem = {},
  todayFoodEntries = {},
  today,
  days = 7,
}) {
  // Generate last N days
  const dateRange = useMemo(() => {
    const dates = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: dateStr === today,
      });
    }
    return dates.reverse();
  }, [days, today]);

  // Process habit data for each day
  const habitsByDate = useMemo(() => {
    const result = {};
    dateRange.forEach(({ date }) => {
      result[date] = {};
      trackables.forEach(t => {
        const habitDates = habitDataByTrackable[t.id] || [];
        const entry = habitDates.find(d => d.date === date);
        // Check today's entries for real-time data
        if (date === today && todayEntries[t.id]) {
          result[date][t.id] = todayEntries[t.id].is_completed;
        } else {
          result[date][t.id] = entry ? true : false;
        }
      });
    });
    return result;
  }, [dateRange, trackables, habitDataByTrackable, todayEntries, today]);

  // Process workout data for each day
  const workoutsByDate = useMemo(() => {
    const result = {};
    dateRange.forEach(({ date }) => {
      const dayData = workoutData.find(d => d.date === date);
      result[date] = dayData?.count || 0;
    });
    return result;
  }, [dateRange, workoutData]);

  // Process food data for each day
  const foodByDate = useMemo(() => {
    const result = {};
    dateRange.forEach(({ date }) => {
      result[date] = {};
      foodItems.forEach(item => {
        const itemDates = foodDataByItem[item.id] || [];
        const entry = itemDates.find(d => d.date === date);
        if (date === today && todayFoodEntries[item.id]) {
          result[date][item.id] = true;
        } else {
          result[date][item.id] = entry ? true : false;
        }
      });
    });
    return result;
  }, [dateRange, foodItems, foodDataByItem, todayFoodEntries, today]);

  // Calculate habit completion rates
  const habitStats = useMemo(() => {
    return trackables.map(t => {
      const completedDays = dateRange.filter(d => habitsByDate[d.date]?.[t.id]).length;
      const rate = Math.round((completedDays / days) * 100);
      const sparkData = dateRange.map(d => ({
        date: d.date,
        count: habitsByDate[d.date]?.[t.id] ? 1 : 0,
      }));
      return { ...t, completedDays, rate, sparkData };
    });
  }, [trackables, dateRange, habitsByDate, days]);

  // Calculate exercise stats
  const exerciseStats = useMemo(() => {
    return Object.entries(exerciseLogsByName).slice(0, 5).map(([name, logs]) => {
      const recentLogs = logs.filter(l => dateRange.some(d => d.date === l.date));
      const maxWeight = recentLogs.length > 0 ? Math.max(...recentLogs.map(l => l.weight)) : 0;
      const avgWeight = recentLogs.length > 0 
        ? Math.round(recentLogs.reduce((sum, l) => sum + l.weight, 0) / recentLogs.length) 
        : 0;
      
      // Get sparkline data (weight over time)
      const sparkData = logs
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7)
        .map(l => ({ date: l.date, value: l.weight }));
      
      // Trend calculation
      const oldLogs = logs.filter(l => l.date < dateRange[Math.floor(days/2)]?.date);
      const newLogs = logs.filter(l => l.date >= dateRange[Math.floor(days/2)]?.date);
      const oldAvg = oldLogs.length > 0 ? oldLogs.reduce((s, l) => s + l.weight, 0) / oldLogs.length : 0;
      const newAvg = newLogs.length > 0 ? newLogs.reduce((s, l) => s + l.weight, 0) / newLogs.length : 0;
      
      return { name, recentCount: recentLogs.length, maxWeight, avgWeight, sparkData, oldAvg, newAvg };
    });
  }, [exerciseLogsByName, dateRange, days]);

  // Calculate food stats
  const foodStats = useMemo(() => {
    return foodItems.map(item => {
      const completedDays = dateRange.filter(d => foodByDate[d.date]?.[item.id]).length;
      const rate = Math.round((completedDays / days) * 100);
      return { ...item, completedDays, rate };
    });
  }, [foodItems, dateRange, foodByDate, days]);

  // Calculate workout trend
  const workoutTrend = useMemo(() => {
    const halfIndex = Math.floor(dateRange.length / 2);
    const firstHalf = dateRange.slice(0, halfIndex);
    const secondHalf = dateRange.slice(halfIndex);
    const firstSum = firstHalf.reduce((s, d) => s + (workoutsByDate[d.date] || 0), 0);
    const secondSum = secondHalf.reduce((s, d) => s + (workoutsByDate[d.date] || 0), 0);
    return { previous: firstSum, current: secondSum };
  }, [dateRange, workoutsByDate]);

  return (
    <div className="rounded-2xl bg-iron-900/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-iron-800/50">
        <h3 className="text-iron-100 font-semibold">Weekly Overview</h3>
        <p className="text-iron-500 text-sm">Last {days} days at a glance</p>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Date Header Row */}
          <thead>
            <tr className="bg-iron-900/30">
              <th className="sticky left-0 bg-iron-900 z-10 p-3 text-left text-iron-400 font-medium w-32">
                Metric
              </th>
              {dateRange.map(({ date, dayName, dayNum, isToday }) => (
                <th 
                  key={date} 
                  className={`p-2 text-center min-w-[44px] ${isToday ? 'bg-lift-primary/10' : ''}`}
                >
                  <div className={`text-xs ${isToday ? 'text-lift-primary' : 'text-iron-500'}`}>
                    {dayName}
                  </div>
                  <div className={`font-bold ${isToday ? 'text-lift-primary' : 'text-iron-300'}`}>
                    {dayNum}
                  </div>
                </th>
              ))}
              <th className="p-3 text-center text-iron-400 font-medium min-w-[70px]">
                Trend
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Workouts Row */}
            <tr className="border-b border-iron-800/30">
              <td className="sticky left-0 bg-iron-900 z-10 p-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-lift-primary/20 flex items-center justify-center">
                    <Dumbbell className="w-4 h-4 text-lift-primary" />
                  </div>
                  <span className="text-iron-200 font-medium text-xs">Workouts</span>
                </div>
              </td>
              {dateRange.map(({ date, isToday }) => (
                <td key={date} className={`p-2 text-center ${isToday ? 'bg-lift-primary/10' : ''}`}>
                  {workoutsByDate[date] > 0 ? (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-lift-primary/20 text-lift-primary font-bold text-xs">
                      {workoutsByDate[date]}
                    </span>
                  ) : (
                    <span className="text-iron-700">—</span>
                  )}
                </td>
              ))}
              <td className="p-3 text-center">
                <TrendIndicator current={workoutTrend.current} previous={workoutTrend.previous} />
              </td>
            </tr>

            {/* Habits Rows */}
            {habitStats.map(habit => (
              <tr key={habit.id} className="border-b border-iron-800/30">
                <td className="sticky left-0 bg-iron-900 z-10 p-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                      style={{ backgroundColor: `${habit.color}30` }}
                    >
                      {habit.icon}
                    </div>
                    <span className="text-iron-200 font-medium text-xs truncate max-w-[80px]">
                      {habit.name}
                    </span>
                  </div>
                </td>
                {dateRange.map(({ date, isToday }) => (
                  <td key={date} className={`p-2 text-center ${isToday ? 'bg-lift-primary/10' : ''}`}>
                    {habitsByDate[date]?.[habit.id] ? (
                      <span 
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
                        style={{ backgroundColor: `${habit.color}30` }}
                      >
                        <Check className="w-4 h-4" style={{ color: habit.color }} />
                      </span>
                    ) : (
                      <span className="text-iron-700">—</span>
                    )}
                  </td>
                ))}
                <td className="p-3 text-center">
                  <span className={`text-xs font-medium ${habit.rate >= 70 ? 'text-green-400' : habit.rate >= 40 ? 'text-amber-400' : 'text-iron-500'}`}>
                    {habit.rate}%
                  </span>
                </td>
              </tr>
            ))}

            {/* Food Rows */}
            {foodStats.map(food => (
              <tr key={food.id} className="border-b border-iron-800/30">
                <td className="sticky left-0 bg-iron-900 z-10 p-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                      style={{ backgroundColor: `${food.color}30` }}
                    >
                      {food.icon}
                    </div>
                    <span className="text-iron-200 font-medium text-xs truncate max-w-[80px]">
                      {food.name}
                    </span>
                  </div>
                </td>
                {dateRange.map(({ date, isToday }) => (
                  <td key={date} className={`p-2 text-center ${isToday ? 'bg-lift-primary/10' : ''}`}>
                    {foodByDate[date]?.[food.id] ? (
                      <span 
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
                        style={{ backgroundColor: `${food.color}30` }}
                      >
                        <Check className="w-4 h-4" style={{ color: food.color }} />
                      </span>
                    ) : (
                      <span className="text-iron-700">—</span>
                    )}
                  </td>
                ))}
                <td className="p-3 text-center">
                  <span className={`text-xs font-medium ${food.rate >= 70 ? 'text-green-400' : food.rate >= 40 ? 'text-amber-400' : 'text-iron-500'}`}>
                    {food.rate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Exercise Progress Section */}
      {exerciseStats.length > 0 && (
        <div className="border-t border-iron-800/50 p-4">
          <h4 className="text-iron-400 text-xs font-medium mb-3 uppercase tracking-wider">
            Top Exercises (Weight Progress)
          </h4>
          <div className="space-y-3">
            {exerciseStats.map(ex => (
              <div key={ex.name} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-iron-200 text-sm font-medium truncate">{ex.name}</p>
                  <p className="text-iron-500 text-xs">
                    Max: {ex.maxWeight}kg · Avg: {ex.avgWeight}kg
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Sparkline 
                    data={ex.sparkData} 
                    color="#22c55e" 
                    height={20} 
                    width={50} 
                  />
                  <TrendIndicator current={ex.newAvg} previous={ex.oldAvg} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


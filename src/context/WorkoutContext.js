import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const WorkoutContext = createContext();

export function WorkoutProvider({ children }) {
  const [user, setUser] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [exerciseHistory, setExerciseHistory] = useState({});
  const [trackables, setTrackables] = useState([]);
  const [todayEntries, setTodayEntries] = useState({});
  const [foodItems, setFoodItems] = useState([]);
  const [todayFoodEntries, setTodayFoodEntries] = useState({});
  const [settings, setSettings] = useState({
    unit: 'kg',
    dark_mode: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Use local timezone for today's date
  const getLocalDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const today = getLocalDateStr();

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load exercises
  const loadExercises = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');
      
      if (!error && data) {
        setExercises(data);
      }
    } catch (err) {
      console.error('Error loading exercises:', err);
    }
  }, []);

  // Load settings
  const loadSettings = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!error && data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  }, [user]);

  // Load exercise history
  const loadExerciseHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('exercise_history')
        .select('*')
        .eq('user_id', user.id);
      
      if (!error && data) {
        const historyMap = {};
        for (const h of data) {
          historyMap[h.exercise_name] = h;
        }
        setExerciseHistory(historyMap);
      }
    } catch (err) {
      console.error('Error loading exercise history:', err);
    }
  }, [user]);

  // Load trackables (habits/health)
  const loadTrackables = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('trackables')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index');
      
      if (!error && data) {
        setTrackables(data);
      }
    } catch (err) {
      console.error('Error loading trackables:', err);
    }
  }, [user]);

  // Load today's tracking entries
  const loadTodayEntries = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tracking_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);
      
      if (!error && data) {
        const entriesMap = {};
        for (const e of data) {
          entriesMap[e.trackable_id] = e;
        }
        setTodayEntries(entriesMap);
      }
    } catch (err) {
      console.error('Error loading today entries:', err);
    }
  }, [user, today]);

  // Load food items
  const loadFoodItems = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index');
      
      if (!error && data) {
        setFoodItems(data);
      }
    } catch (err) {
      console.error('Error loading food items:', err);
    }
  }, [user]);

  // Load today's food entries
  const loadTodayFoodEntries = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);
      
      if (!error && data) {
        const entriesMap = {};
        for (const e of data) {
          entriesMap[e.food_item_id] = e;
        }
        setTodayFoodEntries(entriesMap);
      }
    } catch (err) {
      console.error('Error loading today food entries:', err);
    }
  }, [user, today]);

  // Initialize when user changes
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadExercises();
      if (user) {
        await Promise.all([
          loadSettings(),
          loadExerciseHistory(),
          loadTrackables(),
          loadTodayEntries(),
          loadFoodItems(),
          loadTodayFoodEntries(),
        ]);
      }
      setIsLoading(false);
    }
    init();
  }, [user, loadExercises, loadSettings, loadExerciseHistory, loadTrackables, loadTodayEntries, loadFoodItems, loadTodayFoodEntries]);

  // Toggle tracking entry (habit/health)
  const toggleTrackingEntry = useCallback(async (trackableId, isCompleted, value = null) => {
    if (!user) return;

    const existing = todayEntries[trackableId];

    if (existing) {
      // Update existing entry
      const { error } = await supabase
        .from('tracking_entries')
        .update({ is_completed: isCompleted, value })
        .eq('id', existing.id);

      if (!error) {
        setTodayEntries(prev => ({
          ...prev,
          [trackableId]: { ...existing, is_completed: isCompleted, value },
        }));
      }
    } else {
      // Create new entry
      const { data, error } = await supabase
        .from('tracking_entries')
        .insert({
          user_id: user.id,
          trackable_id: trackableId,
          date: today,
          is_completed: isCompleted,
          value,
        })
        .select()
        .single();

      if (!error && data) {
        setTodayEntries(prev => ({
          ...prev,
          [trackableId]: data,
        }));
      }
    }
  }, [user, today, todayEntries]);

  // Log exercise (simplified - just weight, reps, sets)
  const logExercise = useCallback(async (exercise, { weight, reps, sets }) => {
    if (!user) return null;

    // Insert exercise log
    const { data, error } = await supabase
      .from('exercise_logs')
      .insert({
        user_id: user.id,
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        date: today,
        weight,
        reps,
        sets,
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging exercise:', error);
      return null;
    }

    // Update exercise history
    const existing = exerciseHistory[exercise.name];
    const historyEntry = {
      id: existing?.id,
      user_id: user.id,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      last_weight: weight,
      last_reps: reps,
      last_sets: sets,
      personal_record_weight: Math.max(weight, existing?.personal_record_weight || 0),
      times_performed: (existing?.times_performed || 0) + 1,
      last_performed_at: new Date().toISOString(),
    };

    await supabase.from('exercise_history').upsert(historyEntry);

    setExerciseHistory(prev => ({
      ...prev,
      [exercise.name]: historyEntry,
    }));

    return data;
  }, [user, today, exerciseHistory]);

  // Get exercise logs for a date range
  const getExerciseLogs = useCallback(async (startDate, endDate) => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error getting exercise logs:', error);
      return [];
    }

    return data || [];
  }, [user]);

  // Get tracking entries for a date range (for heatmap)
  const getTrackingEntries = useCallback(async (startDate, endDate) => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('tracking_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error getting tracking entries:', error);
      return [];
    }

    return data || [];
  }, [user]);

  // Get today's exercise logs
  const getTodayExerciseLogs = useCallback(async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting today logs:', error);
      return [];
    }

    return data || [];
  }, [user, today]);

  // Delete exercise log
  const deleteExerciseLog = useCallback(async (logId) => {
    if (!user) return false;

    const { error } = await supabase
      .from('exercise_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting exercise log:', error);
      return false;
    }

    return true;
  }, [user]);

  // Create trackable
  const createTrackable = useCallback(async (trackable) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('trackables')
      .insert({
        user_id: user.id,
        ...trackable,
        order_index: trackables.length,
      })
      .select()
      .single();

    if (!error && data) {
      setTrackables(prev => [...prev, data]);
      return data;
    }
    return null;
  }, [user, trackables]);

  // Update trackable
  const updateTrackable = useCallback(async (id, updates) => {
    if (!user) return;

    const { error } = await supabase
      .from('trackables')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setTrackables(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
  }, [user]);

  // Delete trackable
  const deleteTrackable = useCallback(async (id) => {
    if (!user) return;

    const { error } = await supabase
      .from('trackables')
      .delete()
      .eq('id', id);

    if (!error) {
      setTrackables(prev => prev.filter(t => t.id !== id));
    }
  }, [user]);

  // ============================================
  // FOOD TRACKING FUNCTIONS
  // ============================================

  // Create food item
  const createFoodItem = useCallback(async (foodItem) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('food_items')
      .insert({
        user_id: user.id,
        ...foodItem,
        order_index: foodItems.length,
      })
      .select()
      .single();

    if (!error && data) {
      setFoodItems(prev => [...prev, data]);
      return data;
    }
    return null;
  }, [user, foodItems]);

  // Update food item
  const updateFoodItem = useCallback(async (id, updates) => {
    if (!user) return;

    const { error } = await supabase
      .from('food_items')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setFoodItems(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    }
  }, [user]);

  // Delete food item
  const deleteFoodItem = useCallback(async (id) => {
    if (!user) return;

    const { error } = await supabase
      .from('food_items')
      .delete()
      .eq('id', id);

    if (!error) {
      setFoodItems(prev => prev.filter(f => f.id !== id));
    }
  }, [user]);

  // Toggle food entry (mark as eaten or not)
  const toggleFoodEntry = useCallback(async (foodItemId, quantity = 1) => {
    if (!user) return;

    const existing = todayFoodEntries[foodItemId];

    if (existing) {
      // Toggle off - delete entry
      const { error } = await supabase
        .from('food_entries')
        .delete()
        .eq('id', existing.id);

      if (!error) {
        setTodayFoodEntries(prev => {
          const updated = { ...prev };
          delete updated[foodItemId];
          return updated;
        });
      }
    } else {
      // Create new entry
      const { data, error } = await supabase
        .from('food_entries')
        .insert({
          user_id: user.id,
          food_item_id: foodItemId,
          date: today,
          quantity,
          is_completed: true,
        })
        .select()
        .single();

      if (!error && data) {
        setTodayFoodEntries(prev => ({
          ...prev,
          [foodItemId]: data,
        }));
      }
    }
  }, [user, today, todayFoodEntries]);

  // Update food entry quantity
  const updateFoodEntryQuantity = useCallback(async (foodItemId, quantity) => {
    if (!user) return;

    const existing = todayFoodEntries[foodItemId];

    if (existing) {
      const { error } = await supabase
        .from('food_entries')
        .update({ quantity })
        .eq('id', existing.id);

      if (!error) {
        setTodayFoodEntries(prev => ({
          ...prev,
          [foodItemId]: { ...existing, quantity },
        }));
      }
    } else {
      // Create new entry with quantity
      const { data, error } = await supabase
        .from('food_entries')
        .insert({
          user_id: user.id,
          food_item_id: foodItemId,
          date: today,
          quantity,
          is_completed: true,
        })
        .select()
        .single();

      if (!error && data) {
        setTodayFoodEntries(prev => ({
          ...prev,
          [foodItemId]: data,
        }));
      }
    }
  }, [user, today, todayFoodEntries]);

  // Get food entries for a date range
  const getFoodEntries = useCallback(async (startDate, endDate) => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('food_entries')
      .select('*, food_items(name, icon, color)')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error getting food entries:', error);
      return [];
    }

    return data || [];
  }, [user]);

  // Update settings
  const updateSettings = useCallback(async (newSettings) => {
    if (!user) return;
    
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    await supabase.from('user_settings').update(newSettings).eq('user_id', user.id);
  }, [settings, user]);

  // Auth functions
  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }, []);

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTrackables([]);
    setTodayEntries({});
    setExerciseHistory({});
    setFoodItems([]);
    setTodayFoodEntries({});
  }, []);

  return (
    <WorkoutContext.Provider
      value={{
        user,
        exercises,
        exerciseHistory,
        trackables,
        todayEntries,
        foodItems,
        todayFoodEntries,
        settings,
        isLoading,
        today,
        loadExercises,
        loadTrackables,
        loadTodayEntries,
        loadFoodItems,
        loadTodayFoodEntries,
        toggleTrackingEntry,
        logExercise,
        getExerciseLogs,
        getTrackingEntries,
        getTodayExerciseLogs,
        deleteExerciseLog,
        createTrackable,
        updateTrackable,
        deleteTrackable,
        createFoodItem,
        updateFoodItem,
        deleteFoodItem,
        toggleFoodEntry,
        updateFoodEntryQuantity,
        getFoodEntries,
        updateSettings,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}

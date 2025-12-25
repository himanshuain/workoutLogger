import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase";

const WorkoutContext = createContext();

export function WorkoutProvider({ children }) {
  const [user, setUser] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [exerciseHistory, setExerciseHistory] = useState({});
  const [trackables, setTrackables] = useState([]);
  const [todayEntries, setTodayEntries] = useState({});
  const [foodItems, setFoodItems] = useState([]);
  const [todayFoodEntries, setTodayFoodEntries] = useState({});
  const [routines, setRoutines] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [settings, setSettings] = useState({
    unit: "kg",
    dark_mode: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Use local timezone for today's date
  const getLocalDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateStr();

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load exercises
  const loadExercises = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("name");

      if (!error && data) {
        setExercises(data);
      }
    } catch (err) {
      console.error("Error loading exercises:", err);
    }
  }, []);

  // Load settings
  const loadSettings = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setSettings(data);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  }, [user]);

  // Load exercise history
  const loadExerciseHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("exercise_history")
        .select("*")
        .eq("user_id", user.id);

      if (!error && data) {
        const historyMap = {};
        for (const h of data) {
          historyMap[h.exercise_name] = h;
        }
        setExerciseHistory(historyMap);
      }
    } catch (err) {
      console.error("Error loading exercise history:", err);
    }
  }, [user]);

  // Load trackables (habits/health)
  const loadTrackables = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("trackables")
        .select("*")
        .eq("user_id", user.id)
        .order("order_index");

      if (!error && data) {
        setTrackables(data);
      }
    } catch (err) {
      console.error("Error loading trackables:", err);
    }
  }, [user]);

  // Load today's tracking entries
  const loadTodayEntries = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("tracking_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today);

      if (!error && data) {
        const entriesMap = {};
        for (const e of data) {
          entriesMap[e.trackable_id] = e;
        }
        setTodayEntries(entriesMap);
      }
    } catch (err) {
      console.error("Error loading today entries:", err);
    }
  }, [user, today]);

  // Load food items
  const loadFoodItems = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("food_items")
        .select("*")
        .eq("user_id", user.id)
        .order("order_index");

      if (!error && data) {
        setFoodItems(data);
      }
    } catch (err) {
      console.error("Error loading food items:", err);
    }
  }, [user]);

  // Load today's food entries
  const loadTodayFoodEntries = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("food_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today);

      if (!error && data) {
        const entriesMap = {};
        for (const e of data) {
          entriesMap[e.food_item_id] = e;
        }
        setTodayFoodEntries(entriesMap);
      }
    } catch (err) {
      console.error("Error loading today food entries:", err);
    }
  }, [user, today]);

  // ============================================
  // WORKOUT ROUTINES
  // ============================================

  // Load workout routines
  const loadRoutines = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("workout_routines")
        .select(
          `
          *,
          routine_exercises (
            id,
            exercise_id,
            exercise_name,
            category,
            target_sets,
            order_index
          )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Sort exercises within each routine
        const sortedData = data.map((routine) => ({
          ...routine,
          routine_exercises: (routine.routine_exercises || []).sort(
            (a, b) => a.order_index - b.order_index,
          ),
        }));
        setRoutines(sortedData);
      }
    } catch (err) {
      console.error("Error loading routines:", err);
    }
  }, [user]);

  // Create workout routine
  const createRoutine = useCallback(
    async (routineData) => {
      if (!user) return null;

      const { exercises: routineExercises, ...routine } = routineData;

      // Create the routine
      const { data: newRoutine, error } = await supabase
        .from("workout_routines")
        .insert({
          user_id: user.id,
          name: routine.name,
          day_of_week: routine.day_of_week,
          color: routine.color || "#3b82f6",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating routine:", error);
        return null;
      }

      // Add exercises to the routine
      if (routineExercises && routineExercises.length > 0) {
        const exercisesToInsert = routineExercises.map((ex, index) => ({
          routine_id: newRoutine.id,
          exercise_id: ex.exercise_id || null,
          exercise_name: ex.exercise_name,
          category: ex.category || "other",
          target_sets: ex.target_sets || 3,
          order_index: index,
        }));

        await supabase.from("routine_exercises").insert(exercisesToInsert);
      }

      await loadRoutines();
      return newRoutine;
    },
    [user, loadRoutines],
  );

  // Update workout routine
  const updateRoutine = useCallback(
    async (routineId, routineData) => {
      if (!user) return;

      const { exercises: routineExercises, ...routine } = routineData;

      // Update the routine
      await supabase
        .from("workout_routines")
        .update({
          name: routine.name,
          day_of_week: routine.day_of_week,
          color: routine.color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", routineId);

      // Delete existing exercises and re-add
      if (routineExercises) {
        await supabase
          .from("routine_exercises")
          .delete()
          .eq("routine_id", routineId);

        if (routineExercises.length > 0) {
          const exercisesToInsert = routineExercises.map((ex, index) => ({
            routine_id: routineId,
            exercise_id: ex.exercise_id || null,
            exercise_name: ex.exercise_name,
            category: ex.category || "other",
            target_sets: ex.target_sets || 3,
            order_index: index,
          }));

          await supabase.from("routine_exercises").insert(exercisesToInsert);
        }
      }

      await loadRoutines();
    },
    [user, loadRoutines],
  );

  // Delete workout routine
  const deleteRoutine = useCallback(
    async (routineId) => {
      if (!user) return;

      await supabase.from("workout_routines").delete().eq("id", routineId);

      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
    },
    [user],
  );

  // Get today's routine
  const getTodayRoutine = useCallback(() => {
    const dayOfWeek = new Date().getDay(); // 0 = Sunday
    return routines.find((r) => r.day_of_week === dayOfWeek) || null;
  }, [routines]);

  // ============================================
  // WORKOUT SESSIONS
  // ============================================

  // Load active session for today
  const loadActiveSession = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(
          `
          *,
          set_logs (*)
        `,
        )
        .eq("user_id", user.id)
        .eq("date", today)
        .eq("status", "active")
        .single();

      if (!error && data) {
        setActiveSession(data);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      setActiveSession(null);
    }
  }, [user, today]);

  // Start a new workout session
  const startWorkoutSession = useCallback(
    async (routine) => {
      if (!user) return null;

      // Check if there's already an active session for today
      const { data: existing } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", today)
        .eq("status", "active")
        .single();

      if (existing) {
        // Return existing session
        const { data: session } = await supabase
          .from("workout_sessions")
          .select("*, set_logs (*)")
          .eq("id", existing.id)
          .single();

        setActiveSession(session);
        return session;
      }

      // Create new session
      const { data: newSession, error } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          routine_id: routine.id,
          routine_name: routine.name,
          date: today,
          status: "active",
          current_exercise_index: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating session:", error);
        return null;
      }

      // Create set logs for each exercise
      const setLogs = [];
      for (const exercise of routine.routine_exercises || []) {
        const history = exerciseHistory[exercise.exercise_name];

        for (let setNum = 1; setNum <= exercise.target_sets; setNum++) {
          // Get previous set data for this exercise
          const previousWeight = history?.last_weight || 0;
          const previousReps = history?.last_reps || 10;

          setLogs.push({
            session_id: newSession.id,
            user_id: user.id,
            exercise_name: exercise.exercise_name,
            category: exercise.category,
            set_number: setNum,
            weight: previousWeight,
            reps: previousReps,
            is_completed: false,
            previous_weight: previousWeight,
            previous_reps: previousReps,
          });
        }
      }

      if (setLogs.length > 0) {
        await supabase.from("set_logs").insert(setLogs);
      }

      // Fetch the complete session with set logs
      const { data: completeSession } = await supabase
        .from("workout_sessions")
        .select("*, set_logs (*)")
        .eq("id", newSession.id)
        .single();

      setActiveSession(completeSession);
      return completeSession;
    },
    [user, today, exerciseHistory],
  );

  // Update a set log
  const updateSetLog = useCallback(
    async (setLogId, updates) => {
      if (!user) return;

      const { error } = await supabase
        .from("set_logs")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", setLogId);

      if (!error && activeSession) {
        setActiveSession((prev) => ({
          ...prev,
          set_logs: prev.set_logs.map((log) =>
            log.id === setLogId ? { ...log, ...updates } : log,
          ),
        }));
      }
    },
    [user, activeSession],
  );

  // Complete a workout session
  const completeWorkoutSession = useCallback(
    async (sessionId) => {
      if (!user) return;

      const { error } = await supabase
        .from("workout_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (!error) {
        // Update exercise history with the completed sets
        const session = activeSession;
        if (session && session.set_logs) {
          const exerciseMap = {};

          // Group completed sets by exercise
          session.set_logs
            .filter((log) => log.is_completed)
            .forEach((log) => {
              if (!exerciseMap[log.exercise_name]) {
                exerciseMap[log.exercise_name] = {
                  sets: 0,
                  totalReps: 0,
                  maxWeight: 0,
                };
              }
              exerciseMap[log.exercise_name].sets += 1;
              exerciseMap[log.exercise_name].totalReps += log.reps;
              exerciseMap[log.exercise_name].maxWeight = Math.max(
                exerciseMap[log.exercise_name].maxWeight,
                log.weight,
              );
            });

          // Update history for each exercise
          for (const [exerciseName, data] of Object.entries(exerciseMap)) {
            const avgReps = Math.round(data.totalReps / data.sets);
            const existing = exerciseHistory[exerciseName];

            await supabase.from("exercise_history").upsert({
              id: existing?.id,
              user_id: user.id,
              exercise_name: exerciseName,
              last_weight: data.maxWeight,
              last_reps: avgReps,
              last_sets: data.sets,
              personal_record_weight: Math.max(
                data.maxWeight,
                existing?.personal_record_weight || 0,
              ),
              times_performed: (existing?.times_performed || 0) + 1,
              last_performed_at: new Date().toISOString(),
            });
          }

          await loadExerciseHistory();
        }

        setActiveSession(null);
      }
    },
    [user, activeSession, exerciseHistory, loadExerciseHistory],
  );

  // Get workout session by ID
  const getWorkoutSession = useCallback(
    async (sessionId) => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*, set_logs (*)")
        .eq("id", sessionId)
        .single();

      if (error) {
        console.error("Error fetching session:", error);
        return null;
      }

      return data;
    },
    [user],
  );

  // Get today's completed session
  const getTodaySession = useCallback(async () => {
    if (!user) return null;

    const { data } = await supabase
      .from("workout_sessions")
      .select("*, set_logs (*)")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    return data;
  }, [user, today]);

  // Update session's current exercise index
  const updateSessionExerciseIndex = useCallback(
    async (sessionId, index) => {
      if (!user) return;

      await supabase
        .from("workout_sessions")
        .update({ current_exercise_index: index })
        .eq("id", sessionId);

      if (activeSession && activeSession.id === sessionId) {
        setActiveSession((prev) => ({
          ...prev,
          current_exercise_index: index,
        }));
      }
    },
    [user, activeSession],
  );

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
          loadRoutines(),
          loadActiveSession(),
        ]);
      }
      setIsLoading(false);
    }
    init();
  }, [
    user,
    loadExercises,
    loadSettings,
    loadExerciseHistory,
    loadTrackables,
    loadTodayEntries,
    loadFoodItems,
    loadTodayFoodEntries,
    loadRoutines,
    loadActiveSession,
  ]);

  // Toggle tracking entry (habit/health)
  const toggleTrackingEntry = useCallback(
    async (trackableId, isCompleted, value = null) => {
      if (!user) return;

      const existing = todayEntries[trackableId];

      if (existing) {
        const { error } = await supabase
          .from("tracking_entries")
          .update({ is_completed: isCompleted, value })
          .eq("id", existing.id);

        if (!error) {
          setTodayEntries((prev) => ({
            ...prev,
            [trackableId]: { ...existing, is_completed: isCompleted, value },
          }));
        }
      } else {
        const { data, error } = await supabase
          .from("tracking_entries")
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
          setTodayEntries((prev) => ({
            ...prev,
            [trackableId]: data,
          }));
        }
      }
    },
    [user, today, todayEntries],
  );

  // Log exercise (legacy - for backwards compatibility)
  const logExercise = useCallback(
    async (exercise, { weight, reps, sets }) => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("exercise_logs")
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
        console.error("Error logging exercise:", error);
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
        personal_record_weight: Math.max(
          weight,
          existing?.personal_record_weight || 0,
        ),
        times_performed: (existing?.times_performed || 0) + 1,
        last_performed_at: new Date().toISOString(),
      };

      await supabase.from("exercise_history").upsert(historyEntry);

      setExerciseHistory((prev) => ({
        ...prev,
        [exercise.name]: historyEntry,
      }));

      return data;
    },
    [user, today, exerciseHistory],
  );

  // Get exercise logs for a date range
  const getExerciseLogs = useCallback(
    async (startDate, endDate) => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("exercise_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error getting exercise logs:", error);
        return [];
      }

      return data || [];
    },
    [user],
  );

  // Get tracking entries for a date range (for heatmap)
  const getTrackingEntries = useCallback(
    async (startDate, endDate) => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("tracking_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) {
        console.error("Error getting tracking entries:", error);
        return [];
      }

      return data || [];
    },
    [user],
  );

  // Get today's exercise logs
  const getTodayExerciseLogs = useCallback(async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("exercise_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting today logs:", error);
      return [];
    }

    return data || [];
  }, [user, today]);

  // Delete exercise log
  const deleteExerciseLog = useCallback(
    async (logId) => {
      if (!user) return false;

      const { error } = await supabase
        .from("exercise_logs")
        .delete()
        .eq("id", logId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting exercise log:", error);
        return false;
      }

      return true;
    },
    [user],
  );

  // Create trackable
  const createTrackable = useCallback(
    async (trackable) => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("trackables")
        .insert({
          user_id: user.id,
          ...trackable,
          order_index: trackables.length,
        })
        .select()
        .single();

      if (!error && data) {
        setTrackables((prev) => [...prev, data]);
        return data;
      }
      return null;
    },
    [user, trackables],
  );

  // Update trackable
  const updateTrackable = useCallback(
    async (id, updates) => {
      if (!user) return;

      const { error } = await supabase
        .from("trackables")
        .update(updates)
        .eq("id", id);

      if (!error) {
        setTrackables((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        );
      }
    },
    [user],
  );

  // Delete trackable
  const deleteTrackable = useCallback(
    async (id) => {
      if (!user) return;

      const { error } = await supabase.from("trackables").delete().eq("id", id);

      if (!error) {
        setTrackables((prev) => prev.filter((t) => t.id !== id));
      }
    },
    [user],
  );

  // ============================================
  // FOOD TRACKING FUNCTIONS
  // ============================================

  const createFoodItem = useCallback(
    async (foodItem) => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("food_items")
        .insert({
          user_id: user.id,
          ...foodItem,
          order_index: foodItems.length,
        })
        .select()
        .single();

      if (!error && data) {
        setFoodItems((prev) => [...prev, data]);
        return data;
      }
      return null;
    },
    [user, foodItems],
  );

  const updateFoodItem = useCallback(
    async (id, updates) => {
      if (!user) return;

      const { error } = await supabase
        .from("food_items")
        .update(updates)
        .eq("id", id);

      if (!error) {
        setFoodItems((prev) =>
          prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        );
      }
    },
    [user],
  );

  const deleteFoodItem = useCallback(
    async (id) => {
      if (!user) return;

      const { error } = await supabase.from("food_items").delete().eq("id", id);

      if (!error) {
        setFoodItems((prev) => prev.filter((f) => f.id !== id));
      }
    },
    [user],
  );

  const toggleFoodEntry = useCallback(
    async (foodItemId, quantity = 1) => {
      if (!user) return;

      const existing = todayFoodEntries[foodItemId];

      if (existing) {
        const { error } = await supabase
          .from("food_entries")
          .delete()
          .eq("id", existing.id);

        if (!error) {
          setTodayFoodEntries((prev) => {
            const updated = { ...prev };
            delete updated[foodItemId];
            return updated;
          });
        }
      } else {
        const { data, error } = await supabase
          .from("food_entries")
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
          setTodayFoodEntries((prev) => ({
            ...prev,
            [foodItemId]: data,
          }));
        }
      }
    },
    [user, today, todayFoodEntries],
  );

  const updateFoodEntryQuantity = useCallback(
    async (foodItemId, quantity) => {
      if (!user) return;

      const existing = todayFoodEntries[foodItemId];

      if (existing) {
        const { error } = await supabase
          .from("food_entries")
          .update({ quantity })
          .eq("id", existing.id);

        if (!error) {
          setTodayFoodEntries((prev) => ({
            ...prev,
            [foodItemId]: { ...existing, quantity },
          }));
        }
      } else {
        const { data, error } = await supabase
          .from("food_entries")
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
          setTodayFoodEntries((prev) => ({
            ...prev,
            [foodItemId]: data,
          }));
        }
      }
    },
    [user, today, todayFoodEntries],
  );

  const getFoodEntries = useCallback(
    async (startDate, endDate) => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("food_entries")
        .select("*, food_items(name, icon, color)")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) {
        console.error("Error getting food entries:", error);
        return [];
      }

      return data || [];
    },
    [user],
  );

  // Update settings
  const updateSettings = useCallback(
    async (newSettings) => {
      if (!user) return;

      const updated = { ...settings, ...newSettings };
      setSettings(updated);

      await supabase
        .from("user_settings")
        .update(newSettings)
        .eq("user_id", user.id);
    },
    [settings, user],
  );

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
    setRoutines([]);
    setActiveSession(null);
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
        routines,
        activeSession,
        settings,
        isLoading,
        today,
        loadExercises,
        loadTrackables,
        loadTodayEntries,
        loadFoodItems,
        loadTodayFoodEntries,
        loadRoutines,
        loadActiveSession,
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
        // New routine functions
        createRoutine,
        updateRoutine,
        deleteRoutine,
        getTodayRoutine,
        // New session functions
        startWorkoutSession,
        updateSetLog,
        completeWorkoutSession,
        getWorkoutSession,
        getTodaySession,
        updateSessionExerciseIndex,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error("useWorkout must be used within a WorkoutProvider");
  }
  return context;
}

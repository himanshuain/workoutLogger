import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const WorkoutContext = createContext();

export function WorkoutProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [exerciseHistory, setExerciseHistory] = useState({});
  const [trackables, setTrackables] = useState([]);
  const [todayEntries, setTodayEntries] = useState({});
  const [foodItems, setFoodItems] = useState([]);
  const [todayFoodEntries, setTodayFoodEntries] = useState({});
  const [routines, setRoutines] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [stepCards, setStepCards] = useState([]);
  const [settings, setSettings] = useState({
    unit: "kg",
    dark_mode: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Use local timezone for today's date
  const getLocalDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateStr();

  // Auth state listener — dedupe by user ID to prevent cascading re-renders
  useEffect(() => {
    const setUserStable = (newUser) => {
      setUser(prev => {
        const prevId = prev?.id ?? null;
        const newId = newUser?.id ?? null;
        if (prevId === newId) return prev;
        return newUser;
      });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserStable(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserStable(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load exercises
  const loadExercises = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("exercises").select("*").order("name");

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
        .maybeSingle();

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

  // Helper: load/save active_days from localStorage (not in Supabase schema)
  const getActiveDaysMap = useCallback(() => {
    if (typeof window === "undefined" || !user) return {};
    try {
      const stored = localStorage.getItem(`logbook_active_days_${user.id}`);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  }, [user]);

  const saveActiveDays = useCallback((trackableId, activeDays) => {
    if (typeof window === "undefined" || !user) return;
    const map = getActiveDaysMap();
    if (activeDays === null || activeDays === undefined) {
      delete map[trackableId];
    } else {
      map[trackableId] = activeDays;
    }
    localStorage.setItem(`logbook_active_days_${user.id}`, JSON.stringify(map));
  }, [user, getActiveDaysMap]);

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
        const daysMap = getActiveDaysMap();
        const enriched = data.map(t => ({
          ...t,
          active_days: daysMap[t.id] || null,
        }));
        setTrackables(enriched);
      }
    } catch (err) {
      console.error("Error loading trackables:", err);
    }
  }, [user, getActiveDaysMap]);

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
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Sort exercises within each routine
        const sortedData = data.map(routine => ({
          ...routine,
          routine_exercises: (routine.routine_exercises || []).sort(
            (a, b) => a.order_index - b.order_index
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
    async routineData => {
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
    [user, loadRoutines]
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
        await supabase.from("routine_exercises").delete().eq("routine_id", routineId);

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
    [user, loadRoutines]
  );

  // Delete workout routine
  const deleteRoutine = useCallback(
    async routineId => {
      if (!user) return;

      await supabase.from("workout_routines").delete().eq("id", routineId);

      setRoutines(prev => prev.filter(r => r.id !== routineId));
    },
    [user]
  );

  // Get today's routine
  const getTodayRoutine = useCallback(() => {
    const dayOfWeek = new Date().getDay(); // 0 = Sunday
    return routines.find(r => r.day_of_week === dayOfWeek) || null;
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
        `
        )
        .eq("user_id", user.id)
        .eq("date", today)
        .eq("status", "active")
        .maybeSingle();

      setActiveSession(data || null);
    } catch (err) {
      setActiveSession(null);
    }
  }, [user, today]);

  // Start a new workout session
  const startWorkoutSession = useCallback(
    async routine => {
      if (!user) return null;

      // Check if there's already an active session for today
      const { data: existing } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", today)
        .eq("status", "active")
        .maybeSingle();

      if (existing) {
        const { data: session } = await supabase
          .from("workout_sessions")
          .select("*, set_logs (*)")
          .eq("id", existing.id)
          .maybeSingle();

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
    [user, today, exerciseHistory]
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
        setActiveSession(prev => ({
          ...prev,
          set_logs: prev.set_logs.map(log => (log.id === setLogId ? { ...log, ...updates } : log)),
        }));
      }
    },
    [user, activeSession]
  );

  // Complete a workout session
  const completeWorkoutSession = useCallback(
    async sessionId => {
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
            .filter(log => log.is_completed)
            .forEach(log => {
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
                log.weight
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
                existing?.personal_record_weight || 0
              ),
              times_performed: (existing?.times_performed || 0) + 1,
              last_performed_at: new Date().toISOString(),
            });
          }

          await loadExerciseHistory();
        }

        setActiveSession(null);

        queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
        queryClient.invalidateQueries({ queryKey: ["todaySession"] });
        queryClient.invalidateQueries({ queryKey: ["historySessions"] });
        queryClient.invalidateQueries({ queryKey: ["exerciseLogs"] });
      }
    },
    [user, activeSession, exerciseHistory, loadExerciseHistory, queryClient]
  );

  // Get workout session by ID
  const getWorkoutSession = useCallback(
    async sessionId => {
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
    [user]
  );

  // Delete a single set log from a session
  const deleteSetLog = useCallback(
    async (setLogId) => {
      if (!user) return false;
      const { error } = await supabase.from("set_logs").delete().eq("id", setLogId);
      if (!error) {
        if (activeSession) {
          setActiveSession(prev => ({
            ...prev,
            set_logs: prev.set_logs.filter(log => log.id !== setLogId),
          }));
        }
        queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
        queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
        queryClient.invalidateQueries({ queryKey: ["todaySession"] });
        queryClient.invalidateQueries({ queryKey: ["historySessions"] });
        return true;
      }
      return false;
    },
    [user, activeSession, queryClient]
  );

  // Delete a full workout session and its set logs
  const deleteWorkoutSession = useCallback(
    async (sessionId) => {
      if (!user) return false;
      await supabase.from("set_logs").delete().eq("session_id", sessionId);
      const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
        queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
        queryClient.invalidateQueries({ queryKey: ["todaySession"] });
        queryClient.invalidateQueries({ queryKey: ["historySessions"] });
        return true;
      }
      return false;
    },
    [user, queryClient]
  );

  // Update a set log (for editing history)
  const updateSetLogData = useCallback(
    async (setLogId, updates) => {
      if (!user) return false;
      const { error } = await supabase
        .from("set_logs")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", setLogId);
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
        queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
        queryClient.invalidateQueries({ queryKey: ["todaySession"] });
        return true;
      }
      return false;
    },
    [user, queryClient]
  );

  // Get today's completed session
  const getTodaySession = useCallback(async () => {
    if (!user) return null;

    const { data } = await supabase
      .from("workout_sessions")
      .select("*, set_logs (*)")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

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
        setActiveSession(prev => ({
          ...prev,
          current_exercise_index: index,
        }));
      }
    },
    [user, activeSession]
  );

  // ============================================
  // LIFE LOG FUNCTIONS
  // ============================================

  // Load event types with their latest log
  const loadEventTypes = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("event_types")
        .select(
          `
          *,
          event_logs (
            id,
            date,
            notes,
            cost,
            created_at
          )
        `
        )
        .eq("user_id", user.id)
        .order("order_index");

      if (!error && data) {
        // Process to add last_log and days_since for each event type
        const processed = data.map(eventType => {
          const logs = eventType.event_logs || [];
          // Sort logs by date descending to get the most recent
          const sortedLogs = logs.sort((a, b) => new Date(b.date) - new Date(a.date));
          const lastLog = sortedLogs[0] || null;

          let daysSince = null;
          if (lastLog) {
            const lastDate = new Date(lastLog.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            lastDate.setHours(0, 0, 0, 0);
            daysSince = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
          }

          return {
            ...eventType,
            last_log: lastLog,
            days_since: daysSince,
            total_logs: logs.length,
          };
        });

        setEventTypes(processed);
      }
    } catch (err) {
      console.error("Error loading event types:", err);
    }
  }, [user]);

  // Load step cards with nested items
  const loadStepCards = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("step_cards")
        .select(`
          *,
          step_items (
            id,
            text,
            order_index,
            created_at
          )
        `)
        .eq("user_id", user.id)
        .order("order_index");

      if (!error && data) {
        const processed = data.map(card => ({
          ...card,
          step_items: (card.step_items || []).sort((a, b) => a.order_index - b.order_index),
        }));
        setStepCards(processed);
      }
    } catch (err) {
      console.error("Error loading step cards:", err);
    }
  }, [user]);

  // Initialize once per user login
  const initUserIdRef = useRef(null);

  useEffect(() => {
    const uid = user?.id ?? null;

    if (uid === initUserIdRef.current) return;
    initUserIdRef.current = uid;

    if (!uid) return;

    async function loadInitData() {
      try {
        const { data, error } = await supabase.rpc("get_user_init_data", {
          p_user_id: uid,
          p_today: today,
        });

        if (error) throw error;

        setExercises(data.exercises || []);

        if (data.user_settings) setSettings(data.user_settings);

        const historyMap = {};
        for (const h of (data.exercise_history || [])) {
          historyMap[h.exercise_name] = h;
        }
        setExerciseHistory(historyMap);

        const daysMap = getActiveDaysMap();
        const enriched = (data.trackables || []).map(t => ({
          ...t,
          active_days: daysMap[t.id] || null,
        }));
        setTrackables(enriched);

        const entriesMap = {};
        for (const e of (data.today_entries || [])) {
          entriesMap[e.trackable_id] = e;
        }
        setTodayEntries(entriesMap);

        setFoodItems(data.food_items || []);

        const entriesMap2 = {};
        for (const e of (data.today_food_entries || [])) {
          entriesMap2[e.food_item_id] = e;
        }
        setTodayFoodEntries(entriesMap2);

        const sortedRoutines = (data.routines || []).map(routine => ({
          ...routine,
          routine_exercises: (routine.routine_exercises || []).sort(
            (a, b) => a.order_index - b.order_index
          ),
        }));
        setRoutines(sortedRoutines);

        setActiveSession(data.active_session || null);

        const processedEvents = (data.event_types || []).map(eventType => {
          const logs = eventType.event_logs || [];
          const sortedLogs = logs.sort((a, b) => new Date(b.date) - new Date(a.date));
          const lastLog = sortedLogs[0] || null;
          let daysSince = null;
          if (lastLog) {
            const lastDate = new Date(lastLog.date);
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            lastDate.setHours(0, 0, 0, 0);
            daysSince = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
          }
          return { ...eventType, last_log: lastLog, days_since: daysSince, total_logs: logs.length };
        });
        setEventTypes(processedEvents);

        const processedCards = (data.step_cards || []).map(card => ({
          ...card,
          step_items: (card.step_items || []).sort((a, b) => a.order_index - b.order_index),
        }));
        setStepCards(processedCards);
      } catch (err) {
        console.error("RPC init failed, falling back to individual loaders:", err);
        loadExercises();
        Promise.all([
          loadSettings(),
          loadExerciseHistory(),
          loadTrackables(),
          loadTodayEntries(),
          loadFoodItems(),
          loadTodayFoodEntries(),
          loadRoutines(),
          loadActiveSession(),
          loadEventTypes(),
          loadStepCards(),
        ]);
      }
    }

    loadInitData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
          setTodayEntries(prev => ({
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
          setTodayEntries(prev => ({
            ...prev,
            [trackableId]: data,
          }));
        }
      }

      queryClient.invalidateQueries({ queryKey: ["trackingEntries"] });
      queryClient.invalidateQueries({ queryKey: ["trackingEntriesForHeatmap"] });
      queryClient.invalidateQueries({ queryKey: ["bodyWeightHistory"] });
    },
    [user, today, todayEntries, queryClient]
  );

  // Toggle tracking entry for a specific date (for past entries)
  const toggleTrackingEntryForDate = useCallback(
    async (trackableId, date, isCompleted, value = null) => {
      if (!user) return { success: false };

      const { data: existing } = await supabase
        .from("tracking_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("trackable_id", trackableId)
        .eq("date", date)
        .maybeSingle();

      if (existing) {
        if (isCompleted) {
          // Update existing entry
          const { error } = await supabase
            .from("tracking_entries")
            .update({ is_completed: isCompleted, value })
            .eq("id", existing.id);

          if (!error) {
            // If it's today, update todayEntries
            if (date === today) {
              setTodayEntries(prev => ({
                ...prev,
                [trackableId]: { ...existing, is_completed: isCompleted, value },
              }));
            }
            return { success: true, action: "updated" };
          }
        } else {
          // Delete entry if unchecking
          const { error } = await supabase
            .from("tracking_entries")
            .delete()
            .eq("id", existing.id);

          if (!error) {
            // If it's today, update todayEntries
            if (date === today) {
              setTodayEntries(prev => {
                const newEntries = { ...prev };
                delete newEntries[trackableId];
                return newEntries;
              });
            }
            return { success: true, action: "deleted" };
          }
        }
      } else if (isCompleted) {
        // Create new entry
        const { data, error } = await supabase
          .from("tracking_entries")
          .insert({
            user_id: user.id,
            trackable_id: trackableId,
            date,
            is_completed: isCompleted,
            value,
          })
          .select()
          .single();

        if (!error && data) {
          // If it's today, update todayEntries
          if (date === today) {
            setTodayEntries(prev => ({
              ...prev,
              [trackableId]: data,
            }));
          }
          return { success: true, action: "created" };
        }
      }

      queryClient.invalidateQueries({ queryKey: ["trackingEntries"] });
      queryClient.invalidateQueries({ queryKey: ["trackingEntriesForHeatmap"] });
      queryClient.invalidateQueries({ queryKey: ["bodyWeightHistory"] });
      return { success: false };
    },
    [user, today, queryClient]
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
        personal_record_weight: Math.max(weight, existing?.personal_record_weight || 0),
        times_performed: (existing?.times_performed || 0) + 1,
        last_performed_at: new Date().toISOString(),
      };

      await supabase.from("exercise_history").upsert(historyEntry);

      setExerciseHistory(prev => ({
        ...prev,
        [exercise.name]: historyEntry,
      }));

      queryClient.invalidateQueries({ queryKey: ["exerciseLogs"] });
      queryClient.invalidateQueries({ queryKey: ["historyLogs"] });
      return data;
    },
    [user, today, exerciseHistory, queryClient]
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
    [user]
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
    [user]
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

  // Get workout sessions with set logs for a date range (for progress tracking)
  const getWorkoutSessions = useCallback(
    async (startDate, endDate) => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*, set_logs (*)")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error getting workout sessions:", error);
        return [];
      }

      return data || [];
    },
    [user]
  );

  // Get today's workout session set logs (for quick stats)
  const getTodaySetLogs = useCallback(async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("workout_sessions")
      .select("*, set_logs (*)")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (error) {
      console.error("Error getting today session:", error);
      return [];
    }

    if (!data) return [];

    // Return completed set logs
    return (data.set_logs || []).filter(log => log.is_completed);
  }, [user, today]);

  // Delete exercise log
  const deleteExerciseLog = useCallback(
    async logId => {
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
    [user]
  );

  // Create trackable
  const createTrackable = useCallback(
    async trackable => {
      if (!user) return null;

      const { active_days, ...dbFields } = trackable;

      const { data, error } = await supabase
        .from("trackables")
        .insert({
          user_id: user.id,
          ...dbFields,
          order_index: trackables.length,
        })
        .select()
        .single();

      if (!error && data) {
        if (active_days) {
          saveActiveDays(data.id, active_days);
        }
        const enriched = { ...data, active_days: active_days || null };
        setTrackables(prev => [...prev, enriched]);
        return enriched;
      }
      return null;
    },
    [user, trackables, saveActiveDays]
  );

  // Update trackable
  const updateTrackable = useCallback(
    async (id, updates) => {
      if (!user) return;

      const { active_days, ...dbUpdates } = updates;

      if (active_days !== undefined) {
        saveActiveDays(id, active_days);
      }

      const hasDbUpdates = Object.keys(dbUpdates).length > 0;
      if (hasDbUpdates) {
        const { error } = await supabase.from("trackables").update(dbUpdates).eq("id", id);
        if (error) return;
      }

      setTrackables(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
    },
    [user, saveActiveDays]
  );

  // Delete trackable
  const deleteTrackable = useCallback(
    async id => {
      if (!user) return;

      const { error } = await supabase.from("trackables").delete().eq("id", id);

      if (!error) {
        setTrackables(prev => prev.filter(t => t.id !== id));
      }
    },
    [user]
  );

  // ============================================
  // FOOD TRACKING FUNCTIONS
  // ============================================

  const createFoodItem = useCallback(
    async foodItem => {
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
        setFoodItems(prev => [...prev, data]);
        return data;
      }
      return null;
    },
    [user, foodItems]
  );

  const updateFoodItem = useCallback(
    async (id, updates) => {
      if (!user) return;

      const { error } = await supabase.from("food_items").update(updates).eq("id", id);

      if (!error) {
        setFoodItems(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
      }
    },
    [user]
  );

  const deleteFoodItem = useCallback(
    async id => {
      if (!user) return;

      const { error } = await supabase.from("food_items").delete().eq("id", id);

      if (!error) {
        setFoodItems(prev => prev.filter(f => f.id !== id));
      }
    },
    [user]
  );

  const toggleFoodEntry = useCallback(
    async (foodItemId, quantity = 1) => {
      if (!user) return;

      const existing = todayFoodEntries[foodItemId];

      if (existing) {
        const { error } = await supabase.from("food_entries").delete().eq("id", existing.id);

        if (!error) {
          setTodayFoodEntries(prev => {
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
          setTodayFoodEntries(prev => ({
            ...prev,
            [foodItemId]: data,
          }));
        }
      }

      queryClient.invalidateQueries({ queryKey: ["foodEntries"] });
    },
    [user, today, todayFoodEntries, queryClient]
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
          setTodayFoodEntries(prev => ({
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
          setTodayFoodEntries(prev => ({
            ...prev,
            [foodItemId]: data,
          }));
        }
      }

      queryClient.invalidateQueries({ queryKey: ["foodEntries"] });
    },
    [user, today, todayFoodEntries, queryClient]
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
    [user]
  );

  // Update settings
  const updateSettings = useCallback(
    async newSettings => {
      if (!user) return;

      const updated = { ...settings, ...newSettings };
      setSettings(updated);

      await supabase.from("user_settings").update(newSettings).eq("user_id", user.id);
    },
    [settings, user]
  );

  // Create event type
  const createEventType = useCallback(
    async eventType => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("event_types")
        .insert({
          user_id: user.id,
          ...eventType,
          order_index: eventTypes.length,
        })
        .select()
        .single();

      if (!error && data) {
        const newEventType = {
          ...data,
          event_logs: [],
          last_log: null,
          days_since: null,
          total_logs: 0,
        };
        setEventTypes(prev => [...prev, newEventType]);
        return newEventType;
      }
      return null;
    },
    [user, eventTypes]
  );

  // Update event type
  const updateEventType = useCallback(
    async (id, updates) => {
      if (!user) return;

      const { error } = await supabase
        .from("event_types")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (!error) {
        setEventTypes(prev => prev.map(et => (et.id === id ? { ...et, ...updates } : et)));
      }
    },
    [user]
  );

  // Delete event type
  const deleteEventType = useCallback(
    async id => {
      if (!user) return;

      const { error } = await supabase.from("event_types").delete().eq("id", id);

      if (!error) {
        setEventTypes(prev => prev.filter(et => et.id !== id));
      }
    },
    [user]
  );

  // Log an event (add a new occurrence)
  const logEvent = useCallback(
    async (eventTypeId, { date = null, notes = null, cost = null } = {}) => {
      if (!user) return null;

      const logDate = date || getLocalDateStr();

      const { data, error } = await supabase
        .from("event_logs")
        .insert({
          user_id: user.id,
          event_type_id: eventTypeId,
          date: logDate,
          notes,
          cost,
        })
        .select()
        .single();

      if (!error && data) {
        // Update the event type in state with new log
        setEventTypes(prev =>
          prev.map(et => {
            if (et.id === eventTypeId) {
              const newLogs = [data, ...(et.event_logs || [])];
              const daysSince = 0; // Just logged today or on the date

              // Calculate actual days since
              const logDateObj = new Date(logDate);
              const todayObj = new Date();
              todayObj.setHours(0, 0, 0, 0);
              logDateObj.setHours(0, 0, 0, 0);
              const actualDaysSince = Math.floor((todayObj - logDateObj) / (1000 * 60 * 60 * 24));

              return {
                ...et,
                event_logs: newLogs,
                last_log: data,
                days_since: actualDaysSince,
                total_logs: (et.total_logs || 0) + 1,
              };
            }
            return et;
          })
        );
        return data;
      }
      return null;
    },
    [user]
  );

  // Delete an event log
  const deleteEventLog = useCallback(
    async (logId, eventTypeId) => {
      if (!user) return false;

      const { error } = await supabase.from("event_logs").delete().eq("id", logId);

      if (!error) {
        // Reload event types to get updated last_log
        await loadEventTypes();
        return true;
      }
      return false;
    },
    [user, loadEventTypes]
  );

  // Update an event log
  const updateEventLog = useCallback(
    async (logId, updates) => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("event_logs")
        .update(updates)
        .eq("id", logId)
        .select()
        .single();

      if (!error && data) {
        await loadEventTypes();
        return data;
      }
      return null;
    },
    [user, loadEventTypes]
  );

  // Get all logs for an event type
  const getEventLogs = useCallback(
    async eventTypeId => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("event_logs")
        .select("*")
        .eq("event_type_id", eventTypeId)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error getting event logs:", error);
        return [];
      }

      return data || [];
    },
    [user]
  );

  // Step Cards CRUD
  const createStepCard = useCallback(
    async (card) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("step_cards")
        .insert({
          user_id: user.id,
          name: card.name,
          icon: card.icon || "📋",
          color: card.color || "#3b82f6",
          order_index: stepCards.length,
        })
        .select()
        .single();

      if (!error && data) {
        setStepCards(prev => [...prev, { ...data, step_items: [] }]);
        return data;
      }
      return null;
    },
    [user, stepCards.length]
  );

  const updateStepCard = useCallback(
    async (id, updates) => {
      if (!user) return;
      const { error } = await supabase
        .from("step_cards")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (!error) {
        setStepCards(prev =>
          prev.map(c => (c.id === id ? { ...c, ...updates } : c))
        );
      }
    },
    [user]
  );

  const deleteStepCard = useCallback(
    async (id) => {
      if (!user) return;
      const { error } = await supabase.from("step_cards").delete().eq("id", id);
      if (!error) {
        setStepCards(prev => prev.filter(c => c.id !== id));
      }
    },
    [user]
  );

  const createStepItem = useCallback(
    async (cardId, text) => {
      if (!user) return null;
      const card = stepCards.find(c => c.id === cardId);
      const orderIndex = card ? (card.step_items || []).length : 0;

      const { data, error } = await supabase
        .from("step_items")
        .insert({
          card_id: cardId,
          user_id: user.id,
          text,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (!error && data) {
        setStepCards(prev =>
          prev.map(c =>
            c.id === cardId
              ? { ...c, step_items: [...(c.step_items || []), data] }
              : c
          )
        );
        return data;
      }
      return null;
    },
    [user, stepCards]
  );

  const batchCreateStepItems = useCallback(
    async (cardId, texts) => {
      if (!user || !texts.length) return [];

      const { data, error } = await supabase
        .from("step_items")
        .insert(
          texts.map((text, i) => ({
            card_id: cardId,
            user_id: user.id,
            text,
            order_index: i,
          }))
        )
        .select();

      if (!error && data) {
        setStepCards(prev =>
          prev.map(c =>
            c.id === cardId
              ? { ...c, step_items: [...(c.step_items || []), ...data] }
              : c
          )
        );
        return data;
      }
      return [];
    },
    [user]
  );

  const updateStepItem = useCallback(
    async (itemId, cardId, updates) => {
      if (!user) return;
      const { error } = await supabase
        .from("step_items")
        .update(updates)
        .eq("id", itemId);

      if (!error) {
        setStepCards(prev =>
          prev.map(c =>
            c.id === cardId
              ? {
                  ...c,
                  step_items: (c.step_items || []).map(item =>
                    item.id === itemId ? { ...item, ...updates } : item
                  ),
                }
              : c
          )
        );
      }
    },
    [user]
  );

  const deleteStepItem = useCallback(
    async (itemId, cardId) => {
      if (!user) return;
      const { error } = await supabase.from("step_items").delete().eq("id", itemId);
      if (!error) {
        setStepCards(prev =>
          prev.map(c =>
            c.id === cardId
              ? { ...c, step_items: (c.step_items || []).filter(item => item.id !== itemId) }
              : c
          )
        );
      }
    },
    [user]
  );

  const reorderStepItems = useCallback(
    async (cardId, reorderedItems) => {
      if (!user) return;
      setStepCards(prev =>
        prev.map(c => (c.id === cardId ? { ...c, step_items: reorderedItems } : c))
      );
      await supabase.from("step_items").upsert(
        reorderedItems.map((item, i) => ({ id: item.id, card_id: cardId, user_id: user.id, text: item.text, order_index: i }))
      );
    },
    [user]
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

  const resetPassword = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined,
    });
    return { data, error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) {
      console.error("Google login error:", error.message);
      return { error };
    }
    return { error: null };
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
    setEventTypes([]);
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
        eventTypes,
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
        loadEventTypes,
        toggleTrackingEntry,
        toggleTrackingEntryForDate,
        logExercise,
        getExerciseLogs,
        getTrackingEntries,
        getTodayExerciseLogs,
        getWorkoutSessions,
        getTodaySetLogs,
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
        signInWithGoogle,
        signUp,
        resetPassword,
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
        deleteSetLog,
        deleteWorkoutSession,
        updateSetLogData,
        // Life Log functions
        createEventType,
        updateEventType,
        deleteEventType,
        logEvent,
        deleteEventLog,
        updateEventLog,
        getEventLogs,
        // Step Cards functions
        stepCards,
        loadStepCards,
        createStepCard,
        updateStepCard,
        deleteStepCard,
        createStepItem,
        batchCreateStepItems,
        updateStepItem,
        deleteStepItem,
        reorderStepItems,
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

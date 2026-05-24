import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { prepareExerciseCatalog } from "@/lib/exerciseCatalog";
import { getAuthRedirectUrl } from "@/lib/authRedirect";
import { normalizeFoodQuantity } from "@/lib/foodQuantity";
import {
  addSessionExtra,
  clearSessionClientState,
  hydrateSessionClientState,
  removeSessionExtra,
  renameSessionExerciseClient,
  setSessionMetaPersistCallback,
} from "@/lib/workoutSessionClient";
import NotificationService from "@/lib/notifications";
import {
  cacheLocalNavConfig,
  mergeTrackablesActiveDays,
  readLegacyNotificationSchedules,
  readLocalEventSettings,
  readLocalNavConfig,
  readLocalRestMap,
  cacheLocalRestMap,
} from "@/lib/userPrefsMigration";
import { reconcileExerciseMediaOverrides } from "@/lib/exerciseMediaOverridesStorage";
import { useTrackableActions } from "@/context/hooks/useTrackables";
import { useNotificationSchedules } from "@/context/hooks/useNotificationSchedules";
import { useWorkoutSettings } from "@/context/hooks/useWorkoutSettings";

const WorkoutContext = createContext();

/** JSON payload for replace_routine_exercises RPC (order = array order). */
function buildRoutineExercisesJson(routineExercises) {
  return (routineExercises || []).map(ex => ({
    exercise_id: ex.exercise_id ?? null,
    exercise_name: ex.exercise_name,
    category: ex.category || "other",
    target_sets: ex.target_sets || 3,
    notes:
      ex.notes != null && String(ex.notes).trim()
        ? String(ex.notes).trim().slice(0, 500)
        : null,
  }));
}

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
  const [notificationSchedules, setNotificationSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use local timezone for today's date
  const getLocalDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateStr();

  const { loadTrackables, createTrackable, updateTrackable, deleteTrackable } =
    useTrackableActions(user, trackables, setTrackables);

  const { upsertNotificationSchedule, removeNotificationSchedule, getNotificationSchedule } =
    useNotificationSchedules(user, notificationSchedules, setNotificationSchedules);

  const { updateSettings } = useWorkoutSettings(user, settings, setSettings);

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
        setExercises(prepareExerciseCatalog(data));
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
        const { merged, needsServerBackfill } = reconcileExerciseMediaOverrides(
          user.id,
          data.exercise_media_overrides,
        );
        setSettings({ ...data, exercise_media_overrides: merged });
        if (needsServerBackfill) {
          void supabase
            .from("user_settings")
            .update({ exercise_media_overrides: merged })
            .eq("user_id", user.id);
        }
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

  // Persist session client_meta to Supabase
  const persistSessionClientMeta = useCallback(
    async (sessionId, clientMeta) => {
      if (!user || !sessionId) return;
      await supabase
        .from("workout_sessions")
        .update({ client_meta: clientMeta })
        .eq("id", sessionId)
        .eq("user_id", user.id);
    },
    [user],
  );

  useEffect(() => {
    setSessionMetaPersistCallback(persistSessionClientMeta);
    return () => setSessionMetaPersistCallback(null);
  }, [persistSessionClientMeta]);

  // Load trackables handled by useTrackableActions hook

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
            order_index,
            notes
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

      // Add exercises atomically (single DB transaction — avoids empty routine if insert fails)
      if (routineExercises && routineExercises.length > 0) {
        const { error: exError } = await supabase.rpc("replace_routine_exercises", {
          p_routine_id: newRoutine.id,
          p_exercises: buildRoutineExercisesJson(routineExercises),
        });
        if (exError) {
          console.error("Error adding routine exercises:", exError);
          await loadRoutines();
          return newRoutine;
        }
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

      // Replace exercises atomically when the payload includes `exercises`
      if (routineExercises !== undefined) {
        const { error: exError } = await supabase.rpc("replace_routine_exercises", {
          p_routine_id: routineId,
          p_exercises: buildRoutineExercisesJson(routineExercises),
        });
        if (exError) {
          console.error("Error replacing routine exercises:", exError);
          await loadRoutines();
          return;
        }
      }

      await loadRoutines();
    },
    [user, loadRoutines]
  );

  // Get today's routine
  const getTodayRoutine = useCallback(() => {
    const dayOfWeek = new Date().getDay(); // 0 = Sunday
    return routines.find(r => r.day_of_week === dayOfWeek) || null;
  }, [routines]);

  /** @param {number} dayOfWeek 0=Sun … 6=Sat */
  const getRoutineForDay = useCallback(
    dayOfWeek => routines.find(r => r.day_of_week === dayOfWeek) || null,
    [routines],
  );

  /** Append one exercise to a saved routine (no-op if name already present). */
  const appendExerciseToRoutine = useCallback(
    async (routineId, row) => {
      if (!user || !routineId || !row?.exercise_name?.trim()) return null;
      const routine = routines.find(r => r.id === routineId);
      if (!routine) return null;

      const name = row.exercise_name.trim();
      const existing = (routine.routine_exercises || []).map(ex => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        category: ex.category || "other",
        target_sets: ex.target_sets || 3,
        notes:
          ex.notes != null && String(ex.notes).trim()
            ? String(ex.notes).trim().slice(0, 500)
            : null,
      }));

      if (existing.some(e => e.exercise_name === name)) {
        return "exists";
      }

      existing.push({
        exercise_id: row.exercise_id ?? null,
        exercise_name: name,
        category: row.category || "other",
        target_sets: row.target_sets ?? 3,
        notes:
          row.notes != null && String(row.notes).trim()
            ? String(row.notes).trim().slice(0, 500)
            : null,
      });

      await updateRoutine(routineId, {
        name: routine.name,
        day_of_week: routine.day_of_week,
        color: routine.color || "#3b82f6",
        exercises: existing,
      });
      return "added";
    },
    [user, routines, updateRoutine],
  );

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
      if (data) hydrateSessionClientState(data);
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

      // Sets are created on demand when the user logs (flexible order, unlimited sets).

      // Fetch the complete session with set logs
      const { data: completeSession } = await supabase
        .from("workout_sessions")
        .select("*, set_logs (*)")
        .eq("id", newSession.id)
        .single();

      setActiveSession(completeSession);
      return completeSession;
    },
    [user, today]
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
        clearSessionClientState(sessionId);
        // Update exercise history with the completed sets (always use fresh DB row)
        const { data: session } = await supabase
          .from("workout_sessions")
          .select("*, set_logs (*)")
          .eq("id", sessionId)
          .single();

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
        queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
        queryClient.invalidateQueries({ queryKey: ["todaySession"] });
        queryClient.invalidateQueries({ queryKey: ["historySessions"] });
        queryClient.invalidateQueries({ queryKey: ["exerciseLogs"] });
        queryClient.invalidateQueries({ queryKey: ["workoutSessionsForDate"] });
      }
    },
    [user, exerciseHistory, loadExerciseHistory, queryClient]
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

  /** Mark today's workout complete without logging sets; details can be added later on the summary screen. */
  const markTodayWorkoutDone = useCallback(
    async (routine = null) => {
      if (!user) return null;

      const { data: existingCompleted } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", today)
        .eq("status", "completed")
        .maybeSingle();

      if (existingCompleted?.id) {
        return getWorkoutSession(existingCompleted.id);
      }

      const wasAlreadyActive = activeSession?.status === "active";
      let session = wasAlreadyActive ? activeSession : null;

      if (!session) {
        const r = routine || getTodayRoutine();
        if (!r) return null;
        session = await startWorkoutSession(r);
      }

      if (!session?.id) return null;

      const planned = getTodayRoutine();
      let markDoneUndo = "reopen";
      if (!wasAlreadyActive && (!planned || planned.id !== session.routine_id)) {
        markDoneUndo = "delete";
      }

      const prevMeta =
        session.client_meta && typeof session.client_meta === "object" ? session.client_meta : {};
      await persistSessionClientMeta(session.id, { ...prevMeta, mark_done_undo: markDoneUndo });

      if (session.status === "active") {
        await completeWorkoutSession(session.id);
      }

      return getWorkoutSession(session.id);
    },
    [
      user,
      today,
      activeSession,
      getTodayRoutine,
      startWorkoutSession,
      completeWorkoutSession,
      getWorkoutSession,
      persistSessionClientMeta,
    ],
  );

  /** Reopen a completed session as in-progress (undo mark done / continue logging). */
  const reopenWorkoutSession = useCallback(
    async sessionId => {
      if (!user || !sessionId) return null;

      const { error } = await supabase
        .from("workout_sessions")
        .update({
          status: "active",
          completed_at: null,
        })
        .eq("id", sessionId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error reopening session:", error);
        return null;
      }

      const session = await getWorkoutSession(sessionId);
      if (session) {
        setActiveSession(session);
        hydrateSessionClientState(session);
      }

      queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
      queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
      queryClient.invalidateQueries({ queryKey: ["todaySession"] });
      queryClient.invalidateQueries({ queryKey: ["historySessions"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSessionsForDate", user.id] });
      queryClient.invalidateQueries({ queryKey: ["exerciseLogs"] });

      return session;
    },
    [user, getWorkoutSession, queryClient],
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

  /** Remove every set_log row for one exercise name in a session (+ local "added today" extras). */
  const deleteSessionExerciseByName = useCallback(
    async (sessionId, exerciseName) => {
      if (!user || !sessionId || !exerciseName) return false;
      const { error } = await supabase
        .from("set_logs")
        .delete()
        .eq("session_id", sessionId)
        .eq("exercise_name", exerciseName);

      if (error) {
        console.error("deleteSessionExerciseByName:", error);
        return false;
      }

      removeSessionExtra(sessionId, exerciseName);

      if (activeSession?.id === sessionId) {
        setActiveSession(prev => ({
          ...prev,
          set_logs: (prev.set_logs || []).filter(log => log.exercise_name !== exerciseName),
        }));
      }

      queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
      queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
      queryClient.invalidateQueries({ queryKey: ["todaySession"] });
      queryClient.invalidateQueries({ queryKey: ["historySessions"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSessionsForDate", user.id] });
      queryClient.invalidateQueries({ queryKey: ["exerciseLogs"] });
      return true;
    },
    [user, activeSession, queryClient]
  );

  /** Clear all logged sets for one exercise; keeps the exercise on the plan (and in extras). */
  const resetSessionExerciseLogs = useCallback(
    async (sessionId, exerciseName) => {
      if (!user || !sessionId || !exerciseName) return false;
      const { error } = await supabase
        .from("set_logs")
        .delete()
        .eq("session_id", sessionId)
        .eq("exercise_name", exerciseName);

      if (error) {
        console.error("resetSessionExerciseLogs:", error);
        return false;
      }

      if (activeSession?.id === sessionId) {
        setActiveSession(prev => ({
          ...prev,
          set_logs: (prev.set_logs || []).filter(log => log.exercise_name !== exerciseName),
        }));
      }

      queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
      queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
      queryClient.invalidateQueries({ queryKey: ["todaySession"] });
      queryClient.invalidateQueries({ queryKey: ["historySessions"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSessionsForDate", user.id] });
      queryClient.invalidateQueries({ queryKey: ["exerciseLogs"] });
      return true;
    },
    [user, activeSession, queryClient]
  );

  /** Rename all set_log rows (+ client extras map) from oldName → newName for a session. */
  const renameSessionExerciseByName = useCallback(
    async (sessionId, oldName, newName, category) => {
      if (!user || !sessionId || !oldName?.trim() || !newName?.trim() || oldName.trim() === newName.trim())
        return false;

      const trimmedNew = newName.trim();
      const updates = {
        exercise_name: trimmedNew,
        updated_at: new Date().toISOString(),
      };
      if (category != null && String(category).length) updates.category = category;

      const { error } = await supabase
        .from("set_logs")
        .update(updates)
        .eq("session_id", sessionId)
        .eq("exercise_name", oldName.trim());

      if (error) {
        console.error("renameSessionExerciseByName:", error);
        return false;
      }

      renameSessionExerciseClient(sessionId, oldName.trim(), trimmedNew);

      if (activeSession?.id === sessionId) {
        setActiveSession(prev => ({
          ...prev,
          set_logs: (prev.set_logs || []).map(log =>
            log.exercise_name === oldName.trim() ? { ...log, ...updates } : log
          ),
        }));
      }

      queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
      queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
      queryClient.invalidateQueries({ queryKey: ["todaySession"] });
      queryClient.invalidateQueries({ queryKey: ["historySessions"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSessionsForDate", user.id] });
      queryClient.invalidateQueries({ queryKey: ["exerciseLogs"] });
      return true;
    },
    [user, activeSession, queryClient]
  );

  /**
   * Add a new exercise to an in-progress session with completed placeholder sets (review/summary fixes).
   * Inserts rows + optional localStorage "added today" marker.
   */
  const seedCompletedExerciseSetsForSession = useCallback(
    async ({
      sessionId,
      exercise,
      targetSets = 3,
      markAddedToday = true,
    }) => {
      if (!user || !sessionId || !exercise?.name?.trim()) return false;
      const name = exercise.name.trim();
      const category = exercise.category || "other";

      const { data: clash, error: clashErr } = await supabase
        .from("set_logs")
        .select("id")
        .eq("session_id", sessionId)
        .eq("exercise_name", name)
        .limit(1);

      if (clashErr) {
        console.error("seedCompletedExerciseSetsForSession clash check:", clashErr);
        return false;
      }
      if (clash?.length) return false;

      const hist = exerciseHistory[name];
      const weight = Number(hist?.last_weight ?? 0);
      const reps = Number(hist?.last_reps ?? 10);
      const rows = [];
      for (let i = 1; i <= targetSets; i++) {
        rows.push({
          session_id: sessionId,
          user_id: user.id,
          exercise_name: name,
          category,
          set_number: i,
          weight,
          reps,
          is_completed: true,
          previous_weight: weight,
          previous_reps: reps,
        });
      }

      const { data: inserted, error } = await supabase.from("set_logs").insert(rows).select();

      if (error) {
        console.error("seedCompletedExerciseSetsForSession insert:", error);
        return false;
      }

      if (markAddedToday) {
        addSessionExtra(sessionId, {
          exercise_id: exercise.id ?? null,
          exercise_name: name,
          category,
          equipment: typeof exercise.equipment === "string" ? exercise.equipment : "",
          image_url: exercise.gif_url ?? exercise.image_url ?? null,
        });
      }

      if (activeSession?.id === sessionId) {
        setActiveSession(prev => ({
          ...prev,
          set_logs: [...(prev.set_logs || []), ...(inserted || [])],
        }));
      }

      queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
      queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
      queryClient.invalidateQueries({ queryKey: ["todaySession"] });
      queryClient.invalidateQueries({ queryKey: ["historySessions"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSessionsForDate", user.id] });
      queryClient.invalidateQueries({ queryKey: ["exerciseLogs"] });
      return true;
    },
    [user, exerciseHistory, activeSession, queryClient]
  );

  /** Append one set row for an exercise in an active session */
  const addSetLog = useCallback(
    async ({ sessionId, exerciseName, category }) => {
      if (!user) return null;

      const { data: rows, error: fetchErr } = await supabase
        .from("set_logs")
        .select("set_number, weight, reps, previous_weight, previous_reps")
        .eq("session_id", sessionId)
        .eq("exercise_name", exerciseName);

      if (fetchErr) {
        console.error("addSetLog fetch:", fetchErr);
        return null;
      }

      const maxNum = rows?.length ? Math.max(...rows.map(r => r.set_number)) : 0;
      const last = rows?.length
        ? [...rows].sort((a, b) => b.set_number - a.set_number)[0]
        : null;

      const hist = exerciseHistory[exerciseName];
      const weight = Number(last?.weight ?? hist?.last_weight ?? 0);
      const reps = Number(last?.reps ?? hist?.last_reps ?? 10);
      const previousWeight = last?.previous_weight ?? hist?.last_weight ?? weight;
      const previousReps = last?.previous_reps ?? hist?.last_reps ?? reps;

      const { data: inserted, error } = await supabase
        .from("set_logs")
        .insert({
          session_id: sessionId,
          user_id: user.id,
          exercise_name: exerciseName,
          category: category || "other",
          set_number: maxNum + 1,
          weight,
          reps,
          is_completed: false,
          previous_weight: previousWeight,
          previous_reps: previousReps,
        })
        .select()
        .single();

      if (error) {
        console.error("addSetLog insert:", error);
        return null;
      }

      if (activeSession?.id === sessionId) {
        setActiveSession(prev => ({
          ...prev,
          set_logs: [...(prev.set_logs || []), inserted],
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
      queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
      queryClient.invalidateQueries({ queryKey: ["todaySession"] });
      queryClient.invalidateQueries({ queryKey: ["historySessions"] });

      return inserted;
    },
    [user, exerciseHistory, activeSession, queryClient]
  );

  // Delete a full workout session and its set logs (abandon in-progress or remove from history)
  const deleteWorkoutSession = useCallback(
    async (sessionId) => {
      if (!user) return false;
      await supabase.from("set_logs").delete().eq("session_id", sessionId);
      const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);
      if (!error) {
        clearSessionClientState(sessionId);
        setActiveSession(prev => (prev?.id === sessionId ? null : prev));
        queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
        queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
        queryClient.invalidateQueries({ queryKey: ["todaySession"] });
        queryClient.invalidateQueries({ queryKey: ["historySessions"] });
        queryClient.invalidateQueries({ queryKey: ["workoutSessionsForDate", user.id] });
        queryClient.invalidateQueries({ queryKey: ["exerciseLogs"] });
        return true;
      }
      return false;
    },
    [user, queryClient]
  );

  /** Undo mark done — reopens in-progress workouts or removes ad-hoc picker sessions. */
  const undoTodayWorkoutDone = useCallback(
    async sessionId => {
      if (!user || !sessionId) return null;

      const session = await getWorkoutSession(sessionId);
      if (!session) return null;

      const meta =
        session.client_meta && typeof session.client_meta === "object" ? session.client_meta : {};
      const hasLoggedSets = (session.set_logs || []).some(l => l.is_completed);
      let undoMode = meta.mark_done_undo;
      if (!undoMode) {
        const planned = getTodayRoutine();
        undoMode =
          !hasLoggedSets && (!planned || planned.id !== session.routine_id) ? "delete" : "reopen";
      }

      if (undoMode === "delete" && !hasLoggedSets) {
        const ok = await deleteWorkoutSession(sessionId);
        return ok ? { deleted: true } : null;
      }

      const reopened = await reopenWorkoutSession(sessionId);
      if (reopened) {
        const nextMeta = { ...meta };
        delete nextMeta.mark_done_undo;
        await persistSessionClientMeta(sessionId, nextMeta);
        return { deleted: false, session: reopened };
      }
      return null;
    },
    [
      user,
      getWorkoutSession,
      getTodayRoutine,
      deleteWorkoutSession,
      reopenWorkoutSession,
      persistSessionClientMeta,
    ],
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

    if (!uid) {
      initUserIdRef.current = null;
      setIsLoading(false);
      return;
    }

    if (uid === initUserIdRef.current) return;
    initUserIdRef.current = uid;

    setIsLoading(true);

    async function loadInitData() {
      try {
        const { data, error } = await supabase.rpc("get_user_init_data", {
          p_today: today,
        });

        if (error) throw error;

        setExercises(prepareExerciseCatalog(data.exercises || []));

        if (data.user_settings) {
          const { merged: mediaOverrides, needsServerBackfill: backfillMediaOverrides } =
            reconcileExerciseMediaOverrides(uid, data.user_settings.exercise_media_overrides);

          setSettings({ ...data.user_settings, exercise_media_overrides: mediaOverrides });

          if (backfillMediaOverrides) {
            void supabase
              .from("user_settings")
              .update({ exercise_media_overrides: mediaOverrides })
              .eq("user_id", uid);
          }

          const serverRest = data.user_settings.routine_rest_days;
          if (!serverRest || Object.keys(serverRest || {}).length === 0) {
            const localRest = readLocalRestMap(uid);
            if (Object.keys(localRest).length > 0) {
              void supabase
                .from("user_settings")
                .update({ routine_rest_days: localRest })
                .eq("user_id", uid);
              setSettings(prev => ({ ...prev, routine_rest_days: localRest }));
              cacheLocalRestMap(uid, localRest);
            }
          } else {
            cacheLocalRestMap(uid, serverRest);
          }

          const serverNav = data.user_settings.nav_config;
          if (!serverNav || Object.keys(serverNav || {}).length === 0) {
            const localNav = readLocalNavConfig();
            if (localNav.order || localNav.hidden?.length || Object.keys(localNav.labels || {}).length) {
              void supabase
                .from("user_settings")
                .update({ nav_config: localNav })
                .eq("user_id", uid);
              setSettings(prev => ({ ...prev, nav_config: localNav }));
              cacheLocalNavConfig(localNav);
            }
          } else {
            cacheLocalNavConfig(serverNav);
          }
        }

        const historyMap = {};
        for (const h of (data.exercise_history || [])) {
          historyMap[h.exercise_name] = h;
        }
        setExerciseHistory(historyMap);

        const { merged: mergedTrackables, toMigrate: activeDaysToMigrate } =
          mergeTrackablesActiveDays(data.trackables || [], uid);
        setTrackables(mergedTrackables);
        if (activeDaysToMigrate.length > 0) {
          await Promise.all(
            activeDaysToMigrate.map(row =>
              supabase
                .from("trackables")
                .update({ active_days: row.active_days })
                .eq("id", row.id),
            ),
          );
        }

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
        if (data.active_session) hydrateSessionClientState(data.active_session);

        let schedules = data.notification_schedules || [];
        const legacySchedules = readLegacyNotificationSchedules();
        if ((!schedules || schedules.length === 0) && Object.keys(legacySchedules).length > 0) {
          const migrated = await Promise.all(
            Object.entries(legacySchedules).map(async ([trackableId, sched]) => {
              const { data: row } = await supabase
                .from("notification_schedules")
                .upsert(
                  {
                    user_id: uid,
                    trackable_id: trackableId,
                    title: sched.title,
                    body: sched.body,
                    icon: sched.icon,
                    time: sched.time,
                    days: sched.days || [],
                    enabled: sched.enabled !== false,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "user_id,trackable_id" },
                )
                .select()
                .single();
              return row;
            }),
          );
          schedules = migrated.filter(Boolean);
        }
        setNotificationSchedules(schedules);
        NotificationService.setUserId(uid);
        NotificationService.setSchedulesFromServer(schedules, uid);

        const localEventSettings = readLocalEventSettings();
        const eventTypesRaw = data.event_types || [];
        const eventTypesNeedingMigration = eventTypesRaw.filter(et => localEventSettings[et.id]);
        if (eventTypesNeedingMigration.length > 0) {
          await Promise.all(
            eventTypesNeedingMigration.map(et => {
              const local = localEventSettings[et.id];
              return supabase
                .from("event_types")
                .update({
                  track_graph: local.track_graph || false,
                  need_value: local.need_value || false,
                  need_notes: local.need_notes || false,
                })
                .eq("id", et.id);
            }),
          );
        }

        const processedEvents = (eventTypesNeedingMigration.length > 0
          ? eventTypesRaw.map(et => {
              const local = localEventSettings[et.id];
              if (!local) return et;
              return {
                ...et,
                track_graph: local.track_graph || false,
                need_value: local.need_value || false,
                need_notes: local.need_notes || false,
              };
            })
          : eventTypesRaw
        ).map(eventType => {
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
      } finally {
        setIsLoading(false);
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

  /** Sessions for a single calendar day (Log page, history). */
  const getWorkoutSessionsForDate = useCallback(
    async dateStr => {
      if (!dateStr) return [];
      return getWorkoutSessions(dateStr, dateStr);
    },
    [getWorkoutSessions]
  );

  /**
   * Start (or resume) an active workout session for a specific date.
   * Past dates do not replace `activeSession` for today so Today stays correct.
   * @param {string} dateStr YYYY-MM-DD
   * @param {object|null} routine Planned routine row or null for a custom/open workout
   */
  const startWorkoutSessionForDate = useCallback(
    async (dateStr, routine) => {
      if (!user || !dateStr) return null;

      const { data: existing } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", dateStr)
        .eq("status", "active")
        .maybeSingle();

      if (existing) {
        const { data: session } = await supabase
          .from("workout_sessions")
          .select("*, set_logs (*)")
          .eq("id", existing.id)
          .maybeSingle();
        if (session && dateStr === today) {
          setActiveSession(session);
        }
        queryClient.invalidateQueries({ queryKey: ["workoutSessionsForDate", user.id] });
        return session;
      }

      const routineName = routine?.name?.trim() || "Custom workout";
      const routineId = routine?.id ?? null;

      const { data: newSession, error } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          routine_id: routineId,
          routine_name: routineName,
          date: dateStr,
          status: "active",
          current_exercise_index: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating session for date:", error);
        return null;
      }

      const { data: completeSession } = await supabase
        .from("workout_sessions")
        .select("*, set_logs (*)")
        .eq("id", newSession.id)
        .single();

      if (completeSession && dateStr === today) {
        setActiveSession(completeSession);
      }

      queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
      queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
      queryClient.invalidateQueries({ queryKey: ["todaySession"] });
      queryClient.invalidateQueries({ queryKey: ["historySessions"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSessionsForDate", user.id] });

      return completeSession;
    },
    [user, today, queryClient]
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
    async (foodItemId, secondArg = 1) => {
      if (!user) return;

      const opts =
        secondArg !== null && typeof secondArg === "object" && !Array.isArray(secondArg)
          ? { quantity: secondArg.quantity ?? 1, date: secondArg.date ?? today }
          : { quantity: Number(secondArg) || 1, date: today };

      const targetDate = opts.date;
      const forToday = targetDate === today;

      let existing = forToday ? todayFoodEntries[foodItemId] : null;
      if (!forToday) {
        const { data } = await supabase
          .from("food_entries")
          .select("*")
          .eq("user_id", user.id)
          .eq("food_item_id", foodItemId)
          .eq("date", targetDate)
          .maybeSingle();
        existing = data;
      }

      if (existing) {
        const { error } = await supabase.from("food_entries").delete().eq("id", existing.id);

        if (!error && forToday) {
          setTodayFoodEntries(prev => {
            const updated = { ...prev };
            delete updated[foodItemId];
            return updated;
          });
        }
      } else {
        const item = foodItems.find(f => f.id === foodItemId);
        const q = normalizeFoodQuantity(opts.quantity, item);
        const { data, error } = await supabase
          .from("food_entries")
          .insert({
            user_id: user.id,
            food_item_id: foodItemId,
            date: targetDate,
            quantity: q,
            is_completed: true,
          })
          .select()
          .single();

        if (!error && data && forToday) {
          setTodayFoodEntries(prev => ({
            ...prev,
            [foodItemId]: data,
          }));
        }
      }

      queryClient.invalidateQueries({ queryKey: ["foodEntries"] });
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    },
    [user, today, todayFoodEntries, queryClient, foodItems]
  );

  const updateFoodEntryQuantity = useCallback(
    async (foodItemId, quantity, entryDate = today) => {
      if (!user) return;

      const item = foodItems.find(f => f.id === foodItemId);
      const q = normalizeFoodQuantity(quantity, item);
      const forToday = entryDate === today;

      let existing = forToday ? todayFoodEntries[foodItemId] : null;
      if (!forToday) {
        const { data } = await supabase
          .from("food_entries")
          .select("*")
          .eq("user_id", user.id)
          .eq("food_item_id", foodItemId)
          .eq("date", entryDate)
          .maybeSingle();
        existing = data;
      }

      if (existing) {
        const { error } = await supabase
          .from("food_entries")
          .update({ quantity: q })
          .eq("id", existing.id);

        if (!error && forToday) {
          setTodayFoodEntries(prev => ({
            ...prev,
            [foodItemId]: { ...existing, quantity: q },
          }));
        }
      } else {
        const { data, error } = await supabase
          .from("food_entries")
          .insert({
            user_id: user.id,
            food_item_id: foodItemId,
            date: entryDate,
            quantity: q,
            is_completed: true,
          })
          .select()
          .single();

        if (!error && data && forToday) {
          setTodayFoodEntries(prev => ({
            ...prev,
            [foodItemId]: data,
          }));
        }
      }

      queryClient.invalidateQueries({ queryKey: ["foodEntries"] });
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    },
    [user, today, todayFoodEntries, queryClient, foodItems]
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

  // Update settings handled by useWorkoutSettings hook

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
    const redirectTo =
      typeof window !== "undefined" ? getAuthRedirectUrl() : undefined;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { data, error };
  }, []);

  const updatePassword = useCallback(async newPassword => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (typeof window === "undefined") {
      return { error: new Error("Google sign-in is only available in the browser.") };
    }
    try {
      const redirectTo = getAuthRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          // Ask Google to show the account picker (saved profiles + add account).
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (error) {
        console.error("Google login error:", error.message);
        return { error };
      }
      return { error: null, data };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error("Google login error:", err);
      return { error: err };
    }
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
        getWorkoutSessionsForDate,
        startWorkoutSessionForDate,
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
        notificationSchedules,
        upsertNotificationSchedule,
        removeNotificationSchedule,
        getNotificationSchedule,
        signIn,
        signInWithGoogle,
        signUp,
        resetPassword,
        updatePassword,
        signOut,
        // New routine functions
        createRoutine,
        updateRoutine,
        getTodayRoutine,
        getRoutineForDay,
        appendExerciseToRoutine,
        // New session functions
        startWorkoutSession,
        updateSetLog,
        completeWorkoutSession,
        markTodayWorkoutDone,
        reopenWorkoutSession,
        undoTodayWorkoutDone,
        getWorkoutSession,
        getTodaySession,
        updateSessionExerciseIndex,
        deleteSetLog,
        deleteSessionExerciseByName,
        resetSessionExerciseLogs,
        renameSessionExerciseByName,
        seedCompletedExerciseSetsForSession,
        addSetLog,
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

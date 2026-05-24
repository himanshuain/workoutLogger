import { useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  addSessionExtra,
  clearSessionClientState,
  hydrateSessionClientState,
  removeSessionExtra,
  renameSessionExerciseClient,
  setSessionMetaPersistCallback,
} from "@/lib/workoutSessionClient";

/** Workout session lifecycle + set logs extracted from WorkoutContext. */
export function useWorkoutSessions({
  user,
  today,
  queryClient,
  exerciseHistory,
  activeSession,
  setActiveSession,
  loadExerciseHistory,
  getTodayRoutine,
}) {
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
        .maybeSingle();

      setActiveSession(data || null);
      if (data) hydrateSessionClientState(data);
    } catch {
      setActiveSession(null);
    }
  }, [user, today, setActiveSession]);

  const startWorkoutSession = useCallback(
    async routine => {
      if (!user) return null;

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

      const { data: completeSession } = await supabase
        .from("workout_sessions")
        .select("*, set_logs (*)")
        .eq("id", newSession.id)
        .single();

      setActiveSession(completeSession);
      return completeSession;
    },
    [user, today, setActiveSession],
  );

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
    [user, activeSession, setActiveSession],
  );

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
        const { data: session } = await supabase
          .from("workout_sessions")
          .select("*, set_logs (*)")
          .eq("id", sessionId)
          .single();

        if (session && session.set_logs) {
          const exerciseMap = {};

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
                log.weight,
              );
            });

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

        queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
        queryClient.invalidateQueries({ queryKey: ["recentSessions"] });
        queryClient.invalidateQueries({ queryKey: ["todaySession"] });
        queryClient.invalidateQueries({ queryKey: ["historySessions"] });
        queryClient.invalidateQueries({ queryKey: ["exerciseLogs"] });
        queryClient.invalidateQueries({ queryKey: ["workoutSessionsForDate"] });
      }
    },
    [user, exerciseHistory, loadExerciseHistory, queryClient, setActiveSession],
  );

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
    [user],
  );

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
    [user, getWorkoutSession, queryClient, setActiveSession],
  );

  const deleteSetLog = useCallback(
    async setLogId => {
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
    [user, activeSession, queryClient, setActiveSession],
  );

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
    [user, activeSession, queryClient, setActiveSession],
  );

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
    [user, activeSession, queryClient, setActiveSession],
  );

  const renameSessionExerciseByName = useCallback(
    async (sessionId, oldName, newName, category) => {
      if (
        !user ||
        !sessionId ||
        !oldName?.trim() ||
        !newName?.trim() ||
        oldName.trim() === newName.trim()
      )
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
            log.exercise_name === oldName.trim() ? { ...log, ...updates } : log,
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
    [user, activeSession, queryClient, setActiveSession],
  );

  const seedCompletedExerciseSetsForSession = useCallback(
    async ({ sessionId, exercise, targetSets = 3, markAddedToday = true }) => {
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
    [user, exerciseHistory, activeSession, queryClient, setActiveSession],
  );

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
      const last = rows?.length ? [...rows].sort((a, b) => b.set_number - a.set_number)[0] : null;

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
    [user, exerciseHistory, activeSession, queryClient, setActiveSession],
  );

  const deleteWorkoutSession = useCallback(
    async sessionId => {
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
    [user, queryClient, setActiveSession],
  );

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
    [user, queryClient],
  );

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
    [user, activeSession, setActiveSession],
  );

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
    [user],
  );

  const getWorkoutSessionsForDate = useCallback(
    async dateStr => {
      if (!dateStr) return [];
      return getWorkoutSessions(dateStr, dateStr);
    },
    [getWorkoutSessions],
  );

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
    [user, today, queryClient, setActiveSession],
  );

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

    return (data.set_logs || []).filter(log => log.is_completed);
  }, [user, today]);

  return {
    persistSessionClientMeta,
    loadActiveSession,
    startWorkoutSession,
    updateSetLog,
    completeWorkoutSession,
    getWorkoutSession,
    markTodayWorkoutDone,
    reopenWorkoutSession,
    deleteSetLog,
    deleteSessionExerciseByName,
    resetSessionExerciseLogs,
    renameSessionExerciseByName,
    seedCompletedExerciseSetsForSession,
    addSetLog,
    deleteWorkoutSession,
    undoTodayWorkoutDone,
    updateSetLogData,
    getTodaySession,
    updateSessionExerciseIndex,
    getWorkoutSessions,
    getWorkoutSessionsForDate,
    startWorkoutSessionForDate,
    getTodaySetLogs,
  };
}

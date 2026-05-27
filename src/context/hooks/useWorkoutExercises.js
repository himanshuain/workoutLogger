import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { prepareExerciseCatalog, normalizeExerciseName } from "@/lib/exerciseCatalog";
import { reconcileExerciseMediaOverrides } from "@/lib/exerciseMediaOverridesStorage";

/** Exercise catalog, history, and legacy logging extracted from WorkoutContext. */
export function useWorkoutExercises(
  user,
  today,
  setExercises,
  exerciseHistory,
  setExerciseHistory,
  setSettings,
  queryClient,
) {
  const loadExercises = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("exercises").select("*").order("name");

      if (!error && data) {
        setExercises(prepareExerciseCatalog(data));
      }
    } catch (err) {
      console.error("Error loading exercises:", err);
    }
  }, [setExercises]);

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
  }, [user, setExerciseHistory]);

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
  }, [user, setSettings]);

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
    [user, today, exerciseHistory, setExerciseHistory, queryClient],
  );

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
    [user],
  );

  const createCustomExercise = useCallback(
    async ({ name, category = "other", equipment = "" }) => {
      if (!user) return null;

      const trimmed = String(name || "").trim();
      if (!trimmed) return null;

      const normalizedCategory = String(category || "other").toLowerCase();
      const equipmentDisplay = String(equipment || "").trim();
      const metadata = equipmentDisplay ? { equipment_display: equipmentDisplay } : {};

      try {
        const { data: userRows, error: fetchError } = await supabase
          .from("exercises")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_predefined", false);

        if (fetchError) {
          console.error("Error loading custom exercises:", fetchError);
          return null;
        }

        const nameKey = normalizeExerciseName(trimmed);
        const existing = (userRows || []).find(
          row => normalizeExerciseName(row.name) === nameKey,
        );

        if (existing) {
          const needsUpdate =
            existing.category !== normalizedCategory ||
            (equipmentDisplay &&
              existing.metadata?.equipment_display !== equipmentDisplay);

          if (needsUpdate) {
            const { data: updated, error: updateError } = await supabase
              .from("exercises")
              .update({
                category: normalizedCategory,
                metadata: { ...(existing.metadata || {}), ...metadata },
              })
              .eq("id", existing.id)
              .eq("user_id", user.id)
              .select()
              .single();

            if (updateError) {
              console.error("Error updating custom exercise:", updateError);
              return existing;
            }

            await loadExercises();
            return updated;
          }

          return existing;
        }

        const { data, error } = await supabase
          .from("exercises")
          .insert({
            user_id: user.id,
            name: trimmed,
            category: normalizedCategory,
            is_predefined: false,
            metadata,
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating custom exercise:", error);
          return null;
        }

        await loadExercises();
        return data;
      } catch (err) {
        console.error("Error creating custom exercise:", err);
        return null;
      }
    },
    [user, loadExercises],
  );

  return {
    loadExercises,
    loadExerciseHistory,
    loadSettings,
    logExercise,
    getExerciseLogs,
    getTodayExerciseLogs,
    deleteExerciseLog,
    createCustomExercise,
  };
}

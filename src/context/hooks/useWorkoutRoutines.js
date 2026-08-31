import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { buildRoutineExercisesJson } from "@/context/utils/buildRoutineExercisesJson";

/** Workout routine CRUD extracted from WorkoutContext. */
export function useWorkoutRoutines(user, routines, setRoutines) {
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
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const sortedData = data.map(routine => ({
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
  }, [user, setRoutines]);

  const createRoutine = useCallback(
    async routineData => {
      if (!user) return null;

      const { exercises: routineExercises, ...routine } = routineData;

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
    [user, loadRoutines],
  );

  const updateRoutine = useCallback(
    async (routineId, routineData) => {
      if (!user) return;

      const { exercises: routineExercises, ...routine } = routineData;

      await supabase
        .from("workout_routines")
        .update({
          name: routine.name,
          day_of_week: routine.day_of_week,
          color: routine.color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", routineId);

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
    [user, loadRoutines],
  );

  /** @deprecated Day-based planning removed; always null. Use routine picker on Today. */
  const getTodayRoutine = useCallback(() => null, []);

  /** @param {number} dayOfWeek 0=Sun … 6=Sat — legacy routines only */
  const getRoutineForDay = useCallback(
    dayOfWeek => routines.find(r => r.day_of_week === dayOfWeek) || null,
    [routines],
  );

  const getRoutineById = useCallback(
    routineId => (routineId ? routines.find(r => r.id === routineId) ?? null : null),
    [routines],
  );

  const deleteRoutine = useCallback(
    async routineId => {
      if (!user || !routineId) return false;

      const { error } = await supabase
        .from("workout_routines")
        .delete()
        .eq("id", routineId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting routine:", error);
        return false;
      }

      setRoutines(prev => prev.filter(r => r.id !== routineId));
      return true;
    },
    [user, setRoutines],
  );

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
        is_pinned: Boolean(ex.is_pinned),
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
        is_pinned: Boolean(row.is_pinned),
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

  return {
    loadRoutines,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    getTodayRoutine,
    getRoutineForDay,
    getRoutineById,
    appendExerciseToRoutine,
  };
}

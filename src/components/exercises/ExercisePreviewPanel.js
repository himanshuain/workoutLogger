import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useResolvedExerciseMediaSlides } from "@/hooks/useResolvedExerciseMedia";
import ExerciseMediaCarousel from "@/components/exercises/ExerciseMediaCarousel";
import ExerciseDrawerMediaActions from "@/components/exercises/ExerciseDrawerMediaActions";
import RoutineDayPickerDialog from "@/components/exercises/RoutineDayPickerDialog";
import { getExerciseEquipment } from "@/lib/exerciseMedia";
import { addSessionExtra } from "@/lib/workoutSessionClient";
import {
  getRoutinePlannerReturnHref,
  getSessionAwareCopy,
  getPostAddExerciseNavigatePath,
  getQueryParamString,
} from "@/lib/workoutNavigation";
import { toast } from "sonner";
import { CirclePlus, ListChecks } from "lucide-react";
import {
  buildExerciseCatalogByName,
  resolveCatalogVariations,
} from "@/lib/exerciseCatalog";
import { useExerciseMediaOverrides } from "@/hooks/useExerciseMediaOverrides";

/**
 * Shared preview: hero media, title (optional), equipment, add actions.
 * @param {{ hideHeading?: boolean; variant?: "default" | "sheet" }} props — sheet: compact media + no nested scroll in bottom drawer
 */
export default function ExercisePreviewPanel({
  exercise,
  isDarkMode,
  hideHeading = false,
  hideActions = false,
  variant = "default",
  onOpenExercise,
}) {
  const router = useRouter();
  const {
    exercises,
    getRoutineForDay,
    updateRoutine,
    createRoutine,
    getWorkoutSession,
    seedCompletedExerciseSetsForSession,
    appendExerciseToRoutine,
    settings,
    updateSettings,
  } = useWorkout();
  const mediaOverrides = useExerciseMediaOverrides();
  const mediaUrls = useResolvedExerciseMediaSlides(exercise, exercises, mediaOverrides);
  const equipmentLine = useMemo(() => getExerciseEquipment(exercise), [exercise]);
  const plannerNotes =
    typeof exercise?.metadata?.planner_notes === "string"
      ? exercise.metadata.planner_notes.trim()
      : "";
  const catalogByName = useMemo(() => buildExerciseCatalogByName(exercises), [exercises]);
  const variations = useMemo(
    () => resolveCatalogVariations(exercise, catalogByName),
    [exercise, catalogByName],
  );
  const [session, setSession] = useState(null);
  const [routinePickerOpen, setRoutinePickerOpen] = useState(false);

  // Load session context for session-aware button copy
  useEffect(() => {
    async function loadSession() {
      const sessionId = router.query.sessionId;
      if (typeof sessionId === "string" && getWorkoutSession) {
        try {
          const sessionData = await getWorkoutSession(sessionId);
          setSession(sessionData);
        } catch (error) {
          console.error('Error loading session:', error);
          setSession(null);
        }
      } else {
        setSession(null);
      }
    }
    loadSession();
  }, [router.query.sessionId, getWorkoutSession]);

  const handleAddToToday = async () => {
    const sessionId = router.query.sessionId;
    if (typeof sessionId !== "string") {
      const copy = getSessionAwareCopy(session);
      toast.error(copy.errorMessage);
      return;
    }
    if (!exercise) return;

    const addReturn = getQueryParamString(router.query, "addReturn").trim().toLowerCase();
    if (addReturn === "summary") {
      const seeded = await seedCompletedExerciseSetsForSession({
        sessionId,
        exercise: {
          id: exercise.id,
          name: exercise.name,
          category: exercise.category || "other",
          equipment: getExerciseEquipment(exercise),
          gif_url: exercise.gif_url,
          image_url: exercise.image_url,
        },
        targetSets: 3,
        markAddedToday: false,
      });
      if (!seeded) {
        toast.error("Could not add — already logged in this workout.");
        return;
      }
    }

    const routineRow = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      category: exercise.category || "other",
      target_sets: 3,
    };

    if (session?.routine_id) {
      const result = await appendExerciseToRoutine(session.routine_id, routineRow);
      if (result === null) {
        toast.error("Could not add to routine");
        return;
      }
      if (result === "exists") {
        toast.message("Already in this routine");
      } else {
        const copy = getSessionAwareCopy(session);
        toast.success(copy.addedMessage);
      }
    } else {
      addSessionExtra(sessionId, {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        category: exercise.category || "other",
        equipment: getExerciseEquipment(exercise),
        image_url: mediaUrls[0] ?? exercise.image_url ?? exercise.gif_url ?? null,
      });
      const copy = getSessionAwareCopy(session);
      toast.success(copy.addedMessage);
    }

    await router.replace(getPostAddExerciseNavigatePath(sessionId, router.query));
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const addExerciseToRoutineDay = async dayNum => {
    if (!exercise) return false;

    const row = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      category: exercise.category || "other",
      target_sets: 3,
    };

    const routine = getRoutineForDay(dayNum);
    if (!routine) {
      await createRoutine({
        name: `${dayNames[dayNum] ?? "Day"} workout`,
        day_of_week: dayNum,
        color: "#3b82f6",
        exercises: [row],
      });
      toast.success("Routine created with exercise");
      return true;
    }

    const existing = (routine.routine_exercises || []).map(ex => ({
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      category: ex.category || "other",
      target_sets: ex.target_sets || 3,
    }));
    if (existing.some(e => e.exercise_name === exercise.name)) {
      toast.message("Already in routine");
      return false;
    }
    existing.push(row);
    await updateRoutine(routine.id, {
      name: routine.name,
      day_of_week: routine.day_of_week,
      color: routine.color || "#3b82f6",
      exercises: existing,
    });
    toast.success("Added to routine");
    return true;
  };

  const handleAddToRoutine = async () => {
    const sessionId = router.query.sessionId;
    if (typeof sessionId === "string" && session?.routine_id && exercise) {
      const result = await appendExerciseToRoutine(session.routine_id, {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        category: exercise.category || "other",
        target_sets: 3,
      });
      if (result === null) {
        toast.error("Could not add to routine");
        return;
      }
      if (result === "exists") {
        toast.message("Already in this routine");
      } else {
        toast.success("Added to routine");
      }
      await router.replace(getPostAddExerciseNavigatePath(sessionId, router.query));
      return;
    }

    const routineId =
      typeof router.query.routineId === "string"
        ? router.query.routineId
        : Array.isArray(router.query.routineId)
          ? router.query.routineId[0]
          : "";
    if (routineId) {
      const result = await appendExerciseToRoutine(routineId, {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        category: exercise.category || "other",
        target_sets: 3,
      });
      if (result === null) {
        toast.error("Could not add to split");
        return;
      }
      if (result === "exists") {
        toast.message("Already in this split");
      } else {
        toast.success("Added to split");
      }
      const href = getRoutinePlannerReturnHref(router.query);
      if (href) await router.replace(href);
      return;
    }

    const day = router.query.routineDay;
    if (typeof day !== "string") {
      setRoutinePickerOpen(true);
      return;
    }
    const dayNum = parseInt(day, 10);
    if (Number.isNaN(dayNum)) return;

    const ok = await addExerciseToRoutineDay(dayNum);
    if (!ok) return;
    const href = getRoutinePlannerReturnHref(router.query);
    if (href) await router.replace(href);
  };

  if (!exercise) return null;

  const isSheet = variant === "sheet";

  return (
    <div
      className={
        isSheet
          ? "flex flex-col gap-4 pb-2"
          : hideHeading
            ? "pb-2"
            : "pb-6"
      }
    >
      <ExerciseMediaCarousel
        urls={mediaUrls}
        alt={exercise.name}
        isDarkMode={isDarkMode}
        compact={isSheet}
        className={isSheet ? "shrink-0" : undefined}
      />
      <ExerciseDrawerMediaActions
        exercise={exercise}
        exerciseName={exercise.name}
        allExercises={exercises}
        isDarkMode={isDarkMode}
        mediaOverrides={mediaOverrides}
        updateSettings={updateSettings}
        compact={isSheet}
      />

      {!hideHeading && (
        <h1
          className={`mt-8 text-2xl font-semibold tracking-tight ${
            isDarkMode ? "text-iron-50" : "text-slate-900"
          }`}
        >
          {exercise.name}
        </h1>
      )}
      <p
        className={`text-sm shrink-0 ${
          hideHeading ? (isSheet ? "mt-0" : "mt-4") : "mt-2"
        } ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
      >
        <span className="capitalize">{exercise.category || "General"}</span>
        {equipmentLine ? ` · ${equipmentLine}` : ""}
      </p>
      {plannerNotes ? (
        <p
          className={`text-sm shrink-0 mt-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
        >
          {plannerNotes}
        </p>
      ) : null}

      {variations.length > 0 ? (
        <div className={`shrink-0 ${hideHeading ? (isSheet ? "mt-2" : "mt-4") : "mt-6"}`}>
          <p
            className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${
              isDarkMode ? "text-iron-500" : "text-slate-500"
            }`}
          >
            Variations
          </p>
          <div className="flex flex-wrap gap-2">
            {variations.map(({ label, exercise: varEx }) => (
              <button
                key={label}
                type="button"
                disabled={!varEx || !onOpenExercise}
                onClick={() => varEx && onOpenExercise?.(varEx)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  varEx && onOpenExercise
                    ? isDarkMode
                      ? "border-iron-600 text-iron-200 active:bg-iron-800"
                      : "border-slate-300 text-slate-700 active:bg-slate-100"
                    : isDarkMode
                      ? "border-iron-800 text-iron-600 cursor-default"
                      : "border-slate-200 text-slate-400 cursor-default"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!hideActions ? (
      <div
        className={`shrink-0 ${hideHeading ? (isSheet ? "mt-2" : "mt-6") : "mt-10"} ${isSheet ? "space-y-2" : "space-y-3"}`}
      >
        <button
          type="button"
          onClick={handleAddToToday}
          className={`w-full rounded-card font-semibold inline-flex items-center justify-center gap-2 ${
            isSheet ? "py-3 text-[15px]" : "py-3.5"
          } ${isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"}`}
        >
          <CirclePlus className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden />
          {getSessionAwareCopy(session).addAction}
        </button>
        <button
          type="button"
          onClick={handleAddToRoutine}
          className={`w-full rounded-card font-semibold border inline-flex items-center justify-center gap-2 ${
            isSheet ? "py-3 text-[15px]" : "py-3.5"
          } ${
            isDarkMode ? "border-iron-700 text-iron-100" : "border-slate-300 text-slate-800"
          }`}
        >
          <ListChecks className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden />
          Add to routine
        </button>
      </div>
      ) : null}

      <RoutineDayPickerDialog
        open={routinePickerOpen}
        onOpenChange={setRoutinePickerOpen}
        isDarkMode={isDarkMode}
        getRoutineForDay={getRoutineForDay}
        onConfirm={async pickedDay => {
          const ok = await addExerciseToRoutineDay(pickedDay);
          if (ok) {
            const href = getRoutinePlannerReturnHref(router.query, pickedDay);
            if (href) await router.replace(href);
          }
          return ok;
        }}
      />
    </div>
  );
}

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useResolvedExerciseMediaSlides } from "@/hooks/useResolvedExerciseMedia";
import ExerciseMediaCarousel from "@/components/exercises/ExerciseMediaCarousel";
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

/**
 * Shared preview: hero media, title (optional), equipment, add actions.
 * @param {{ hideHeading?: boolean; variant?: "default" | "sheet" }} props — sheet: compact media + no nested scroll in bottom drawer
 */
export default function ExercisePreviewPanel({
  exercise,
  isDarkMode,
  hideHeading = false,
  variant = "default",
}) {
  const router = useRouter();
  const {
    exercises,
    getRoutineForDay,
    updateRoutine,
    createRoutine,
    getWorkoutSession,
    seedCompletedExerciseSetsForSession,
  } = useWorkout();
  const mediaUrls = useResolvedExerciseMediaSlides(exercise, exercises);
  const equipmentLine = useMemo(() => getExerciseEquipment(exercise), [exercise]);
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

    addSessionExtra(sessionId, {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      category: exercise.category || "other",
      equipment: getExerciseEquipment(exercise),
      image_url: mediaUrls[0] ?? exercise.image_url ?? exercise.gif_url ?? null,
    });

    const copy = getSessionAwareCopy(session);
    toast.success(copy.addedMessage);
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
          ? "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]"
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
          hideHeading ? (isSheet ? "mt-1" : "mt-4") : "mt-2"
        } ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
      >
        <span className="capitalize">{exercise.category || "General"}</span>
        {equipmentLine ? ` · ${equipmentLine}` : ""}
      </p>

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

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import ExerciseIcon from "@/components/ExerciseIcon";
import { useWorkout } from "@/context/WorkoutContext";
import { useResolvedExerciseMedia } from "@/hooks/useResolvedExerciseMedia";
import { exerciseImageUnoptimized, getExerciseEquipment } from "@/lib/exerciseMedia";
import { addSessionExtra } from "@/lib/workoutSessionClient";
import { getSessionAwareReturnPath, getSessionAwareCopy } from "@/lib/workoutNavigation";
import { toast } from "sonner";

/**
 * Shared preview: hero media, title (optional), equipment, add actions.
 * @param {{ hideHeading?: boolean }} props — hide name row when title is shown in a drawer header
 */
export default function ExercisePreviewPanel({ exercise, isDarkMode, hideHeading = false }) {
  const router = useRouter();
  const { getRoutineForDay, updateRoutine, createRoutine, getWorkoutSession } = useWorkout();
  const media = useResolvedExerciseMedia(exercise);
  const equipmentLine = useMemo(() => getExerciseEquipment(exercise), [exercise]);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    setMediaFailed(false);
  }, [exercise?.id, media]);

  // Load session context for session-aware copy and navigation
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
    
    addSessionExtra(sessionId, {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      category: exercise.category || "other",
      equipment: getExerciseEquipment(exercise),
      image_url: exercise.image_url || exercise.gif_url || null,
    });
    
    const copy = getSessionAwareCopy(session);
    toast.success(copy.addedMessage);
    
    // Navigate back to appropriate context
    try {
      const returnPath = await getSessionAwareReturnPath(sessionId, getWorkoutSession);
      router.push(returnPath);
    } catch (error) {
      console.error('Error determining return path:', error);
      router.push("/");
    }
  };

  const handleAddToRoutine = async () => {
    const day = router.query.routineDay;
    if (typeof day !== "string") {
      toast.error("Open Routine planner and pick a day first");
      router.push("/plan");
      return;
    }
    const dayNum = parseInt(day, 10);
    if (Number.isNaN(dayNum)) return;
    if (!exercise) return;

    const row = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      category: exercise.category || "other",
      target_sets: 3,
    };

    const routine = getRoutineForDay(dayNum);
    if (!routine) {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      await createRoutine({
        name: `${dayNames[dayNum] ?? "Day"} workout`,
        day_of_week: dayNum,
        color: "#3b82f6",
        exercises: [row],
      });
      toast.success("Routine created with exercise");
      router.push("/plan");
      return;
    }

    const existing = (routine.routine_exercises || []).map((ex) => ({
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      category: ex.category || "other",
      target_sets: ex.target_sets || 3,
    }));
    if (existing.some((e) => e.exercise_name === exercise.name)) {
      toast.message("Already in routine");
      return;
    }
    existing.push(row);
    await updateRoutine(routine.id, {
      name: routine.name,
      day_of_week: routine.day_of_week,
      color: routine.color || "#3b82f6",
      exercises: existing,
    });
    toast.success("Added to routine");
    router.push("/plan");
  };

  if (!exercise) return null;

  return (
    <div className={hideHeading ? "pb-2" : "pb-6"}>
      <div
        className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden flex items-center justify-center ${
          isDarkMode ? "bg-iron-900 text-iron-500" : "bg-slate-200 text-slate-400"
        }`}
      >
        {media && !mediaFailed ? (
          <Image
            src={media}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
            unoptimized={exerciseImageUnoptimized(media)}
            onError={() => setMediaFailed(true)}
          />
        ) : (
          <ExerciseIcon name={exercise.name} className="w-24 h-24 sm:w-32 sm:h-32" color="currentColor" />
        )}
      </div>

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
        className={`text-sm ${hideHeading ? "mt-4" : "mt-2"} ${
          isDarkMode ? "text-iron-400" : "text-slate-600"
        }`}
      >
        <span className="capitalize">{exercise.category || "General"}</span>
        {equipmentLine ? ` · ${equipmentLine}` : ""}
      </p>

      <div className={`space-y-3 ${hideHeading ? "mt-6" : "mt-10"}`}>
        <button
          type="button"
          onClick={handleAddToToday}
          className={`w-full py-3.5 rounded-2xl font-semibold ${
            isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
          }`}
        >
          {getSessionAwareCopy(session).addAction}
        </button>
        <button
          type="button"
          onClick={handleAddToRoutine}
          className={`w-full py-3.5 rounded-2xl font-semibold border ${
            isDarkMode ? "border-iron-700 text-iron-100" : "border-slate-300 text-slate-800"
          }`}
        >
          Add to routine
        </button>
      </div>
    </div>
  );
}

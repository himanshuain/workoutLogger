import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import ExerciseIcon from "@/components/ExerciseIcon";
import { useWorkout } from "@/context/WorkoutContext";
import { useResolvedExerciseMedia } from "@/hooks/useResolvedExerciseMedia";
import { exerciseImageUnoptimized, getExerciseEquipment } from "@/lib/exerciseMedia";
import { addSessionExtra } from "@/lib/workoutSessionClient";
import { toast } from "sonner";

/**
 * Shared preview: hero media, title (optional), equipment, add actions.
 * @param {{ hideHeading?: boolean }} props — hide name row when title is shown in a drawer header
 */
export default function ExercisePreviewPanel({ exercise, isDarkMode, hideHeading = false }) {
  const router = useRouter();
  const { getRoutineForDay, updateRoutine, createRoutine } = useWorkout();
  const media = useResolvedExerciseMedia(exercise);
  const equipmentLine = useMemo(() => getExerciseEquipment(exercise), [exercise]);
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    setMediaFailed(false);
  }, [exercise?.id, media]);

  const handleAddToToday = () => {
    const sessionId = router.query.sessionId;
    if (typeof sessionId !== "string") {
      toast.error("Start a workout from Today first");
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
    toast.success("Added to today");
    router.push("/");
  };

  const handleAddToRoutine = async () => {
    const day = router.query.routineDay;
    if (typeof day !== "string") {
      toast.error("Open Routine planner and pick a day first");
      router.push("/routine");
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
      router.push("/routine");
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
    router.push("/routine");
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
          Add to today
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

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import RoutineDayPickerDialog from "@/components/exercises/RoutineDayPickerDialog";
import { addSessionExtra } from "@/lib/workoutSessionClient";
import {
  getRoutinePlannerReturnHref,
  getSessionAwareCopy,
  getPostAddExerciseNavigatePath,
  getQueryParamString,
} from "@/lib/workoutNavigation";
import { toast } from "sonner";
import { ArrowLeft, CirclePlus, ListChecks } from "lucide-react";

const MUSCLES = ["Chest", "Back", "Legs", "Arms", "Shoulders", "Core", "Other"];

export default function CustomExercisePage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const {
    user,
    getRoutineForDay,
    updateRoutine,
    createRoutine,
    getWorkoutSession,
    seedCompletedExerciseSetsForSession,
  } = useWorkout();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Chest");
  const [equipment, setEquipment] = useState("");
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

  const inputClass = `w-full rounded-card px-4 py-3.5 text-base outline-none ${
    isDarkMode
      ? "bg-iron-900 border border-iron-800 text-iron-100 placeholder:text-iron-600"
      : "bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400"
  }`;

  const handleAddToToday = async () => {
    const sessionId = router.query.sessionId;
    if (typeof sessionId !== "string") {
      const copy = getSessionAwareCopy(session);
      toast.error(copy.errorMessage);
      return;
    }
    if (!name.trim()) return;

    const trimmed = name.trim();
    const lowered = category.toLowerCase();

    const addReturn = getQueryParamString(router.query, "addReturn").trim().toLowerCase();
    if (addReturn === "summary") {
      const seeded = await seedCompletedExerciseSetsForSession({
        sessionId,
        exercise: {
          id: null,
          name: trimmed,
          category: lowered,
          equipment: equipment.trim(),
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
      exercise_id: null,
      exercise_name: trimmed,
      category: lowered,
      equipment: equipment.trim(),
    });

    const copy = getSessionAwareCopy(session);
    toast.success(copy.addedMessage);
    await router.replace(getPostAddExerciseNavigatePath(sessionId, router.query));
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const addCustomExerciseToRoutineDay = async dayNum => {
    if (Number.isNaN(dayNum) || !name.trim()) return false;
    const trimmed = name.trim();
    const row = {
      exercise_id: null,
      exercise_name: trimmed,
      category: category.toLowerCase(),
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
    if (existing.some(e => e.exercise_name === trimmed)) {
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
    if (!name.trim()) return;
    const day = router.query.routineDay;
    if (typeof day !== "string") {
      setRoutinePickerOpen(true);
      return;
    }
    const dayNum = parseInt(day, 10);
    if (Number.isNaN(dayNum)) return;
    const ok = await addCustomExerciseToRoutineDay(dayNum);
    if (!ok) return;
    const href = getRoutinePlannerReturnHref(router.query);
    if (href) await router.replace(href);
  };

  if (!user) {
    return null;
  }

  return (
    <div
      className={`min-h-screen px-5 pt-8 pb-12 ${isDarkMode ? "bg-iron-950" : "bg-slate-50"}`}
      style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}
    >
      <button
        type="button"
        onClick={() => router.back()}
        className={`text-sm font-medium mb-6 inline-flex items-center gap-2 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
      >
        <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
        Back
      </button>

      <h1 className={`text-2xl font-semibold ${isDarkMode ? "text-iron-50" : "text-slate-900"}`}>
        Custom exercise
      </h1>
      <p className={`mt-1 text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
        Lightweight entry — saved with your workout or routine.
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            Name
          </label>
          <input className={`mt-2 ${inputClass}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Landmine press" />
        </div>
        <div>
          <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            Muscle / group
          </label>
          <select
            className={`mt-2 ${inputClass}`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {MUSCLES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            Equipment (optional)
          </label>
          <input
            className={`mt-2 ${inputClass}`}
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="e.g. Cable"
          />
        </div>
      </div>

      <div className="mt-10 space-y-3">
        <button
          type="button"
          onClick={handleAddToToday}
          disabled={!name.trim()}
          className={`w-full py-4 rounded-card font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
            isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
          }`}
        >
          <CirclePlus className="w-5 h-5 shrink-0" aria-hidden />
          {getSessionAwareCopy(session).addAction}
        </button>
        <button
          type="button"
          onClick={handleAddToRoutine}
          disabled={!name.trim()}
          className={`w-full py-4 rounded-card font-semibold border disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
            isDarkMode ? "border-iron-700 text-iron-100" : "border-slate-300 text-slate-800"
          }`}
        >
          <ListChecks className="w-5 h-5 shrink-0" aria-hidden />
          Add to routine
        </button>
      </div>

      <RoutineDayPickerDialog
        open={routinePickerOpen}
        onOpenChange={setRoutinePickerOpen}
        isDarkMode={isDarkMode}
        getRoutineForDay={getRoutineForDay}
        onConfirm={async pickedDay => {
          const ok = await addCustomExerciseToRoutineDay(pickedDay);
          if (ok) {
            const href = getRoutinePlannerReturnHref(router.query, pickedDay);
            if (href) await router.replace(href);
          }
          return ok;
        }}
        disabled={!name.trim()}
      />
    </div>
  );
}

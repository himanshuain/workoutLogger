import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import { addSessionExtra } from "@/lib/workoutSessionClient";
import { getSessionAwareReturnPath, getSessionAwareCopy } from "@/lib/workoutNavigation";
import { toast } from "sonner";

const MUSCLES = ["Chest", "Back", "Legs", "Arms", "Shoulders", "Core", "Other"];

export default function CustomExercisePage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { user, getRoutineForDay, updateRoutine, createRoutine, getWorkoutSession } = useWorkout();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Chest");
  const [equipment, setEquipment] = useState("");
  const [session, setSession] = useState(null);

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

  const inputClass = `w-full rounded-2xl px-4 py-3.5 text-base outline-none ${
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
    
    addSessionExtra(sessionId, {
      exercise_id: null,
      exercise_name: name.trim(),
      category: category.toLowerCase(),
      equipment: equipment.trim(),
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
      toast.error("Pick a day in Routine planner first");
      router.push("/plan");
      return;
    }
    const dayNum = parseInt(day, 10);
    if (Number.isNaN(dayNum) || !name.trim()) return;
    const row = {
      exercise_id: null,
      exercise_name: name.trim(),
      category: category.toLowerCase(),
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
    if (existing.some((e) => e.exercise_name === name.trim())) {
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
        className={`text-sm font-medium mb-6 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
      >
        ← Back
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
          className={`w-full py-4 rounded-2xl font-semibold disabled:opacity-50 ${
            isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
          }`}
        >
          {getSessionAwareCopy(session).addAction}
        </button>
        <button
          type="button"
          onClick={handleAddToRoutine}
          disabled={!name.trim()}
          className={`w-full py-4 rounded-2xl font-semibold border disabled:opacity-50 ${
            isDarkMode ? "border-iron-700 text-iron-100" : "border-slate-300 text-slate-800"
          }`}
        >
          Add to routine
        </button>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import ExerciseAutocomplete from "@/components/ExerciseAutocomplete";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Plus,
  Dumbbell,
  Trash2,
  GripVertical,
  Calendar,
  ChevronRight,
  Check,
  X,
  Pencil,
  Minus,
} from "lucide-react";

const DAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const ROUTINE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#14b8a6",
  "#6366f1",
];

export default function Routines() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const {
    user,
    routines,
    exercises,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    isLoading,
  } = useWorkout();

  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [newRoutine, setNewRoutine] = useState({
    name: "",
    day_of_week: null,
    color: "#3b82f6",
    exercises: [],
  });

  // Group routines by day
  const routinesByDay = useMemo(() => {
    const grouped = {};
    DAYS.forEach((day) => {
      grouped[day.value] = routines.filter((r) => r.day_of_week === day.value);
    });
    grouped["unassigned"] = routines.filter((r) => r.day_of_week === null);
    return grouped;
  }, [routines]);

  const handleCreateRoutine = () => {
    setEditingRoutine(null);
    setNewRoutine({
      name: "",
      day_of_week: null,
      color: "#3b82f6",
      exercises: [],
    });
    setShowCreateDrawer(true);
  };

  const handleEditRoutine = (routine) => {
    setEditingRoutine(routine);
    setNewRoutine({
      name: routine.name,
      day_of_week: routine.day_of_week,
      color: routine.color || "#3b82f6",
      exercises:
        routine.routine_exercises?.map((ex) => ({
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          category: ex.category,
          target_sets: ex.target_sets,
        })) || [],
    });
    setShowCreateDrawer(true);
  };

  const handleSaveRoutine = async () => {
    if (!newRoutine.name.trim() || newRoutine.exercises.length === 0) return;

    if (editingRoutine) {
      await updateRoutine(editingRoutine.id, newRoutine);
    } else {
      await createRoutine(newRoutine);
    }

    setShowCreateDrawer(false);
    setEditingRoutine(null);
    setNewRoutine({
      name: "",
      day_of_week: null,
      color: "#3b82f6",
      exercises: [],
    });
  };

  const handleDeleteRoutine = async (routineId) => {
    if (confirm("Delete this routine?")) {
      await deleteRoutine(routineId);
    }
  };

  const handleAddExercise = (exercise) => {
    setNewRoutine((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          category: exercise.category,
          target_sets: 3,
        },
      ],
    }));
    setShowExercisePicker(false);
  };

  const handleRemoveExercise = (index) => {
    setNewRoutine((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateExerciseSets = (index, sets) => {
    setNewRoutine((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i === index ? { ...ex, target_sets: sets } : ex,
      ),
    }));
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
          <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
            Sign in to manage routines
          </p>
          <button
            onClick={() => router.push("/auth")}
            className="mt-4 px-6 py-2.5 rounded-xl bg-workout-primary text-white font-bold"
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-4 pb-24">
        {/* Header */}
        <div
          className={`sticky top-0 z-30 -mx-4 px-4 pb-3 pt-1 backdrop-blur-sm ${
            isDarkMode ? "bg-iron-950/95" : "bg-slate-50/95"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2
              className={`text-xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
            >
              Workout Routines
            </h2>
            <button
              onClick={handleCreateRoutine}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-workout-primary text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
        </div>

        {/* Routines List */}
        <div className="space-y-6 mt-4">
          {routines.length === 0 ? (
            <button
              onClick={handleCreateRoutine}
              className={`
                w-full p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3
                ${
                  isDarkMode
                    ? "border-iron-800 hover:border-iron-700"
                    : "border-slate-300 hover:border-slate-400"
                }
              `}
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  isDarkMode ? "bg-iron-800" : "bg-slate-100"
                }`}
              >
                <Dumbbell
                  className={`w-8 h-8 ${isDarkMode ? "text-iron-400" : "text-slate-400"}`}
                />
              </div>
              <p
                className={`font-medium ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Create your first routine
              </p>
              <p
                className={`text-sm ${isDarkMode ? "text-iron-600" : "text-slate-500"}`}
              >
                Plan your workouts for each day
              </p>
            </button>
          ) : (
            <>
              {/* Show routines grouped by day */}
              {DAYS.map((day) => {
                const dayRoutines = routinesByDay[day.value];
                if (dayRoutines.length === 0) return null;

                return (
                  <div key={day.value}>
                    <h3
                      className={`text-xs font-medium uppercase tracking-wider mb-2 ${
                        isDarkMode ? "text-iron-500" : "text-slate-500"
                      }`}
                    >
                      {day.label}
                    </h3>
                    <div className="space-y-2">
                      {dayRoutines.map((routine) => (
                        <RoutineCard
                          key={routine.id}
                          routine={routine}
                          isDarkMode={isDarkMode}
                          onEdit={() => handleEditRoutine(routine)}
                          onDelete={() => handleDeleteRoutine(routine.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Unassigned routines */}
              {routinesByDay["unassigned"].length > 0 && (
                <div>
                  <h3
                    className={`text-xs font-medium uppercase tracking-wider mb-2 ${
                      isDarkMode ? "text-iron-500" : "text-slate-500"
                    }`}
                  >
                    Any Day
                  </h3>
                  <div className="space-y-2">
                    {routinesByDay["unassigned"].map((routine) => (
                      <RoutineCard
                        key={routine.id}
                        routine={routine}
                        isDarkMode={isDarkMode}
                        onEdit={() => handleEditRoutine(routine)}
                        onDelete={() => handleDeleteRoutine(routine.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Routine Drawer */}
      <Drawer open={showCreateDrawer} onOpenChange={setShowCreateDrawer}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>
              {editingRoutine ? "Edit Routine" : "Create Routine"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-24 space-y-4 overflow-y-auto max-h-[70vh]">
            {/* Name */}
            <div>
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Routine Name
              </label>
              <input
                type="text"
                value={newRoutine.name}
                onChange={(e) =>
                  setNewRoutine({ ...newRoutine, name: e.target.value })
                }
                placeholder="e.g., Upper Body Strength"
                className={`input-field ${isDarkMode ? "bg-iron-800 text-iron-100" : "bg-slate-100 text-slate-800"}`}
              />
            </div>

            {/* Day Selection */}
            <div>
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Assign to Day (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    setNewRoutine({ ...newRoutine, day_of_week: null })
                  }
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    newRoutine.day_of_week === null
                      ? "bg-workout-primary text-white"
                      : isDarkMode
                        ? "bg-iron-800 text-iron-400"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Any
                </button>
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() =>
                      setNewRoutine({ ...newRoutine, day_of_week: day.value })
                    }
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      newRoutine.day_of_week === day.value
                        ? "bg-workout-primary text-white"
                        : isDarkMode
                          ? "bg-iron-800 text-iron-400"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label
                className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
              >
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {ROUTINE_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewRoutine({ ...newRoutine, color })}
                    className={`w-10 h-10 rounded-xl transition-transform ${
                      newRoutine.color === color
                        ? "ring-2 ring-white ring-offset-2 scale-110"
                        : ""
                    }`}
                    style={{
                      backgroundColor: color,
                      ringOffsetColor: isDarkMode ? "#18181b" : "#f8fafc",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Exercises */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className={`text-sm ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}
                >
                  Exercises ({newRoutine.exercises.length})
                </label>
                <button
                  onClick={() => setShowExercisePicker(true)}
                  className="flex items-center gap-1 text-workout-primary text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {newRoutine.exercises.map((ex, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      isDarkMode ? "bg-iron-800" : "bg-slate-100"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        isDarkMode
                          ? "bg-iron-700 text-iron-400"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-medium ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
                      >
                        {ex.exercise_name}
                      </p>
                      <p
                        className={`text-xs capitalize ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                      >
                        {ex.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleUpdateExerciseSets(
                            index,
                            Math.max(1, ex.target_sets - 1),
                          )
                        }
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isDarkMode
                            ? "bg-iron-700 text-iron-400"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span
                        className={`w-8 text-center font-medium ${
                          isDarkMode ? "text-iron-300" : "text-slate-600"
                        }`}
                      >
                        {ex.target_sets}
                      </span>
                      <button
                        onClick={() =>
                          handleUpdateExerciseSets(
                            index,
                            Math.min(10, ex.target_sets + 1),
                          )
                        }
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isDarkMode
                            ? "bg-iron-700 text-iron-400"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span
                        className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
                      >
                        sets
                      </span>
                      <button
                        onClick={() => handleRemoveExercise(index)}
                        className="p-1 text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {newRoutine.exercises.length === 0 && (
                  <button
                    onClick={() => setShowExercisePicker(true)}
                    className={`
                      w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2
                      ${
                        isDarkMode
                          ? "border-iron-700 text-iron-500"
                          : "border-slate-300 text-slate-500"
                      }
                    `}
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-sm">
                      Add exercises to this routine
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 pb-safe">
              <button
                onClick={() => setShowCreateDrawer(false)}
                className={`flex-1 py-3.5 rounded-xl font-medium ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-400"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoutine}
                disabled={
                  !newRoutine.name.trim() || newRoutine.exercises.length === 0
                }
                className="flex-1 py-3.5 rounded-xl bg-workout-primary text-white font-bold
                         disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {editingRoutine ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Exercise Picker Drawer */}
      <Drawer open={showExercisePicker} onOpenChange={setShowExercisePicker}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add Exercise</DrawerTitle>
          </DrawerHeader>
          <ExerciseAutocomplete
            exercises={exercises}
            recentExercises={[]}
            loggedToday={new Set()}
            onSelect={handleAddExercise}
            onClose={() => setShowExercisePicker(false)}
          />
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}

function RoutineCard({ routine, isDarkMode, onEdit, onDelete }) {
  const exerciseCount = routine.routine_exercises?.length || 0;
  const totalSets =
    routine.routine_exercises?.reduce((sum, ex) => sum + ex.target_sets, 0) ||
    0;

  return (
    <div
      className={`
        p-4 rounded-2xl transition-all
        ${isDarkMode ? "bg-iron-900" : "bg-white border border-slate-200 shadow-sm"}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Color indicator */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${routine.color}20` }}
        >
          <Dumbbell className="w-6 h-6" style={{ color: routine.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={`font-bold truncate ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
          >
            {routine.name}
          </h4>
          <p
            className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
          >
            {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} ·{" "}
            {totalSets} sets
          </p>

          {/* Exercise preview */}
          {exerciseCount > 0 && (
            <div
              className={`mt-2 text-xs ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}
            >
              {routine.routine_exercises
                ?.slice(0, 3)
                .map((ex) => ex.exercise_name)
                .join(", ")}
              {exerciseCount > 3 && ` +${exerciseCount - 3} more`}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className={`p-2 rounded-lg ${isDarkMode ? "hover:bg-iron-800" : "hover:bg-slate-100"}`}
          >
            <Pencil
              className={`w-4 h-4 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}
            />
          </button>
          <button
            onClick={onDelete}
            className={`p-2 rounded-lg ${isDarkMode ? "hover:bg-iron-800" : "hover:bg-slate-100"}`}
          >
            <Trash2
              className={`w-4 h-4 ${isDarkMode ? "text-iron-500 hover:text-red-400" : "text-slate-400 hover:text-red-500"}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

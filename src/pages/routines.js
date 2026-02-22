import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import ExerciseAutocomplete from "@/components/ExerciseAutocomplete";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
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
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

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
  const [deleteConfirm, setDeleteConfirm] = useState(null);
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

    try {
      if (editingRoutine) {
        await updateRoutine(editingRoutine.id, newRoutine);
        toast.success("Routine saved");
      } else {
        await createRoutine(newRoutine);
        toast.success("Routine created");
      }

      setShowCreateDrawer(false);
      setEditingRoutine(null);
      setNewRoutine({
        name: "",
        day_of_week: null,
        color: "#3b82f6",
        exercises: [],
      });
    } catch {
      toast.error("Failed to save routine");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteRoutine(deleteConfirm.id);
      toast.success("Routine deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete routine");
      setDeleteConfirm(null);
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
              New Routine
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
                          onDelete={() => setDeleteConfirm(routine)}
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
                        onDelete={() => setDeleteConfirm(routine)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Routine Modal */}
      <Modal open={showCreateDrawer} onOpenChange={setShowCreateDrawer}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              {editingRoutine ? "Edit Routine" : "Create Routine"}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {/* Name */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Routine Name
              </label>
              <input
                type="text"
                value={newRoutine.name}
                onChange={(e) => setNewRoutine({ ...newRoutine, name: e.target.value })}
                placeholder="e.g., Upper Body Strength"
                className={`input-field ${isDarkMode ? "bg-iron-800 text-iron-100" : "bg-slate-100 text-slate-800"}`}
              />
            </div>

            {/* Day Selection */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Assign to Day (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setNewRoutine({ ...newRoutine, day_of_week: null })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    newRoutine.day_of_week === null
                      ? "bg-workout-primary text-white"
                      : isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Any
                </button>
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => setNewRoutine({ ...newRoutine, day_of_week: day.value })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      newRoutine.day_of_week === day.value
                        ? "bg-workout-primary text-white"
                        : isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {ROUTINE_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewRoutine({ ...newRoutine, color })}
                    className={`w-9 h-9 rounded-lg transition-transform ${
                      newRoutine.color === color ? "ring-2 ring-white ring-offset-2 scale-110" : ""
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
                <label className={`text-sm ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                  Exercises ({newRoutine.exercises.length})
                </label>
                <button
                  onClick={() => setShowExercisePicker(true)}
                  className={`flex items-center gap-1 text-sm font-medium ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              <div className="space-y-1 max-h-[30vh] overflow-y-auto">
                {newRoutine.exercises.map((ex, index) => {
                  const isSuperset = ex.superset_group && index > 0 && newRoutine.exercises[index - 1]?.superset_group === ex.superset_group;
                  const startsSuperset = ex.superset_group && index < newRoutine.exercises.length - 1 && newRoutine.exercises[index + 1]?.superset_group === ex.superset_group;

                  return (
                    <div key={index}>
                      {isSuperset && (
                        <div className={`flex items-center justify-center py-0.5`}>
                          <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isDarkMode ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-600"}`}>
                            superset
                          </div>
                        </div>
                      )}
                      <div
                        className={`flex items-center gap-2 p-2 rounded-xl ${
                          ex.superset_group
                            ? isDarkMode ? "bg-orange-500/5 border border-orange-500/20" : "bg-orange-50 border border-orange-200"
                            : isDarkMode ? "bg-iron-800" : "bg-slate-100"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                          isDarkMode ? "bg-iron-700 text-iron-400" : "bg-slate-200 text-slate-500"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                            {ex.exercise_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {index > 0 && (
                            <button
                              onClick={() => {
                                const updated = [...newRoutine.exercises];
                                const prevEx = updated[index - 1];
                                if (ex.superset_group && prevEx.superset_group === ex.superset_group) {
                                  updated[index] = { ...ex, superset_group: null };
                                  const groupId = ex.superset_group;
                                  const remaining = updated.filter(e => e.superset_group === groupId);
                                  if (remaining.length <= 1) {
                                    remaining.forEach(e => { e.superset_group = null; });
                                  }
                                } else {
                                  const groupId = prevEx.superset_group || `ss_${Date.now()}`;
                                  updated[index - 1] = { ...prevEx, superset_group: groupId };
                                  updated[index] = { ...ex, superset_group: groupId };
                                }
                                setNewRoutine({ ...newRoutine, exercises: updated });
                              }}
                              title={ex.superset_group ? "Unlink superset" : "Link as superset"}
                              className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                                ex.superset_group
                                  ? isDarkMode ? "bg-orange-500/30 text-orange-400" : "bg-orange-200 text-orange-600"
                                  : isDarkMode ? "bg-iron-700 text-iron-500" : "bg-slate-200 text-slate-400"
                              }`}
                            >
                              🔗
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateExerciseSets(index, Math.max(1, ex.target_sets - 1))}
                            className={`w-6 h-6 rounded flex items-center justify-center ${
                              isDarkMode ? "bg-iron-700 text-iron-400" : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`w-5 text-center text-sm font-medium ${isDarkMode ? "text-iron-300" : "text-slate-600"}`}>
                            {ex.target_sets}
                          </span>
                          <button
                            onClick={() => handleUpdateExerciseSets(index, Math.min(10, ex.target_sets + 1))}
                            className={`w-6 h-6 rounded flex items-center justify-center ${
                              isDarkMode ? "bg-iron-700 text-iron-400" : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleRemoveExercise(index)} className="p-1 text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {newRoutine.exercises.length === 0 && (
                  <button
                    onClick={() => setShowExercisePicker(true)}
                    className={`w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 ${
                      isDarkMode ? "border-iron-700 text-iron-500" : "border-slate-300 text-slate-500"
                    }`}
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-sm">Add exercises to this routine</span>
                  </button>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setShowCreateDrawer(false)}
              className={`flex-1 py-3 rounded-xl font-medium ${
                isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveRoutine}
              disabled={!newRoutine.name.trim() || newRoutine.exercises.length === 0}
              className={`flex-1 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              <Check className="w-4 h-4" />
              {editingRoutine ? "Save" : "Create"}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Exercise Picker Modal */}
      <Modal open={showExercisePicker} onOpenChange={setShowExercisePicker}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>Add Exercise</ModalTitle>
          </ModalHeader>
          <ModalBody className="p-0">
            <ExerciseAutocomplete
              exercises={exercises}
              recentExercises={[]}
              loggedToday={new Set()}
              onSelect={handleAddExercise}
              onClose={() => setShowExercisePicker(false)}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Delete Routine
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : "text-slate-500"}>
              Are you sure you want to delete this routine? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={isDarkMode ? "bg-iron-800 text-iron-300 hover:bg-iron-700 border-0" : ""}
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 border-0"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function RoutineCard({ routine, isDarkMode, onEdit, onDelete }) {
  const exerciseCount = routine.routine_exercises?.length || 0;
  const totalSets =
    routine.routine_exercises?.reduce((sum, ex) => sum + ex.target_sets, 0) ||
    0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`
            p-4 rounded-2xl transition-all
            ${isDarkMode ? "bg-iron-900" : "bg-white border border-slate-200 shadow-sm"}
          `}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${routine.color}20` }}
            >
              <Dumbbell className="w-5 h-5" style={{ color: routine.color }} />
            </div>

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
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
        <ContextMenuItem
          onClick={onEdit}
          className={isDarkMode ? "text-iron-200" : "text-slate-700"}
        >
          <Pencil className="w-4 h-4" />
          Edit Routine
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          destructive
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
          Delete Routine
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

import { useState, useMemo, useEffect, useCallback } from "react";
import { useWorkout } from "@/context/WorkoutContext";
import { toast } from "sonner";
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
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Target, Plus, Trash2, Trophy, ChevronRight, ChevronDown, Minus, Check, Pencil } from "lucide-react";

const GOAL_TYPES = [
  { id: "workout_days", label: "Workout days per week", icon: "💪", unit: "days/week", max: 7, auto: true, desc: "Auto-tracks from your workouts" },
  { id: "habit_streak", label: "Complete all habits for X days", icon: "🔥", unit: "days", auto: true, desc: "Auto-tracks from your habits" },
  { id: "custom", label: "Custom goal", icon: "🎯", unit: "", auto: false, desc: "Tap to update progress manually" },
];

function GoalProgressRing({ progress, size = 44, strokeWidth = 4, isDarkMode }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const offset = circumference - (clampedProgress / 100) * circumference;
  const isComplete = clampedProgress >= 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDarkMode ? "#27272a" : "#e2e8f0"}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isComplete ? "#22c55e" : isDarkMode ? "#fbbf24" : "#dc2626"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {isComplete ? (
          <Trophy className="w-4 h-4 text-green-400" />
        ) : (
          <span className={`text-[10px] font-bold ${isDarkMode ? "text-iron-300" : "text-slate-600"}`}>
            {Math.round(clampedProgress)}%
          </span>
        )}
      </div>
    </div>
  );
}

function getStorageKey(userId) {
  return `logbook_goals_${userId}`;
}

function loadGoals(userId) {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveGoals(userId, goals) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStorageKey(userId), JSON.stringify(goals));
}

export default function GoalsWidget({ isDarkMode, workoutHeatmapData = [], habitHeatmapData = [], trackables = [], todayEntries = {} }) {
  const { user, settings, updateSettings } = useWorkout();
  const [goals, setGoals] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({
    type: "workout_days",
    target: "",
    name: "",
  });

  const persistGoals = useCallback(
    (next) => {
      setGoals(next);
      if (!user?.id) return;
      saveGoals(user.id, next);
      void updateSettings({ goals: next });
    },
    [user?.id, updateSettings],
  );

  /* Show local cache until `user_settings` row is loaded from the server */
  useEffect(() => {
    if (!user?.id) return;
    if (settings?.user_id) return;
    setGoals(loadGoals(user.id));
  }, [user?.id, settings?.user_id]);

  /* Sync from Supabase `user_settings.goals`; migrate legacy localStorage once */
  useEffect(() => {
    if (!user?.id) return;
    if (!settings?.user_id) return;
    const local = loadGoals(user.id);
    const serverGoals = Array.isArray(settings.goals) ? settings.goals : [];
    if (serverGoals.length > 0) {
      setGoals(serverGoals);
      saveGoals(user.id, serverGoals);
    } else if (local.length > 0) {
      setGoals(local);
      void updateSettings({ goals: local });
    } else {
      setGoals([]);
    }
  }, [user?.id, settings?.user_id, settings?.goals, updateSettings]);

  const goalProgress = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;

    return goals.map((goal) => {
      let current = 0;
      let target = goal.target;
      let label = "";
      const goalType = GOAL_TYPES.find((t) => t.id === goal.type);
      const isAuto = goalType?.auto ?? false;

      switch (goal.type) {
        case "workout_days": {
          current = workoutHeatmapData.filter((d) => d.date >= weekStartStr).length;
          label = `${current}/${target} days this week`;
          break;
        }
        case "habit_streak": {
          let streak = 0;
          const completedDateMap = {};
          habitHeatmapData.forEach((x) => {
            completedDateMap[x.date] = x.count || 0;
          });
          const habits = trackables.filter((t) => t.name !== "Body Weight");
          let checkDate = new Date();
          for (let i = 0; i < 365; i++) {
            const y = checkDate.getFullYear();
            const m = String(checkDate.getMonth() + 1).padStart(2, "0");
            const d = String(checkDate.getDate()).padStart(2, "0");
            const dateStr = `${y}-${m}-${d}`;
            const dayOfWeek = checkDate.getDay();

            const scheduledHabits = habits.filter(
              (t) => !t.active_days || t.active_days.includes(dayOfWeek),
            );
            const scheduledCount = scheduledHabits.length;

            if (scheduledCount === 0) {
              checkDate.setDate(checkDate.getDate() - 1);
              continue;
            }

            const completedCount = completedDateMap[dateStr] || 0;
            if (completedCount >= scheduledCount) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else if (i > 0) {
              break;
            } else {
              checkDate.setDate(checkDate.getDate() - 1);
            }
          }
          current = streak;
          label = `${current}/${target} day streak`;
          break;
        }
        case "custom": {
          current = goal.current || 0;
          label = `${current}/${target}`;
          break;
        }
      }

      const progress = target > 0 ? (current / target) * 100 : 0;
      return { ...goal, current, progress, label, isAuto };
    });
  }, [goals, workoutHeatmapData, habitHeatmapData, trackables]);

  const handleAddGoal = () => {
    if (!newGoal.target || !user?.id) return;
    const goalType = GOAL_TYPES.find((t) => t.id === newGoal.type);
    const goal = {
      id: Date.now().toString(),
      type: newGoal.type,
      target: parseFloat(newGoal.target),
      name: newGoal.type === "custom" ? newGoal.name : goalType?.label,
      icon: goalType?.icon || "🎯",
      current: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [...goals, goal];
    persistGoals(updated);
    toast.success("Goal added");
    setShowAddModal(false);
    setNewGoal({ type: "workout_days", target: "", name: "" });
  };

  const handleDeleteGoal = (goalId) => {
    const updated = goals.filter((g) => g.id !== goalId);
    persistGoals(updated);
    toast.success("Goal removed");
    setDeleteConfirm(null);
  };

  const handleOpenEdit = (goal) => {
    const goalType = GOAL_TYPES.find((t) => t.id === goal.type);
    setEditingGoal({
      ...goal,
      name: goal.name || goalType?.label || "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingGoal || !editingGoal.target) return;
    const updated = goals.map((g) =>
      g.id === editingGoal.id
        ? { ...g, target: parseFloat(editingGoal.target), name: editingGoal.type === "custom" ? editingGoal.name : g.name }
        : g,
    );
    persistGoals(updated);
    toast.success("Goal updated");
    setEditingGoal(null);
  };

  const updateGoalProgress = (goalId, newCurrent) => {
    const updated = goals.map((g) =>
      g.id === goalId ? { ...g, current: Math.max(0, newCurrent) } : g,
    );
    persistGoals(updated);
  };

  const selectedType = GOAL_TYPES.find((t) => t.id === newGoal.type);

  return (
    <div className={`rounded-2xl overflow-hidden ${isDarkMode ? "bg-iron-900/50" : "bg-white border border-slate-200 shadow-sm"}`}>
      {/* Header — collapsible */}
      <div className={`p-4 flex items-center justify-between gap-2`}>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left rounded-xl -m-1 p-1 active:opacity-90"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? "bg-amber-500/20" : "bg-amber-100"}`}>
            <Target className={`w-5 h-5 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`font-semibold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>Goals</h3>
            <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              {goals.length === 0 ? "Set your targets" : `${goalProgress.filter((g) => g.progress >= 100).length}/${goals.length} completed`}
            </p>
          </div>
          <ChevronDown
            className={`w-5 h-5 shrink-0 transition-transform duration-200 opacity-70 ${
              isDarkMode ? "text-iron-400" : "text-slate-500"
            } ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className={`shrink-0 p-2 rounded-xl ${isDarkMode ? "bg-iron-800 text-iron-400 active:bg-iron-700" : "bg-slate-100 text-slate-600 active:bg-slate-200"}`}
          aria-label="Add goal"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Goals List */}
      {expanded && goalProgress.length > 0 && (
        <div className={`px-4 pb-4 space-y-2`}>
          {goalProgress.map((goal) => (
            <ContextMenu key={goal.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={`rounded-xl overflow-hidden ${
                    goal.progress >= 100
                      ? isDarkMode
                        ? "bg-green-500/10 border border-green-500/20"
                        : "bg-green-50 border border-green-200"
                      : isDarkMode
                        ? "bg-iron-800/50"
                        : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <GoalProgressRing progress={goal.progress} isDarkMode={isDarkMode} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{goal.icon}</span>
                        <p className={`text-sm font-medium truncate ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                          {goal.name}
                        </p>
                      </div>
                      <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                        {goal.label}
                      </p>
                    </div>

                    {!goal.isAuto && goal.progress < 100 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateGoalProgress(goal.id, (goal.current || 0) - 1)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-iron-700 active:bg-iron-600" : "bg-slate-200 active:bg-slate-300"}`}
                        >
                          <Minus className={`w-3.5 h-3.5 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`} />
                        </button>
                        <button
                          onClick={() => updateGoalProgress(goal.id, (goal.current || 0) + 1)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-lift-primary/20 active:bg-lift-primary/30" : "bg-amber-100 active:bg-amber-200"}`}
                        >
                          <Plus className={`w-3.5 h-3.5 ${isDarkMode ? "text-lift-primary" : "text-amber-600"}`} />
                        </button>
                      </div>
                    )}

                    {goal.progress >= 100 && (
                      <span
                        className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-500/15"
                        title="Goal met"
                      >
                        <Check className="h-5 w-5 text-green-400" strokeWidth={2.5} aria-hidden />
                      </span>
                    )}
                  </div>

                  {goal.isAuto && (
                    <div className={`px-3 pb-2 -mt-1`}>
                      <p className={`text-[10px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                        Auto-tracked
                      </p>
                    </div>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
                <ContextMenuItem
                  onClick={() => handleOpenEdit(goal)}
                  className={isDarkMode ? "text-iron-200" : "text-slate-700"}
                >
                  <Pencil className="w-4 h-4" />
                  Edit Goal
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  destructive
                  onClick={() => setDeleteConfirm(goal)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Goal
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      )}

      {expanded && goals.length === 0 && (
        <div className={`px-4 pb-4`}>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className={`w-full py-6 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 ${
              isDarkMode ? "border-iron-700 text-iron-500" : "border-slate-300 text-slate-400"
            }`}
          >
            <Target className="w-6 h-6" />
            <span className="text-sm">Add your first goal</span>
          </button>
        </div>
      )}

      {/* Add Goal Modal */}
      <Modal open={showAddModal} onOpenChange={setShowAddModal}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>Add Goal</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {/* Goal Type */}
            <div className="space-y-2">
              {GOAL_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setNewGoal({ ...newGoal, type: type.id })}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    newGoal.type === type.id
                      ? isDarkMode
                        ? "bg-lift-primary/10 border border-lift-primary/30"
                        : "bg-workout-primary/5 border border-workout-primary/30"
                      : isDarkMode
                        ? "bg-iron-800/50 border border-transparent"
                        : "bg-slate-50 border border-transparent"
                  }`}
                >
                  <span className="text-lg">{type.icon}</span>
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${isDarkMode ? "text-iron-200" : "text-slate-700"}`}>
                      {type.label}
                    </span>
                    <p className={`text-[10px] mt-0.5 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>
                      {type.desc}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
                    newGoal.type === type.id
                      ? isDarkMode ? "text-lift-primary" : "text-workout-primary"
                      : isDarkMode ? "text-iron-600" : "text-slate-400"
                  }`} />
                </button>
              ))}
            </div>

            {/* Custom Name */}
            {newGoal.type === "custom" && (
              <div>
                <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>Goal Name</label>
                <input
                  type="text"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="e.g., Run 5km, Read 30 minutes"
                  className={`input-field ${isDarkMode ? "bg-iron-800 text-iron-100 border-iron-700" : "bg-slate-50 text-slate-800 border-slate-200"}`}
                />
              </div>
            )}

            {/* Target Value */}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Target {selectedType?.unit ? `(${selectedType.unit})` : ""}
              </label>
              <input
                type="number"
                value={newGoal.target}
                onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                placeholder={newGoal.type === "workout_days" ? "e.g., 4" : newGoal.type === "habit_streak" ? "e.g., 30" : "e.g., 10"}
                max={selectedType?.max}
                className={`input-field text-center text-xl font-bold ${isDarkMode ? "bg-iron-800 text-iron-100 border-iron-700" : "bg-slate-50 text-slate-800 border-slate-200"}`}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setShowAddModal(false)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium ${isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"}`}
            >
              Cancel
            </button>
            <button
              onClick={handleAddGoal}
              disabled={!newGoal.target || (newGoal.type === "custom" && !newGoal.name)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold ${
                isDarkMode
                  ? "bg-lift-primary text-iron-950 disabled:opacity-40"
                  : "bg-workout-primary text-white disabled:opacity-40"
              }`}
            >
              Add Goal
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Goal Modal */}
      <Modal open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>Edit Goal</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {editingGoal?.type === "custom" && (
              <div>
                <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>Goal Name</label>
                <input
                  type="text"
                  value={editingGoal?.name || ""}
                  onChange={(e) => setEditingGoal({ ...editingGoal, name: e.target.value })}
                  className={`input-field ${isDarkMode ? "bg-iron-800 text-iron-100 border-iron-700" : "bg-slate-50 text-slate-800 border-slate-200"}`}
                />
              </div>
            )}
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Target {GOAL_TYPES.find((t) => t.id === editingGoal?.type)?.unit ? `(${GOAL_TYPES.find((t) => t.id === editingGoal?.type).unit})` : ""}
              </label>
              <input
                type="number"
                value={editingGoal?.target || ""}
                onChange={(e) => setEditingGoal({ ...editingGoal, target: e.target.value })}
                max={GOAL_TYPES.find((t) => t.id === editingGoal?.type)?.max}
                className={`input-field text-center text-xl font-bold ${isDarkMode ? "bg-iron-800 text-iron-100 border-iron-700" : "bg-slate-50 text-slate-800 border-slate-200"}`}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setEditingGoal(null)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium ${isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"}`}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={!editingGoal?.target || (editingGoal?.type === "custom" && !editingGoal?.name)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold ${
                isDarkMode
                  ? "bg-lift-primary text-iron-950 disabled:opacity-40"
                  : "bg-workout-primary text-white disabled:opacity-40"
              }`}
            >
              Save
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>Remove Goal</AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : "text-slate-500"}>
              Remove &ldquo;{deleteConfirm?.name}&rdquo;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDarkMode ? "bg-iron-800 text-iron-300 hover:bg-iron-700 border-0" : ""}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteGoal(deleteConfirm?.id)}
              className="bg-red-600 text-white hover:bg-red-700 border-0"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { X, Minus, Plus, Check, Zap, RotateCcw, Trash2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import ExerciseIcon from "@/components/ExerciseIcon";

export default function ExerciseLogModal({
  isOpen,
  exercise,
  history,
  unit = "kg",
  onClose,
  onLog,
}) {
  const [weight, setWeight] = useState(0);
  const [sets, setSets] = useState([{ reps: 10, completed: false }]);
  const [isLogging, setIsLogging] = useState(false);
  const [mode, setMode] = useState("quick"); // 'quick' or 'detailed'

  // Generate presets from history
  const presets = [];
  if (history) {
    if (history.last_weight && history.last_reps && history.last_sets) {
      presets.push({
        label: `${history.last_sets}×${history.last_reps} @ ${history.last_weight}${unit}`,
        weight: history.last_weight,
        reps: history.last_reps,
        setCount: history.last_sets,
        type: "last",
      });
    }
    if (
      history.personal_record_weight &&
      history.personal_record_weight !== history.last_weight
    ) {
      presets.push({
        label: `PR: ${history.personal_record_weight}${unit}`,
        weight: history.personal_record_weight,
        reps: history.last_reps || 8,
        setCount: history.last_sets || 3,
        type: "pr",
      });
    }
  }

  useEffect(() => {
    if (isOpen && history) {
      setWeight(history.last_weight || 0);
      const setCount = history.last_sets || 3;
      const reps = history.last_reps || 10;
      setSets(
        Array(setCount)
          .fill(null)
          .map(() => ({ reps, completed: false })),
      );
      setMode("quick");
    } else if (isOpen) {
      setWeight(0);
      setSets([
        { reps: 10, completed: false },
        { reps: 10, completed: false },
        { reps: 10, completed: false },
      ]);
      setMode("quick");
    }
  }, [isOpen, history]);

  const handlePresetClick = (preset) => {
    setWeight(preset.weight);
    setSets(
      Array(preset.setCount)
        .fill(null)
        .map(() => ({ reps: preset.reps, completed: false })),
    );
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handleAddSet = () => {
    const lastReps = sets[sets.length - 1]?.reps || 10;
    setSets([...sets, { reps: lastReps, completed: false }]);
  };

  const handleRemoveSet = (index) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  const handleSetRepsChange = (index, delta) => {
    setSets(
      sets.map((set, i) =>
        i === index
          ? { ...set, reps: Math.max(1, Math.min(100, set.reps + delta)) }
          : set,
      ),
    );
  };

  const handleToggleSet = (index) => {
    setSets(
      sets.map((set, i) =>
        i === index ? { ...set, completed: !set.completed } : set,
      ),
    );
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handleLog = async () => {
    setIsLogging(true);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate([10, 50, 10]);
    }
    try {
      // Calculate totals
      const totalSets = sets.length;
      const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
      const avgReps = Math.round(totalReps / totalSets);

      await onLog({
        weight,
        reps: avgReps,
        sets: totalSets,
        // Pass individual sets for detailed logging
        individualSets: sets.map((s) => s.reps),
      });
      onClose();
    } catch (err) {
      console.error("Error logging exercise:", err);
    } finally {
      setIsLogging(false);
    }
  };

  const weightStep = unit === "kg" ? 2.5 : 5;
  const totalVolume = sets.reduce((sum, s) => sum + s.reps * weight, 0);
  const completedSets = sets.filter((s) => s.completed).length;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-iron-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-iron-800 flex items-center justify-center flex-shrink-0">
              <ExerciseIcon
                name={exercise?.name}
                className="w-10 h-10"
                color="#22c55e"
              />
            </div>
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-xl truncate">
                {exercise?.name}
              </DrawerTitle>
              <p className="text-iron-500 text-sm capitalize">
                {exercise?.category}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-iron-800 flex items-center justify-center flex-shrink-0"
            >
              <X className="w-4 h-4 text-iron-400" />
            </button>
          </div>
        </DrawerHeader>

        <div className="px-4 py-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Quick Presets */}
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {presets.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => handlePresetClick(preset)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95
                    ${
                      preset.type === "pr"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-lift-primary/20 text-lift-primary border border-lift-primary/30"
                    }
                  `}
                >
                  {preset.type === "last" ? (
                    <RotateCcw className="w-4 h-4" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {/* Weight Stepper */}
          <div className="flex items-center justify-between p-4 bg-iron-800/50 rounded-2xl">
            <span className="text-iron-300 font-medium">Weight</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWeight(Math.max(0, weight - weightStep))}
                className="w-12 h-12 rounded-xl bg-iron-700 flex items-center justify-center active:bg-iron-600 transition-colors"
              >
                <Minus className="w-5 h-5 text-iron-300" />
              </button>
              <div className="w-24 text-center">
                <span className="text-2xl font-bold text-iron-100">
                  {weight}
                </span>
                <span className="text-sm text-iron-500 ml-1">{unit}</span>
              </div>
              <button
                onClick={() => setWeight(Math.min(500, weight + weightStep))}
                className="w-12 h-12 rounded-xl bg-iron-700 flex items-center justify-center active:bg-iron-600 transition-colors"
              >
                <Plus className="w-5 h-5 text-iron-300" />
              </button>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("quick")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                mode === "quick"
                  ? "bg-lift-primary text-iron-950"
                  : "bg-iron-800 text-iron-400"
              }`}
            >
              Quick Log
            </button>
            <button
              onClick={() => setMode("detailed")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                mode === "detailed"
                  ? "bg-lift-primary text-iron-950"
                  : "bg-iron-800 text-iron-400"
              }`}
            >
              Per-Set Reps
            </button>
          </div>

          {mode === "quick" ? (
            /* Quick Mode - Same reps for all sets */
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-iron-800/50 rounded-2xl">
                <span className="text-iron-300 font-medium">Reps per set</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setSets(
                        sets.map((s) => ({
                          ...s,
                          reps: Math.max(1, s.reps - 1),
                        })),
                      )
                    }
                    className="w-12 h-12 rounded-xl bg-iron-700 flex items-center justify-center active:bg-iron-600 transition-colors"
                  >
                    <Minus className="w-5 h-5 text-iron-300" />
                  </button>
                  <div className="w-16 text-center">
                    <span className="text-2xl font-bold text-iron-100">
                      {sets[0]?.reps || 10}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setSets(
                        sets.map((s) => ({
                          ...s,
                          reps: Math.min(100, s.reps + 1),
                        })),
                      )
                    }
                    className="w-12 h-12 rounded-xl bg-iron-700 flex items-center justify-center active:bg-iron-600 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-iron-300" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-iron-800/50 rounded-2xl">
                <span className="text-iron-300 font-medium">Sets</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      sets.length > 1 && setSets(sets.slice(0, -1))
                    }
                    className="w-12 h-12 rounded-xl bg-iron-700 flex items-center justify-center active:bg-iron-600 transition-colors"
                  >
                    <Minus className="w-5 h-5 text-iron-300" />
                  </button>
                  <div className="w-16 text-center">
                    <span className="text-2xl font-bold text-iron-100">
                      {sets.length}
                    </span>
                  </div>
                  <button
                    onClick={handleAddSet}
                    className="w-12 h-12 rounded-xl bg-iron-700 flex items-center justify-center active:bg-iron-600 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-iron-300" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Detailed Mode - Individual reps per set */
            <div className="space-y-2">
              <p className="text-iron-500 text-sm">
                Tap set to mark complete, adjust reps individually:
              </p>

              {sets.map((set, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    set.completed
                      ? "bg-lift-primary/20 border border-lift-primary/30"
                      : "bg-iron-800/50"
                  }`}
                >
                  <button
                    onClick={() => handleToggleSet(index)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      set.completed
                        ? "bg-lift-primary text-iron-950"
                        : "bg-iron-700 text-iron-400"
                    }`}
                  >
                    {set.completed ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="font-bold">{index + 1}</span>
                    )}
                  </button>

                  <div className="flex-1 flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleSetRepsChange(index, -1)}
                      className="w-10 h-10 rounded-lg bg-iron-700 flex items-center justify-center active:bg-iron-600"
                    >
                      <Minus className="w-4 h-4 text-iron-300" />
                    </button>
                    <div className="w-16 text-center">
                      <span className="text-xl font-bold text-iron-100">
                        {set.reps}
                      </span>
                      <span className="text-xs text-iron-500 ml-1">reps</span>
                    </div>
                    <button
                      onClick={() => handleSetRepsChange(index, 1)}
                      className="w-10 h-10 rounded-lg bg-iron-700 flex items-center justify-center active:bg-iron-600"
                    >
                      <Plus className="w-4 h-4 text-iron-300" />
                    </button>
                  </div>

                  {sets.length > 1 && (
                    <button
                      onClick={() => handleRemoveSet(index)}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-iron-500 hover:text-red-400 active:bg-iron-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={handleAddSet}
                className="w-full py-3 rounded-xl border-2 border-dashed border-iron-700 text-iron-400 
                         flex items-center justify-center gap-2 active:bg-iron-800/50"
              >
                <Plus className="w-4 h-4" />
                Add Set
              </button>
            </div>
          )}

          {/* Summary */}
          <div className="p-4 bg-gradient-to-r from-lift-primary/10 to-transparent rounded-2xl border border-lift-primary/20">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-iron-400 text-sm">Summary</p>
                <p className="text-lg font-bold text-iron-100">
                  {sets.length} set{sets.length !== 1 ? "s" : ""} ×{" "}
                  {mode === "quick" ? sets[0]?.reps : "varied"} reps
                </p>
                {mode === "detailed" && (
                  <p className="text-iron-500 text-xs mt-1">
                    {sets.map((s) => s.reps).join(" → ")} reps
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-iron-400 text-sm">Volume</p>
                <p className="text-lg font-bold text-iron-100 font-mono">
                  {totalVolume.toLocaleString()}
                  <span className="text-xs text-iron-400 ml-1">{unit}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Log Button */}
          <button
            onClick={handleLog}
            disabled={isLogging}
            className="w-full py-4 rounded-2xl bg-lift-primary text-iron-950 font-bold text-lg
                     active:bg-lift-secondary transition-all disabled:opacity-50
                     flex items-center justify-center gap-2 shadow-lg shadow-lift-primary/30"
          >
            {isLogging ? (
              <>
                <div className="w-5 h-5 border-2 border-iron-950 border-t-transparent rounded-full animate-spin" />
                Logging...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Log {sets.length} set{sets.length !== 1 ? "s" : ""} at {weight}
                {unit}
              </>
            )}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

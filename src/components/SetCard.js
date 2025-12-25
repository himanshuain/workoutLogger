import { useState, useEffect } from "react";
import { Minus, Plus, Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function SetCard({
  setNumber,
  weight,
  reps,
  previousWeight,
  previousReps,
  isCompleted,
  unit = "kg",
  onWeightChange,
  onRepsChange,
  onToggleComplete,
}) {
  const { isDarkMode } = useTheme();
  const [localWeight, setLocalWeight] = useState(weight);
  const [localReps, setLocalReps] = useState(reps);

  useEffect(() => {
    setLocalWeight(weight);
    setLocalReps(reps);
  }, [weight, reps]);

  const weightStep = unit === "kg" ? 2.5 : 5;

  const handleWeightChange = (delta) => {
    const newWeight = Math.max(0, Math.min(500, localWeight + delta));
    setLocalWeight(newWeight);
    onWeightChange(newWeight);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(5);
    }
  };

  const handleRepsChange = (delta) => {
    const newReps = Math.max(1, Math.min(100, localReps + delta));
    setLocalReps(newReps);
    onRepsChange(newReps);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(5);
    }
  };

  const handleToggle = () => {
    onToggleComplete(!isCompleted);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const hasPrevious = previousWeight !== null && previousReps !== null;

  return (
    <div
      className={`
        rounded-2xl p-4 transition-all duration-200 border-2
        ${
          isCompleted
            ? isDarkMode
              ? "border-lift-primary bg-lift-primary/10"
              : "border-green-500 bg-green-50"
            : isDarkMode
              ? "border-transparent bg-iron-900"
              : "border-slate-200 bg-white shadow-sm"
        }
      `}
    >
      {/* Header: Set number, Previous, Checkmark */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Set Number Badge */}
          <div
            className={`
              w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
              ${
                isCompleted
                  ? isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-green-500 text-white"
                  : isDarkMode
                    ? "bg-iron-800 text-iron-400"
                    : "bg-slate-100 text-slate-500"
              }
            `}
          >
            {setNumber}
          </div>

          {/* Previous Performance */}
          {hasPrevious && (
            <span
              className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
            >
              Previous: {previousReps} × {previousWeight}
              {unit}
            </span>
          )}
        </div>

        {/* Checkmark Button */}
        <button
          onClick={handleToggle}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90
            ${
              isCompleted
                ? isDarkMode
                  ? "bg-lift-primary text-iron-950"
                  : "bg-green-500 text-white"
                : isDarkMode
                  ? "bg-iron-800 text-iron-500 hover:bg-iron-700"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            }
          `}
        >
          <Check className="w-6 h-6" strokeWidth={3} />
        </button>
      </div>

      {/* Controls: Reps and Weight */}
      <div className="grid grid-cols-2 gap-4">
        {/* Reps Control */}
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
          >
            Reps
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRepsChange(-1)}
              className={`
                w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95
                ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-300 active:bg-iron-700"
                    : "bg-slate-100 text-slate-600 active:bg-slate-200"
                }
              `}
            >
              <Minus className="w-5 h-5" />
            </button>
            <span
              className={`flex-1 text-center text-2xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
            >
              {localReps}
            </span>
            <button
              onClick={() => handleRepsChange(1)}
              className={`
                w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95
                ${
                  isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-workout-primary text-white"
                }
              `}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weight Control */}
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}
          >
            Weight ({unit})
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleWeightChange(-weightStep)}
              className={`
                w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95
                ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-300 active:bg-iron-700"
                    : "bg-slate-100 text-slate-600 active:bg-slate-200"
                }
              `}
            >
              <Minus className="w-5 h-5" />
            </button>
            <span
              className={`flex-1 text-center text-2xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}
            >
              {localWeight}
            </span>
            <button
              onClick={() => handleWeightChange(weightStep)}
              className={`
                w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95
                ${
                  isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-workout-primary text-white"
                }
              `}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

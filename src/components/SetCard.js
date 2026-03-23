import { useState, useEffect, useMemo } from "react";
import { Minus, Plus, Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const REP_SUGGESTIONS = [6, 8, 10, 12, 15];

const KG_SUGGEST_STEP = 2.5;
const KG_SUGGEST_MIN = 5;
const KG_SUGGEST_COUNT = 7; // 5, 7.5, … 20

function snapToStep(value, step) {
  return Math.round(value / step) * step;
}

function buildWeightSuggestions(unit, previousWeight, weightStep) {
  if (unit === "kg") {
    const pw = Number(previousWeight);
    if (Number.isFinite(pw) && pw > 0) {
      const base = snapToStep(pw, KG_SUGGEST_STEP);
      const deltas = [-7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10];
      const seen = new Set();
      for (const d of deltas) {
        const v = snapToStep(base + d, KG_SUGGEST_STEP);
        if (v >= KG_SUGGEST_MIN && v <= 500) seen.add(v);
      }
      return [...seen].sort((a, b) => a - b);
    }
    return Array.from({ length: KG_SUGGEST_COUNT }, (_, i) => KG_SUGGEST_MIN + i * KG_SUGGEST_STEP);
  }

  const pw = Number(previousWeight);
  if (Number.isFinite(pw) && pw > 0) {
    const deltas = [-10, -5, 0, 5, 10, 20];
    const seen = new Set();
    for (const d of deltas) {
      const raw = pw + d;
      if (raw < 0) continue;
      const rounded = Math.round(raw / weightStep) * weightStep;
      const clamped = Math.max(0, Math.min(500, rounded));
      seen.add(clamped);
    }
    return [...seen].sort((a, b) => a - b);
  }
  return [45, 55, 65, 75, 85, 95, 105];
}

function FieldBlock({ title, hint, children, isDarkMode }) {
  return (
    <div
      className={`rounded-xl p-3 ${
        isDarkMode ? "bg-iron-950/80 border border-iron-800/80" : "bg-slate-50 border border-slate-200"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span
          className={`text-xs font-semibold ${isDarkMode ? "text-iron-300" : "text-slate-700"}`}
        >
          {title}
        </span>
        {hint ? (
          <span className={`text-[10px] truncate ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

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
  const weightSuggestions = useMemo(
    () => buildWeightSuggestions(unit, previousWeight, weightStep),
    [unit, previousWeight, weightStep],
  );

  const handleWeightChange = (delta) => {
    const newWeight = Math.max(0, Math.min(500, localWeight + delta));
    setLocalWeight(newWeight);
    onWeightChange(newWeight);
    if (window.navigator?.vibrate) window.navigator.vibrate(5);
  };

  const handleRepsChange = (delta) => {
    const newReps = Math.max(1, Math.min(100, localReps + delta));
    setLocalReps(newReps);
    onRepsChange(newReps);
    if (window.navigator?.vibrate) window.navigator.vibrate(5);
  };

  const pickReps = (n) => {
    setLocalReps(n);
    onRepsChange(n);
    if (window.navigator?.vibrate) window.navigator.vibrate(5);
  };

  const pickWeight = (w) => {
    setLocalWeight(w);
    onWeightChange(w);
    if (window.navigator?.vibrate) window.navigator.vibrate(5);
  };

  const handleToggle = () => {
    onToggleComplete(!isCompleted);
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const hasPrevious = previousWeight !== null && previousReps !== null;
  const prevHint = hasPrevious ? `Last: ${previousReps}×${previousWeight}${unit}` : null;

  const chipClass = (active) =>
    `min-w-[2rem] px-2 py-1 rounded-md text-xs font-semibold tabular-nums transition-colors ${
      active
        ? isDarkMode
          ? "bg-lift-primary text-iron-950"
          : "bg-workout-primary text-white"
        : isDarkMode
          ? "bg-iron-800/80 text-iron-400"
          : "bg-white text-slate-600 border border-slate-200"
    }`;

  const stepBtn = (isPlus) =>
    `w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-colors active:scale-95 ${
      isPlus
        ? isDarkMode
          ? "bg-lift-primary text-iron-950"
          : "bg-workout-primary text-white"
        : isDarkMode
          ? "bg-iron-800 text-iron-300"
          : "bg-white border border-slate-200 text-slate-600"
    }`;

  return (
    <div
      className={`
        rounded-2xl border overflow-hidden
        ${
          isCompleted
            ? isDarkMode
              ? "border-lift-primary/50 bg-iron-900/60"
              : "border-green-300 bg-green-50/80"
            : isDarkMode
              ? "border-iron-800 bg-iron-900/30"
              : "border-slate-200 bg-white"
        }
      `}
    >
      {/* Card header: identity + done */}
      <div
        className={`flex items-center justify-between px-3 py-2.5 border-b ${
          isDarkMode ? "border-iron-800/80 bg-iron-900/50" : "border-slate-100 bg-slate-50/80"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`
              w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0
              ${
                isCompleted
                  ? isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-green-500 text-white"
                  : isDarkMode
                    ? "bg-iron-800 text-iron-400"
                    : "bg-slate-200 text-slate-600"
              }
            `}
          >
            {setNumber}
          </span>
          <span className={`text-xs truncate ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            {prevHint || "No prior log"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className={`
            shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors active:scale-95
            ${
              isCompleted
                ? isDarkMode
                  ? "bg-lift-primary text-iron-950"
                  : "bg-green-500 text-white"
                : isDarkMode
                  ? "bg-iron-800 text-iron-500"
                  : "bg-slate-100 text-slate-400"
            }
          `}
          aria-label={isCompleted ? "Mark set not done" : "Mark set complete"}
        >
          <Check className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <FieldBlock title="Reps" hint={null} isDarkMode={isDarkMode}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleRepsChange(-1)}
              className={stepBtn(false)}
              aria-label="Decrease reps"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span
              className={`flex-1 text-center text-2xl font-bold tabular-nums ${
                isDarkMode ? "text-iron-50" : "text-slate-900"
              }`}
            >
              {localReps}
            </span>
            <button
              type="button"
              onClick={() => handleRepsChange(1)}
              className={stepBtn(true)}
              aria-label="Increase reps"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div
            className={`flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-dashed ${
              isDarkMode ? "border-iron-700/40" : "border-slate-200"
            }`}
          >
            {REP_SUGGESTIONS.map((n) => (
              <button key={n} type="button" onClick={() => pickReps(n)} className={chipClass(localReps === n)}>
                {n}
              </button>
            ))}
          </div>
        </FieldBlock>

        <FieldBlock title={`Weight (${unit})`} hint={null} isDarkMode={isDarkMode}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleWeightChange(-weightStep)}
              className={stepBtn(false)}
              aria-label="Decrease weight"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span
              className={`flex-1 text-center text-2xl font-bold tabular-nums ${
                isDarkMode ? "text-iron-50" : "text-slate-900"
              }`}
            >
              {localWeight}
            </span>
            <button
              type="button"
              onClick={() => handleWeightChange(weightStep)}
              className={stepBtn(true)}
              aria-label="Increase weight"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div
            className={`flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-dashed ${
              isDarkMode ? "border-iron-700/40" : "border-slate-200"
            }`}
          >
            {weightSuggestions.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => pickWeight(w)}
                className={chipClass(localWeight === w)}
              >
                {w}
              </button>
            ))}
          </div>
        </FieldBlock>
      </div>
    </div>
  );
}

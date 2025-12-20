import { useState, useEffect } from 'react';
import Stepper from './Stepper';

export default function ExerciseLogModal({
  isOpen,
  exercise,
  history,
  unit = 'kg',
  onClose,
  onLog,
}) {
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(10);
  const [sets, setSets] = useState(3);
  const [isLogging, setIsLogging] = useState(false);

  // Generate presets from history
  const presets = [];
  if (history) {
    // Last used
    if (history.last_weight && history.last_reps && history.last_sets) {
      presets.push({
        label: `${history.last_sets}×${history.last_reps} @ ${history.last_weight}${unit}`,
        weight: history.last_weight,
        reps: history.last_reps,
        sets: history.last_sets,
        type: 'last',
      });
    }
    // PR weight (if different)
    if (history.personal_record_weight && history.personal_record_weight !== history.last_weight) {
      presets.push({
        label: `PR: ${history.last_sets || 3}×${history.last_reps || 8} @ ${history.personal_record_weight}${unit}`,
        weight: history.personal_record_weight,
        reps: history.last_reps || 8,
        sets: history.last_sets || 3,
        type: 'pr',
      });
    }
  }

  // Initialize values from history when modal opens
  useEffect(() => {
    if (isOpen && history) {
      setWeight(history.last_weight || 0);
      setReps(history.last_reps || 10);
      setSets(history.last_sets || 3);
    } else if (isOpen) {
      setWeight(0);
      setReps(10);
      setSets(3);
    }
  }, [isOpen, history]);

  const handlePresetClick = (preset) => {
    setWeight(preset.weight);
    setReps(preset.reps);
    setSets(preset.sets);
  };

  const handleLog = async () => {
    setIsLogging(true);
    try {
      await onLog({
        weight,
        reps,
        sets,
      });
      onClose();
    } catch (err) {
      console.error('Error logging exercise:', err);
    } finally {
      setIsLogging(false);
    }
  };

  if (!isOpen || !exercise) return null;

  const weightStep = unit === 'kg' ? 2.5 : 5;

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="modal-content animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-iron-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-iron-100">{exercise.name}</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-iron-500 hover:text-iron-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-6">
          {/* Quick Presets */}
          {presets.length > 0 && (
            <div className="mb-6">
              <p className="text-iron-500 text-sm mb-2">Quick presets:</p>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handlePresetClick(preset)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${preset.type === 'pr' 
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                        : 'bg-lift-primary/20 text-lift-primary border border-lift-primary/30'
                      }
                      active:scale-95
                    `}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setWeight(0);
                    setReps(10);
                    setSets(3);
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium
                           bg-iron-800 text-iron-400 active:scale-95"
                >
                  Custom
                </button>
              </div>
            </div>
          )}

          {/* Manual Input */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-iron-800/50 rounded-xl">
              <span className="text-iron-400">Weight</span>
              <Stepper
                value={weight}
                onChange={setWeight}
                step={weightStep}
                min={0}
                max={500}
                unit={unit}
                size="md"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-iron-800/50 rounded-xl">
              <span className="text-iron-400">Reps</span>
              <Stepper
                value={reps}
                onChange={setReps}
                step={1}
                min={1}
                max={100}
                size="md"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-iron-800/50 rounded-xl">
              <span className="text-iron-400">Sets</span>
              <Stepper
                value={sets}
                onChange={setSets}
                step={1}
                min={1}
                max={20}
                size="md"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 bg-iron-800/30 rounded-xl text-center">
            <p className="text-iron-500 text-sm">You're logging</p>
            <p className="text-iron-100 text-lg font-bold font-mono">
              {sets} × {reps} @ {weight}{unit}
            </p>
            <p className="text-iron-600 text-xs mt-1">
              Total volume: {(sets * reps * weight).toLocaleString()}{unit}
            </p>
          </div>

          {/* Log Button */}
          <button
            onClick={handleLog}
            disabled={isLogging}
            className="w-full mt-6 py-4 rounded-xl bg-lift-primary text-iron-950 font-bold text-lg
                     active:bg-lift-secondary transition-colors disabled:opacity-50
                     flex items-center justify-center gap-2"
          >
            {isLogging ? (
              <>
                <div className="w-5 h-5 border-2 border-iron-950 border-t-transparent rounded-full animate-spin" />
                Logging...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Log Exercise
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}


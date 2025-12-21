import { useState, useEffect } from 'react';
import { X, Minus, Plus, Check, Zap, RotateCcw } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import ExerciseIcon from '@/components/ExerciseIcon';

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
    if (history.last_weight && history.last_reps && history.last_sets) {
      presets.push({
        label: `${history.last_sets}×${history.last_reps} @ ${history.last_weight}${unit}`,
        weight: history.last_weight,
        reps: history.last_reps,
        sets: history.last_sets,
        type: 'last',
      });
    }
    if (history.personal_record_weight && history.personal_record_weight !== history.last_weight) {
      presets.push({
        label: `PR: ${history.personal_record_weight}${unit}`,
        weight: history.personal_record_weight,
        reps: history.last_reps || 8,
        sets: history.last_sets || 3,
        type: 'pr',
      });
    }
  }

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
      await onLog({ weight, reps, sets });
      onClose();
    } catch (err) {
      console.error('Error logging exercise:', err);
    } finally {
      setIsLogging(false);
    }
  };

  const weightStep = unit === 'kg' ? 2.5 : 5;

  const StepperRow = ({ label, value, onChange, step, min, max, suffix = '' }) => (
    <div className="flex items-center justify-between p-4 bg-iron-800/50 rounded-2xl">
      <span className="text-iron-300 font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-12 h-12 rounded-xl bg-iron-700 flex items-center justify-center active:bg-iron-600 transition-colors"
        >
          <Minus className="w-5 h-5 text-iron-300" />
        </button>
        <div className="w-20 text-center">
          <span className="text-2xl font-bold text-iron-100">{value}</span>
          {suffix && <span className="text-sm text-iron-500 ml-1">{suffix}</span>}
        </div>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-12 h-12 rounded-xl bg-iron-700 flex items-center justify-center active:bg-iron-600 transition-colors"
        >
          <Plus className="w-5 h-5 text-iron-300" />
        </button>
      </div>
    </div>
  );

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-iron-800 pb-4">
          <div className="flex items-center gap-3">
            {/* Exercise Icon */}
            <div className="w-14 h-14 rounded-xl bg-iron-800 flex items-center justify-center flex-shrink-0">
              <ExerciseIcon 
                name={exercise?.name} 
                className="w-10 h-10" 
                color="#22c55e"
              />
            </div>
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-xl truncate">{exercise?.name}</DrawerTitle>
              <p className="text-iron-500 text-sm capitalize">{exercise?.category}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-iron-800 flex items-center justify-center flex-shrink-0"
            >
              <X className="w-4 h-4 text-iron-400" />
            </button>
          </div>
        </DrawerHeader>

        <div className="px-4 py-4 space-y-4 overflow-y-auto">
          {/* Quick Presets */}
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {presets.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => handlePresetClick(preset)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95
                    ${preset.type === 'pr' 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                      : 'bg-lift-primary/20 text-lift-primary border border-lift-primary/30'
                    }
                  `}
                >
                  {preset.type === 'last' ? (
                    <RotateCcw className="w-4 h-4" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {/* Steppers */}
          <div className="space-y-3">
            <StepperRow
              label="Weight"
              value={weight}
              onChange={setWeight}
              step={weightStep}
              min={0}
              max={500}
              suffix={unit}
            />
            <StepperRow
              label="Reps"
              value={reps}
              onChange={setReps}
              step={1}
              min={1}
              max={100}
            />
            <StepperRow
              label="Sets"
              value={sets}
              onChange={setSets}
              step={1}
              min={1}
              max={20}
            />
          </div>

          {/* Summary */}
          <div className="p-4 bg-gradient-to-r from-lift-primary/10 to-transparent rounded-2xl border border-lift-primary/20">
            <p className="text-iron-400 text-sm">Total Volume</p>
            <p className="text-2xl font-bold text-iron-100 font-mono">
              {(sets * reps * weight).toLocaleString()}<span className="text-sm text-iron-400 ml-1">{unit}</span>
            </p>
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
                Log {sets} set{sets !== 1 ? 's' : ''} of {reps} rep{reps !== 1 ? 's' : ''} at {weight}{unit}
              </>
            )}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

import { useState } from 'react';
import ExerciseIcon from '@/components/ExerciseIcon';
import { Check, Trash2, MoreVertical, Pencil } from 'lucide-react';

export default function LogCard({ 
  exerciseName, 
  sets, 
  totalReps, 
  weightRange, 
  unit,
  onEdit,
  onDelete 
}) {
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    setIsDeleting(true);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(20);
    }
    setTimeout(() => {
      onDelete?.();
    }, 200);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setShowActions(false);
    onEdit?.();
  };

  const handleCardClick = () => {
    if (showActions) {
      setShowActions(false);
    } else {
      onEdit?.();
    }
  };

  const toggleActions = (e) => {
    e.stopPropagation();
    setShowActions(!showActions);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(5);
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl transition-all duration-200 ${isDeleting ? 'opacity-0 scale-95' : ''}`}>
      {/* Card content */}
      <div
        className="relative bg-iron-900 p-4 rounded-2xl"
        onClick={handleCardClick}
      >
        <div className="flex items-center gap-3">
          {/* Exercise Icon */}
          <div className="w-14 h-14 rounded-xl bg-iron-800 flex items-center justify-center flex-shrink-0">
            <ExerciseIcon 
              name={exerciseName} 
              className="w-10 h-10" 
              color="#22c55e"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-iron-100 font-semibold text-base truncate">{exerciseName}</h3>
            <p className="text-iron-400 text-sm mt-0.5">
              {sets} set{sets !== 1 ? 's' : ''} · {totalReps} reps · {weightRange}{unit}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            {showActions ? (
              <>
                <button
                  onClick={handleEdit}
                  className="w-10 h-10 rounded-xl bg-iron-800 flex items-center justify-center active:bg-iron-700"
                >
                  <Pencil className="w-4 h-4 text-iron-400" />
                </button>
                <button
                  onClick={handleDelete}
                  className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center active:bg-red-500/30"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-lift-primary/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-lift-primary" />
                </div>
                <button
                  onClick={toggleActions}
                  className="w-8 h-8 rounded-lg flex items-center justify-center active:bg-iron-800"
                >
                  <MoreVertical className="w-4 h-4 text-iron-500" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

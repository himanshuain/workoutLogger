import { useState, useRef } from 'react';
import ExerciseIcon from '@/components/ExerciseIcon';
import { Check, Trash2 } from 'lucide-react';

export default function LogCard({ 
  exerciseName, 
  sets, 
  totalReps, 
  weightRange, 
  unit,
  onEdit,
  onDelete 
}) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Only allow left swipe (negative)
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -100));
    } else {
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    
    if (swipeOffset < -60) {
      // Show delete button
      setSwipeOffset(-80);
    } else {
      setSwipeOffset(0);
    }
  };

  const handleDelete = () => {
    setIsDeleting(true);
    // Haptic feedback
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(20);
    }
    setTimeout(() => {
      onDelete?.();
    }, 200);
  };

  const handleTap = () => {
    if (swipeOffset === 0) {
      onEdit?.();
    } else {
      setSwipeOffset(0);
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-xl transition-all duration-200 ${isDeleting ? 'opacity-0 scale-95' : ''}`}>
      {/* Delete background */}
      <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
        <button 
          onClick={handleDelete}
          className="w-full h-full flex items-center justify-center"
        >
          <Trash2 className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Card content */}
      <div
        className="relative bg-iron-900 p-4 rounded-2xl transition-transform"
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}
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
          
          <div className="w-8 h-8 rounded-full bg-lift-primary/20 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-lift-primary" />
          </div>
        </div>

        {/* Swipe hint */}
        {/* {swipeOffset === 0 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-iron-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        )} */}
      </div>
    </div>
  );
}


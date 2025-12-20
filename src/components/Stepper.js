import { useState, useRef, useCallback, useEffect } from 'react';

export default function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  unit = '',
  label = '',
  size = 'md',
}) {
  const [isHolding, setIsHolding] = useState(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const holdStartRef = useRef(null);

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const increment = useCallback(() => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
    triggerHaptic();
  }, [value, step, max, onChange, triggerHaptic]);

  const decrement = useCallback(() => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
    triggerHaptic();
  }, [value, step, min, onChange, triggerHaptic]);

  const startHold = useCallback((action) => {
    setIsHolding(true);
    holdStartRef.current = Date.now();
    
    // Start slow, speed up after holding
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        action();
      }, 100); // Fast repeat
    }, 300); // Delay before fast repeat starts
  }, []);

  const stopHold = useCallback(() => {
    setIsHolding(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHold();
    };
  }, [stopHold]);

  const sizeClasses = {
    sm: {
      button: 'w-9 h-9 text-lg',
      value: 'text-base min-w-[40px]',
      label: 'text-xs',
    },
    md: {
      button: 'w-11 h-11 text-xl',
      value: 'text-lg min-w-[50px]',
      label: 'text-xs',
    },
    lg: {
      button: 'w-14 h-14 text-2xl',
      value: 'text-xl min-w-[60px]',
      label: 'text-sm',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className={`text-iron-500 mb-1 ${classes.label}`}>{label}</span>
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`stepper-btn rounded-xl bg-iron-800 text-iron-300 flex items-center justify-center font-bold select-none ${classes.button}`}
          onClick={decrement}
          onTouchStart={() => startHold(decrement)}
          onTouchEnd={stopHold}
          onMouseDown={() => startHold(decrement)}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          disabled={value <= min}
        >
          −
        </button>
        
        <div className={`text-center font-mono font-semibold text-iron-100 ${classes.value}`}>
          {value}{unit && <span className="text-iron-500 text-sm ml-0.5">{unit}</span>}
        </div>
        
        <button
          type="button"
          className={`stepper-btn rounded-xl bg-iron-800 text-iron-300 flex items-center justify-center font-bold select-none ${classes.button}`}
          onClick={increment}
          onTouchStart={() => startHold(increment)}
          onTouchEnd={stopHold}
          onMouseDown={() => startHold(increment)}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}


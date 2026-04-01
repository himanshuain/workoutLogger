import { useEffect, useState } from "react";
import { motion, useDragControls, useMotionValue, useTransform } from "framer-motion";
import { Hand } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import SetCard from "@/components/SetCard";

const SWIPE_THRESHOLD = 88;
const VELOCITY_THRESHOLD = 420;
const SWIPE_HINT_KEY = "workout-logger-swipe-set-hint-dismissed";

/**
 * Tinder-style horizontal swipe between sets. Drag is ignored when the gesture
 * starts on reps/weight sliders ([data-no-swipe-deck]) or buttons.
 */
export default function SetSwipeDeck({
  sortedSets,
  activeIndex,
  onActiveIndexChange,
  unit,
  onWeightChange,
  onRepsChange,
  onToggleComplete,
}) {
  const { isDarkMode } = useTheme();
  const controls = useDragControls();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-180, 180], [-12, 12]);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SWIPE_HINT_KEY) === "1") return;
    setShowSwipeHint(true);
  }, []);

  useEffect(() => {
    if (!showSwipeHint) return;
    const t = window.setTimeout(() => {
      setShowSwipeHint(false);
      sessionStorage.setItem(SWIPE_HINT_KEY, "1");
    }, 12000);
    return () => window.clearTimeout(t);
  }, [showSwipeHint]);

  const dismissSwipeHint = () => {
    setShowSwipeHint(false);
    if (typeof window !== "undefined") sessionStorage.setItem(SWIPE_HINT_KEY, "1");
  };

  const activeSet = sortedSets[activeIndex];
  const canPrev = activeIndex > 0;
  const canNext = activeIndex < sortedSets.length - 1;
  const nextSet = sortedSets[activeIndex + 1];

  useEffect(() => {
    x.set(0);
  }, [activeIndex, activeSet?.id, x]);

  if (!activeSet) return null;

  const shouldIgnoreSwipeStart = target => {
    if (!(target instanceof Element)) return true;
    return Boolean(target.closest("[data-no-swipe-deck], button, a, input, textarea"));
  };

  const onPointerDownCapture = e => {
    if (shouldIgnoreSwipeStart(e.target)) return;
    controls.start(e);
  };

  const onDragEnd = (_, info) => {
    x.set(0);
    const { offset, velocity } = info;
    const ox = offset.x;
    const vx = velocity.x;
    let dir = 0;
    if ((ox < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) && canNext) dir = 1;
    else if ((ox > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) && canPrev) dir = -1;
    if (dir !== 0) {
      dismissSwipeHint();
      onActiveIndexChange(activeIndex + dir);
    }
  };

  const dotActive = isDarkMode ? "bg-lift-primary" : "bg-workout-primary";
  const dotIdle = isDarkMode ? "bg-iron-600" : "bg-slate-300";

  return (
    <div className="relative">
      {sortedSets.length > 1 && showSwipeHint && (
        <div className="mb-2 flex h-9 items-center justify-center" aria-hidden>
          <motion.div
            className="pointer-events-none"
            animate={{ opacity: [0.45, 0.95, 0.45] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          >
            <motion.div
              animate={{ x: [0, 22, 0, -22, 0] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            >
              <Hand
                className={`h-8 w-8 ${isDarkMode ? "text-lift-primary/90" : "text-workout-primary"}`}
                strokeWidth={1.5}
              />
            </motion.div>
          </motion.div>
        </div>
      )}

      {sortedSets.length > 1 && (
        <div
          className={`mb-2 flex items-center justify-center gap-1.5 `}
          role="tablist"
          aria-label="Sets — swipe the card horizontally, or tap a dot"
        >
          {sortedSets.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Set ${s.set_number}`}
              onClick={() => {
                dismissSwipeHint();
                onActiveIndexChange(i);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? `w-6 ${dotActive}` : `w-1.5 ${dotIdle} opacity-45`
              }`}
            />
          ))}
        </div>
      )}

      {nextSet ? (
        <div
          className={`pointer-events-none absolute inset-x-2 top-[5.5rem] z-0 rounded-2xl border p-3 opacity-30 scale-[0.97] sm:top-24 ${
            isDarkMode ? "border-iron-800 bg-iron-900/40" : "border-slate-200 bg-white"
          }`}
          aria-hidden
        >
          <p className={`text-xs font-semibold ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>
            Set {nextSet.set_number}
          </p>
        </div>
      ) : null}

      <motion.div
        key={activeSet.id}
        className="relative z-10 touch-pan-y"
        style={{ rotate }}
        drag="x"
        dragControls={controls}
        dragListener={false}
        dragElastic={0.18}
        dragConstraints={{
          left: canNext ? -320 : 0,
          right: canPrev ? 320 : 0,
        }}
        onPointerDownCapture={onPointerDownCapture}
        onDrag={(_, info) => x.set(info.offset.x)}
        onDragEnd={onDragEnd}
      >
        <SetCard
          setNumber={activeSet.set_number}
          weight={activeSet.weight}
          reps={activeSet.reps}
          previousWeight={activeSet.previous_weight}
          previousReps={activeSet.previous_reps}
          isCompleted={activeSet.is_completed}
          unit={unit}
          onWeightChange={w => onWeightChange(activeSet.id, w)}
          onRepsChange={r => onRepsChange(activeSet.id, r)}
          onToggleComplete={done => onToggleComplete(activeSet.id, done)}
        />
      </motion.div>
    </div>
  );
}

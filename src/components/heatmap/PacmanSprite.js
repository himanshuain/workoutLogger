import { motion } from "framer-motion";

const ROTATION = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};

export default function PacmanSprite({
  direction = "right",
  mouthOpen = true,
  size = 32,
  isRunning = true,
  isEating = false,
}) {
  const rotation = ROTATION[direction] ?? 0;

  return (
    <div
      className="pointer-events-none"
      style={{
        width: size,
        height: size,
        transform: `rotate(${rotation}deg)`,
      }}
      aria-hidden
    >
      <motion.div
        className="h-full w-full drop-shadow-lg"
        animate={
          isEating
            ? { scale: [1, 1.2, 1.04], y: [0, -1, 0] }
            : isRunning
              ? {
                  scale: mouthOpen ? [1, 1.1, 0.96, 1.08] : [1.08, 0.94, 1.1, 1],
                  y: [0, -3, 0, -2],
                }
              : { scale: 1, y: 0 }
        }
        transition={
          isEating
            ? { duration: 0.32, ease: "easeOut" }
            : { duration: 0.42, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <circle cx="12" cy="12" r="10" fill="#facc15" />
          <path
            d={
              mouthOpen
                ? "M12 12 L22 4 A10 10 0 0 0 22 20 Z"
                : "M12 12 L22 11 A10 10 0 0 0 22 13 Z"
            }
            fill={mouthOpen ? "#fefce8" : "#facc15"}
          />
          <circle cx="15" cy="9" r="1.5" fill="#422006" />
        </svg>
      </motion.div>
    </div>
  );
}

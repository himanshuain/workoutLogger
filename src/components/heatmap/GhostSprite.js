import { motion } from "framer-motion";

export default function GhostSprite({ size = 30, isBeingEaten = false }) {
  return (
    <motion.div
      className="pointer-events-none flex items-center justify-center"
      style={{ width: size, height: size }}
      animate={
        isBeingEaten
          ? { scale: [1, 1.12, 0.2], opacity: [1, 1, 0], y: [0, -2, 6] }
          : { scale: [1, 1.06, 1], y: [0, -2, 0] }
      }
      transition={
        isBeingEaten
          ? { duration: 0.38, ease: "easeIn" }
          : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
      }
      aria-hidden
    >
      <img
        src="/easter-egg/ghost.png"
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain drop-shadow-sm"
        draggable={false}
      />
    </motion.div>
  );
}

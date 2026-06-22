import { motion } from "framer-motion";

export default function EatSplatter({ size = 38, mini = false }) {
  const splatterSize = mini ? size * 0.85 : size;

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
      initial={{ scale: 0.35, opacity: 0 }}
      animate={{ scale: [0.35, 1.08, 1], opacity: [0, 1, 0.92] }}
      exit={{ scale: 1.15, opacity: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      aria-hidden
    >
      <img
        src="/easter-egg/blood-splatter.png"
        alt=""
        width={splatterSize}
        height={splatterSize}
        className="object-contain"
        draggable={false}
      />
    </motion.div>
  );
}

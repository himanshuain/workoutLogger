import { motion } from "framer-motion";

// Spring configuration for consistent animations
const springConfig = {
  type: "spring",
  stiffness: 400,
  damping: 25,
  mass: 0.8,
};

const gentleSpring = {
  type: "spring", 
  stiffness: 300,
  damping: 30,
  mass: 1,
};

export function FadeIn({ children, delay = 0, className = "", duration = 0.4, y = 10 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SpringIn({ children, delay = 0, className = "", y = 12 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...springConfig, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...gentleSpring, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideUp({ children, delay = 0, className = "", distance = 20 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springConfig, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, className = "", stagger = 0.06 }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { ...springConfig } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Interactive feedback components
export function PressableScale({ children, className = "", scale = 0.97 }) {
  return (
    <motion.div
      whileTap={{ scale }}
      transition={{ ...springConfig, duration: 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HoverScale({ children, className = "", scale = 1.02 }) {
  return (
    <motion.div
      whileHover={{ scale }}
      transition={springConfig}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Success/completion animation
export function SuccessBounce({ children, className = "", trigger = false }) {
  return (
    <motion.div
      animate={trigger ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Layout transition for shared elements
export function SharedLayout({ children, layoutId, className = "" }) {
  return (
    <motion.div
      layoutId={layoutId}
      transition={springConfig}
      className={className}
    >
      {children}
    </motion.div>
  );
}

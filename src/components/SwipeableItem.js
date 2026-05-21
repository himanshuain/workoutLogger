"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Trash2 } from "lucide-react";

const DELETE_THRESHOLD = 80;

export default function SwipeableItem({
  children,
  onDelete,
  onEdit,
  isDarkMode,
  disabled = false,
}) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -80], [1, 0.6]);

  const handleDragEnd = (_, info) => {
    if (disabled) return;
    if (info.offset.x < -DELETE_THRESHOLD) {
      onDelete?.();
    } else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  };

  return (
    <div className="overflow-hidden rounded-card relative">
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 gap-2 bg-red-500 text-white min-w-[100px]"
        style={{ opacity: deleteOpacity }}
      >
        <Trash2 size={20} />
        <span className="text-sm font-medium">Delete</span>
      </motion.div>
      <motion.div
        className={`relative z-10 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
        style={{ x }}
        drag={disabled ? false : "x"}
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}

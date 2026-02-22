import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";

export default function DragReorderList({ items, onReorder, renderItem, keyExtractor, isDarkMode }) {
  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={onReorder}
      className="space-y-2"
    >
      {items.map((item) => (
        <Reorder.Item
          key={keyExtractor(item)}
          value={item}
          className="list-none"
        >
          <div className="flex items-center gap-2">
            <div
              className={`cursor-grab active:cursor-grabbing p-1 rounded-lg touch-none ${
                isDarkMode ? "text-iron-600 hover:text-iron-400" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              {renderItem(item)}
            </div>
          </div>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}

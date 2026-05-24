import DayPicker from "@/components/DayPicker";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { Check } from "lucide-react";
import {
  segmentSelected,
  segmentUnselected,
  actionPrimary,
  actionSecondary,
} from "@/lib/actionButtonStyles";

const PILL_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#f59e0b",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
];

const PILL_ICONS = [
  "💧",
  "💊",
  "🥩",
  "😴",
  "🧘",
  "🏃",
  "💪",
  "🍎",
  "☀️",
  "🧠",
  "❤️",
  "⚡",
];

export default function HomeAddHabitModal({
  open,
  onOpenChange,
  isDarkMode,
  newHabit,
  setNewHabit,
  onSave,
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
        <ModalHeader>
          <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>Add New Habit</ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
              Name
            </label>
            <input
              type="text"
              value={newHabit.name}
              onChange={e => setNewHabit({ ...newHabit, name: e.target.value })}
              placeholder="e.g., Water, Sleep, Creatine"
              className={`input-field ${
                isDarkMode
                  ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                  : "bg-slate-100 text-slate-800 placeholder-slate-400"
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
              Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewHabit({ ...newHabit, type: "habit", has_value: false })}
                className={`flex-1 py-3 rounded-card text-sm font-medium flex items-center justify-center gap-2 ${
                  newHabit.type === "habit"
                    ? segmentSelected(isDarkMode)
                    : segmentUnselected(isDarkMode)
                }`}
              >
                {newHabit.type === "habit" && <Check className="w-4 h-4" />}
                Habit (Yes/No)
              </button>
              <button
                type="button"
                onClick={() => setNewHabit({ ...newHabit, type: "health", has_value: true })}
                className={`flex-1 py-3 rounded-card text-sm font-medium flex items-center justify-center gap-2 ${
                  newHabit.type === "health"
                    ? segmentSelected(isDarkMode)
                    : segmentUnselected(isDarkMode)
                }`}
              >
                {newHabit.type === "health" && <Check className="w-4 h-4" />}
                Health (Value)
              </button>
            </div>
          </div>

          {newHabit.type === "health" && (
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Unit
              </label>
              <input
                type="text"
                value={newHabit.value_unit}
                onChange={e => setNewHabit({ ...newHabit, value_unit: e.target.value })}
                placeholder="e.g., hours, liters, 1-10"
                className={`input-field ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400"
                }`}
              />
            </div>
          )}

          <div>
            <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
              Icon
            </label>
            <EmojiPicker
              value={newHabit.icon}
              onChange={icon => setNewHabit({ ...newHabit, icon })}
              presets={PILL_ICONS}
              isDarkMode={isDarkMode}
            />
          </div>

          <div>
            <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
              Color
            </label>
            <ColorPicker
              value={newHabit.color}
              onChange={color => setNewHabit({ ...newHabit, color })}
              presets={PILL_COLORS}
              isDarkMode={isDarkMode}
            />
          </div>

          <DayPicker
            value={newHabit.active_days}
            onChange={days => setNewHabit({ ...newHabit, active_days: days })}
            isDarkMode={isDarkMode}
          />
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={`flex-1 py-3 rounded-card font-medium ${actionSecondary(isDarkMode)}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!newHabit.name.trim()}
            className={`flex-1 py-3 rounded-card font-bold disabled:opacity-50 flex items-center justify-center gap-2 ${actionPrimary(isDarkMode)}`}
          >
            <Check className="w-4 h-4" />
            Add Habit
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

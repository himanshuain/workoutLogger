import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from "@/components/ui/modal";
import { Dumbbell, ChevronRight } from "lucide-react";
import { formatChipLabel } from "@/lib/dateLogUtils";

export default function HomeRoutineSelectorModal({
  open,
  onOpenChange,
  isDarkMode,
  routineSelectorMode,
  isViewingToday,
  viewingDate,
  today,
  routines,
  isStartingWorkout,
  onSelectRoutine,
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
        <ModalHeader>
          <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
            {routineSelectorMode === "markDone"
              ? "Mark done — pick a routine"
              : isViewingToday
                ? "Choose a Routine"
                : `Choose routine for ${formatChipLabel(viewingDate, today)}`}
          </ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-2">
          {routines.map(routine => (
            <button
              key={routine.id}
              type="button"
              onClick={() => onSelectRoutine(routine)}
              disabled={isStartingWorkout}
              className={`w-full p-4 rounded-card text-left transition-all disabled:opacity-50 disabled:pointer-events-none ${
                isDarkMode ? "bg-iron-800 hover:bg-iron-700" : "bg-slate-100 hover:bg-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-card flex items-center justify-center"
                  style={{ backgroundColor: `${routine.color}20` }}
                >
                  <Dumbbell className="w-6 h-6" style={{ color: routine.color }} />
                </div>
                <div className="flex-1">
                  <p className={`font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                    {routine.name}
                  </p>
                  <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    {routine.routine_exercises?.length || 0} exercises
                  </p>
                </div>
                <ChevronRight className={`w-5 h-5 ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
              </div>
            </button>
          ))}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

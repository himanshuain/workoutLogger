import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter } from "@/components/ui/modal";
import { sheetTopActionButtonClass } from "@/components/ui/sheetTopActions";
import { useWorkout } from "@/context/WorkoutContext";

/**
 * Log or update body weight for a given date (shared by dashboard tracker + Today life log).
 */
export default function LogBodyWeightSheet({
  open,
  onOpenChange,
  isDarkMode,
  trackableId,
  date,
  initialValue = "",
  onSaved,
}) {
  const { today, toggleTrackingEntry, toggleTrackingEntryForDate } = useWorkout();
  const queryClient = useQueryClient();
  const [logWeight, setLogWeight] = useState("");
  const [logDate, setLogDate] = useState(date || today);

  useEffect(() => {
    if (!open) return;
    setLogDate(date || today);
    setLogWeight(initialValue != null && initialValue !== "" ? String(initialValue) : "");
  }, [open, date, today, initialValue]);

  const close = () => onOpenChange(false);

  const handleSave = async () => {
    if (!trackableId || !logWeight) return;
    const value = parseFloat(logWeight);
    if (!Number.isFinite(value)) {
      toast.error("Enter a valid weight");
      return;
    }
    if (logDate === today) {
      await toggleTrackingEntry(trackableId, true, value);
    } else {
      await toggleTrackingEntryForDate(trackableId, logDate, true, value);
    }
    toast.success(`Weight logged: ${value} kg`);
    queryClient.invalidateQueries({ queryKey: ["bodyWeightHistory"] });
    queryClient.invalidateQueries({ queryKey: ["trackingEntriesForDate"] });
    queryClient.invalidateQueries({ queryKey: ["trackingEntries"] });
    queryClient.invalidateQueries({ queryKey: ["trackingEntriesForHeatmap"] });
    onSaved?.();
    close();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        showCloseButton
        className={cn(
          "flex min-h-0 flex-col overflow-hidden",
          isDarkMode ? "border-iron-800 bg-iron-900" : "border-slate-200 bg-white",
        )}
      >
        <ModalFooter>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!logWeight.trim()}
            className={sheetTopActionButtonClass(isDarkMode, { primary: true })}
          >
            Save
          </button>
        </ModalFooter>
        <ModalHeader>
          <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
            Log weight
          </ModalTitle>
        </ModalHeader>
        <ModalBody className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div>
            <label className={`mb-2 block text-sm ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
              Date
            </label>
            <input
              type="date"
              value={logDate}
              onChange={e => setLogDate(e.target.value)}
              max={today}
              className={`input-field w-full ${
                isDarkMode
                  ? "border-iron-700 bg-iron-800 text-iron-100"
                  : "border-slate-200 bg-slate-50 text-slate-800"
              }`}
            />
          </div>
          <div>
            <label className={`mb-2 block text-sm ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
              Weight (kg)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={logWeight}
              onChange={e => setLogWeight(e.target.value)}
              placeholder="e.g. 72.5"
              className={`input-field w-full text-center text-2xl font-bold ${
                isDarkMode
                  ? "border-iron-700 bg-iron-800 text-iron-100"
                  : "border-slate-200 bg-slate-50 text-slate-800"
              }`}
              autoFocus
            />
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

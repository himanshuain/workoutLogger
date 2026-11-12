import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { actionPrimary, actionSecondary, actionDestructive } from "@/lib/actionButtonStyles";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export default function BikeTrackerManageSheet({
  open,
  onOpenChange,
  isDarkMode,
  tracker,
  onSave,
  onDelete,
  saving = false,
}) {
  const [name, setName] = useState("");
  const [reminderDays, setReminderDays] = useState("");

  useEffect(() => {
    if (open && tracker) {
      setName(tracker.name || "");
      setReminderDays(tracker.reminder_days ? String(tracker.reminder_days) : "");
    }
  }, [open, tracker]);

  if (!tracker) return null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : ""}>
        <ModalHeader>
          <ModalTitle className={isDarkMode ? "text-iron-50" : ""}>Edit tracker</ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className={cn(
                "w-full rounded-card px-3 py-2.5 text-sm outline-none",
                isDarkMode ? "bg-iron-800 text-iron-100" : "bg-slate-50 border border-slate-200",
              )}
            />
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Remind every (days)
            </label>
            <input
              type="number"
              min="1"
              value={reminderDays}
              onChange={e => setReminderDays(e.target.value)}
              placeholder="Optional"
              className={cn(
                "w-full rounded-card px-3 py-2.5 text-sm outline-none",
                isDarkMode ? "bg-iron-800 text-iron-100" : "bg-slate-50 border border-slate-200",
              )}
            />
          </div>
        </ModalBody>
        <ModalFooter className="flex-col gap-2">
          <button
            type="button"
            onClick={() =>
              onSave({
                name: name.trim() || tracker.name,
                reminder_days: reminderDays ? parseInt(reminderDays, 10) : null,
              })
            }
            disabled={saving}
            className={cn("w-full rounded-card py-2.5 text-sm font-semibold", actionPrimary(isDarkMode))}
          >
            Save tracker
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={cn(
              "w-full rounded-card py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5",
              actionDestructive(isDarkMode),
            )}
          >
            <Trash2 className="w-4 h-4" />
            Delete tracker & all logs
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className={cn("w-full rounded-card py-2.5 text-sm font-semibold", actionSecondary(isDarkMode))}>
            Cancel
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

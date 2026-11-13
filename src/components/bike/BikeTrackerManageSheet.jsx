import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import {
  sheetHeaderWithTopActionsClass,
  sheetTopActionButtonClass,
  sheetTopActionDestructiveClass,
} from "@/components/ui/sheetTopActions";
import { cn } from "@/lib/utils";
import { Check, Trash2 } from "lucide-react";

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

  const handleSave = () => {
    onSave({
      name: name.trim() || tracker.name,
      reminder_days: reminderDays ? parseInt(reminderDays, 10) : null,
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="flex min-h-0 flex-col overflow-hidden">
        <ModalFooter className="flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onDelete}
            className={sheetTopActionDestructiveClass(isDarkMode)}
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
            Delete
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className={cn(sheetTopActionButtonClass(isDarkMode, { primary: true }), "gap-1")}
          >
            <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {saving ? "Saving…" : "Save"}
          </button>
        </ModalFooter>
        <ModalHeader className={sheetHeaderWithTopActionsClass}>
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
          <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            Delete removes this tracker and all of its log entries.
          </p>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

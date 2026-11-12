import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { normalizeTags } from "@/lib/bikeLogUtils";
import { actionPrimary, actionSecondary } from "@/lib/actionButtonStyles";
import { cn } from "@/lib/utils";

export default function BikeLogTagSheet({
  open,
  onOpenChange,
  isDarkMode,
  logLabel,
  initialTags = [],
  onSave,
  saving = false,
}) {
  const [selected, setSelected] = useState([]);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (open) {
      setSelected(normalizeTags(initialTags));
      setCustom("");
    }
  }, [open, initialTags]);

  const toggle = tag => {
    setSelected(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const addCustom = () => {
    const parts = normalizeTags(custom.split(/[\s,]+/));
    if (parts.length === 0) return;
    setSelected(prev => [...new Set([...prev, ...parts])]);
    setCustom("");
  };

  const handleSave = async () => {
    await onSave(selected);
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : ""}>
        <ModalHeader>
          <ModalTitle className={isDarkMode ? "text-iron-50" : ""}>Tags</ModalTitle>
          {logLabel ? (
            <p className={`text-xs mt-1 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>{logLabel}</p>
          ) : null}
        </ModalHeader>
        <ModalBody className="space-y-4">
          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggle(tag)}
                  className={cn(
                    "rounded-pill px-2.5 py-1 text-[11px] font-semibold capitalize",
                    isDarkMode
                      ? "bg-lift-primary/20 text-lift-primary ring-1 ring-lift-primary/40"
                      : "bg-workout-primary/15 text-workout-primary ring-1 ring-workout-primary/30",
                  )}
                >
                  {tag} ×
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2">
            <input
              type="text"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Type a tag"
              className={cn(
                "flex-1 rounded-card px-3 py-2 text-sm outline-none",
                isDarkMode
                  ? "bg-iron-800 text-iron-100 placeholder:text-iron-600"
                  : "bg-slate-50 text-slate-800 border border-slate-200",
              )}
            />
            <button
              type="button"
              onClick={addCustom}
              className={cn("rounded-card px-3 py-2 text-sm font-semibold", actionSecondary(isDarkMode))}
            >
              Add
            </button>
          </div>
        </ModalBody>
        <ModalFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn("flex-1 rounded-card py-2.5 text-sm font-semibold", actionSecondary(isDarkMode))}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className={cn(
              "flex-1 rounded-card py-2.5 text-sm font-semibold disabled:opacity-50",
              actionPrimary(isDarkMode),
            )}
          >
            {saving ? "Saving…" : "Save tags"}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

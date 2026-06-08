import { useState } from "react";
import { Settings2 } from "lucide-react";
import { DEFAULT_MACRO_TARGETS } from "@/lib/macroCalculations";
import { cn } from "@/lib/utils";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";

const FIELDS = [
  { key: "protein_g", label: "Protein", unit: "g", step: 5 },
  { key: "carbs_g", label: "Carbs", unit: "g", step: 5 },
  { key: "fat_g", label: "Fat", unit: "g", step: 5 },
  { key: "calories", label: "Calories", unit: "kcal", step: 50 },
];

export default function MacroTargetsEditor({ targets, onSave, isDarkMode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ ...DEFAULT_MACRO_TARGETS });

  const openEditor = () => {
    setDraft({ ...targets });
    setOpen(true);
  };

  const handleSave = async () => {
    await onSave(draft);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-card text-sm font-medium",
          isDarkMode
            ? "bg-iron-800 text-iron-300 hover:bg-iron-700"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200",
        )}
      >
        <Settings2 className="w-4 h-4" />
        Targets
      </button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Daily Macro Targets
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {FIELDS.map(f => (
              <div key={f.key}>
                <label className={cn("block text-sm mb-1.5", isDarkMode ? "text-iron-400" : "text-slate-600")}>
                  {f.label} ({f.unit})
                </label>
                <input
                  type="number"
                  step={f.step}
                  min="0"
                  value={draft[f.key]}
                  onChange={e =>
                    setDraft(prev => ({ ...prev, [f.key]: Math.max(0, Number(e.target.value) || 0) }))
                  }
                  className={cn(
                    "w-full h-12 px-4 rounded-card outline-none focus:ring-2",
                    isDarkMode
                      ? "bg-iron-800 text-iron-100 focus:ring-lift-primary/50"
                      : "bg-slate-100 text-slate-800 focus:ring-amber-500/50",
                  )}
                />
              </div>
            ))}
          </ModalBody>
          <ModalFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                "flex-1 py-3 rounded-card font-medium",
                isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600",
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                "flex-1 py-3 rounded-card font-bold",
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-amber-500 text-white",
              )}
            >
              Save
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

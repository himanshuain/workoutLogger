import { useState, useCallback } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { actionGhost } from "@/lib/actionButtonStyles";
import { resolveExerciseForPreview } from "@/lib/plannerLibraryNavigation";
import ExercisePreviewPanel from "@/components/exercises/ExercisePreviewPanel";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";

/**
 * @param {"inline" | "overlay" | "pill"} variant — inline icon, overlay on cards, or tile pill with label
 */
export default function ExercisePreviewButton({
  exerciseName,
  exerciseId,
  category,
  notes,
  exercises,
  isDarkMode,
  variant = "inline",
  overlayOffset,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [previewExercise, setPreviewExercise] = useState(null);

  const label = exerciseName ? `Preview ${exerciseName}` : "Preview exercise";

  const handleClick = useCallback(
    e => {
      e.stopPropagation();
      e.preventDefault();
      const ex = resolveExerciseForPreview(exercises, {
        exerciseId,
        exerciseName,
        category,
        notes,
      });
      if (!ex) {
        toast.message("Exercise not found in catalog");
        return;
      }
      setPreviewExercise(ex);
      setOpen(true);
    },
    [exercises, exerciseId, exerciseName, category, notes],
  );

  const handleOpenChange = useCallback(next => {
    setOpen(next);
    if (!next) setPreviewExercise(null);
  }, []);

  const isPill = variant === "pill";

  const base = cn(
    "pointer-events-auto flex items-center justify-center border transition-colors touch-manipulation",
    actionGhost(isDarkMode),
    isPill &&
      "min-w-0 flex-1 gap-1 rounded-full px-2 h-8 text-[10px] font-semibold leading-none",
    variant === "inline" && "h-9 w-9 shrink-0 rounded-lg",
    variant === "overlay" && "absolute top-2 z-10 h-8 w-8 rounded-lg",
    variant === "overlay" && (overlayOffset ?? "right-2"),
    className,
  );

  const iconClass = isPill
    ? "h-3.5 w-3.5 shrink-0"
    : variant === "inline"
      ? "h-4 w-4"
      : "h-[18px] w-[18px] sm:h-5 sm:w-5";

  return (
    <>
      <button type="button" onClick={handleClick} className={base} aria-label={label}>
        <Eye className={iconClass} aria-hidden />
        {isPill ? <span className="truncate">Preview</span> : null}
      </button>

      <Modal open={open} onOpenChange={handleOpenChange}>
        <ModalContent
          showCloseButton
          className={cn(
            isDarkMode ? "bg-iron-900 border-iron-800" : "bg-surface-section border-surface-subtle",
            "!max-h-[min(92dvh,760px)] flex min-h-0 flex-col overflow-hidden",
          )}
        >
          <ModalHeader className="shrink-0 pb-2">
            <ModalTitle
              className={cn(
                "line-clamp-2 pr-10",
                isDarkMode ? "!text-iron-50" : "!text-[color:var(--text-primary)]",
              )}
            >
              {previewExercise?.name ?? exerciseName ?? "Exercise"}
            </ModalTitle>
          </ModalHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))] touch-pan-y">
            {previewExercise ? (
              <ExercisePreviewPanel
                exercise={previewExercise}
                isDarkMode={isDarkMode}
                hideHeading
                hideActions
                variant="sheet"
                onOpenExercise={ex => {
                  const next = exercises.find(e => e.id === ex.id);
                  if (next) setPreviewExercise(next);
                }}
              />
            ) : null}
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}

/** Right offset for overlay eye when reset / remove buttons are present. */
export function libraryEyeOverlayClass({ hasTrash, hasReset }) {
  if (hasTrash && hasReset) return "right-[4.75rem]";
  if (hasTrash || hasReset) return "right-10";
  return "right-2";
}

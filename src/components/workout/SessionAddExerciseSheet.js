import { useMemo, useState, useCallback } from "react";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter } from "@/components/ui/modal";
import { sheetTopActionButtonClass } from "@/components/ui/sheetTopActions";
import ExerciseListThumbnail from "@/components/exercises/ExerciseListThumbnail";
import ExercisePreviewPanel from "@/components/exercises/ExercisePreviewPanel";
import { ExerciseSheetTitleRow } from "@/components/exercises/ExerciseSheetTitle";
import { useWorkout } from "@/context/WorkoutContext";
import { useExerciseMediaOverrides } from "@/hooks/useExerciseMediaOverrides";
import { exerciseMatchesSearch } from "@/lib/exerciseCatalog";
import { addSessionExtra } from "@/lib/workoutSessionClient";
import { getExerciseEquipment, exerciseMediaUrl } from "@/lib/exerciseMedia";
import { getSessionAwareCopy } from "@/lib/workoutNavigation";

/**
 * Bottom sheet to add exercises to the active workout session (replaces full-page navigation).
 */
export default function SessionAddExerciseSheet({
  open,
  onOpenChange,
  sessionId,
  session,
  isDarkMode,
  onAdded,
}) {
  const { exercises, activeSession, appendExerciseToRoutine } = useWorkout();
  const mediaOverrides = useExerciseMediaOverrides();
  const [q, setQ] = useState("");
  const [previewExercise, setPreviewExercise] = useState(null);

  const resolvedSession = session ?? activeSession;

  const filtered = useMemo(() => {
    const term = q.trim();
    let list = exercises || [];
    if (term) list = list.filter(e => exerciseMatchesSearch(e, term));
    return list.slice(0, 120);
  }, [exercises, q]);

  const closeSheet = useCallback(() => {
    setPreviewExercise(null);
    setQ("");
    onOpenChange(false);
  }, [onOpenChange]);

  const addExercise = useCallback(
    async exercise => {
      if (!sessionId || !exercise) return;
      const routineRow = {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        category: exercise.category || "other",
        target_sets: 3,
      };

      if (resolvedSession?.routine_id) {
        const result = await appendExerciseToRoutine(resolvedSession.routine_id, routineRow);
        if (result === null) {
          toast.error("Could not add to split");
          return;
        }
        if (result === "exists") {
          toast.message("Already in this split");
        } else {
          toast.success(getSessionAwareCopy(resolvedSession).addedMessage);
        }
      } else {
        addSessionExtra(sessionId, {
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          category: exercise.category || "other",
          equipment: getExerciseEquipment(exercise),
          image_url: exerciseMediaUrl(exercise, mediaOverrides) ?? exercise.gif_url ?? null,
        });
        toast.success(getSessionAwareCopy(resolvedSession).addedMessage);
      }
      onAdded?.({ exerciseName: exercise.name });
      closeSheet();
    },
    [sessionId, resolvedSession, mediaOverrides, onAdded, closeSheet, appendExerciseToRoutine],
  );

  return (
    <>
      <Modal open={open} onOpenChange={next => !next && closeSheet()}>
        <ModalContent
          showCloseButton
          className={cn(
            "flex min-h-0 flex-col overflow-hidden",
            isDarkMode ? "border-iron-800 bg-iron-900" : "border-slate-200 bg-white",
          )}
        >
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Add exercise
            </ModalTitle>
          </ModalHeader>
          <div className="shrink-0 px-4 pb-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-card border px-3 py-2.5",
                isDarkMode
                  ? "border-iron-700 bg-iron-950/80"
                  : "border-slate-200 bg-slate-50",
              )}
            >
              <Search className={cn("h-4 w-4 shrink-0", isDarkMode ? "text-iron-500" : "text-slate-400")} />
              <input
                type="search"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search exercises…"
                className={cn(
                  "min-w-0 flex-1 bg-transparent text-sm outline-none",
                  isDarkMode
                    ? "text-iron-100 placeholder:text-iron-600"
                    : "text-slate-900 placeholder:text-slate-400",
                )}
                autoFocus
              />
            </div>
          </div>
          <ModalBody className="min-h-0 flex-1 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {filtered.map(ex => (
              <div
                key={ex.id}
                className={cn(
                  "flex items-center gap-3 rounded-card border p-2",
                  isDarkMode ? "border-iron-800 bg-iron-950/40" : "border-slate-200 bg-white",
                )}
              >
                <button
                  type="button"
                  onClick={() => setPreviewExercise(ex)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <ExerciseListThumbnail
                    exercise={ex}
                    isDarkMode={isDarkMode}
                    mediaOverrides={mediaOverrides}
                  />
                  <div className="min-w-0">
                    <p className={cn("text-sm font-semibold leading-snug", isDarkMode ? "text-iron-100" : "text-slate-900")}>
                      {ex.name}
                    </p>
                    <p className={cn("text-xs capitalize", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                      {ex.category || "General"}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void addExercise(ex)}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isDarkMode
                      ? "bg-lift-primary text-iron-950"
                      : "bg-workout-primary text-white",
                  )}
                  aria-label={`Add ${ex.name}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ))}
            {filtered.length === 0 ? (
              <p className={cn("py-8 text-center text-sm", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                No exercises match your search.
              </p>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal open={Boolean(previewExercise)} onOpenChange={next => !next && setPreviewExercise(null)}>
        <ModalContent
          showCloseButton
          className={cn(
            "flex min-h-0 flex-col overflow-hidden",
            isDarkMode ? "border-iron-800 bg-iron-900" : "bg-surface-section border-surface-subtle",
          )}
        >
          <ModalFooter>
            <button
              type="button"
              onClick={() => setPreviewExercise(null)}
              className={sheetTopActionButtonClass(isDarkMode)}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => previewExercise && void addExercise(previewExercise)}
              className={sheetTopActionButtonClass(isDarkMode, { primary: true })}
            >
              Add
            </button>
          </ModalFooter>
          {previewExercise?.external_source !== "smartworkout" ? (
            <ModalHeader className="shrink-0">
              <ExerciseSheetTitleRow
                name={previewExercise?.name ?? "Exercise"}
                category={previewExercise?.category}
                isDarkMode={isDarkMode}
              />
            </ModalHeader>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] touch-pan-y">
            {previewExercise ? (
              <ExercisePreviewPanel
                exercise={previewExercise}
                isDarkMode={isDarkMode}
                hideHeading
                hideActions
                variant="sheet"
              />
            ) : null}
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}

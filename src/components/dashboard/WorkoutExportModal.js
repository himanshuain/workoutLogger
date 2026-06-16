import { useState, useCallback } from "react";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { useWorkout } from "@/context/WorkoutContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { actionPrimary, segmentSelected, segmentUnselected } from "@/lib/actionButtonStyles";
import {
  EXPORT_PRESETS,
  buildWorkoutExportPayload,
  downloadWorkoutPdf,
  exportFilename,
  getExportBounds,
} from "@/lib/workoutExport";

export default function WorkoutExportModal({ open, onOpenChange, isDarkMode }) {
  const { user, today, settings, getWorkoutSessions, getExerciseLogs } = useWorkout();
  const unit = settings?.unit || "kg";

  const [presetId, setPresetId] = useState("this_month");
  const [exporting, setExporting] = useState(false);

  const fetchPayload = useCallback(async () => {
    const bounds = getExportBounds(presetId, today);
    const [sessions, legacyLogs] = await Promise.all([
      getWorkoutSessions(bounds.startDate, bounds.endDate),
      getExerciseLogs(bounds.startDate, bounds.endDate),
    ]);

    return buildWorkoutExportPayload({
      sessions,
      legacyLogs,
      unit,
      startDate: bounds.startDate,
      endDate: bounds.endDate,
      presetId,
    });
  }, [presetId, today, getWorkoutSessions, getExerciseLogs, unit]);

  const runExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const payload = await fetchPayload();

      if (payload.summary.workout_days === 0) {
        toast.error("No workouts in this range");
        return;
      }

      await downloadWorkoutPdf(payload, exportFilename("workout-history", "pdf", { presetId }), { presetId });
      toast.success("PDF downloaded");
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-md", isDarkMode && "bg-iron-900 border-iron-800")}>
        <DialogHeader>
          <DialogTitle className={isDarkMode ? "text-iron-100" : undefined}>Export workout history</DialogTitle>
          <DialogDescription className={isDarkMode ? "text-iron-400" : undefined}>
            Download a PDF of exercises, sets, weight & reps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className={cn("text-xs font-medium mb-2", isDarkMode ? "text-iron-400" : "text-slate-500")}>
              Period
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXPORT_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPresetId(preset.id)}
                  className={cn(
                    "rounded-card px-3 py-1.5 text-xs font-semibold transition-colors",
                    presetId === preset.id
                      ? segmentSelected(isDarkMode)
                      : segmentUnselected(isDarkMode),
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={exporting}
            onClick={runExport}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-card px-4 py-3 text-sm font-semibold",
              actionPrimary(isDarkMode),
            )}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Download PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

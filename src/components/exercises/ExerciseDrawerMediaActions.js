import { useState } from "react";
import Image from "next/image";
import GoogleGIcon from "@/components/icons/GoogleGIcon";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { googleImagesSearchUrl, exerciseImageUnoptimized } from "@/lib/exerciseMedia";
import {
  buildExerciseMediaOverridesPatch,
  getExerciseMediaOverrideUrl,
  isValidMediaUrl,
} from "@/lib/exerciseMediaOverrides";
import { cn } from "@/lib/utils";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Google Images shortcut + custom thumbnail URL editor for exercise preview drawers.
 */
export default function ExerciseDrawerMediaActions({
  exercise,
  exerciseName,
  isDarkMode,
  mediaOverrides,
  updateSettings,
  compact = false,
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftUrl, setDraftUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const name = exerciseName || exercise?.name || "";
  const googleHref = googleImagesSearchUrl(name);
  const currentOverride = getExerciseMediaOverrideUrl(exercise, mediaOverrides);

  const openEditor = () => {
    setDraftUrl(currentOverride || "");
    setEditorOpen(true);
  };

  const persistOverride = async url => {
    if (!exercise || !updateSettings) return;
    const patch = buildExerciseMediaOverridesPatch(mediaOverrides, exercise, url);
    if (!patch) return;
    setSaving(true);
    try {
      await updateSettings({ exercise_media_overrides: patch });
      toast.success(url ? "Custom image saved" : "Custom image removed");
      setEditorOpen(false);
    } catch (err) {
      const code = err?.code ?? "";
      const message = String(err?.message ?? "");
      const migrationHint =
        message.includes("exercise_media_overrides") || code === "PGRST204";
      if (migrationHint) {
        toast.error("Saved on this device only — run migration-v15 on Supabase to sync");
      } else if (patch && Object.keys(patch).length) {
        toast.message("Saved on this device — cloud sync failed, will retry on next load");
      } else {
        toast.error("Could not save image");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const trimmed = draftUrl.trim();
    if (!trimmed) {
      await persistOverride("");
      return;
    }
    if (!isValidMediaUrl(trimmed)) {
      toast.error("Enter a valid http(s) image or GIF URL");
      return;
    }
    await persistOverride(trimmed);
  };

  const chipClass = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-pill font-semibold transition-colors",
    compact ? "min-h-[36px] px-3 text-xs" : "min-h-[40px] px-3.5 text-sm",
    isDarkMode
      ? "border border-iron-700 bg-iron-800/90 text-iron-100 hover:bg-iron-700"
      : "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50",
  );

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", compact ? "mt-1" : "mt-2")}>
        {googleHref ? (
          <a
            href={googleHref}
            target="_blank"
            rel="noopener noreferrer"
            className={chipClass}
            aria-label={name ? `Search Google Images for ${name}` : "Search Google Images"}
            title="Search Google Images"
          >
            <GoogleGIcon className="h-4 w-4 shrink-0" />
            <span>Google</span>
          </a>
        ) : null}
        <button type="button" onClick={openEditor} className={chipClass}>
          <ImagePlus className="h-4 w-4 shrink-0" aria-hidden />
          {currentOverride ? "Change image" : "Add image / GIF"}
        </button>
      </div>

      <Modal open={editorOpen} onOpenChange={setEditorOpen}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-900"}>
              Custom thumbnail
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <p className={`text-sm ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
              Paste a direct link to an image or GIF. It will show first in the drawer and as the list thumbnail.
            </p>
            <input
              type="url"
              inputMode="url"
              autoFocus
              value={draftUrl}
              onChange={e => setDraftUrl(e.target.value)}
              placeholder="https://…/photo.jpg or .gif"
              className={cn(
                "w-full rounded-card border px-3 py-3 text-base outline-none focus:ring-2",
                isDarkMode
                  ? "border-iron-700 bg-iron-900 text-iron-100 placeholder:text-iron-600 focus:ring-lift-primary/40"
                  : "border-slate-200 bg-white placeholder:text-slate-400 focus:ring-workout-primary/40",
              )}
            />
            {isValidMediaUrl(draftUrl) ? (
              <div
                className={cn(
                  "relative aspect-[4/3] w-full overflow-hidden rounded-card",
                  isDarkMode ? "bg-iron-800" : "bg-slate-100",
                )}
              >
                <Image
                  src={draftUrl.trim()}
                  alt="Preview"
                  fill
                  className="object-contain"
                  sizes="320px"
                  unoptimized={exerciseImageUnoptimized(draftUrl.trim())}
                />
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter className="gap-2">
            {currentOverride ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void persistOverride("")}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-card py-3 text-sm font-medium disabled:opacity-50",
                  isDarkMode ? "bg-iron-800 text-red-400" : "bg-slate-100 text-red-600",
                )}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Remove
              </button>
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditorOpen(false)}
              className={cn(
                "flex-1 rounded-card py-3 text-sm font-medium",
                isDarkMode ? "bg-iron-800 text-iron-300" : "bg-slate-100 text-slate-600",
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className={cn(
                "flex-1 rounded-card py-3 text-sm font-bold disabled:opacity-50",
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white",
              )}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

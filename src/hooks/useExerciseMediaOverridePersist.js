import { useCallback, useState } from "react";
import { useWorkout } from "@/context/WorkoutContext";
import { useExerciseMediaOverrides } from "@/hooks/useExerciseMediaOverrides";
import {
  buildExerciseMediaOverridesPatch,
  buildExerciseMediaRemoveUrlPatch,
} from "@/lib/exerciseMediaOverrides";
import { mergeExerciseMediaOverrides } from "@/lib/exerciseMediaOverridesStorage";
import {
  cacheLocalExerciseMediaOverrides,
  readLocalExerciseMediaOverrides,
} from "@/lib/userPrefsMigration";
import { toast } from "sonner";

/** Ensures spinners paint (optimistic settings updates can finish in one frame). */
const MIN_PENDING_MS = 320;

function delayForMinPending(startedAt) {
  const remain = MIN_PENDING_MS - (Date.now() - startedAt);
  if (remain <= 0) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, remain));
}

/**
 * Persist exercise_media_overrides patches (set primary URL or remove one slide).
 */
export function useExerciseMediaOverridePersist() {
  const { user, settings, updateSettings } = useWorkout();
  const mediaOverrides = useExerciseMediaOverrides();
  const [saving, setSaving] = useState(false);
  /** URL of the slide currently being removed (for per-button / overlay loaders). */
  const [deletingUrl, setDeletingUrl] = useState(null);

  const mergedBaseForExercise = useCallback(() => {
    if (!user?.id) return {};
    const local = readLocalExerciseMediaOverrides(user.id);
    return mergeExerciseMediaOverrides(
      local,
      mergeExerciseMediaOverrides(mediaOverrides, settings?.exercise_media_overrides),
    );
  }, [user?.id, mediaOverrides, settings?.exercise_media_overrides]);

  const applyOverridesPatch = useCallback(
    async (
      patch,
      { successMessage = "Thumbnail updated", onSuccess, removingUrl = null } = {},
    ) => {
      if (!user?.id) {
        toast.error("Sign in to save a custom image");
        return false;
      }
      if (!patch || !Object.keys(patch).length) return false;

      const startedAt = Date.now();
      if (removingUrl) setDeletingUrl(removingUrl);
      else setSaving(true);
      try {
        await updateSettings({ exercise_media_overrides: patch });
        toast.success(successMessage);
        onSuccess?.();
        return true;
      } catch (err) {
        const code = err?.code ?? "";
        const message = String(err?.message ?? "");
        const migrationHint =
          message.includes("exercise_media_overrides") || code === "PGRST204";
        const cached = cacheLocalExerciseMediaOverrides(user.id, patch);
        toast.success(successMessage);
        if (!cached) {
          toast.message("GIF is large — saved in this session only", { duration: 5000 });
        } else if (migrationHint) {
          toast.message("Cloud sync issue — thumbnail is on this device", { duration: 5000 });
        }
        onSuccess?.();
        return true;
      } finally {
        await delayForMinPending(startedAt);
        if (removingUrl) setDeletingUrl(null);
        else setSaving(false);
      }
    },
    [updateSettings, user?.id],
  );

  const persistPrimaryUrl = useCallback(
    async (exercise, url, onSuccess) => {
      if (!exercise) return false;
      const patch = buildExerciseMediaOverridesPatch(mergedBaseForExercise(), exercise, url);
      if (!patch) return false;
      const msg = url ? "Thumbnail updated" : "Using catalog image";
      return applyOverridesPatch(patch, { successMessage: msg, onSuccess });
    },
    [applyOverridesPatch, mergedBaseForExercise],
  );

  const removeMediaUrl = useCallback(
    async (exercise, url, onSuccess) => {
      if (!exercise || !url) return false;
      setDeletingUrl(url);
      const patch = buildExerciseMediaRemoveUrlPatch(mergedBaseForExercise(), exercise, url);
      if (!patch) {
        setDeletingUrl(null);
        return false;
      }
      return applyOverridesPatch(patch, {
        successMessage: "Image removed",
        onSuccess,
        removingUrl: url,
      });
    },
    [applyOverridesPatch, mergedBaseForExercise],
  );

  return { saving, deletingUrl, persistPrimaryUrl, removeMediaUrl };
}

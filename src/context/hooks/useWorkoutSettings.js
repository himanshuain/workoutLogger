import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  cacheLocalNavConfig,
  cacheLocalRestMap,
  cacheLocalExerciseMediaOverrides,
} from "@/lib/userPrefsMigration";
import { writeLocalWorkoutUiPrefs } from "@/lib/workoutUiPrefs";
import { hasExerciseMediaOverrides } from "@/lib/exerciseMediaOverridesStorage";

/** User settings read/write extracted from WorkoutContext. */
export function useWorkoutSettings(user, settings, setSettings) {
  const updateSettings = useCallback(
    async newSettings => {
      if (!user) {
        throw new Error("Sign in to save settings");
      }

      const mediaOnlyUpdate =
        Boolean(newSettings.exercise_media_overrides) &&
        Object.keys(newSettings).length === 1;

      setSettings(prev => ({ ...(prev ?? {}), ...newSettings }));

      if (newSettings.exercise_media_overrides) {
        cacheLocalExerciseMediaOverrides(user.id, newSettings.exercise_media_overrides);
      }

      if (newSettings.nav_config) {
        cacheLocalNavConfig(newSettings.nav_config);
      }
      if (newSettings.routine_rest_days) {
        cacheLocalRestMap(user.id, newSettings.routine_rest_days);
      }
      if (newSettings.workout_ui_prefs) {
        writeLocalWorkoutUiPrefs(user.id, newSettings.workout_ui_prefs);
      }

      const { data: updateData, error } = await supabase
        .from("user_settings")
        .update(newSettings)
        .eq("user_id", user.id)
        .select("exercise_media_overrides")
        .maybeSingle();

      let data = updateData;

      if (!error && data == null && newSettings.exercise_media_overrides) {
        const upsertResult = await supabase
          .from("user_settings")
          .upsert({ user_id: user.id, ...newSettings }, { onConflict: "user_id" })
          .select("exercise_media_overrides")
          .maybeSingle();
        if (!upsertResult.error) {
          data = upsertResult.data;
        }
      }

      if (error) {
        if (mediaOnlyUpdate) {
          const sent = newSettings.exercise_media_overrides;
          cacheLocalExerciseMediaOverrides(user.id, sent);
          setSettings(prev => ({ ...(prev ?? {}), exercise_media_overrides: sent }));
          return;
        }
        throw error;
      }

      if (newSettings.exercise_media_overrides) {
        const fromServer = data?.exercise_media_overrides;
        const sent = newSettings.exercise_media_overrides;
        const resolved = hasExerciseMediaOverrides(fromServer)
          ? fromServer
          : sent;
        const preferSent =
          hasExerciseMediaOverrides(sent) &&
          JSON.stringify(sent).length > JSON.stringify(fromServer ?? {}).length;
        const finalOverrides = preferSent ? sent : resolved;
        cacheLocalExerciseMediaOverrides(user.id, finalOverrides);
        setSettings(prev => ({ ...(prev ?? {}), exercise_media_overrides: finalOverrides }));
      }
    },
    [user, setSettings],
  );

  return { updateSettings };
}

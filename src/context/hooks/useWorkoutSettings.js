import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  cacheLocalNavConfig,
  cacheLocalRestMap,
  cacheLocalExerciseMediaOverrides,
} from "@/lib/userPrefsMigration";
import { hasExerciseMediaOverrides } from "@/lib/exerciseMediaOverridesStorage";

/** User settings read/write extracted from WorkoutContext. */
export function useWorkoutSettings(user, settings, setSettings) {
  const updateSettings = useCallback(
    async newSettings => {
      if (!user) {
        throw new Error("Sign in to save settings");
      }

      if (newSettings.exercise_media_overrides) {
        cacheLocalExerciseMediaOverrides(user.id, newSettings.exercise_media_overrides);
      }

      setSettings(prev => ({ ...(prev ?? {}), ...newSettings }));

      if (newSettings.nav_config) {
        cacheLocalNavConfig(newSettings.nav_config);
      }
      if (newSettings.routine_rest_days) {
        cacheLocalRestMap(user.id, newSettings.routine_rest_days);
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
        throw error;
      }

      if (newSettings.exercise_media_overrides) {
        const fromServer = data?.exercise_media_overrides;
        const resolved = hasExerciseMediaOverrides(fromServer)
          ? fromServer
          : newSettings.exercise_media_overrides;
        cacheLocalExerciseMediaOverrides(user.id, resolved);
        setSettings(prev => ({ ...(prev ?? {}), exercise_media_overrides: resolved }));
      }
    },
    [user, setSettings],
  );

  return { updateSettings };
}

import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { cacheLocalNavConfig, cacheLocalRestMap } from "@/lib/userPrefsMigration";

/** User settings read/write extracted from WorkoutContext. */
export function useWorkoutSettings(user, settings, setSettings) {
  const updateSettings = useCallback(
    async newSettings => {
      if (!user) return;

      const updated = { ...settings, ...newSettings };
      setSettings(updated);

      if (newSettings.nav_config) {
        cacheLocalNavConfig(newSettings.nav_config);
      }
      if (newSettings.routine_rest_days) {
        cacheLocalRestMap(user.id, newSettings.routine_rest_days);
      }

      await supabase.from("user_settings").update(newSettings).eq("user_id", user.id);
    },
    [settings, user, setSettings],
  );

  return { updateSettings };
}

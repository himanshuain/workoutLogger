import { useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useWorkout } from "@/context/WorkoutContext";

/** Sync theme from Supabase user_settings when loaded. */
export default function ThemeSettingsSync() {
  const { setTheme } = useTheme();
  const { settings } = useWorkout();

  useEffect(() => {
    if (settings?.user_id && settings.dark_mode !== undefined) {
      setTheme(!!settings.dark_mode);
    }
  }, [settings?.user_id, settings?.dark_mode, setTheme]);

  return null;
}

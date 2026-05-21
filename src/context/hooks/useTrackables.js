import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { mergeTrackablesActiveDays } from "@/lib/userPrefsMigration";

/** Trackable load/create/update helpers extracted from WorkoutContext. */
export function useTrackableActions(user, trackables, setTrackables) {
  const loadTrackables = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("trackables")
        .select("*")
        .eq("user_id", user.id)
        .order("order_index");

      if (!error && data) {
        const { merged } = mergeTrackablesActiveDays(data, user.id);
        setTrackables(merged);
      }
    } catch (err) {
      console.error("Error loading trackables:", err);
    }
  }, [user, setTrackables]);

  const createTrackable = useCallback(
    async trackable => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("trackables")
        .insert({
          user_id: user.id,
          ...trackable,
          order_index: trackables.length,
        })
        .select()
        .single();

      if (!error && data) {
        const enriched = { ...data, active_days: data.active_days ?? null };
        setTrackables(prev => [...prev, enriched]);
        return enriched;
      }
      return null;
    },
    [user, trackables, setTrackables],
  );

  const updateTrackable = useCallback(
    async (id, updates) => {
      if (!user) return;

      const { error } = await supabase.from("trackables").update(updates).eq("id", id);
      if (error) return;

      setTrackables(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
    },
    [user, setTrackables],
  );

  const deleteTrackable = useCallback(
    async id => {
      if (!user) return;

      const { error } = await supabase.from("trackables").delete().eq("id", id);

      if (!error) {
        setTrackables(prev => prev.filter(t => t.id !== id));
      }
    },
    [user, setTrackables],
  );

  return {
    loadTrackables,
    createTrackable,
    updateTrackable,
    deleteTrackable,
  };
}

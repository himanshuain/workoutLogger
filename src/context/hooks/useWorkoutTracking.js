import { useCallback } from "react";
import { supabase } from "@/lib/supabase";

/** Daily tracking entries (habits/health) extracted from WorkoutContext. */
export function useWorkoutTracking(user, today, todayEntries, setTodayEntries, queryClient) {
  const loadTodayEntries = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("tracking_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today);

      if (!error && data) {
        const entriesMap = {};
        for (const e of data) {
          entriesMap[e.trackable_id] = e;
        }
        setTodayEntries(entriesMap);
      }
    } catch (err) {
      console.error("Error loading today entries:", err);
    }
  }, [user, today, setTodayEntries]);

  const toggleTrackingEntry = useCallback(
    async (trackableId, isCompleted, value = null) => {
      if (!user) return;

      const existing = todayEntries[trackableId];

      if (existing) {
        const { error } = await supabase
          .from("tracking_entries")
          .update({ is_completed: isCompleted, value })
          .eq("id", existing.id);

        if (!error) {
          setTodayEntries(prev => ({
            ...prev,
            [trackableId]: { ...existing, is_completed: isCompleted, value },
          }));
        }
      } else {
        const { data, error } = await supabase
          .from("tracking_entries")
          .insert({
            user_id: user.id,
            trackable_id: trackableId,
            date: today,
            is_completed: isCompleted,
            value,
          })
          .select()
          .single();

        if (!error && data) {
          setTodayEntries(prev => ({
            ...prev,
            [trackableId]: data,
          }));
        }
      }

      queryClient.invalidateQueries({ queryKey: ["trackingEntries"] });
      queryClient.invalidateQueries({ queryKey: ["trackingEntriesForHeatmap"] });
      queryClient.invalidateQueries({ queryKey: ["bodyWeightHistory"] });
    },
    [user, today, todayEntries, setTodayEntries, queryClient],
  );

  const toggleTrackingEntryForDate = useCallback(
    async (trackableId, date, isCompleted, value = null) => {
      if (!user) return { success: false };

      const { data: existing } = await supabase
        .from("tracking_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("trackable_id", trackableId)
        .eq("date", date)
        .maybeSingle();

      if (existing) {
        if (isCompleted) {
          const { error } = await supabase
            .from("tracking_entries")
            .update({ is_completed: isCompleted, value })
            .eq("id", existing.id);

          if (!error) {
            if (date === today) {
              setTodayEntries(prev => ({
                ...prev,
                [trackableId]: { ...existing, is_completed: isCompleted, value },
              }));
            }
            return { success: true, action: "updated" };
          }
        } else {
          const { error } = await supabase.from("tracking_entries").delete().eq("id", existing.id);

          if (!error) {
            if (date === today) {
              setTodayEntries(prev => {
                const newEntries = { ...prev };
                delete newEntries[trackableId];
                return newEntries;
              });
            }
            return { success: true, action: "deleted" };
          }
        }
      } else if (isCompleted) {
        const { data, error } = await supabase
          .from("tracking_entries")
          .insert({
            user_id: user.id,
            trackable_id: trackableId,
            date,
            is_completed: isCompleted,
            value,
          })
          .select()
          .single();

        if (!error && data) {
          if (date === today) {
            setTodayEntries(prev => ({
              ...prev,
              [trackableId]: data,
            }));
          }
          return { success: true, action: "created" };
        }
      }

      queryClient.invalidateQueries({ queryKey: ["trackingEntries"] });
      queryClient.invalidateQueries({ queryKey: ["trackingEntriesForHeatmap"] });
      queryClient.invalidateQueries({ queryKey: ["bodyWeightHistory"] });
      return { success: false };
    },
    [user, today, setTodayEntries, queryClient],
  );

  const getTrackingEntries = useCallback(
    async (startDate, endDate) => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("tracking_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) {
        console.error("Error getting tracking entries:", error);
        return [];
      }

      return data || [];
    },
    [user],
  );

  return {
    loadTodayEntries,
    toggleTrackingEntry,
    toggleTrackingEntryForDate,
    getTrackingEntries,
  };
}

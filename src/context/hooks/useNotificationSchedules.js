import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import NotificationService from "@/lib/notifications";

/** Notification schedule CRUD extracted from WorkoutContext. */
export function useNotificationSchedules(user, notificationSchedules, setNotificationSchedules) {
  const upsertNotificationSchedule = useCallback(
    async (trackableId, schedule) => {
      if (!user) return null;

      const payload = {
        user_id: user.id,
        trackable_id: trackableId,
        title: schedule.title,
        body: schedule.body,
        icon: schedule.icon,
        time: schedule.time,
        days: schedule.days || [],
        enabled: schedule.enabled !== false,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("notification_schedules")
        .upsert(payload, { onConflict: "user_id,trackable_id" })
        .select()
        .single();

      if (error) return null;

      setNotificationSchedules(prev => {
        const next = prev.filter(s => s.trackable_id !== trackableId);
        return [...next, data];
      });

      const all = [...notificationSchedules.filter(s => s.trackable_id !== trackableId), data];
      NotificationService.setSchedulesFromServer(all, user.id);

      return data;
    },
    [user, notificationSchedules, setNotificationSchedules],
  );

  const removeNotificationSchedule = useCallback(
    async trackableId => {
      if (!user) return;

      await supabase
        .from("notification_schedules")
        .delete()
        .eq("user_id", user.id)
        .eq("trackable_id", trackableId);

      setNotificationSchedules(prev => prev.filter(s => s.trackable_id !== trackableId));

      const remaining = notificationSchedules.filter(s => s.trackable_id !== trackableId);
      NotificationService.setSchedulesFromServer(remaining, user.id);
    },
    [user, notificationSchedules, setNotificationSchedules],
  );

  const getNotificationSchedule = useCallback(
    trackableId => notificationSchedules.find(s => s.trackable_id === trackableId) || null,
    [notificationSchedules],
  );

  return {
    upsertNotificationSchedule,
    removeNotificationSchedule,
    getNotificationSchedule,
  };
}

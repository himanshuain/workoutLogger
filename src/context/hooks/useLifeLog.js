import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getLocalDateStr } from "@/context/utils/getLocalDateStr";

function processEventTypes(raw) {
  return raw.map(eventType => {
    const logs = eventType.event_logs || [];
    const sortedLogs = logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastLog = sortedLogs[0] || null;
    let daysSince = null;
    if (lastLog) {
      const lastDate = new Date(lastLog.date);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      lastDate.setHours(0, 0, 0, 0);
      daysSince = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    }
    return {
      ...eventType,
      last_log: lastLog,
      days_since: daysSince,
      total_logs: logs.length,
    };
  });
}

/** Life log (event types + logs) extracted from WorkoutContext. */
export function useLifeLog(user, eventTypes, setEventTypes) {
  const loadEventTypes = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("event_types")
        .select(
          `
          *,
          event_logs (
            id,
            date,
            notes,
            cost,
            created_at
          )
        `,
        )
        .eq("user_id", user.id)
        .order("order_index");

      if (!error && data) {
        setEventTypes(processEventTypes(data));
      }
    } catch (err) {
      console.error("Error loading event types:", err);
    }
  }, [user, setEventTypes]);

  const createEventType = useCallback(
    async eventType => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("event_types")
        .insert({
          user_id: user.id,
          ...eventType,
          order_index: eventTypes.length,
        })
        .select()
        .single();

      if (!error && data) {
        const newEventType = {
          ...data,
          event_logs: [],
          last_log: null,
          days_since: null,
          total_logs: 0,
        };
        setEventTypes(prev => [...prev, newEventType]);
        return newEventType;
      }
      return null;
    },
    [user, eventTypes, setEventTypes],
  );

  const updateEventType = useCallback(
    async (id, updates) => {
      if (!user) return;

      const { error } = await supabase
        .from("event_types")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (!error) {
        setEventTypes(prev => prev.map(et => (et.id === id ? { ...et, ...updates } : et)));
      }
    },
    [user, setEventTypes],
  );

  const deleteEventType = useCallback(
    async id => {
      if (!user) return;

      const { error } = await supabase.from("event_types").delete().eq("id", id);

      if (!error) {
        setEventTypes(prev => prev.filter(et => et.id !== id));
      }
    },
    [user, setEventTypes],
  );

  const logEvent = useCallback(
    async (eventTypeId, { date = null, notes = null, cost = null } = {}) => {
      if (!user) return null;

      const logDate = date || getLocalDateStr();

      const { data, error } = await supabase
        .from("event_logs")
        .insert({
          user_id: user.id,
          event_type_id: eventTypeId,
          date: logDate,
          notes,
          cost,
        })
        .select()
        .single();

      if (!error && data) {
        setEventTypes(prev =>
          prev.map(et => {
            if (et.id === eventTypeId) {
              const newLogs = [data, ...(et.event_logs || [])];
              const logDateObj = new Date(logDate);
              const todayObj = new Date();
              todayObj.setHours(0, 0, 0, 0);
              logDateObj.setHours(0, 0, 0, 0);
              const actualDaysSince = Math.floor((todayObj - logDateObj) / (1000 * 60 * 60 * 24));

              return {
                ...et,
                event_logs: newLogs,
                last_log: data,
                days_since: actualDaysSince,
                total_logs: (et.total_logs || 0) + 1,
              };
            }
            return et;
          }),
        );
        return data;
      }
      return null;
    },
    [user, setEventTypes],
  );

  const deleteEventLog = useCallback(
    async (logId, eventTypeId) => {
      if (!user) return false;

      const { error } = await supabase.from("event_logs").delete().eq("id", logId);

      if (!error) {
        await loadEventTypes();
        return true;
      }
      return false;
    },
    [user, loadEventTypes],
  );

  const updateEventLog = useCallback(
    async (logId, updates) => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("event_logs")
        .update(updates)
        .eq("id", logId)
        .select()
        .single();

      if (!error && data) {
        await loadEventTypes();
        return data;
      }
      return null;
    },
    [user, loadEventTypes],
  );

  const getEventLogs = useCallback(
    async eventTypeId => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("event_logs")
        .select("*")
        .eq("event_type_id", eventTypeId)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error getting event logs:", error);
        return [];
      }

      return data || [];
    },
    [user],
  );

  return {
    loadEventTypes,
    processEventTypes,
    createEventType,
    updateEventType,
    deleteEventType,
    logEvent,
    deleteEventLog,
    updateEventLog,
    getEventLogs,
  };
}

import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getLocalDateStr } from "@/context/utils/getLocalDateStr";

/** Init RPC used to omit tags/title/km — keep fields already in client state when absent on incoming logs. */
export function mergeEventTypesPreservingLogFields(prev, incomingRaw) {
  const incoming = processEventTypes(incomingRaw);
  if (!prev?.length) return incoming;

  const prevLogById = new Map();
  for (const et of prev) {
    for (const log of et.event_logs || []) {
      if (log?.id) prevLogById.set(log.id, log);
    }
  }

  return incoming.map(et => ({
    ...et,
    event_logs: (et.event_logs || []).map(log => {
      const prior = prevLogById.get(log.id);
      if (!prior) return log;
      const merged = { ...log };
      if (log.tags === undefined && prior.tags !== undefined) merged.tags = prior.tags;
      if (log.title === undefined && prior.title !== undefined) merged.title = prior.title;
      if (log.odometer_km === undefined && prior.odometer_km !== undefined) {
        merged.odometer_km = prior.odometer_km;
      }
      return merged;
    }),
  }));
}

function processEventTypes(raw) {
  return raw.map(eventType => {
    const logs = [...(eventType.event_logs || [])];
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
      event_logs: sortedLogs,
      last_log: lastLog,
      days_since: daysSince,
      total_logs: sortedLogs.length,
    };
  });
}

function patchLogsForEventType(setEventTypes, predicate, mapLogs) {
  setEventTypes(prev =>
    processEventTypes(
      prev.map(et => {
        if (!predicate(et)) return et;
        return { ...et, event_logs: mapLogs(et.event_logs || []) };
      }),
    ),
  );
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
          event_logs (*)
        `,
        )
        .eq("user_id", user.id)
        .order("order_index");

      if (!error && data) {
        setEventTypes(prev => mergeEventTypesPreservingLogFields(prev, data));
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
    async (
      eventTypeId,
      {
        date = null,
        notes = null,
        title = null,
        cost = null,
        odometer_km = null,
        tags = null,
      } = {},
    ) => {
      if (!user) return null;

      const logDate = date || getLocalDateStr();

      const tagPayload =
        tags == null ? {} : { tags: Array.isArray(tags) ? tags : [] };

      const km =
        odometer_km != null && odometer_km !== "" && !Number.isNaN(Number(odometer_km))
          ? Math.round(Number(odometer_km))
          : null;

      const { data, error } = await supabase
        .from("event_logs")
        .insert({
          user_id: user.id,
          event_type_id: eventTypeId,
          date: logDate,
          title: title?.trim() || null,
          notes,
          cost,
          odometer_km: km,
          ...tagPayload,
        })
        .select()
        .single();

      if (!error && data) {
        patchLogsForEventType(
          setEventTypes,
          et => et.id === eventTypeId,
          logs => [data, ...logs],
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

      let removed = null;
      patchLogsForEventType(
        setEventTypes,
        et => et.id === eventTypeId,
        logs => {
          removed = logs.find(l => l.id === logId);
          return logs.filter(l => l.id !== logId);
        },
      );

      const { error } = await supabase.from("event_logs").delete().eq("id", logId);

      if (!error) return true;

      if (removed) {
        patchLogsForEventType(
          setEventTypes,
          et => et.id === eventTypeId,
          logs => [...logs, removed],
        );
      } else {
        await loadEventTypes();
      }
      return false;
    },
    [user, setEventTypes, loadEventTypes],
  );

  const updateEventLog = useCallback(
    async (logId, updates) => {
      if (!user) return null;

      let snapshot = null;
      patchLogsForEventType(
        setEventTypes,
        et => (et.event_logs || []).some(l => l.id === logId),
        logs =>
          logs.map(l => {
            if (l.id !== logId) return l;
            snapshot = l;
            return { ...l, ...updates };
          }),
      );

      let { data, error } = await supabase
        .from("event_logs")
        .update(updates)
        .eq("id", logId)
        .select()
        .single();

      if (error && (updates.title != null || updates.odometer_km != null)) {
        const { title: _t, odometer_km: _k, ...rest } = updates;
        const retry = await supabase.from("event_logs").update(rest).eq("id", logId).select().single();
        data = retry.data;
        error = retry.error;
        if (!error && data) {
          data = { ...data, title: updates.title ?? data.title, odometer_km: updates.odometer_km ?? data.odometer_km };
        }
      }

      if (!error && data) {
        patchLogsForEventType(
          setEventTypes,
          et => (et.event_logs || []).some(l => l.id === logId),
          logs => logs.map(l => (l.id === logId ? { ...l, ...data } : l)),
        );
        return data;
      }

      if (snapshot) {
        patchLogsForEventType(
          setEventTypes,
          et => (et.event_logs || []).some(l => l.id === logId),
          logs => logs.map(l => (l.id === logId ? snapshot : l)),
        );
      }
      return null;
    },
    [user, setEventTypes],
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
    mergeEventTypesPreservingLogFields,
    createEventType,
    updateEventType,
    deleteEventType,
    logEvent,
    deleteEventLog,
    updateEventLog,
    getEventLogs,
  };
}

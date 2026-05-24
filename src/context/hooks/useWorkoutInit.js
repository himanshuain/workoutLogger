import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { prepareExerciseCatalog } from "@/lib/exerciseCatalog";
import { hydrateSessionClientState } from "@/lib/workoutSessionClient";
import NotificationService from "@/lib/notifications";
import {
  cacheLocalNavConfig,
  mergeTrackablesActiveDays,
  readLegacyNotificationSchedules,
  readLocalEventSettings,
  readLocalNavConfig,
  readLocalRestMap,
  cacheLocalRestMap,
} from "@/lib/userPrefsMigration";
import { reconcileExerciseMediaOverrides } from "@/lib/exerciseMediaOverridesStorage";

/** Runs get_user_init_data RPC once per login; falls back to individual loaders. */
export function useWorkoutInit({
  user,
  today,
  setIsLoading,
  setExercises,
  setSettings,
  setExerciseHistory,
  setTrackables,
  setTodayEntries,
  setFoodItems,
  setTodayFoodEntries,
  setRoutines,
  setActiveSession,
  setNotificationSchedules,
  setEventTypes,
  setStepCards,
  processEventTypes,
  fallbackLoaders,
}) {
  const initUserIdRef = useRef(null);

  useEffect(() => {
    const uid = user?.id ?? null;

    if (!uid) {
      initUserIdRef.current = null;
      setIsLoading(false);
      return;
    }

    if (uid === initUserIdRef.current) return;
    initUserIdRef.current = uid;

    setIsLoading(true);

    async function loadInitData() {
      try {
        const { data, error } = await supabase.rpc("get_user_init_data", {
          p_today: today,
        });

        if (error) throw error;

        setExercises(prepareExerciseCatalog(data.exercises || []));

        if (data.user_settings) {
          const { merged: mediaOverrides, needsServerBackfill: backfillMediaOverrides } =
            reconcileExerciseMediaOverrides(uid, data.user_settings.exercise_media_overrides);

          setSettings({ ...data.user_settings, exercise_media_overrides: mediaOverrides });

          if (backfillMediaOverrides) {
            void supabase
              .from("user_settings")
              .update({ exercise_media_overrides: mediaOverrides })
              .eq("user_id", uid);
          }

          const serverRest = data.user_settings.routine_rest_days;
          if (!serverRest || Object.keys(serverRest || {}).length === 0) {
            const localRest = readLocalRestMap(uid);
            if (Object.keys(localRest).length > 0) {
              void supabase
                .from("user_settings")
                .update({ routine_rest_days: localRest })
                .eq("user_id", uid);
              setSettings(prev => ({ ...prev, routine_rest_days: localRest }));
              cacheLocalRestMap(uid, localRest);
            }
          } else {
            cacheLocalRestMap(uid, serverRest);
          }

          const serverNav = data.user_settings.nav_config;
          if (!serverNav || Object.keys(serverNav || {}).length === 0) {
            const localNav = readLocalNavConfig();
            if (
              localNav.order ||
              localNav.hidden?.length ||
              Object.keys(localNav.labels || {}).length
            ) {
              void supabase
                .from("user_settings")
                .update({ nav_config: localNav })
                .eq("user_id", uid);
              setSettings(prev => ({ ...prev, nav_config: localNav }));
              cacheLocalNavConfig(localNav);
            }
          } else {
            cacheLocalNavConfig(serverNav);
          }
        }

        const historyMap = {};
        for (const h of data.exercise_history || []) {
          historyMap[h.exercise_name] = h;
        }
        setExerciseHistory(historyMap);

        const { merged: mergedTrackables, toMigrate: activeDaysToMigrate } =
          mergeTrackablesActiveDays(data.trackables || [], uid);
        setTrackables(mergedTrackables);
        if (activeDaysToMigrate.length > 0) {
          await Promise.all(
            activeDaysToMigrate.map(row =>
              supabase
                .from("trackables")
                .update({ active_days: row.active_days })
                .eq("id", row.id),
            ),
          );
        }

        const entriesMap = {};
        for (const e of data.today_entries || []) {
          entriesMap[e.trackable_id] = e;
        }
        setTodayEntries(entriesMap);

        setFoodItems(data.food_items || []);

        const foodEntriesMap = {};
        for (const e of data.today_food_entries || []) {
          foodEntriesMap[e.food_item_id] = e;
        }
        setTodayFoodEntries(foodEntriesMap);

        const sortedRoutines = (data.routines || []).map(routine => ({
          ...routine,
          routine_exercises: (routine.routine_exercises || []).sort(
            (a, b) => a.order_index - b.order_index,
          ),
        }));
        setRoutines(sortedRoutines);

        setActiveSession(data.active_session || null);
        if (data.active_session) hydrateSessionClientState(data.active_session);

        let schedules = data.notification_schedules || [];
        const legacySchedules = readLegacyNotificationSchedules();
        if ((!schedules || schedules.length === 0) && Object.keys(legacySchedules).length > 0) {
          const migrated = await Promise.all(
            Object.entries(legacySchedules).map(async ([trackableId, sched]) => {
              const { data: row } = await supabase
                .from("notification_schedules")
                .upsert(
                  {
                    user_id: uid,
                    trackable_id: trackableId,
                    title: sched.title,
                    body: sched.body,
                    icon: sched.icon,
                    time: sched.time,
                    days: sched.days || [],
                    enabled: sched.enabled !== false,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "user_id,trackable_id" },
                )
                .select()
                .single();
              return row;
            }),
          );
          schedules = migrated.filter(Boolean);
        }
        setNotificationSchedules(schedules);
        NotificationService.setUserId(uid);
        NotificationService.setSchedulesFromServer(schedules, uid);

        const localEventSettings = readLocalEventSettings();
        const eventTypesRaw = data.event_types || [];
        const eventTypesNeedingMigration = eventTypesRaw.filter(et => localEventSettings[et.id]);
        if (eventTypesNeedingMigration.length > 0) {
          await Promise.all(
            eventTypesNeedingMigration.map(et => {
              const local = localEventSettings[et.id];
              return supabase
                .from("event_types")
                .update({
                  track_graph: local.track_graph || false,
                  need_value: local.need_value || false,
                  need_notes: local.need_notes || false,
                })
                .eq("id", et.id);
            }),
          );
        }

        const processedEvents = processEventTypes(
          eventTypesNeedingMigration.length > 0
            ? eventTypesRaw.map(et => {
                const local = localEventSettings[et.id];
                if (!local) return et;
                return {
                  ...et,
                  track_graph: local.track_graph || false,
                  need_value: local.need_value || false,
                  need_notes: local.need_notes || false,
                };
              })
            : eventTypesRaw,
        );
        setEventTypes(processedEvents);

        const processedCards = (data.step_cards || []).map(card => ({
          ...card,
          step_items: (card.step_items || []).sort((a, b) => a.order_index - b.order_index),
        }));
        setStepCards(processedCards);
      } catch (err) {
        console.error("RPC init failed, falling back to individual loaders:", err);
        fallbackLoaders.loadExercises();
        Promise.all([
          fallbackLoaders.loadSettings(),
          fallbackLoaders.loadExerciseHistory(),
          fallbackLoaders.loadTrackables(),
          fallbackLoaders.loadTodayEntries(),
          fallbackLoaders.loadFoodItems(),
          fallbackLoaders.loadTodayFoodEntries(),
          fallbackLoaders.loadRoutines(),
          fallbackLoaders.loadActiveSession(),
          fallbackLoaders.loadEventTypes(),
          fallbackLoaders.loadStepCards(),
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
}

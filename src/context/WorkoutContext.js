import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTrackableActions } from "@/context/hooks/useTrackables";
import { useNotificationSchedules } from "@/context/hooks/useNotificationSchedules";
import { useWorkoutSettings } from "@/context/hooks/useWorkoutSettings";
import { useWorkoutAuth } from "@/context/hooks/useWorkoutAuth";
import { useWorkoutExercises } from "@/context/hooks/useWorkoutExercises";
import { useWorkoutRoutines } from "@/context/hooks/useWorkoutRoutines";
import { useWorkoutSessions } from "@/context/hooks/useWorkoutSessions";
import { useWorkoutTracking } from "@/context/hooks/useWorkoutTracking";
import { useWorkoutFood } from "@/context/hooks/useWorkoutFood";
import { useLifeLog } from "@/context/hooks/useLifeLog";
import { useStepCards } from "@/context/hooks/useStepCards";
import { useWorkoutInit } from "@/context/hooks/useWorkoutInit";
import { getLocalDateStr } from "@/context/utils/getLocalDateStr";
import { WorkoutAuthProvider, useWorkoutAuthContext } from "@/context/contexts/WorkoutAuthContext";
import { WorkoutFoodProvider, useWorkoutFoodContext } from "@/context/contexts/WorkoutFoodContext";
import { LifeLogProvider, useLifeLogContext } from "@/context/contexts/LifeLogContext";
import { StepCardsProvider, useStepCardsContext } from "@/context/contexts/StepCardsContext";

const WorkoutContext = createContext(null);

function WorkoutProviderInner({ children }) {
  const queryClient = useQueryClient();
  const [exercises, setExercises] = useState([]);
  const [exerciseHistory, setExerciseHistory] = useState({});
  const [trackables, setTrackables] = useState([]);
  const [todayEntries, setTodayEntries] = useState({});
  const [foodItems, setFoodItems] = useState([]);
  const [todayFoodEntries, setTodayFoodEntries] = useState({});
  const [routines, setRoutines] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [stepCards, setStepCards] = useState([]);
  const [settings, setSettings] = useState({
    unit: "kg",
    dark_mode: true,
  });
  const [notificationSchedules, setNotificationSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const today = getLocalDateStr();

  const clearUserData = useCallback(() => {
    setTrackables([]);
    setTodayEntries({});
    setExerciseHistory({});
    setFoodItems([]);
    setTodayFoodEntries({});
    setRoutines([]);
    setActiveSession(null);
    setEventTypes([]);
  }, []);

  const {
    user,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    signInWithGoogle,
    signOut,
  } = useWorkoutAuth(clearUserData);

  const { loadTrackables, createTrackable, updateTrackable, deleteTrackable } =
    useTrackableActions(user, trackables, setTrackables);

  const { upsertNotificationSchedule, removeNotificationSchedule, getNotificationSchedule } =
    useNotificationSchedules(user, notificationSchedules, setNotificationSchedules);

  const { updateSettings } = useWorkoutSettings(user, settings, setSettings);

  const {
    loadExercises,
    loadExerciseHistory,
    loadSettings,
    logExercise,
    getExerciseLogs,
    getTodayExerciseLogs,
    deleteExerciseLog,
  } = useWorkoutExercises(user, today, setExercises, exerciseHistory, setExerciseHistory, setSettings, queryClient);

  const {
    loadRoutines,
    createRoutine,
    updateRoutine,
    getTodayRoutine,
    getRoutineForDay,
    appendExerciseToRoutine,
  } = useWorkoutRoutines(user, routines, setRoutines);

  const {
    loadActiveSession,
    startWorkoutSession,
    updateSetLog,
    completeWorkoutSession,
    getWorkoutSession,
    markTodayWorkoutDone,
    reopenWorkoutSession,
    deleteSetLog,
    deleteSessionExerciseByName,
    resetSessionExerciseLogs,
    renameSessionExerciseByName,
    seedCompletedExerciseSetsForSession,
    addSetLog,
    deleteWorkoutSession,
    undoTodayWorkoutDone,
    updateSetLogData,
    getTodaySession,
    updateSessionExerciseIndex,
    getWorkoutSessions,
    getWorkoutSessionsForDate,
    startWorkoutSessionForDate,
    getTodaySetLogs,
  } = useWorkoutSessions({
    user,
    today,
    queryClient,
    exerciseHistory,
    activeSession,
    setActiveSession,
    loadExerciseHistory,
    getTodayRoutine,
  });

  const { loadTodayEntries, toggleTrackingEntry, toggleTrackingEntryForDate, getTrackingEntries } =
    useWorkoutTracking(user, today, todayEntries, setTodayEntries, queryClient);

  const {
    loadFoodItems,
    loadTodayFoodEntries,
    createFoodItem,
    updateFoodItem,
    deleteFoodItem,
    toggleFoodEntry,
    updateFoodEntryQuantity,
    getFoodEntries,
  } = useWorkoutFood(user, today, foodItems, setFoodItems, todayFoodEntries, setTodayFoodEntries, queryClient);

  const {
    loadEventTypes,
    processEventTypes,
    createEventType,
    updateEventType,
    deleteEventType,
    logEvent,
    deleteEventLog,
    updateEventLog,
    getEventLogs,
  } = useLifeLog(user, eventTypes, setEventTypes);

  const {
    loadStepCards,
    createStepCard,
    updateStepCard,
    deleteStepCard,
    createStepItem,
    batchCreateStepItems,
    updateStepItem,
    deleteStepItem,
    reorderStepItems,
  } = useStepCards(user, stepCards, setStepCards);

  useWorkoutInit({
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
    fallbackLoaders: {
      loadExercises,
      loadSettings,
      loadExerciseHistory,
      loadTrackables,
      loadTodayEntries,
      loadFoodItems,
      loadTodayFoodEntries,
      loadRoutines,
      loadActiveSession,
      loadEventTypes,
      loadStepCards,
    },
  });

  const authValue = useMemo(
    () => ({
      user,
      isLoading,
      signIn,
      signInWithGoogle,
      signUp,
      resetPassword,
      updatePassword,
      signOut,
    }),
    [user, isLoading, signIn, signInWithGoogle, signUp, resetPassword, updatePassword, signOut],
  );

  const foodValue = useMemo(
    () => ({
      foodItems,
      todayFoodEntries,
      loadFoodItems,
      loadTodayFoodEntries,
      createFoodItem,
      updateFoodItem,
      deleteFoodItem,
      toggleFoodEntry,
      updateFoodEntryQuantity,
      getFoodEntries,
    }),
    [
      foodItems,
      todayFoodEntries,
      loadFoodItems,
      loadTodayFoodEntries,
      createFoodItem,
      updateFoodItem,
      deleteFoodItem,
      toggleFoodEntry,
      updateFoodEntryQuantity,
      getFoodEntries,
    ],
  );

  const lifeLogValue = useMemo(
    () => ({
      eventTypes,
      loadEventTypes,
      createEventType,
      updateEventType,
      deleteEventType,
      logEvent,
      deleteEventLog,
      updateEventLog,
      getEventLogs,
    }),
    [
      eventTypes,
      loadEventTypes,
      createEventType,
      updateEventType,
      deleteEventType,
      logEvent,
      deleteEventLog,
      updateEventLog,
      getEventLogs,
    ],
  );

  const stepCardsValue = useMemo(
    () => ({
      stepCards,
      loadStepCards,
      createStepCard,
      updateStepCard,
      deleteStepCard,
      createStepItem,
      batchCreateStepItems,
      updateStepItem,
      deleteStepItem,
      reorderStepItems,
    }),
    [
      stepCards,
      loadStepCards,
      createStepCard,
      updateStepCard,
      deleteStepCard,
      createStepItem,
      batchCreateStepItems,
      updateStepItem,
      deleteStepItem,
      reorderStepItems,
    ],
  );

  const coreValue = useMemo(
    () => ({
      exercises,
      exerciseHistory,
      trackables,
      todayEntries,
      routines,
      activeSession,
      settings,
      today,
      loadExercises,
      loadTrackables,
      loadTodayEntries,
      loadRoutines,
      loadActiveSession,
      toggleTrackingEntry,
      toggleTrackingEntryForDate,
      logExercise,
      getExerciseLogs,
      getTrackingEntries,
      getTodayExerciseLogs,
      getWorkoutSessions,
      getWorkoutSessionsForDate,
      startWorkoutSessionForDate,
      getTodaySetLogs,
      deleteExerciseLog,
      createTrackable,
      updateTrackable,
      deleteTrackable,
      updateSettings,
      notificationSchedules,
      upsertNotificationSchedule,
      removeNotificationSchedule,
      getNotificationSchedule,
      createRoutine,
      updateRoutine,
      getTodayRoutine,
      getRoutineForDay,
      appendExerciseToRoutine,
      startWorkoutSession,
      updateSetLog,
      completeWorkoutSession,
      markTodayWorkoutDone,
      reopenWorkoutSession,
      undoTodayWorkoutDone,
      getWorkoutSession,
      getTodaySession,
      updateSessionExerciseIndex,
      deleteSetLog,
      deleteSessionExerciseByName,
      resetSessionExerciseLogs,
      renameSessionExerciseByName,
      seedCompletedExerciseSetsForSession,
      addSetLog,
      deleteWorkoutSession,
      updateSetLogData,
    }),
    [
      exercises,
      exerciseHistory,
      trackables,
      todayEntries,
      routines,
      activeSession,
      settings,
      today,
      loadExercises,
      loadTrackables,
      loadTodayEntries,
      loadRoutines,
      loadActiveSession,
      toggleTrackingEntry,
      toggleTrackingEntryForDate,
      logExercise,
      getExerciseLogs,
      getTrackingEntries,
      getTodayExerciseLogs,
      getWorkoutSessions,
      getWorkoutSessionsForDate,
      startWorkoutSessionForDate,
      getTodaySetLogs,
      deleteExerciseLog,
      createTrackable,
      updateTrackable,
      deleteTrackable,
      updateSettings,
      notificationSchedules,
      upsertNotificationSchedule,
      removeNotificationSchedule,
      getNotificationSchedule,
      createRoutine,
      updateRoutine,
      getTodayRoutine,
      getRoutineForDay,
      appendExerciseToRoutine,
      startWorkoutSession,
      updateSetLog,
      completeWorkoutSession,
      markTodayWorkoutDone,
      reopenWorkoutSession,
      undoTodayWorkoutDone,
      getWorkoutSession,
      getTodaySession,
      updateSessionExerciseIndex,
      deleteSetLog,
      deleteSessionExerciseByName,
      resetSessionExerciseLogs,
      renameSessionExerciseByName,
      seedCompletedExerciseSetsForSession,
      addSetLog,
      deleteWorkoutSession,
      updateSetLogData,
    ],
  );

  return (
    <WorkoutAuthProvider value={authValue}>
      <WorkoutFoodProvider value={foodValue}>
        <LifeLogProvider value={lifeLogValue}>
          <StepCardsProvider value={stepCardsValue}>
            <WorkoutContext.Provider value={coreValue}>{children}</WorkoutContext.Provider>
          </StepCardsProvider>
        </LifeLogProvider>
      </WorkoutFoodProvider>
    </WorkoutAuthProvider>
  );
}

export function WorkoutProvider({ children }) {
  return <WorkoutProviderInner>{children}</WorkoutProviderInner>;
}

/** Backward-compatible facade aggregating all domain contexts. */
export function useWorkout() {
  const auth = useWorkoutAuthContext();
  const food = useWorkoutFoodContext();
  const lifeLog = useLifeLogContext();
  const stepCardsCtx = useStepCardsContext();
  const core = useContext(WorkoutContext);

  if (!core) {
    throw new Error("useWorkout must be used within a WorkoutProvider");
  }

  return { ...core, ...auth, ...food, ...lifeLog, ...stepCardsCtx };
}

export { useWorkoutAuthContext, useWorkoutFoodContext, useLifeLogContext, useStepCardsContext };

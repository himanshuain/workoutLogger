import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import {
  REPS_PILLS,
  formatWeightPill,
  formatWeightDisplay,
  isBarWeight,
} from "@/lib/pillConstants";
import PillRail from "@/components/workout/PillRail";
import ExerciseLogModePillRow, { DualPulleyPill } from "@/components/workout/ExerciseLogModeToggle";
import { useExerciseSetLogger } from "@/hooks/useExerciseSetLogger";
import { cn } from "@/lib/utils";

export default function ExerciseSetLogPanel({
  sessionId,
  exerciseName,
  category,
  catalogExercise,
  isDarkMode,
  compact = false,
  explicitPicks = false,
  className,
}) {
  const logger = useExerciseSetLogger({
    sessionId,
    exerciseName,
    category,
    catalogExercise,
    explicitPicks,
  });

  const {
    logMode,
    editWeight,
    setEditWeight,
    reps,
    setReps,
    weightPills,
    currentSetWeight,
    dualPulleyActive,
    picksComplete,
    hasLoggedSets,
    setsForExercise,
    removingSetId,
    handleLogModePill,
    handleDualPulleyToggle,
    handleSaveSet,
    handleRemoveSet,
  } = logger;

  const spaceY = compact ? "space-y-2.5" : "space-y-8";
  const densePills = compact;
  const pillScrollAlign = compact ? "end" : "center";

  const dualPulleyRow = (
    <DualPulleyPill
      selected={dualPulleyActive}
      onToggle={handleDualPulleyToggle}
      isDarkMode={isDarkMode}
      dense={densePills}
    />
  );
  const logModeRow = (
    <ExerciseLogModePillRow
      value={editWeight != null && isBarWeight(editWeight) ? logMode : null}
      onChange={handleLogModePill}
      isDarkMode={isDarkMode}
      dense={densePills}
    />
  );
  const weightRail = (
    <PillRail
      label={logMode === "bodyweight" ? "Added weight" : "Weight"}
      values={weightPills}
      selected={editWeight}
      onSelect={setEditWeight}
      format={v => formatWeightPill(v, logMode)}
      isDarkMode={isDarkMode}
      scrollToSelected={!explicitPicks}
      scrollAlign={pillScrollAlign}
      dense={densePills}
    />
  );
  const repsRail = (
    <PillRail
      label="Reps"
      values={REPS_PILLS}
      selected={reps}
      onSelect={setReps}
      isDarkMode={isDarkMode}
      scrollToSelected={!explicitPicks}
      scrollAlign={pillScrollAlign}
      dense={densePills}
    />
  );

  const saveSetCard = (
    <div
      className={cn(
        "rounded-card space-y-4",
        compact ? "p-4" : "p-6",
        isDarkMode
          ? "bg-iron-900/80 border border-iron-800"
          : "bg-white border border-slate-200 shadow-sm"
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-widest",
          isDarkMode ? "text-iron-500" : "text-slate-500"
        )}
      >
        Current set
      </p>
      {currentSetWeight != null || reps != null ? (
        <div className="flex flex-col items-center gap-1 min-w-[8rem] mx-auto">
          {currentSetWeight != null ? (
            <span
              className={cn(
                "text-2xl font-semibold tabular-nums",
                isDarkMode ? "text-iron-50" : "text-slate-900"
              )}
            >
              {formatWeightDisplay(currentSetWeight, logMode)}
            </span>
          ) : null}
          {reps != null ? (
            <span
              className={cn(
                "text-lg tabular-nums",
                isDarkMode ? "text-iron-400" : "text-slate-600"
              )}
            >
              {reps} reps
            </span>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={e => {
          e.preventDefault();
          handleSaveSet();
        }}
        disabled={!picksComplete}
        className={cn(
          "w-full py-3.5 rounded-card font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed",
          hasLoggedSets
            ? "bg-emerald-500 text-iron-950"
            : isDarkMode
              ? "bg-lift-primary text-iron-950"
              : "bg-workout-primary text-white"
        )}
      >
        {hasLoggedSets ? "Log another set" : "Save set"}
      </button>
    </div>
  );

  return (
    <div
      className={cn(compact ? "px-2 py-3" : "px-5 py-6", spaceY, className)}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()}
    >
      {dualPulleyRow}
      {logModeRow}
      {compact ? (
        <div
          data-log-section="weight-reps"
          className={cn(
            "space-y-2.5",
            "max-lg:scroll-mb-[max(11rem,calc(env(safe-area-inset-bottom)+9.5rem))]"
          )}
        >
          {weightRail}
          {repsRail}
          {saveSetCard}
        </div>
      ) : (
        <>
          {weightRail}
          {repsRail}
          {saveSetCard}
        </>
      )}
      {setsForExercise.length > 0 ? (
        <div>
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-widest mb-3",
              isDarkMode ? "text-iron-500" : "text-slate-500"
            )}
          >
            Logged sets
          </p>
          <div className="flex flex-wrap gap-2">
            {setsForExercise.map(s => (
              <div
                key={s.id}
                className={cn(
                  "inline-flex items-center gap-2 text-sm font-medium pl-3 pr-1 py-1.5 rounded-card",
                  isDarkMode ? "bg-iron-800 text-iron-200" : "bg-slate-100 text-slate-800"
                )}
              >
                <span className="tabular-nums">
                  {isBarWeight(s.weight)
                    ? logMode === "bodyweight"
                      ? "BW"
                      : "Bar"
                    : logMode === "bodyweight"
                      ? `+${s.weight}`
                      : s.weight}
                  ×{s.reps}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSet(s.id)}
                  disabled={removingSetId === s.id}
                  className={cn(
                    "shrink-0 rounded-lg p-1.5 transition-colors disabled:opacity-40",
                    isDarkMode
                      ? "text-iron-500 hover:bg-iron-700 hover:text-red-400"
                      : "text-slate-400 hover:bg-slate-200 hover:text-red-600"
                  )}
                  aria-label={`Delete set ${s.weight}×${s.reps}`}
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2.25} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function useCatalogExerciseForName(exercises, exerciseName) {
  return useMemo(() => {
    if (!exerciseName) return null;
    return (
      exercises.find(e => e.name === exerciseName) ||
      exercises.find(e => e.name?.toLowerCase() === exerciseName?.toLowerCase()) ||
      null
    );
  }, [exercises, exerciseName]);
}

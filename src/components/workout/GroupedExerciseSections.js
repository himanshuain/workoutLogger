import { useMemo } from "react";
import { groupExercisesByArea } from "@/lib/exerciseAreaGroups";
import ExerciseAreaGroupHeader from "@/components/workout/ExerciseAreaGroupHeader";

/**
 * Renders exercises grouped by body area (chest, shoulders, arms, …).
 * @param {object} props
 * @param {Array} props.exercises
 * @param {boolean} props.isDarkMode
 * @param {(exercise: object, group: { area: string, label: string }) => React.ReactNode} props.renderExercise
 * @param {(exercise: object) => string} [props.getCategory]
 * @param {boolean} [props.showHeaders] — default true when more than one group
 */
export default function GroupedExerciseSections({
  exercises,
  isDarkMode,
  renderExercise,
  getCategory,
  showHeaders,
  className = "",
  sectionClassName = "",
  listClassName = "space-y-2",
}) {
  const groups = useMemo(
    () => groupExercisesByArea(exercises, getCategory),
    [exercises, getCategory],
  );
  const headers = showHeaders ?? groups.length > 1;

  if (!groups.length) return null;

  return (
    <div className={className}>
      {groups.map(group => (
        <section key={group.area} className={sectionClassName || (headers ? "mb-4 last:mb-0" : "")}>
          {headers ? (
            <ExerciseAreaGroupHeader
              label={group.label}
              count={group.exercises.length}
              isDarkMode={isDarkMode}
            />
          ) : null}
          <div className={listClassName}>
            {group.exercises.map(ex => renderExercise(ex, group))}
          </div>
        </section>
      ))}
    </div>
  );
}

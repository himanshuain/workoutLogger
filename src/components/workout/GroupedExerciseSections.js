import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { groupExercisesByArea } from "@/lib/exerciseAreaGroups";
import ExerciseAreaGroupHeader from "@/components/workout/ExerciseAreaGroupHeader";
import {
  readAreaCollapse,
  writeAreaCollapse,
} from "@/lib/exerciseAreaCollapseStorage";

function initialCollapsed(groups, defaultExpanded, storageKey) {
  const stored = readAreaCollapse(storageKey);
  if (stored) return stored;
  if (defaultExpanded) return new Set();
  return new Set(groups.map(g => g.area));
}

/**
 * Renders exercises grouped by body area (chest, shoulders, arms, …).
 * @param {object} props
 * @param {Array} props.exercises
 * @param {boolean} props.isDarkMode
 * @param {(exercise: object, group: { area: string, label: string }) => React.ReactNode} props.renderExercise
 * @param {(exercise: object) => string} [props.getCategory]
 * @param {boolean} [props.showHeaders] — default true when more than one group
 * @param {boolean} [props.collapsible] — tap headers to expand/collapse each area (default true)
 * @param {boolean} [props.defaultExpanded] — initial open state when collapsible (default false)
 * @param {string} [props.collapseStorageKey] — sessionStorage key to persist expand/collapse across navigation
 */
export default function GroupedExerciseSections({
  exercises,
  isDarkMode,
  renderExercise,
  getCategory,
  showHeaders,
  collapsible = true,
  defaultExpanded = false,
  collapseStorageKey,
  className = "",
  sectionClassName = "",
  listClassName = "space-y-2",
}) {
  const groups = useMemo(
    () => groupExercisesByArea(exercises, getCategory),
    [exercises, getCategory],
  );
  const headers = showHeaders ?? groups.length > 1;
  const canCollapse = collapsible && headers;
  const areaKeys = useMemo(() => groups.map(g => g.area).join("\0"), [groups]);

  const [collapsedAreas, setCollapsedAreas] = useState(() =>
    canCollapse ? initialCollapsed(groups, defaultExpanded, collapseStorageKey) : new Set(),
  );

  const storageKeyRef = useRef(collapseStorageKey);
  useEffect(() => {
    if (storageKeyRef.current === collapseStorageKey) return;
    storageKeyRef.current = collapseStorageKey;
    if (!canCollapse) {
      setCollapsedAreas(new Set());
      return;
    }
    setCollapsedAreas(initialCollapsed(groups, defaultExpanded, collapseStorageKey));
  }, [collapseStorageKey, canCollapse, defaultExpanded, groups]);

  // Drop collapsed flags for removed areas; new areas follow defaultExpanded (do not reset user toggles).
  useEffect(() => {
    if (!canCollapse) return;
    const current = new Set(groups.map(g => g.area));
    setCollapsedAreas(prev => {
      let changed = false;
      const next = new Set();
      for (const area of prev) {
        if (current.has(area)) next.add(area);
        else changed = true;
      }
      if (!defaultExpanded) {
        for (const area of current) {
          if (!prev.has(area)) {
            next.add(area);
            changed = true;
          }
        }
      }
      if (!changed) return prev;
      writeAreaCollapse(collapseStorageKey, next);
      return next;
    });
  }, [areaKeys, canCollapse, defaultExpanded, collapseStorageKey, groups]);

  const isExpanded = useCallback(
    area => !collapsedAreas.has(area),
    [collapsedAreas],
  );

  const toggleArea = useCallback(
    area => {
      setCollapsedAreas(prev => {
        const next = new Set(prev);
        if (next.has(area)) next.delete(area);
        else next.add(area);
        writeAreaCollapse(collapseStorageKey, next);
        return next;
      });
    },
    [collapseStorageKey],
  );

  if (!groups.length) return null;

  return (
    <div className={className}>
      {groups.map(group => {
        const open = !canCollapse || isExpanded(group.area);
        return (
          <section key={group.area} className={sectionClassName || (headers ? "mb-3 last:mb-0" : "")}>
            {headers ? (
              <ExerciseAreaGroupHeader
                label={group.label}
                count={group.exercises.length}
                isDarkMode={isDarkMode}
                expanded={open}
                onToggle={canCollapse ? () => toggleArea(group.area) : undefined}
              />
            ) : null}
            {open ? (
              <div className={listClassName}>
                {group.exercises.map(ex => renderExercise(ex, group))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

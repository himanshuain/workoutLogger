export const MUSCLE_GROUP_COLORS = {
  all: { dot: "#64748b", soft: "rgba(100, 116, 139, 0.18)" },
  chest: { dot: "#ef4444", soft: "rgba(239, 68, 68, 0.16)" },
  back: { dot: "#3b82f6", soft: "rgba(59, 130, 246, 0.16)" },
  shoulders: { dot: "#f59e0b", soft: "rgba(245, 158, 11, 0.18)" },
  legs: { dot: "#22c55e", soft: "rgba(34, 197, 94, 0.16)" },
  arms: { dot: "#a855f7", soft: "rgba(168, 85, 247, 0.16)" },
  core: { dot: "#14b8a6", soft: "rgba(20, 184, 166, 0.16)" },
  other: { dot: "#94a3b8", soft: "rgba(148, 163, 184, 0.18)" },
};

export const MUSCLE_GROUPS = [
  { key: "all", label: "All" },
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "shoulders", label: "Shoulders" },
  { key: "legs", label: "Legs" },
  { key: "arms", label: "Arms" },
  { key: "core", label: "Core" },
  { key: "other", label: "Other" },
];

/** Map raw category strings to a muscle group key. */
export function normalizeMuscleGroup(cat) {
  if (!cat) return "other";
  const lower = String(cat).toLowerCase();
  if (lower.includes("chest")) return "chest";
  if (lower.includes("back") || lower.includes("lat") || lower.includes("trap") || lower.includes("row")) return "back";
  if (lower.includes("shoulder") || lower.includes("delt")) return "shoulders";
  if (
    lower.includes("leg")
    || lower.includes("quad")
    || lower.includes("hamstring")
    || lower.includes("calf")
    || lower.includes("calves")
    || lower.includes("glut")
    || lower.includes("squat")
  ) {
    return "legs";
  }
  if (lower.includes("arm") || lower.includes("bicep") || lower.includes("tricep") || lower.includes("curl") || lower.includes("forearm")) {
    return "arms";
  }
  if (lower.includes("core") || lower.includes("ab")) return "core";
  return "other";
}

/** Group exercise logs by muscle group with sorted exercise names. */
export function groupExercisesByMuscle(exerciseLogsByName = {}) {
  const groups = Object.fromEntries(MUSCLE_GROUPS.filter(g => g.key !== "all").map(g => [g.key, []]));

  Object.entries(exerciseLogsByName).forEach(([name, logs]) => {
    if (!Array.isArray(logs) || logs.length === 0) return;
    const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    const group = normalizeMuscleGroup(sortedLogs[0]?.category);
    groups[group].push({ name, logs: sortedLogs, group });
  });

  Object.values(groups).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));
  return groups;
}

export function exercisesForMuscleGroup(exerciseLogsByName, groupKey = "all") {
  const grouped = groupExercisesByMuscle(exerciseLogsByName);
  if (groupKey === "all") {
    return Object.values(grouped).flat();
  }
  return grouped[groupKey] || [];
}

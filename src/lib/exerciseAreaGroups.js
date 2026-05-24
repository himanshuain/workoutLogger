/** Display order for routine / workout exercise sections (push-day style). */
export const AREA_GROUP_ORDER = ["chest", "back", "shoulders", "arms", "legs", "core", "other"];

export const AREA_GROUP_LABELS = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms & triceps",
  legs: "Legs",
  core: "Core",
  other: "Other",
};

export function normalizeAreaCategory(category) {
  const c = String(category || "other")
    .trim()
    .toLowerCase();
  if (AREA_GROUP_ORDER.includes(c)) return c;
  if (c.includes("triceps") || c.includes("biceps") || c === "arm") return "arms";
  if (c.includes("shoulder")) return "shoulders";
  if (c.includes("leg") || c.includes("quad") || c.includes("hamstring") || c.includes("calf"))
    return "legs";
  if (c.includes("chest") || c.includes("pec")) return "chest";
  if (c.includes("back") || c.includes("lat")) return "back";
  if (c.includes("core") || c.includes("abs") || c.includes("ab")) return "core";
  return "other";
}

/**
 * @template T
 * @param {T[]} exercises — items with optional `category`
 * @param {(item: T) => string} [getCategory]
 * @returns {{ area: string, label: string, exercises: T[] }[]}
 */
export function groupExercisesByArea(exercises, getCategory = ex => ex?.category) {
  const buckets = new Map();
  for (const ex of exercises || []) {
    const area = normalizeAreaCategory(getCategory(ex));
    if (!buckets.has(area)) buckets.set(area, []);
    buckets.get(area).push(ex);
  }

  const out = [];
  for (const area of AREA_GROUP_ORDER) {
    const items = buckets.get(area);
    if (items?.length) {
      out.push({ area, label: AREA_GROUP_LABELS[area], exercises: items });
      buckets.delete(area);
    }
  }
  for (const [area, items] of buckets) {
    if (items?.length) {
      out.push({
        area,
        label: AREA_GROUP_LABELS[area] || area,
        exercises: items,
      });
    }
  }
  return out;
}

/** Replace one area's exercises after within-group reorder; preserve other areas' order. */
export function mergeAreaReorder(fullList, area, reorderedInArea, getCategory = ex => ex?.category) {
  const groups = groupExercisesByArea(fullList, getCategory);
  const next = [];
  for (const g of groups) {
    next.push(...(g.area === area ? reorderedInArea : g.exercises));
  }
  return next;
}

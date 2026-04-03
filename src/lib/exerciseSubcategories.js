/**
 * Parent body-part chips (top row) + optional sub-filters (second row).
 * Matching uses ExerciseDB metadata (targetMuscles, secondaryMuscles) and exercise name.
 */

export const PARENT_CHIPS = ["Chest", "Back", "Legs", "Arms", "Shoulders", "Core", "Full Body"];

/**
 * @typedef {{ label: string, match: string[] }} SubCategoryDef
 * @type {Record<string, SubCategoryDef[]>}
 */
export const SUBCATEGORY_DEFS = {
  Arms: [
    { label: "Biceps", match: ["biceps", "bicep"] },
    { label: "Triceps", match: ["triceps", "tricep"] },
    { label: "Forearms", match: ["forearms", "forearm", "brachialis", "brachioradialis"] },
  ],
  Core: [
    { label: "Abs", match: ["abs", "abdominals", "rectus abdominis", "abdominal"] },
    { label: "Obliques", match: ["obliques", "oblique"] },
    { label: "Lower Back", match: ["lower back", "lumbar", "spinal erectors", "erector spinae"] },
  ],
  Legs: [
    { label: "Quads", match: ["quads", "quadriceps", "quad"] },
    { label: "Hamstrings", match: ["hamstrings", "hamstring"] },
    { label: "Calves", match: ["calves", "calf", "gastrocnemius", "soleus"] },
    { label: "Adductors", match: ["adductors", "adductor", "inner thigh"] },
    { label: "Abductors", match: ["abductors", "abductor", "gluteus medius"] },
  ],
  Back: [
    { label: "Lats", match: ["latissimus", "lats"] },
    { label: "Traps", match: ["traps", "trapezius"] },
    { label: "Upper Back", match: ["upper back", "rhomboids", "rear delt", "posterior deltoid"] },
    { label: "Lower Back", match: ["lower back", "lumbar", "erector", "spinae"] },
  ],
  Chest: [
    { label: "Upper Chest", match: ["upper chest", "clavicular", "upper pectoral"] },
    { label: "Mid / General", match: ["pectorals", "chest", "pecs", "sternal", "mid chest", "pectoralis"] },
    { label: "Serratus", match: ["serratus", "scapula"] },
  ],
  Shoulders: [
    { label: "Front Delts", match: ["anterior deltoid", "front delt"] },
    { label: "Side Delts", match: ["lateral deltoid", "side delt", "medial deltoid"] },
    { label: "Rear Delts", match: ["posterior deltoid", "rear delt"] },
    { label: "General", match: ["delts", "shoulders", "shoulder", "deltoid"] },
  ],
};

export function getSubcategoriesForParent(parentChip) {
  if (!parentChip || parentChip === "Full Body") return [];
  return SUBCATEGORY_DEFS[parentChip] || [];
}

/**
 * @param {object} exercise — row from `exercises` with optional metadata.exercisedb
 * @param {string|null} parentChip — e.g. "Arms"
 * @param {string|null} subLabel — e.g. "Biceps"; null = no extra muscle filter
 */
export function exerciseMatchesSubFilter(exercise, parentChip, subLabel) {
  if (!subLabel || !parentChip || parentChip === "Full Body") return true;
  const defs = SUBCATEGORY_DEFS[parentChip];
  const def = defs?.find(d => d.label === subLabel);
  if (!def) return true;

  const edb = exercise.metadata?.exercisedb;
  const tm = Array.isArray(edb?.targetMuscles) ? edb.targetMuscles : [];
  const sm = Array.isArray(edb?.secondaryMuscles) ? edb.secondaryMuscles : [];
  const name = (exercise.name || "").toLowerCase();
  const blob = [...tm, ...sm, name].join(" ").toLowerCase();

  return def.match.some(kw => {
    const k = kw.toLowerCase().trim();
    if (!k) return false;
    if (blob.includes(k)) return true;
    return [...tm, ...sm].some(m => String(m).toLowerCase().includes(k));
  });
}

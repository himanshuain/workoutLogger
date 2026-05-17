/** @typedef {{ key: string, label: string, match: (haystackLower: string) => boolean }} EquipmentChip */

import { getExerciseEquipment } from "@/lib/exerciseMedia";

/** User-facing chips (single-select; "Other" catches known equipment strings with no finer tag). */
export const EQUIPMENT_CHIPS /** @type {EquipmentChip[]} */ = [
  { key: "bodyweight", label: "Body weight", match: s => /\b(bodyweight|body\s*weight|calisthenics|\bbw\b)\b/i.test(s) },
  {
    key: "dumbbell",
    label: "Dumbbell",
    match: s => /\b(dumbbell|dumbbells|pair\s+of\s+dumbbells)\b/i.test(s),
  },
  {
    key: "barbell",
    label: "Barbell",
    match: s => /\b(barbell|olympic\s+bar|ez\s*bar(bar)?|trap\s+bar)\b/i.test(s),
  },
  {
    key: "kettlebell",
    label: "Kettlebell",
    match: s => /\b(kettlebell|kb)\b/i.test(s),
  },
  {
    key: "cable",
    label: "Cable",
    match: s => /\b(cross[\s_-]?over)?\bcable|cable\s+motion/i.test(s),
  },
  {
    key: "machine",
    label: "Machine",
    match: s =>
      /\b(machine|plate\s*loaded|\blever\b|\bsmith\b|leg\s+press|leg\s+extension|chest\s+press|hack\s+squat|lat\s+pulldown|row\s+machine|pec\s+deck|glute\s+ham|ghd|leg\s+curl)\b/i.test(s),
  },
  {
    key: "band",
    label: "Band",
    match: s => /\b(resistance\s+)?band|mini\s*bands?|\bloops?\b|\btrx\b|\bsuspension\b/i.test(s),
  },
];

/** Row chips including "Other" bucket for unrecognized equipment phrases. */
export const EQUIPMENT_FILTER_ROW = [...EQUIPMENT_CHIPS, { key: "other", label: "Other" }];

/**
 * Full equipment phrase for tagging (includes `equipment` column and ExerciseDB list via shared helper).
 */
export function getExerciseEquipmentHaystack(exercise) {
  return getExerciseEquipment(exercise).trim();
}

/**
 * Derive standardized tag keys matching EQUIPMENT_CHIPS (plus "other").
 * @returns {string[]}
 */
export function deriveEquipmentTags(exercise) {
  const raw = getExerciseEquipmentHaystack(exercise);
  const name = typeof exercise?.name === "string" ? exercise.name : "";
  /** Equipment chip matching: some rows only encode detail in name (esp. seated/lying leg curls). */
  const lower = `${raw} ${name}`.trim().toLowerCase();
  /** @type {string[]} */
  const tags = [];
  for (const c of EQUIPMENT_CHIPS) {
    if (c.match(lower)) tags.push(c.key);
  }
  if (tags.length === 0 && raw.trim()) tags.push("other");
  return tags;
}

/**
 * @param {object} exercise
 * @param {string|null|undefined} filterKey — one of EQUIPMENT_CHIPS[].key or "other"; nullish = All
 */
export function exerciseMatchesEquipmentFilter(exercise, filterKey) {
  if (!filterKey) return true;
  const tags = deriveEquipmentTags(exercise);
  return tags.includes(filterKey);
}

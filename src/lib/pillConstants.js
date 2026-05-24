/** Empty barbell — no added weight (stored as 0 kg). */
export const BAR_WEIGHT_KG = 0;

/**
 * Plate-loaded machine stack (kg) — e.g. Hammer Strength / Life Fitness selector pin.
 */
export const MACHINE_STACK_WEIGHTS_KG = [
  4, 8, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110,
];

/** Barbell / free-weight pills: 2.5–120 kg in 2.5 kg steps. */
export const BARBELL_WEIGHT_PILLS_KG = Array.from({ length: 48 }, (_, i) => 2.5 * (i + 1));

function mergeWeightPills(...lists) {
  const seen = new Set();
  for (const list of lists) {
    for (const v of list) {
      seen.add(v);
    }
  }
  return [...seen].sort((a, b) => a - b);
}

/** Weight pills: Bar, barbell 2.5 kg steps, plus machine stack plates. */
export const WEIGHT_PILLS_KG = mergeWeightPills(
  [BAR_WEIGHT_KG],
  BARBELL_WEIGHT_PILLS_KG,
  MACHINE_STACK_WEIGHTS_KG,
);

/** Reps pills: 4–30 (every rep). */
export const REPS_PILLS = Array.from({ length: 27 }, (_, i) => i + 4);

export function isBarWeight(v) {
  return v === BAR_WEIGHT_KG || (typeof v === "number" && Math.abs(v) < 0.001);
}

export function formatWeightPill(v) {
  if (isBarWeight(v)) return "Bar";
  return Number.isInteger(v) ? String(v) : String(v);
}

/** e.g. "Bar", "20 kg" */
export function formatWeightDisplay(v) {
  if (isBarWeight(v)) return "Bar";
  return `${formatWeightPill(v)} kg`;
}

/** Snap a numeric value to the closest pill in a sorted list. */
export function nearestPill(val, pills) {
  const n = Number(val);
  if (!Number.isFinite(n)) return pills[0];
  if (pills.some(p => Math.abs(p - n) < 0.001)) {
    return pills.find(p => Math.abs(p - n) < 0.001);
  }
  return pills.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));
}

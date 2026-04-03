/** Weight pills: 2.5–50 kg in 2.5 kg steps (single scroll row). */
export const WEIGHT_PILLS_KG = [
  2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50,
];

/** Reps pills: 5–29 step 2, plus 30 (single scroll row). */
export const REPS_PILLS = [5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 30];

export function formatWeightPill(v) {
  return Number.isInteger(v) ? String(v) : String(v);
}

/** Snap a numeric value to the closest pill in a sorted list. */
export function nearestPill(val, pills) {
  const n = Number(val);
  if (!Number.isFinite(n)) return pills[0];
  if (pills.some((p) => Math.abs(p - n) < 0.001)) {
    return pills.find((p) => Math.abs(p - n) < 0.001);
  }
  return pills.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));
}

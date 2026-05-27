/**
 * @param {number|string} raw
 * @param {{ quantity_whole_numbers?: boolean } | null | undefined} foodItem
 * @returns {number}
 */
export function normalizeFoodQuantity(raw, foodItem) {
  const n = Number(raw);
  if (foodItem?.quantity_whole_numbers) {
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.round(n);
  }
  if (!Number.isFinite(n) || n < 0.5) return 0.5;
  return Math.round(n * 2) / 2;
}

/** @param {{ log_directly?: boolean } | null | undefined} foodItem */
export function foodLogsDirectly(foodItem) {
  return Boolean(foodItem?.log_directly);
}

/** Default quantity for one-tap logging. */
export function initialFoodQuantity(foodItem) {
  const def = foodItem?.default_quantity ?? 1;
  const raw = foodItem?.quantity_whole_numbers
    ? Math.max(1, Math.round(Number(def)))
    : Number(def) || 1;
  return normalizeFoodQuantity(raw, foodItem);
}

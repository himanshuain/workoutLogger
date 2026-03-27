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

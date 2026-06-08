/** Default daily macro targets when none are configured. */
export const DEFAULT_MACRO_TARGETS = {
  protein_g: 150,
  carbs_g: 200,
  fat_g: 65,
  calories: 2200,
};

/** Normalize macro targets from user settings. */
export function getMacroTargets(settings) {
  const raw = settings?.macro_targets;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MACRO_TARGETS };
  return {
    protein_g: Number(raw.protein_g) || DEFAULT_MACRO_TARGETS.protein_g,
    carbs_g: Number(raw.carbs_g) || DEFAULT_MACRO_TARGETS.carbs_g,
    fat_g: Number(raw.fat_g) || DEFAULT_MACRO_TARGETS.fat_g,
    calories: Number(raw.calories) || DEFAULT_MACRO_TARGETS.calories,
  };
}

/** Macros for a single food item at a given quantity. */
export function macrosForEntry(foodItem, quantity = 1) {
  const q = Number(quantity) || 0;
  return {
    protein_g: (Number(foodItem?.protein_g) || 0) * q,
    carbs_g: (Number(foodItem?.carbs_g) || 0) * q,
    fat_g: (Number(foodItem?.fat_g) || 0) * q,
    calories: (Number(foodItem?.calories) || 0) * q,
  };
}

/** Sum macros from food entries + item catalog. */
export function sumMacrosForDay(entries, foodItems, date) {
  const itemsById = Object.fromEntries((foodItems || []).map(f => [f.id, f]));
  const totals = { protein_g: 0, carbs_g: 0, fat_g: 0, calories: 0 };
  const byItem = [];

  (entries || []).forEach(entry => {
    if (entry.date !== date) return;
    const item = itemsById[entry.food_item_id];
    if (!item) return;
    const m = macrosForEntry(item, entry.quantity || 1);
    totals.protein_g += m.protein_g;
    totals.carbs_g += m.carbs_g;
    totals.fat_g += m.fat_g;
    totals.calories += m.calories;
    if (m.protein_g > 0 || m.calories > 0) {
      byItem.push({
        foodItemId: item.id,
        name: item.name,
        icon: item.icon,
        color: item.color,
        quantity: entry.quantity || 1,
        unit: item.unit,
        ...m,
      });
    }
  });

  byItem.sort((a, b) => b.protein_g - a.protein_g);
  return { totals, byItem };
}

/** Build daily macro totals for a date range. */
export function dailyMacroSeries(entries, foodItems, startDate, endDate) {
  const itemsById = Object.fromEntries((foodItems || []).map(f => [f.id, f]));
  const byDate = {};

  (entries || []).forEach(entry => {
    if (entry.date < startDate || entry.date > endDate) return;
    const item = itemsById[entry.food_item_id];
    if (!item) return;
    if (!byDate[entry.date]) {
      byDate[entry.date] = { date: entry.date, protein_g: 0, carbs_g: 0, fat_g: 0, calories: 0 };
    }
    const m = macrosForEntry(item, entry.quantity || 1);
    byDate[entry.date].protein_g += m.protein_g;
    byDate[entry.date].carbs_g += m.carbs_g;
    byDate[entry.date].fat_g += m.fat_g;
    byDate[entry.date].calories += m.calories;
  });

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

/** Progress percentage capped at 100 for ring displays. */
export function macroProgress(current, target) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

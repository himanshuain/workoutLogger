import { macrosForEntry } from "@/lib/macroCalculations";

/** @deprecated Legacy fixed slots — used only for migration */
export const MEAL_SLOTS = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

export function newPlanItem(foodItemId, quantity = 1) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    foodItemId,
    quantity,
  };
}

export function newMeal(name = "Meal 1") {
  return {
    id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    items: [],
  };
}

export function defaultMealPlan() {
  return [newMeal("Meal 1")];
}

export function nextMealName(mealList) {
  const n = (mealList?.length || 0) + 1;
  return `Meal ${n}`;
}

function normalizeItems(items) {
  return (items || []).map((row, idx) => ({
    ...row,
    id: row.id || `${row.foodItemId}-${idx}`,
    quantity: Number(row.quantity) || 1,
  }));
}

export function normalizeMealList(mealList) {
  if (!Array.isArray(mealList) || !mealList.length) {
    return defaultMealPlan();
  }
  return mealList.map((meal, idx) => ({
    id: meal.id || `meal-${idx}`,
    name: meal.name || `Meal ${idx + 1}`,
    items: normalizeItems(meal.items),
  }));
}

function migrateSlotMeals(meals) {
  if (!meals || Array.isArray(meals)) return null;
  const list = [];
  MEAL_SLOTS.forEach(slot => {
    const items = meals[slot.id] || [];
    if (items.length) {
      list.push({
        id: `meal-${slot.id}`,
        name: slot.label,
        items: normalizeItems(items),
      });
    }
  });
  return list.length ? list : null;
}

/** Load the single meal plan. Migrates legacy formats. */
export function getMealPlan(settings) {
  const mp = settings?.macro_plans;

  if (Array.isArray(mp?.mealList)) {
    return { mealList: normalizeMealList(mp.mealList) };
  }

  if (mp?.meals) {
    const migrated = migrateSlotMeals(mp.meals);
    if (migrated) return { mealList: migrated };
  }

  if (mp?.plans && typeof mp.plans === "object") {
    for (const plan of Object.values(mp.plans)) {
      if (Array.isArray(plan?.mealList)) {
        return { mealList: normalizeMealList(plan.mealList) };
      }
      const migrated = migrateSlotMeals(plan?.meals);
      if (migrated) return { mealList: migrated };
    }
  }

  return { mealList: defaultMealPlan() };
}

/** Sum macros for a meal's items. */
export function sumMealItems(items, foodItems) {
  const byId = Object.fromEntries((foodItems || []).map(f => [f.id, f]));
  const totals = { protein_g: 0, carbs_g: 0, fat_g: 0, calories: 0 };
  const rows = [];

  (items || []).forEach(row => {
    const item = byId[row.foodItemId];
    if (!item) return;
    const m = macrosForEntry(item, row.quantity || 1);
    totals.protein_g += m.protein_g;
    totals.carbs_g += m.carbs_g;
    totals.fat_g += m.fat_g;
    totals.calories += m.calories;
    rows.push({
      ...row,
      name: item.name,
      icon: item.icon,
      color: item.color,
      unit: item.unit,
      macros: m,
    });
  });

  return { totals, rows };
}

/** Sum all meals in the plan. */
export function sumPlan(mealList, foodItems) {
  const list = normalizeMealList(mealList);
  const byMeal = {};
  const totals = { protein_g: 0, carbs_g: 0, fat_g: 0, calories: 0 };

  list.forEach(meal => {
    const { totals: mealTotals, rows } = sumMealItems(meal.items, foodItems);
    byMeal[meal.id] = { meal, totals: mealTotals, rows };
    totals.protein_g += mealTotals.protein_g;
    totals.carbs_g += mealTotals.carbs_g;
    totals.fat_g += mealTotals.fat_g;
    totals.calories += mealTotals.calories;
  });

  return { byMeal, totals, mealList: list };
}

/** @deprecated alias */
export function sumDayPlan(meals, foodItems) {
  if (Array.isArray(meals)) {
    return sumPlan(meals, foodItems);
  }
  const migrated = migrateSlotMeals(meals);
  return sumPlan(migrated || defaultMealPlan(), foodItems);
}

export function formatMealMacros(totals) {
  const c = Math.round(totals.calories);
  const p = Math.round(totals.protein_g);
  const cb = Math.round(totals.carbs_g);
  const f = Math.round(totals.fat_g);
  return `${c} kcal · ${p}P ${cb}C ${f}F`;
}

export function formatItemMacros(macros) {
  const p = Math.round(macros.protein_g);
  const cb = Math.round(macros.carbs_g);
  const f = Math.round(macros.fat_g);
  const c = Math.round(macros.calories);
  return `${p}P ${cb}C ${f}F · ${c} kcal`;
}

export function macroRemaining(current, target) {
  const t = Number(target) || 0;
  const c = Number(current) || 0;
  const diff = Math.round(t - c);
  if (diff === 0) return "0";
  return diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`;
}

/** Merge plan items into one quantity per food (for logging). */
export function mergePlanForLogging(mealList) {
  const merged = {};
  normalizeMealList(mealList).forEach(meal => {
    (meal.items || []).forEach(row => {
      merged[row.foodItemId] = (merged[row.foodItemId] || 0) + (Number(row.quantity) || 1);
    });
  });
  return merged;
}

/** Unique food names for a simple grocery list. */
export function groceryListFromPlan(mealList, foodItems) {
  const byId = Object.fromEntries((foodItems || []).map(f => [f.id, f]));
  const names = new Set();
  normalizeMealList(mealList).forEach(meal => {
    meal.items.forEach(row => {
      const item = byId[row.foodItemId];
      if (item?.name) names.add(item.name);
    });
  });
  return [...names].sort();
}

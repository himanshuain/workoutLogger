import { describe, it, expect } from "vitest";
import {
  sumPlan,
  mergePlanForLogging,
  getMealPlan,
  newPlanItem,
  newMeal,
  normalizeMealList,
  formatMealMacros,
  macroRemaining,
  groceryListFromPlan,
} from "@/lib/macroPlanner";

describe("macroPlanner", () => {
  const eggs = {
    id: "egg-1",
    name: "Eggs",
    protein_g: 6,
    carbs_g: 0,
    fat_g: 5,
    calories: 70,
    unit: "egg",
  };

  const mealList = [
    {
      id: "m1",
      name: "Meal 1",
      items: [newPlanItem("egg-1", 2)],
    },
    {
      id: "m2",
      name: "Meal 2",
      items: [newPlanItem("egg-1", 1)],
    },
  ];

  it("sums planned macros across meals", () => {
    const { totals } = sumPlan(mealList, [eggs]);
    expect(totals.protein_g).toBe(18);
    expect(totals.calories).toBe(210);
  });

  it("merges duplicate foods for logging", () => {
    const merged = mergePlanForLogging(mealList);
    expect(merged["egg-1"]).toBe(3);
  });

  it("loads saved mealList plan", () => {
    const settings = {
      macro_plans: {
        mealList: [{ id: "m1", name: "Meal 1", items: [{ id: "a", foodItemId: "x", quantity: 1 }] }],
      },
    };
    const plan = getMealPlan(settings);
    expect(plan.mealList).toHaveLength(1);
    expect(plan.mealList[0].items).toHaveLength(1);
  });

  it("migrates legacy slot-based meals", () => {
    const settings = {
      macro_plans: {
        meals: {
          breakfast: [{ foodItemId: "x", quantity: 1 }],
          lunch: [],
          dinner: [],
          snack: [],
        },
      },
    };
    const plan = getMealPlan(settings);
    expect(plan.mealList).toHaveLength(1);
    expect(plan.mealList[0].name).toBe("Breakfast");
    expect(plan.mealList[0].items[0].id).toBeTruthy();
  });

  it("formats meal macro summary", () => {
    expect(formatMealMacros({ calories: 360, protein_g: 17, carbs_g: 0, fat_g: 33 })).toBe(
      "360 kcal · 17P 0C 33F",
    );
  });

  it("shows remaining macros", () => {
    expect(macroRemaining(17, 150)).toBe("-133");
    expect(macroRemaining(160, 150)).toBe("+10");
  });

  it("builds grocery list from unique foods", () => {
    const list = groceryListFromPlan(mealList, [eggs]);
    expect(list).toEqual(["Eggs"]);
  });

  it("defaults to Meal 1 when empty", () => {
    expect(normalizeMealList([])[0].name).toBe("Meal 1");
    expect(newMeal().items).toEqual([]);
  });
});

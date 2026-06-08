import { describe, it, expect } from "vitest";
import {
  extractPer100g,
  suggestServing,
  mapUsdaSearchResults,
  rankUsdaFoods,
  dedupeUsdaFoods,
} from "@/lib/nutritionLookup";

describe("nutritionLookup", () => {
  const wholeEgg = {
    fdcId: 1,
    description: "Eggs, Grade A, Large, egg whole",
    dataType: "Foundation",
    foodCategory: "Dairy and Egg Products",
    foodNutrients: [
      { nutrientId: 1003, value: 12.4 },
      { nutrientId: 1004, value: 9.96 },
      { nutrientId: 1005, value: 0.96 },
      { nutrientId: 1008, value: 148 },
    ],
  };

  it("extracts per 100g macros", () => {
    expect(extractPer100g(wholeEgg)).toEqual({
      protein_g: 12.4,
      carbs_g: 1,
      fat_g: 10,
      calories: 148,
    });
  });

  it("scales whole egg to one large egg (50g)", () => {
    const serving = suggestServing(wholeEgg);
    expect(serving.unit).toBe("egg");
    expect(serving.macros.protein_g).toBe(6.2);
    expect(serving.macros.calories).toBe(74);
  });

  it("maps search results for UI", () => {
    const results = mapUsdaSearchResults([wholeEgg], "egg");
    expect(results[0].preview).toContain("6.2g protein");
    expect(results[0].unit).toBe("egg");
    expect(results[0].macroLine).toContain("6.2g P");
    expect(results[0].typeLabel).toBe("USDA Foundation");
  });

  it("ranks whole egg above branded duplicates", () => {
    const ranked = rankUsdaFoods(
      [
        { description: "EGGS", dataType: "Branded", score: 100, foodNutrients: [] },
        wholeEgg,
      ],
      "eggs",
    );
    expect(ranked[0].description).toContain("egg whole");
  });

  it("dedupes identical entries", () => {
    const deduped = dedupeUsdaFoods([wholeEgg, { ...wholeEgg, fdcId: 2 }]);
    expect(deduped).toHaveLength(1);
  });
});

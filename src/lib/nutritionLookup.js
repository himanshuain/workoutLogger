/** USDA FoodData Central nutrient IDs */
const NUTRIENT = {
  PROTEIN: 1003,
  FAT: 1004,
  CARBS: 1005,
  CALORIES: 1008,
};

/** Typical gram weight when USDA has no servingSize. */
const COMMON_SERVING_GRAMS = [
  { match: /egg.*whole|whole.*egg/i, grams: 50, unit: "egg", label: "1 large egg (50g)" },
  { match: /egg white/i, grams: 33, unit: "egg white", label: "1 egg white (33g)" },
  { match: /banana/i, grams: 118, unit: "banana", label: "1 medium banana (118g)" },
  { match: /chicken breast/i, grams: 174, unit: "breast", label: "1 breast (~174g)" },
];

function round1(n) {
  return Math.round(n * 10) / 10;
}

/** Pull macros per 100g from a USDA food search hit. */
export function extractPer100g(food) {
  const byId = {};
  (food?.foodNutrients || []).forEach(n => {
    byId[n.nutrientId] = Number(n.value) || 0;
  });
  return {
    protein_g: round1(byId[NUTRIENT.PROTEIN] || 0),
    carbs_g: round1(byId[NUTRIENT.CARBS] || 0),
    fat_g: round1(byId[NUTRIENT.FAT] || 0),
    calories: round1(byId[NUTRIENT.CALORIES] || 0),
  };
}

/** Scale per-100g values to a gram amount. */
export function scaleMacros(per100g, grams) {
  const f = grams / 100;
  return {
    protein_g: round1(per100g.protein_g * f),
    carbs_g: round1(per100g.carbs_g * f),
    fat_g: round1(per100g.fat_g * f),
    calories: round1(per100g.calories * f),
  };
}

/** Pick best serving for a USDA food description. */
export function suggestServing(food) {
  const desc = food?.description || "";
  const per100g = extractPer100g(food);

  if (food?.servingSize && food.servingSize > 0) {
    const unit = (food.servingSizeUnit || "serving").toLowerCase();
    const grams =
      unit === "g" || unit === "gram" || unit === "grams"
        ? food.servingSize
        : food.servingSize;
    return {
      basis: "serving",
      basisLabel: `${food.servingSize} ${food.servingSizeUnit || "serving"}`,
      unit: food.servingSizeUnit || "serving",
      default_quantity: 1,
      grams: unit.includes("g") ? food.servingSize : null,
      macros: food.servingSizeUnit?.toLowerCase().includes("g")
        ? scaleMacros(per100g, food.servingSize)
        : per100g,
      per100g,
    };
  }

  for (const rule of COMMON_SERVING_GRAMS) {
    if (rule.match.test(desc)) {
      return {
        basis: "common",
        basisLabel: rule.label,
        unit: rule.unit,
        default_quantity: 1,
        grams: rule.grams,
        macros: scaleMacros(per100g, rule.grams),
        per100g,
      };
    }
  }

  return {
    basis: "100g",
    basisLabel: "per 100g",
    unit: "100g",
    default_quantity: 1,
    grams: 100,
    macros: per100g,
    per100g,
  };
}

const DATA_TYPE_RANK = { Foundation: 0, "SR Legacy": 1, Branded: 2 };

function dataTypeLabel(dataType) {
  if (dataType === "Foundation") return "USDA Foundation";
  if (dataType === "SR Legacy") return "USDA Legacy";
  if (dataType === "Branded") return "Branded";
  return dataType || "USDA";
}

/** Rank foods so whole/generic entries appear before noisy branded duplicates. */
export function rankUsdaFoods(foods, query = "") {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter(Boolean);

  return [...(foods || [])].sort((a, b) => {
    const score = food => {
      const desc = (food.description || "").toLowerCase();
      let s = 0;
      // USDA relevance score helps Foundation/Legacy; branded lists are noisy for generic foods
      if (food.dataType !== "Branded") {
        s += (Number(food.score) || 0) * 0.01;
      }

      if (desc === q) {
        s += food.dataType === "Branded" ? 5 : 50;
      } else if (desc.startsWith(q)) {
        s += food.dataType === "Branded" ? 8 : 30;
      } else if (desc.includes(q)) {
        s += 15;
      }

      for (const w of words) {
        if (desc.includes(w)) s += 4;
      }

      // Prefer whole foods when searching eggs, chicken, etc.
      if (/egg/i.test(q) && /whole/i.test(desc)) s += 8;
      if (/egg/i.test(q) && /white/i.test(desc) && !/whole/i.test(desc)) s -= 4;

      s -= (DATA_TYPE_RANK[food.dataType] ?? 3) * 40;
      return s;
    };
    return score(b) - score(a);
  });
}

/** Drop near-duplicate rows (same name + same per-100g macros). */
export function dedupeUsdaFoods(foods) {
  const seen = new Set();
  return (foods || []).filter(food => {
    const per100 = extractPer100g(food);
    const key = `${(food.description || "").toLowerCase()}|${per100.protein_g}|${per100.calories}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatMacroLine(macros) {
  return `${macros.protein_g}g P · ${macros.carbs_g}g C · ${macros.fat_g}g F · ${macros.calories} kcal`;
}

/** Normalize USDA search hits for the UI. */
export function mapUsdaSearchResults(foods, query = "") {
  const ranked = dedupeUsdaFoods(rankUsdaFoods(foods, query));

  return ranked.slice(0, 12).map(food => {
    const serving = suggestServing(food);
    const brand = food.brandOwner || food.brandName || null;
    const category = food.foodCategory || "";
    const typeLabel = dataTypeLabel(food.dataType);
    const isBranded = food.dataType === "Branded";

    return {
      id: food.fdcId,
      description: food.description,
      category,
      brand,
      dataType: food.dataType,
      typeLabel,
      isBranded,
      basisLabel: serving.basisLabel,
      per100g: serving.per100g,
      macros: serving.macros,
      unit: serving.unit,
      default_quantity: serving.default_quantity,
      preview: `${serving.macros.protein_g}g protein · ${serving.macros.calories} kcal (${serving.basisLabel})`,
      macroLine: formatMacroLine(serving.macros),
      per100gLine: formatMacroLine(serving.per100g),
      unitHint: `Logs as: ${serving.default_quantity} ${serving.unit}`,
      subtitle: [typeLabel, brand, category].filter(Boolean).join(" · "),
    };
  });
}

/** Apply a lookup result to food item form fields. */
export function applyLookupToFood(result, current = {}) {
  return {
    ...current,
    protein_g: result.macros.protein_g,
    carbs_g: result.macros.carbs_g,
    fat_g: result.macros.fat_g,
    calories: result.macros.calories,
    unit: result.unit || current.unit,
    default_quantity: result.default_quantity ?? current.default_quantity,
  };
}

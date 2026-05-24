import { describe, it, expect } from "vitest";
import {
  dedupeExercisesForPicker,
  prepareExerciseCatalog,
  exerciseMatchesSearch,
  isLegacySeedExercise,
  isSeedCoveredByCatalog,
  resolveCatalogVariations,
  buildExerciseCatalogByName,
  normalizeExerciseName,
} from "@/lib/exerciseCatalog";

describe("exerciseCatalog", () => {
  it("dedupes by normalized name and prefers GIF + exerciseapi metadata", () => {
    const seed = {
      id: "1",
      name: "Bench Press",
      is_predefined: true,
      external_source: null,
      category: "chest",
    };
    const wger = {
      id: "2",
      name: "bench press",
      external_source: "wger",
      image_url: "https://wger.de/img.jpg",
      category: "chest",
    };
    const edb = {
      id: "3",
      name: "Bench Press",
      external_source: "exercisedb",
      gif_url: "https://static.exercisedb.dev/x.gif",
      category: "chest",
    };

    const out = dedupeExercisesForPicker([seed, wger, edb]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("3");
  });

  it("drops legacy seed when catalog entry covers the name with media", () => {
    const seed = {
      id: "s1",
      name: "Squat",
      is_predefined: true,
      external_source: null,
    };
    const catalog = {
      id: "c1",
      name: "Barbell Back Squat",
      external_source: "exerciseapi",
      gif_url: "https://static.exercisedb.dev/squat.gif",
      is_predefined: true,
    };

    expect(isLegacySeedExercise(seed)).toBe(true);
    expect(isSeedCoveredByCatalog(seed, [seed, catalog])).toBe(true);

    const prepared = prepareExerciseCatalog([seed, catalog]);
    expect(prepared.some(e => e.id === "s1")).toBe(false);
    expect(prepared.some(e => e.id === "c1")).toBe(true);
  });

  it("matches search on keywords and variations from exerciseapi metadata", () => {
    const ex = {
      id: "x",
      name: "Barbell Bench Press - Medium Grip",
      category: "chest",
      metadata: {
        exerciseapi: {
          keywords: ["chest press", "bench"],
          variations: ["Incline Barbell Bench Press"],
        },
      },
    };

    expect(exerciseMatchesSearch(ex, "incline")).toBe(true);
    expect(exerciseMatchesSearch(ex, "chest press")).toBe(true);
    expect(exerciseMatchesSearch(ex, "deadlift")).toBe(false);
  });

  it("resolves variation labels to catalog exercises by normalized name", () => {
    const main = {
      id: "m",
      name: "Barbell Bench Press",
      metadata: { exerciseapi: { variations: ["Incline Barbell Bench Press"] } },
    };
    const incline = { id: "i", name: "Incline Barbell Bench Press" };
    const byName = buildExerciseCatalogByName([main, incline]);

    const resolved = resolveCatalogVariations(main, byName);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].label).toBe("Incline Barbell Bench Press");
    expect(resolved[0].exercise?.id).toBe("i");
  });

  it("normalizeExerciseName collapses whitespace and case", () => {
    expect(normalizeExerciseName("  Barbell   Bench Press ")).toBe("barbell bench press");
  });
});

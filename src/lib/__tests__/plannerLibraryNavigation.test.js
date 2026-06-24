import { describe, it, expect } from "vitest";
import {
  resolveExerciseFromCatalog,
  resolveExerciseForPreview,
  buildPlannerExerciseFallback,
} from "@/lib/plannerLibraryNavigation";

const catalog = [
  { id: "a1", name: "Bench Press", category: "chest", is_predefined: true },
  { id: "b2", name: "One Arm Seated High Row", category: "back", user_id: "u1", is_predefined: false },
];

describe("plannerLibraryNavigation", () => {
  it("resolves by normalized name", () => {
    const ex = resolveExerciseFromCatalog(catalog, {
      exerciseName: "one arm seated high row",
    });
    expect(ex?.id).toBe("b2");
  });

  it("builds fallback for custom routine rows missing from catalog", () => {
    const fallback = buildPlannerExerciseFallback({
      exerciseId: "custom-1",
      exerciseName: "One arm Seated high row",
      category: "back",
      notes: "Cable machine variant",
    });
    expect(fallback.name).toBe("One arm Seated high row");
    expect(fallback.metadata.planner_notes).toBe("Cable machine variant");
  });

  it("uses fallback when catalog lookup fails", () => {
    const ex = resolveExerciseForPreview(catalog, {
      exerciseId: "missing-id",
      exerciseName: "Landmine press",
      category: "shoulders",
    });
    expect(ex.name).toBe("Landmine press");
    expect(ex.category).toBe("shoulders");
  });
});

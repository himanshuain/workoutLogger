import { describe, it, expect } from "vitest";
import { exercisesForMuscleGroup, normalizeMuscleGroup } from "@/lib/exerciseCategories";

describe("exerciseCategories", () => {
  it("normalizes categories to muscle groups", () => {
    expect(normalizeMuscleGroup("chest")).toBe("chest");
    expect(normalizeMuscleGroup("Back / Lats")).toBe("back");
    expect(normalizeMuscleGroup("Legs")).toBe("legs");
    expect(normalizeMuscleGroup("unknown")).toBe("other");
  });

  it("groups exercises by muscle", () => {
    const logs = {
      "Bench Press": [{ date: "2026-05-01", weight: 60, reps: 10, category: "chest" }],
      "Leg Extension": [{ date: "2026-05-02", weight: 50, reps: 12, category: "legs" }],
    };
    const chest = exercisesForMuscleGroup(logs, "chest");
    expect(chest).toHaveLength(1);
    expect(chest[0].name).toBe("Bench Press");
    expect(exercisesForMuscleGroup(logs, "all")).toHaveLength(2);
  });
});

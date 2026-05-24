import { describe, it, expect } from "vitest";
import {
  groupExercisesByArea,
  normalizeAreaCategory,
  mergeAreaReorder,
} from "@/lib/exerciseAreaGroups";

describe("exerciseAreaGroups", () => {
  it("normalizes triceps under arms", () => {
    expect(normalizeAreaCategory("triceps")).toBe("arms");
  });

  it("groups push day exercises in display order", () => {
    const exercises = [
      { name: "Tricep Pushdown", category: "arms" },
      { name: "Bench Press", category: "chest" },
      { name: "OHP", category: "shoulders" },
    ];
    const groups = groupExercisesByArea(exercises);
    expect(groups.map(g => g.area)).toEqual(["chest", "shoulders", "arms"]);
    expect(groups[0].exercises).toHaveLength(1);
    expect(groups[0].exercises[0].name).toBe("Bench Press");
  });

  it("mergeAreaReorder updates one section only", () => {
    const full = [
      { key: "a", category: "chest", exercise_name: "A" },
      { key: "b", category: "shoulders", exercise_name: "B" },
      { key: "c", category: "shoulders", exercise_name: "C" },
    ];
    const merged = mergeAreaReorder(
      full,
      "shoulders",
      [
        { key: "c", category: "shoulders", exercise_name: "C" },
        { key: "b", category: "shoulders", exercise_name: "B" },
      ],
      ex => ex.category,
    );
    expect(merged.map(e => e.key)).toEqual(["a", "c", "b"]);
  });
});

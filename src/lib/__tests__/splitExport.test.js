import { describe, it, expect } from "vitest";
import { buildSplitsExportPayload, splitsExportFilename } from "@/lib/splitExport";

describe("splitExport", () => {
  it("builds payload from routines sorted by name", () => {
    const payload = buildSplitsExportPayload([
      {
        id: "b",
        name: "Pull",
        routine_exercises: [
          { exercise_name: "Row", category: "back", target_sets: 4, notes: "Pause" },
        ],
      },
      {
        id: "a",
        name: "Push",
        routine_exercises: [
          { exercise_name: "Bench Press", category: "chest", target_sets: 3, notes: null },
        ],
      },
    ]);

    expect(payload.summary.split_count).toBe(2);
    expect(payload.summary.exercise_count).toBe(2);
    expect(payload.splits[0].name).toBe("Pull");
    expect(payload.splits[1].name).toBe("Push");
    expect(payload.splits[0].exercises[0].notes).toBe("Pause");
  });

  it("applies draft override for the active split", () => {
    const payload = buildSplitsExportPayload(
      [{ id: "a", name: "Push", routine_exercises: [{ exercise_name: "Old", category: "chest" }] }],
      {
        draftOverride: {
          id: "a",
          name: "Push Day",
          exercises: [{ exercise_name: "Bench", category: "chest", target_sets: 5, notes: "Heavy" }],
        },
      },
    );

    expect(payload.splits[0].name).toBe("Push Day");
    expect(payload.splits[0].exercises[0].exercise_name).toBe("Bench");
  });

  it("builds a dated filename", () => {
    expect(splitsExportFilename()).toMatch(/^workout-splits-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});

import { describe, it, expect } from "vitest";
import { buildWorkoutHeatmapFromSessions } from "@/lib/workoutHeatmapData";

describe("buildWorkoutHeatmapFromSessions", () => {
  it("includes only completed sessions", () => {
    const data = buildWorkoutHeatmapFromSessions([
      {
        date: "2026-05-20",
        status: "active",
        set_logs: [{ is_completed: true }, { is_completed: true }],
      },
      {
        date: "2026-05-21",
        status: "completed",
        set_logs: [{ is_completed: true }, { is_completed: true }],
      },
    ]);
    expect(data).toEqual([{ date: "2026-05-21", count: 2 }]);
  });

  it("counts mark-done days with no sets as 1", () => {
    const data = buildWorkoutHeatmapFromSessions([
      { date: "2026-05-22", status: "completed", set_logs: [] },
    ]);
    expect(data).toEqual([{ date: "2026-05-22", count: 1 }]);
  });

  it("ignores incomplete sets on completed sessions", () => {
    const data = buildWorkoutHeatmapFromSessions([
      {
        date: "2026-05-23",
        status: "completed",
        set_logs: [{ is_completed: true }, { is_completed: false }],
      },
    ]);
    expect(data).toEqual([{ date: "2026-05-23", count: 1 }]);
  });
});

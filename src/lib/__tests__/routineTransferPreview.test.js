import { describe, it, expect } from "vitest";
import { describeRoutineTransfer } from "@/lib/routineTransferPreview";

const routines = [
  { day_of_week: 1, name: "Push", routine_exercises: [{ exercise_name: "Bench" }] },
  { day_of_week: 3, name: "Pull", routine_exercises: [{ exercise_name: "Row" }] },
];

function getRoutineForDay(day) {
  return routines.find(r => r.day_of_week === day) ?? null;
}

describe("describeRoutineTransfer", () => {
  it("describes copy to empty day", () => {
    const p = describeRoutineTransfer({
      mode: "copy",
      fromDay: 1,
      toDay: 2,
      restMap: {},
      getRoutineForDay,
    });
    expect(p.action).toBe("copy");
    expect(p.from.after).toBe("Push");
    expect(p.to.after).toBe("Push");
    expect(p.from.note).toBe("Unchanged");
  });

  it("describes move swap", () => {
    const p = describeRoutineTransfer({
      mode: "move",
      fromDay: 1,
      toDay: 3,
      restMap: {},
      getRoutineForDay,
    });
    expect(p.action).toBe("swap");
    expect(p.from.after).toBe("Pull");
    expect(p.to.after).toBe("Push");
    expect(p.confirmLabel).toBe("Swap workouts");
  });

  it("describes move to empty day", () => {
    const p = describeRoutineTransfer({
      mode: "move",
      fromDay: 1,
      toDay: 2,
      restMap: {},
      getRoutineForDay,
    });
    expect(p.action).toBe("move");
    expect(p.from.after).toBe("Not planned");
    expect(p.to.after).toBe("Push");
  });
});

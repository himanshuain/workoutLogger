import { describe, it, expect } from "vitest";
import { getTodayWorkoutPhase } from "@/lib/todayWorkoutPhase";

describe("getTodayWorkoutPhase", () => {
  const routines = [{ id: "r1", name: "Push" }];

  it("returns unauthenticated when no user", () => {
    expect(getTodayWorkoutPhase({ hasUser: false, routines })).toBe("unauthenticated");
  });

  it("prefers active over completed", () => {
    expect(
      getTodayWorkoutPhase({
        hasUser: true,
        routines,
        activeSession: { status: "active" },
        completedSession: { status: "completed" },
      }),
    ).toBe("active");
  });

  it("returns completed when no active session", () => {
    expect(
      getTodayWorkoutPhase({
        hasUser: true,
        routines,
        activeSession: null,
        completedSession: { status: "completed" },
      }),
    ).toBe("completed");
  });

  it("returns no_routines when empty splits", () => {
    expect(
      getTodayWorkoutPhase({
        hasUser: true,
        routines: [],
        activeSession: null,
        completedSession: null,
      }),
    ).toBe("no_routines");
  });

  it("returns pick_routine when routines exist and no session", () => {
    expect(
      getTodayWorkoutPhase({
        hasUser: true,
        routines,
        activeSession: null,
        completedSession: null,
      }),
    ).toBe("pick_routine");
  });
});

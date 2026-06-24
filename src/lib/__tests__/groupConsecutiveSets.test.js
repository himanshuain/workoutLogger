import { describe, it, expect } from "vitest";
import { groupConsecutiveSets } from "@/lib/groupConsecutiveSets";

describe("groupConsecutiveSets", () => {
  it("merges consecutive identical sets", () => {
    const groups = groupConsecutiveSets([
      { weight: 55, reps: 10 },
      { weight: 55, reps: 10 },
      { weight: 55, reps: 10 },
      { weight: 55, reps: 10 },
    ]);
    expect(groups).toEqual([{ weight: 55, reps: 10, count: 4 }]);
  });

  it("keeps different weights separate", () => {
    const groups = groupConsecutiveSets([
      { weight: 12.5, reps: 10 },
      { weight: 10, reps: 10 },
    ]);
    expect(groups).toEqual([
      { weight: 12.5, reps: 10, count: 1 },
      { weight: 10, reps: 10, count: 1 },
    ]);
  });

  it("splits runs when weight changes then repeats", () => {
    const groups = groupConsecutiveSets([
      { weight: 50, reps: 8 },
      { weight: 50, reps: 8 },
      { weight: 45, reps: 10 },
      { weight: 45, reps: 10 },
      { weight: 45, reps: 10 },
    ]);
    expect(groups).toEqual([
      { weight: 50, reps: 8, count: 2 },
      { weight: 45, reps: 10, count: 3 },
    ]);
  });
});

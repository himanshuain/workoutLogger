import { describe, it, expect } from "vitest";
import {
  resolveRestMap,
  sortRoutinesForList,
  swapRestMarkers,
  restMapAfterMove,
} from "@/lib/routinePlanner";
import { mergeTrackablesActiveDays } from "@/lib/userPrefsMigration";

describe("routinePlanner", () => {
  it("sorts routines Mon-first with unassigned last", () => {
    const sorted = sortRoutinesForList([
      { name: "Sun", day_of_week: 0 },
      { name: "Mon", day_of_week: 1 },
      { name: "Any", day_of_week: null },
      { name: "Wed", day_of_week: 3 },
    ]);
    expect(sorted.map(r => r.name)).toEqual(["Mon", "Wed", "Sun", "Any"]);
  });

  it("swaps rest markers between days", () => {
    const next = swapRestMarkers({ 1: true, 3: true }, 1, 5);
    expect(next[1]).toBeUndefined();
    expect(next[5]).toBe(true);
    expect(next[3]).toBe(true);
  });

  it("clears rest flags after routine move", () => {
    const next = restMapAfterMove({ 1: true, 3: true }, 1, 3);
    expect(next).toEqual({});
  });

  it("prefers server rest map over empty object", () => {
    const map = resolveRestMap("user-1", { 2: true });
    expect(map[2]).toBe(true);
  });
});

describe("userPrefsMigration active_days", () => {
  it("merges local active_days when DB value is null", () => {
    const trackables = [{ id: "t1", name: "Water", active_days: null }];
    const { merged, toMigrate } = mergeTrackablesActiveDays(trackables, "user-1");
    expect(merged[0].active_days).toBeNull();
    expect(toMigrate).toEqual([]);
  });
});

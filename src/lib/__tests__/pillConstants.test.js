import { describe, it, expect } from "vitest";
import {
  MACHINE_STACK_WEIGHTS_KG,
  WEIGHT_PILLS_KG,
  nearestPill,
} from "@/lib/pillConstants";

describe("pillConstants", () => {
  it("includes full machine stack in kg", () => {
    for (const kg of MACHINE_STACK_WEIGHTS_KG) {
      expect(WEIGHT_PILLS_KG).toContain(kg);
    }
    expect(MACHINE_STACK_WEIGHTS_KG).toHaveLength(23);
  });

  it("snaps to machine plate weights", () => {
    expect(nearestPill(16, WEIGHT_PILLS_KG)).toBe(16);
    expect(nearestPill(35, WEIGHT_PILLS_KG)).toBe(35);
    expect(nearestPill(110, WEIGHT_PILLS_KG)).toBe(110);
  });
});

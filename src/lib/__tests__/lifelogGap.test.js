import { describe, it, expect } from "vitest";
import { gapDaysBetween } from "@/lib/lifelogUtils";

describe("gapDaysBetween", () => {
  it("counts calendar days between log dates", () => {
    expect(gapDaysBetween("2026-11-12", "2026-11-10")).toBe(2);
    expect(gapDaysBetween("2026-11-12", "2026-11-12")).toBe(0);
  });
});

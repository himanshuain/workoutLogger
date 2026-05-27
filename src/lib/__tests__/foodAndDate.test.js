import { describe, it, expect } from "vitest";
import { normalizeFoodQuantity, initialFoodQuantity, foodLogsDirectly } from "@/lib/foodQuantity";
import { localDateStr, addDaysStr, formatChipLabel } from "@/lib/dateLogUtils";

describe("foodQuantity", () => {
  it("rounds to whole numbers when required", () => {
    expect(normalizeFoodQuantity(2.4, { quantity_whole_numbers: true })).toBe(2);
    expect(normalizeFoodQuantity(0, { quantity_whole_numbers: true })).toBe(1);
  });

  it("snaps to half increments by default", () => {
    expect(normalizeFoodQuantity(1.3, {})).toBe(1.5);
    expect(normalizeFoodQuantity(0.1, {})).toBe(0.5);
  });

  it("uses default quantity for direct logging", () => {
    expect(initialFoodQuantity({ default_quantity: 2, quantity_whole_numbers: true })).toBe(2);
    expect(foodLogsDirectly({ log_directly: true })).toBe(true);
    expect(foodLogsDirectly({ log_directly: false })).toBe(false);
  });
});

describe("dateLogUtils", () => {
  it("adds days to ISO date strings", () => {
    expect(addDaysStr("2026-05-21", 1)).toBe("2026-05-22");
    expect(addDaysStr("2026-05-21", -1)).toBe("2026-05-20");
  });

  it("labels today and yesterday", () => {
    const today = localDateStr(new Date("2026-05-21T12:00:00"));
    expect(formatChipLabel(today, today)).toBe("Today");
    expect(formatChipLabel(addDaysStr(today, -1), today)).toBe("Yesterday");
  });
});

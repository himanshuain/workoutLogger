import { describe, it, expect } from "vitest";
import {
  normalizeTags,
  flattenBikeLogs,
  filterBikeLogsByPill,
  collectTagFilters,
  collectSuggestedTags,
  collectKnownBikeTags,
  resolveBikeLogFields,
  isEventTypeOverdue,
  BIKE_SCOPE_FILTER_ALL,
  BIKE_SCOPE_FILTER_UNTAGGED,
} from "@/lib/bikeLogUtils";
import { BIKE_EVENT_SCOPE } from "@/lib/bikeEventScope";

describe("bikeLogUtils", () => {
  it("normalizes tags", () => {
    expect(normalizeTags([" Fuel ", "SERVICE", "fuel"])).toEqual(["fuel", "service"]);
    expect(normalizeTags("#repair, parts")).toEqual(["repair", "parts"]);
  });

  it("flattens bike-scoped logs newest first", () => {
    const types = [
      {
        id: "a",
        scope: BIKE_EVENT_SCOPE,
        name: "Bike Logs",
        icon: "🔧",
        color: "#f00",
        event_logs: [
          { id: "l1", date: "2025-01-01", tags: ["service"] },
          { id: "l2", date: "2025-02-01", tags: [] },
        ],
      },
      {
        id: "b",
        name: "Haircut",
        event_logs: [{ id: "x", date: "2025-03-01", tags: [] }],
      },
    ];
    const flat = flattenBikeLogs(types);
    expect(flat).toHaveLength(2);
    expect(flat[0].id).toBe("l2");
    expect(flat[0].needsTags).toBe(true);
    expect(flat[1].tags).toEqual(["service"]);
  });

  it("filters by pill", () => {
    const logs = [
      { id: "1", tags: ["fuel"], needsTags: false },
      { id: "2", tags: [], needsTags: true },
    ];
    expect(filterBikeLogsByPill(logs, BIKE_SCOPE_FILTER_ALL)).toHaveLength(2);
    expect(filterBikeLogsByPill(logs, "fuel")).toHaveLength(1);
    expect(filterBikeLogsByPill(logs, BIKE_SCOPE_FILTER_UNTAGGED)).toHaveLength(1);
  });

  it("collects tag filters from logs only", () => {
    const logs = [{ tags: ["custom"] }, { tags: ["fuel"] }];
    const pills = collectTagFilters(logs);
    expect(pills).toEqual(["custom", "fuel"]);
    expect(collectTagFilters([])).toEqual([]);
  });

  it("detects overdue maintenance", () => {
    expect(isEventTypeOverdue({ reminder_days: 30, days_since: 45 })).toBe(true);
    expect(isEventTypeOverdue({ reminder_days: 30, days_since: 10 })).toBe(false);
  });

  it("splits legacy notes into title and body", () => {
    expect(resolveBikeLogFields({ title: "Wash", notes: "Full detail" })).toEqual({
      title: "Wash",
      body: "Full detail",
      odometer_km: null,
    });
    expect(resolveBikeLogFields({ notes: "Puncher\nFixed rear tyre" })).toEqual({
      title: "Puncher",
      body: "Fixed rear tyre",
      odometer_km: null,
    });
    expect(resolveBikeLogFields({ notes: "Single line", odometer_km: 12500 })).toEqual({
      title: "Single line",
      body: "",
      odometer_km: 12500,
    });
  });

  it("suggests tags not already selected", () => {
    const logs = [{ tags: ["wash", "service"] }, { tags: ["fuel"] }];
    expect(collectSuggestedTags(logs)).toEqual(["fuel", "service", "wash"]);
    expect(collectSuggestedTags(logs, ["wash"])).toEqual(["fuel", "service"]);
  });

  it("lists each known tag once for toggle UI", () => {
    const logs = [{ tags: ["wash"] }, { tags: ["wash", "fuel"] }];
    expect(collectKnownBikeTags(logs, ["wash"])).toEqual(["fuel", "wash"]);
    expect(collectKnownBikeTags(logs, ["new"])).toEqual(["fuel", "new", "wash"]);
  });
});

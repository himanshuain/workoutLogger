import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  areaCollapseStorageKey,
  readAreaCollapse,
  writeAreaCollapse,
} from "@/lib/exerciseAreaCollapseStorage";

describe("exerciseAreaCollapseStorage", () => {
  beforeEach(() => {
    const store = {};
    const ss = {
      getItem(key) {
        return store[key] ?? null;
      },
      setItem(key, value) {
        store[key] = value;
      },
      clear() {
        Object.keys(store).forEach(k => delete store[k]);
      },
    };
    vi.stubGlobal("sessionStorage", ss);
    vi.stubGlobal("window", { sessionStorage: ss });
  });

  it("builds a stable key from session id", () => {
    expect(areaCollapseStorageKey("abc")).toBe("wl_area_collapse_abc");
    expect(areaCollapseStorageKey(null)).toBeNull();
  });

  it("round-trips collapsed areas", () => {
    const key = areaCollapseStorageKey("sess-1");
    writeAreaCollapse(key, new Set(["arms", "legs"]));
    expect(readAreaCollapse(key)).toEqual(new Set(["arms", "legs"]));
  });
});

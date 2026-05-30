import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  areaCollapseStorageKey,
  readAreaCollapse,
  writeAreaCollapse,
  resolveAreaCollapseAfterGroupChange,
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

  it("hydrates from storage when groups first become collapsible", () => {
    const current = new Set(["chest", "back", "legs"]);
    const stored = new Set(["back", "legs"]);
    const { collapsed, knownAreas, changed } = resolveAreaCollapseAfterGroupChange({
      knownAreas: null,
      currentAreas: current,
      prevCollapsed: new Set(),
      stored,
      defaultExpanded: false,
    });
    expect(changed).toBe(true);
    expect(collapsed).toEqual(stored);
    expect(knownAreas).toEqual(current);
  });

  it("does not collapse all areas when prev is empty but storage has expanded chest", () => {
    const current = new Set(["chest", "back", "legs"]);
    const stored = new Set(["back", "legs"]);
    const { collapsed } = resolveAreaCollapseAfterGroupChange({
      knownAreas: null,
      currentAreas: current,
      prevCollapsed: new Set(),
      stored,
      defaultExpanded: false,
    });
    expect(collapsed.has("chest")).toBe(false);
    expect(collapsed.has("back")).toBe(true);
  });

  it("only collapses genuinely new areas after hydration", () => {
    const known = new Set(["chest", "back"]);
    const current = new Set(["chest", "back", "legs"]);
    const prev = new Set(["back"]);
    const { collapsed, changed } = resolveAreaCollapseAfterGroupChange({
      knownAreas: known,
      currentAreas: current,
      prevCollapsed: prev,
      stored: null,
      defaultExpanded: false,
    });
    expect(changed).toBe(true);
    expect(collapsed).toEqual(new Set(["back", "legs"]));
  });
});

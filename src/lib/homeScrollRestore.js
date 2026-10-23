const SCROLL_KEY = "wl_home_main_scroll";

export function getHomeScrollElement() {
  if (typeof document === "undefined") return null;
  return (
    document.querySelector("[data-wl-home-scroll]") ||
    document.querySelector("main.flex-1.overflow-y-auto")
  );
}

export function saveHomeScrollPosition() {
  const el = getHomeScrollElement();
  if (!el) return;
  try {
    sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop));
  } catch {
    /* ignore quota */
  }
}

export function restoreHomeScrollPosition() {
  if (typeof window === "undefined") return;
  let top = 0;
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (raw == null) return;
    sessionStorage.removeItem(SCROLL_KEY);
    top = parseInt(raw, 10);
    if (!Number.isFinite(top) || top < 0) return;
  } catch {
    return;
  }

  const apply = () => {
    const el = getHomeScrollElement();
    if (el) el.scrollTop = top;
  };

  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
}

export function clearHomeScrollRestore() {
  try {
    sessionStorage.removeItem(SCROLL_KEY);
  } catch {
    /* ignore */
  }
}

/** Snapshot main scroll container (Today layout) for restore after async UI updates. */
export function captureHomeScrollPosition() {
  const el = getHomeScrollElement();
  if (!el) return null;
  return { el, top: el.scrollTop, left: el.scrollLeft };
}

export function restoreHomeScrollPositionSnapshot(snapshot) {
  if (!snapshot?.el) return;
  const { el, top, left } = snapshot;
  const apply = () => {
    el.scrollTop = top;
    el.scrollLeft = left;
  };
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
}

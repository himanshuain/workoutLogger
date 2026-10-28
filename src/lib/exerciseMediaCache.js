/**
 * Session cache for exercise GIF/image URLs — avoids re-fetching after first successful load.
 * Uses in-memory blob URLs when fetch succeeds; otherwise pins a hidden <img> for browser cache.
 */

const blobUrlByRemote = new Map();
const blobInflight = new Map();
const pinnedUrls = new Set();
const cacheListeners = new Set();

function notifyCacheListeners() {
  cacheListeners.forEach(fn => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

/** Re-render media when a blob copy becomes available. */
export function subscribeExerciseMediaCache(listener) {
  cacheListeners.add(listener);
  return () => cacheListeners.delete(listener);
}

function getHiddenPool() {
  if (typeof document === "undefined") return null;
  let pool = document.getElementById("wl-exercise-media-cache");
  if (!pool) {
    pool = document.createElement("div");
    pool.id = "wl-exercise-media-cache";
    pool.setAttribute("aria-hidden", "true");
    pool.hidden = true;
    pool.style.cssText =
      "position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;top:0";
    document.body.appendChild(pool);
  }
  return pool;
}

function pinRemoteUrlInDom(url) {
  if (typeof document === "undefined" || !url || pinnedUrls.has(url)) return;
  const pool = getHiddenPool();
  if (!pool) return;
  pinnedUrls.add(url);
  const img = document.createElement("img");
  img.src = url;
  img.alt = "";
  img.decoding = "async";
  pool.appendChild(img);
}

async function tryStoreBlobCopy(url) {
  if (blobUrlByRemote.has(url) || blobInflight.has(url)) return;
  const promise = fetch(url, { mode: "cors", credentials: "omit" })
    .then(res => {
      if (!res.ok) throw new Error("fetch failed");
      return res.blob();
    })
    .then(blob => {
      const objectUrl = URL.createObjectURL(blob);
      blobUrlByRemote.set(url, objectUrl);
      blobInflight.delete(url);
      notifyCacheListeners();
      return objectUrl;
    })
    .catch(() => {
      blobInflight.delete(url);
      pinRemoteUrlInDom(url);
      return null;
    });
  blobInflight.set(url, promise);
  await promise;
}

/**
 * Prefer a cached blob URL when available; otherwise the original remote URL.
 */
export function getCachedExerciseMediaSrc(url) {
  if (!url || String(url).startsWith("data:")) return url;
  return blobUrlByRemote.get(url) ?? url;
}

export function preloadExerciseMedia(url) {
  if (!url || String(url).startsWith("data:")) return;
  if (blobUrlByRemote.has(url)) return;
  pinRemoteUrlInDom(url);
  void tryStoreBlobCopy(url);
}

export function cacheExerciseMediaAfterLoad(url) {
  if (!url || String(url).startsWith("data:")) return;
  pinRemoteUrlInDom(url);
  if (!blobUrlByRemote.has(url)) {
    void tryStoreBlobCopy(url);
  }
}

/**
 * Session cache for exercise GIF/image URLs — avoids re-fetching after first successful load.
 * Uses in-memory blob URLs when fetch succeeds; otherwise pins a hidden <img> for browser cache.
 */

const MAX_BLOB_ENTRIES = 200;

const blobUrlByRemote = new Map();
const blobInflight = new Map();
const blobOrder = [];
const pinnedUrls = new Set();
const cacheListeners = new Set();

function evictOldestBlobIfNeeded() {
  while (blobUrlByRemote.size > MAX_BLOB_ENTRIES && blobOrder.length > 0) {
    const old = blobOrder.shift();
    if (!old) continue;
    const objectUrl = blobUrlByRemote.get(old);
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        /* ignore */
      }
      blobUrlByRemote.delete(old);
    }
  }
}

function storeBlobForRemote(url, blob) {
  const existing = blobUrlByRemote.get(url);
  if (existing) return existing;
  const objectUrl = URL.createObjectURL(blob);
  blobUrlByRemote.set(url, objectUrl);
  blobOrder.push(url);
  evictOldestBlobIfNeeded();
  notifyCacheListeners();
  return objectUrl;
}

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

function tryStoreBlobViaImage(url) {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx || canvas.width === 0 || canvas.height === 0) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          if (!blob) {
            resolve(null);
            return;
          }
          resolve(storeBlobForRemote(url, blob));
        }, "image/png");
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function tryStoreBlobCopy(url) {
  if (blobUrlByRemote.has(url) || blobInflight.has(url)) return;
  const promise = fetch(url, { mode: "cors", credentials: "omit" })
    .then(res => {
      if (!res.ok) throw new Error("fetch failed");
      return res.blob();
    })
    .then(blob => {
      blobInflight.delete(url);
      return storeBlobForRemote(url, blob);
    })
    .catch(async () => {
      const viaImg = await tryStoreBlobViaImage(url);
      blobInflight.delete(url);
      if (!viaImg) pinRemoteUrlInDom(url);
      return viaImg;
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

/** Preload many exercise media URLs (deduped) for the current session. */
export function warmExerciseMediaCache(urls) {
  if (!urls?.length) return;
  const seen = new Set();
  for (const raw of urls) {
    const url = raw && String(raw).trim();
    if (!url || url.startsWith("data:") || seen.has(url)) continue;
    seen.add(url);
    preloadExerciseMedia(url);
  }
}

export function isExerciseMediaBlobCached(url) {
  if (!url || String(url).startsWith("data:")) return false;
  return blobUrlByRemote.has(url);
}

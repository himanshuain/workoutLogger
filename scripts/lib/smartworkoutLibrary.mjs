/**
 * SmartWorkout public exercise library (https://smartworkout.app/en/exercise-library).
 * Demo media is served from api.smartworkout.app (GIF at /asset/image/{uuid}, MP4 at /asset/video/…).
 */

const SITEMAP_INDEX = "https://smartworkout.app/sitemap.xml";
const EXERCISE_PAGE_RE =
  /^https:\/\/smartworkout\.app\/en\/exercise-library\/[^/]+\/[^/]+\/?$/;

export function slugFromExercisePageUrl(pageUrl) {
  return String(pageUrl || "").replace(/\/$/, "").split("/").pop() || "";
}

export function isSmartworkoutExercisePageUrl(url) {
  return EXERCISE_PAGE_RE.test(String(url || "").trim());
}

export async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "workout-logger-sync/1.0 (+https://github.com)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

/** All English exercise detail URLs from SmartWorkout sitemaps. */
export async function listSmartworkoutExercisePageUrls() {
  const indexXml = await fetchText(SITEMAP_INDEX);
  const childSitemaps = [...indexXml.matchAll(/<loc>(https:\/\/smartworkout\.app\/sitemap-\d+\.xml)<\/loc>/g)].map(
    m => m[1],
  );
  const urls = new Set();
  for (const sm of childSitemaps) {
    const xml = await fetchText(sm);
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const loc = m[1].trim();
      if (isSmartworkoutExercisePageUrl(loc)) urls.add(loc.replace(/\/$/, ""));
    }
  }
  return [...urls].sort();
}

/** @returns {{ id: string, name: string, aliases: string[], gifUrl: string, libraryPath: string | null, videoDarkUrl: string | null, videoLightUrl: string | null, bodyPart: string | null } | null} */
export function parseSmartworkoutExerciseFromHtml(html, pageUrl) {
  const m = String(html).match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!m) return null;
  let data;
  try {
    data = JSON.parse(m[1]);
  } catch {
    return null;
  }
  const ex = data?.props?.pageProps?.exercise;
  if (!ex?.id) return null;

  const name = ex.translations?.en?.trim();
  const gifUrl = ex.image?.uri?.trim() || null;
  if (!name || !gifUrl) return null;

  const aliases = Array.isArray(ex.aliases?.en) ? ex.aliases.en.filter(Boolean) : [];

  return {
    id: String(ex.id),
    name: name.trim(),
    aliases,
    slug: slugFromExercisePageUrl(pageUrl),
    gifUrl,
    libraryPath: data?.props?.pageProps?.path || pageUrl.replace("https://smartworkout.app", "") || null,
    videoDarkUrl: ex.videoDarkUrl || null,
    videoLightUrl: ex.videoLightUrl || null,
    bodyPart: ex.bodyPart || null,
  };
}

export async function fetchSmartworkoutExerciseRecord(pageUrl) {
  const html = await fetchText(pageUrl);
  return parseSmartworkoutExerciseFromHtml(html, pageUrl);
}

export function mapSmartworkoutBodyPart(bodyPart) {
  const b = String(bodyPart || "").toUpperCase();
  if (b === "CHEST") return "chest";
  if (b === "BACK") return "back";
  if (b === "SHOULDERS") return "shoulders";
  if (b === "BICEPS" || b === "TRICEPS" || b === "FOREARMS") return "arms";
  if (b === "ABS") return "core";
  if (b === "LEGS" || b === "GLUTEUS") return "legs";
  return "other";
}

export function smartworkoutMetadata(record, syncedAt = new Date().toISOString()) {
  return {
    smartworkout: {
      id: record.id,
      slug: record.slug,
      libraryPath: record.libraryPath,
      videoDarkUrl: record.videoDarkUrl,
      videoLightUrl: record.videoLightUrl,
      bodyPart: record.bodyPart,
      aliases: record.aliases,
      syncedAt,
    },
  };
}

/** Supabase row for upsert on (external_source, external_id). */
export function rowFromSmartworkoutRecord(record) {
  if (!record?.id || !record?.name?.trim() || !record?.gifUrl) return null;

  return {
    name: record.name.trim(),
    category: mapSmartworkoutBodyPart(record.bodyPart),
    is_predefined: true,
    user_id: null,
    external_source: "smartworkout",
    external_id: String(record.id),
    description: null,
    gif_url: record.gifUrl,
    image_url: null,
    metadata: smartworkoutMetadata(record),
  };
}

/**
 * SmartWorkout public exercise library (https://smartworkout.app/en/exercise-library).
 * Demo media is served from api.smartworkout.app (GIF at /asset/image/{uuid}, MP4 at /asset/video/…).
 */

import { parseSmartworkoutExerciseFromHtml as parseFromHtml } from "../../src/lib/smartworkoutExerciseParse.js";

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

/** @returns {ReturnType<typeof parseFromHtml> & { slug: string } | null} */
export function parseSmartworkoutExerciseFromHtml(html, pageUrl) {
  const record = parseFromHtml(html, pageUrl);
  if (!record) return null;
  return {
    ...record,
    slug: record.slug || slugFromExercisePageUrl(pageUrl),
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
      description: record.description || null,
      instructions: record.instructions || [],
      tips: record.tips || [],
      commonMistakes: record.commonMistakes || [],
      exerciseMuscles: record.exerciseMuscles || {},
      equipments: record.equipments || [],
      tags: record.tags || [],
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
    description: record.description?.trim() || null,
    gif_url: record.gifUrl,
    image_url: null,
    metadata: smartworkoutMetadata(record),
  };
}

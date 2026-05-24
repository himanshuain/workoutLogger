#!/usr/bin/env node
/**
 * One-way sync: wger.de exerciseinfo (English) → Supabase `exercises`.
 *
 * Env (never commit service role):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run sync:exercises
 *
 * Apply DB migration first: supabase/migration-v7-exercises-wger-media.sql
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./loadEnvLocal.mjs";

loadEnvLocal();

const WGER_BASE = "https://wger.de";
const ENGLISH_LANG = 2;

const WGER_CATEGORY_TO_APP = {
  Abs: "core",
  Arms: "arms",
  Back: "back",
  Calves: "legs",
  Cardio: "other",
  Chest: "chest",
  Legs: "legs",
  Shoulders: "shoulders",
};

function absMediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${WGER_BASE}${p}`;
}

function htmlToText(html) {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function isGifPath(path) {
  return /\.gif(\?|#|$)/i.test(path || "");
}

/** Prefer animated GIF when present; otherwise first main / first static image. */
function pickMedia(images) {
  if (!images?.length) return { gif_url: null, image_url: null };

  const rank = (a, b) => (b.is_main === true) - (a.is_main === true);
  const sorted = [...images].sort(rank);

  const gifs = sorted.filter((i) => isGifPath(i.image));
  const statics = sorted.filter((i) => !isGifPath(i.image));

  const gifPick = gifs.find((i) => i.is_main) || gifs[0] || null;
  const imgPick = statics.find((i) => i.is_main) || statics[0] || null;

  return {
    gif_url: gifPick ? absMediaUrl(gifPick.image) : null,
    image_url: imgPick ? absMediaUrl(imgPick.image) : null,
  };
}

function englishTranslation(info) {
  return (info.translations || []).find((t) => t.language === ENGLISH_LANG) || null;
}

function mapCategory(info) {
  const name = info.category?.name;
  if (!name) return "other";
  return WGER_CATEGORY_TO_APP[name] || "other";
}

function rowFromWger(info) {
  const tr = englishTranslation(info);
  if (!tr?.name?.trim()) return null;

  const id = info.id;
  if (id == null) return null;

  const { gif_url, image_url } = pickMedia(info.images || []);
  const lic = info.license || {};

  return {
    name: tr.name.trim(),
    category: mapCategory(info),
    is_predefined: true,
    user_id: null,
    external_source: "wger",
    external_id: String(id),
    description: htmlToText(tr.description) || null,
    gif_url,
    image_url,
    metadata: {
      wger_uuid: info.uuid,
      license_short: lic.short_name || null,
      license_url: lic.url || null,
      license_author: info.license_author || tr.license_author || null,
    },
  };
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  let nextUrl = `${WGER_BASE}/api/v2/exerciseinfo/?language=2&limit=80`;
  let total = 0;
  let skipped = 0;
  const batch = [];
  const BATCH = 60;

  const flush = async () => {
    if (!batch.length) return;
    const chunk = batch.splice(0, batch.length);
    const { error } = await supabase.from("exercises").upsert(chunk, {
      onConflict: "external_source,external_id",
    });
    if (error) throw error;
    total += chunk.length;
    process.stdout.write(`\rUpserted ${total} exercises…`);
  };

  while (nextUrl) {
    const page = await fetchJson(nextUrl);
    for (const info of page.results || []) {
      const row = rowFromWger(info);
      if (!row) {
        skipped += 1;
        continue;
      }
      batch.push(row);
      if (batch.length >= BATCH) await flush();
    }
    nextUrl = page.next || null;
    if (nextUrl) await new Promise((r) => setTimeout(r, 120));
  }

  await flush();
  console.log(`\nDone. Upserted ${total}, skipped (no English name) ${skipped}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

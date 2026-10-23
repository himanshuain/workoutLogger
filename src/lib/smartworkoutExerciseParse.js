/** Parse SmartWorkout `exercise` object from __NEXT_DATA__ (shared by sync + API). */

export function pickEnString(map) {
  if (!map || typeof map !== "object") return "";
  const v = map.en;
  return typeof v === "string" ? v.trim() : "";
}

export function pickEnStringArray(map) {
  if (!map || typeof map !== "object") return [];
  const v = map.en;
  if (!Array.isArray(v)) return [];
  return v.map(s => String(s ?? "").trim()).filter(Boolean);
}

/** @param {Record<string, unknown>} ex */
export function detailFromSmartworkoutExercise(ex) {
  if (!ex?.id) return null;

  const name = pickEnString(ex.translations);
  const gifUrl = ex.image?.uri?.trim() || null;
  if (!name) return null;

  return {
    id: String(ex.id),
    name,
    aliases: pickEnStringArray(ex.aliases),
    gifUrl,
    bodyPart: ex.bodyPart || null,
    videoDarkUrl: ex.videoDarkUrl || null,
    videoLightUrl: ex.videoLightUrl || null,
    description: pickEnString(ex.descriptions),
    instructions: pickEnStringArray(ex.instructions),
    tips: pickEnStringArray(ex.tips),
    commonMistakes: pickEnStringArray(ex.commonMistakes),
    exerciseMuscles:
      ex.exerciseMuscles && typeof ex.exerciseMuscles === "object" ? ex.exerciseMuscles : {},
    equipments: Array.isArray(ex.equipments) ? ex.equipments.filter(Boolean) : [],
    tags: Array.isArray(ex.tags) ? ex.tags.filter(Boolean) : [],
    mechanics: ex.mechanics || null,
    weightType: ex.weightType || null,
  };
}

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
  const libraryPath =
    data?.props?.pageProps?.path ||
    (pageUrl ? String(pageUrl).replace("https://smartworkout.app", "") : null);

  const detail = detailFromSmartworkoutExercise(ex);
  if (!detail?.gifUrl) return null;

  const slug = String(pageUrl || "").replace(/\/$/, "").split("/").pop() || "";

  return {
    ...detail,
    slug,
    libraryPath,
  };
}

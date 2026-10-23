import { parseSmartworkoutExerciseFromHtml } from "@/lib/smartworkoutExerciseParse";

const UA = "workout-logger/1.0 (+https://github.com)";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const path = typeof req.query.path === "string" ? req.query.path.trim() : "";
  const id = typeof req.query.id === "string" ? req.query.id.trim() : "";

  let pageUrl = null;
  if (path) {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    if (!normalized.includes("/exercise-library/")) {
      return res.status(400).json({ error: "Invalid library path" });
    }
    pageUrl = `https://smartworkout.app${normalized}`;
  } else if (id) {
    return res.status(400).json({
      error: "path required — sync metadata.libraryPath or re-run smartworkout sync",
    });
  } else {
    return res.status(400).json({ error: "path query required" });
  }

  try {
    const upstream = await fetch(pageUrl, {
      headers: { "User-Agent": UA },
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "SmartWorkout page not found" });
    }
    const html = await upstream.text();
    const record = parseSmartworkoutExerciseFromHtml(html, pageUrl);
    if (!record) {
      return res.status(404).json({ error: "Could not parse exercise" });
    }

    return res.status(200).json({
      description: record.description,
      instructions: record.instructions,
      tips: record.tips,
      commonMistakes: record.commonMistakes,
      exerciseMuscles: record.exerciseMuscles,
      bodyPart: record.bodyPart,
      equipments: record.equipments,
      tags: record.tags,
    });
  } catch (e) {
    console.error("smartworkout-exercise-detail", e);
    return res.status(500).json({ error: "Fetch failed" });
  }
}

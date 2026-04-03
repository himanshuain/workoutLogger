/**
 * Resolve GIF URL for an ExerciseDB exercise when DB row has no gif_url yet.
 * GET /api/exercisedb-exercise?id=<exerciseId>
 *
 * @see https://www.exercisedb.dev/docs — GET /api/v1/exercises/{exerciseId}
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  const raw = req.query.id;
  const id = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  if (!id) {
    return res.status(400).json({ url: null });
  }

  try {
    const r = await fetch(
      `https://www.exercisedb.dev/api/v1/exercises/${encodeURIComponent(id)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "workout-logger/1.0",
        },
      },
    );
    if (!r.ok) {
      return res.status(200).json({ url: null });
    }
    const json = await r.json();
    const url = json.data?.gifUrl || null;
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({ url });
  } catch {
    return res.status(200).json({ url: null });
  }
}

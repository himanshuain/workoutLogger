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
      return res.status(200).json({ url: null, urls: [] });
    }
    const json = await r.json();
    const data = json.data ?? {};
    const urls = [];
    const pushUrl = val => {
      if (typeof val !== "string" || !val.trim()) return;
      const u = val.trim();
      if (!urls.includes(u)) urls.push(u);
    };
    pushUrl(data.gifUrl);
    if (Array.isArray(data.gifUrls)) for (const g of data.gifUrls) pushUrl(typeof g === "string" ? g : g?.url);
    pushUrl(typeof data.imageUrl === "string" ? data.imageUrl : data.imageUrl?.url);

    const url = urls[0] || null;
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({ url, urls });
  } catch {
    return res.status(200).json({ url: null });
  }
}

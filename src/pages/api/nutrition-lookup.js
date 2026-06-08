import { mapUsdaSearchResults } from "@/lib/nutritionLookup";
import { serverFetch } from "@/lib/serverFetch";

/**
 * Search USDA FoodData Central for nutrition data.
 * GET /api/nutrition-lookup?q=eggs
 *
 * Optional: FDC_API_KEY in env (free at https://fdc.nal.usda.gov/api-key-signup)
 * Falls back to DEMO_KEY (rate-limited).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  const raw = req.query.q;
  const q = (typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "").trim();
  if (q.length < 2) {
    return res.status(400).json({ error: "Query too short", results: [] });
  }

  const apiKey = process.env.FDC_API_KEY || "DEMO_KEY";
  const params = new URLSearchParams({
    api_key: apiKey,
    query: q,
    pageSize: "25",
    dataType: "Foundation,SR Legacy,Branded",
  });

  try {
    const r = await serverFetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`, {
      headers: { Accept: "application/json", "User-Agent": "workout-logger/1.0" },
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("USDA FDC error:", r.status, text);
      const isAuth = r.status === 403 || text.includes("api_key");
      return res.status(502).json({
        error: isAuth ? "Food search not set up" : "Search failed",
        results: [],
      });
    }

    const json = await r.json();
    const results = mapUsdaSearchResults(json.foods, q);

    return res.status(200).json({
      results,
      source: "USDA FoodData Central",
      query: q,
    });
  } catch (err) {
    console.error("nutrition-lookup:", err);
    const code = err?.cause?.code || err?.code;
    const hint =
      code === "SELF_SIGNED_CERT_IN_CHAIN"
        ? "Network SSL issue (VPN/proxy). Restart dev server after pull, or set FDC_TLS_INSECURE=0 to disable bypass."
        : "Search unavailable";
    return res.status(500).json({ error: hint, results: [] });
  }
}

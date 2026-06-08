import https from "node:https";

/** True when local dev should retry HTTPS after corporate-proxy cert errors. */
function shouldBypassTlsInDev(err) {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.FDC_TLS_INSECURE === "0") return false;
  const code = err?.cause?.code || err?.code;
  return code === "SELF_SIGNED_CERT_IN_CHAIN" || code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE";
}

/** Minimal fetch-like response for https fallback. */
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: `${u.pathname}${u.search}`,
        method: "GET",
        headers,
        rejectUnauthorized: false,
      },
      res => {
        const chunks = [];
        res.on("data", chunk => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            async text() {
              return body;
            },
            async json() {
              return JSON.parse(body);
            },
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

/**
 * Server-side fetch with dev-only TLS retry for corporate VPN/proxy cert chains.
 * Production (e.g. Vercel) uses normal fetch only.
 */
export async function serverFetch(url, options = {}) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (!shouldBypassTlsInDev(err)) throw err;
    console.warn("[serverFetch] Retrying with dev TLS bypass (corporate proxy/VPN)");
    return httpsGet(url, options.headers || {});
  }
}

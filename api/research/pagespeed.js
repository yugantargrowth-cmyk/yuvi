// api/research/pagespeed.js
// Vercel Serverless Function: POST /api/research/pagespeed

function sendJson(res, statusCode, data) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    res.status(statusCode).json(data);
  } else {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  }
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.PAGESPEED_API_KEY?.trim();
  if (!apiKey) {
    return sendJson(res, 200, {
      configured: false,
      reason: "PAGESPEED_API_KEY is not configured on Vercel.",
    });
  }

  const body = await parseBody(req);
  const { url } = body;
  if (!url) return sendJson(res, 400, { ok: false, error: "Missing 'url'." });

  try {
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = `https://${cleanUrl}`;

    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(cleanUrl)}&strategy=mobile&key=${apiKey}`;
    const psRes = await fetch(endpoint);
    if (!psRes.ok) {
      return sendJson(res, psRes.status, { configured: true, ok: false, error: `PageSpeed HTTP ${psRes.status}` });
    }
    const data = await psRes.json();
    const lighthouse = data?.lighthouseResult;
    return sendJson(res, 200, {
      configured: true,
      ok: true,
      mobileScore: Math.round((lighthouse?.categories?.performance?.score ?? 0) * 100),
      lcp: lighthouse?.audits?.["largest-contentful-paint"]?.displayValue ?? "N/A",
      cls: lighthouse?.audits?.["cumulative-layout-shift"]?.displayValue ?? "N/A",
      fcp: lighthouse?.audits?.["first-contentful-paint"]?.displayValue ?? "N/A",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return sendJson(res, 502, { configured: true, ok: false, error: String(err) });
  }
}

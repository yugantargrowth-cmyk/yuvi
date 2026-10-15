// api/research/places.js
// Vercel Serverless Function: POST /api/research/places

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

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    return sendJson(res, 200, {
      configured: false,
      reason: "GOOGLE_PLACES_API_KEY is not configured on Vercel.",
    });
  }

  const body = await parseBody(req);
  const { companyName, city = "Ahmedabad" } = body;
  if (!companyName) return sendJson(res, 400, { ok: false, error: "Missing 'companyName'." });

  try {
    const placesRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber",
      },
      body: JSON.stringify({ textQuery: `${companyName} ${city}` }),
    });

    if (!placesRes.ok) {
      return sendJson(res, placesRes.status, { configured: true, ok: false, error: `Places HTTP ${placesRes.status}` });
    }
    const data = await placesRes.json();
    const place = data?.places?.[0];
    return sendJson(res, 200, {
      configured: true,
      ok: true,
      placeName: place?.displayName?.text,
      address: place?.formattedAddress,
      rating: place?.rating,
      reviewCount: place?.userRatingCount,
      websiteUri: place?.websiteUri,
      phoneNumber: place?.nationalPhoneNumber,
    });
  } catch (err) {
    return sendJson(res, 502, { configured: true, ok: false, error: String(err) });
  }
}

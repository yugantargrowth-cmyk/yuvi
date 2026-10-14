// Vercel Serverless Function: /api/research
// Handles Website Scanning, PageSpeed Insights API, and Google Places API natively on Vercel.

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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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

  const body = await parseBody(req);
  const action = body.action || "scan";

  if (action === "scan") {
    const { url } = body;
    if (!url) return sendJson(res, 400, { ok: false, error: "Missing 'url' parameter." });

    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = `https://${cleanUrl}`;
    const isHttps = cleanUrl.startsWith("https://");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const targetRes = await fetch(cleanUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36 YUVI-Audit/2.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!targetRes.ok) {
        return sendJson(res, targetRes.status, {
          ok: false,
          url: cleanUrl,
          isHttps,
          httpStatus: targetRes.status,
          error: `Server returned HTTP ${targetRes.status}`,
        });
      }

      const html = await targetRes.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : undefined;

      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
      const metaDescription = descMatch ? descMatch[1].trim() : undefined;

      const hasMobileViewport = /<meta[^>]*name=["']viewport["']/i.test(html);

      const phoneLinks = [];
      for (const m of html.matchAll(/href=["']tel:([^"']+)["']/gi)) {
        if (m[1] && !phoneLinks.includes(m[1].trim())) phoneLinks.push(m[1].trim());
      }

      const whatsAppLinks = [];
      for (const m of html.matchAll(/href=["'](https?:\/\/(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)[^"']*)["']/gi)) {
        if (m[1] && !whatsAppLinks.includes(m[1].trim())) whatsAppLinks.push(m[1].trim());
      }

      const hasContactForm = /<form/i.test(html);
      const tracking = {
        ga4: /G-[A-Z0-9]{6,12}/i.test(html) || /gtag\s*\(\s*['"]config['"]\s*,\s*['"]G-/i.test(html),
        gtm: /GTM-[A-Z0-9]{6,10}/i.test(html) || /googletagmanager\.com\/gtm\.js/i.test(html),
        metaPixel: /fbq\s*\(\s*['"]init['"]/i.test(html) || /connect\.facebook\.net/i.test(html),
        clarity: /clarity\.ms\/tag/i.test(html),
      };

      const techStack = [];
      if (/wp-content|wordpress/i.test(html)) techStack.push("WordPress");
      if (/shopify\.com|cdn\.shopify/i.test(html)) techStack.push("Shopify");
      if (/wix\.com|wixstatic\.com/i.test(html)) techStack.push("Wix");
      if (/squarespace\.com/i.test(html)) techStack.push("Squarespace");
      if (/webflow\.com/i.test(html)) techStack.push("Webflow");
      if (/_next\/static/i.test(html)) techStack.push("Next.js");

      return sendJson(res, 200, {
        ok: true,
        url: cleanUrl,
        isHttps,
        httpStatus: targetRes.status,
        title,
        metaDescription,
        hasMobileViewport,
        hasWhatsAppCta: whatsAppLinks.length > 0 || /whatsapp/i.test(html),
        hasContactForm,
        phoneLinks,
        whatsAppLinks,
        tracking,
        techStack,
      });
    } catch (err) {
      return sendJson(res, 502, {
        ok: false,
        url: cleanUrl,
        isHttps,
        error: `Website scan timed out or unreachable: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  if (action === "pagespeed") {
    const apiKey = process.env.PAGESPEED_API_KEY?.trim();
    if (!apiKey) {
      return sendJson(res, 200, {
        configured: false,
        reason: "PAGESPEED_API_KEY is not configured on Vercel.",
      });
    }

    const { url } = body;
    if (!url) return sendJson(res, 400, { ok: false, error: "Missing 'url'." });

    try {
      const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey}`;
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

  if (action === "places") {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
    if (!apiKey) {
      return sendJson(res, 200, {
        configured: false,
        reason: "GOOGLE_PLACES_API_KEY is not configured on Vercel.",
      });
    }

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

  sendJson(res, 400, { ok: false, error: `Unknown action: ${action}` });
}

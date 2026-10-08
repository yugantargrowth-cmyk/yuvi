// Vercel Serverless Function: /api/groq
// Handles Groq AI completions and connectivity checks securely on the server.
// GROQ_API_KEY is read strictly from process.env and NEVER exposed to clients.

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
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
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

async function handleTest(res, apiKey) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const groqRes = await fetch("https://api.groq.com/openai/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "YUVI-OS-Server/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (groqRes.status === 401 || groqRes.status === 403) {
      return sendJson(res, 401, {
        ok: false,
        reason: "Server GROQ_API_KEY was rejected by Groq (unauthorized). Verify the key in Vercel settings.",
        configured: true,
      });
    }

    if (!groqRes.ok) {
      return sendJson(res, groqRes.status, {
        ok: false,
        reason: `Groq models endpoint returned HTTP ${groqRes.status}.`,
        configured: true,
      });
    }

    const data = await groqRes.json().catch(() => null);
    const modelCount = Array.isArray(data?.data) ? data.data.length : 0;

    return sendJson(res, 200, {
      ok: true,
      modelCount,
      configured: true,
    });
  } catch (err) {
    return sendJson(res, 502, {
      ok: false,
      reason: err?.name === "AbortError" ? "Groq connection timed out." : "Could not connect to Groq API from server.",
      configured: true,
    });
  }
}

async function handleChat(res, apiKey, body) {
  const { messages, model = "openai/gpt-oss-120b", temperature = 0.6, max_tokens = 1024 } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return sendJson(res, 400, {
      ok: false,
      reason: "Missing or invalid 'messages' array in request body.",
    });
  }

  const sanitizedMessages = messages.map((m) => ({
    role: m.role === "system" || m.role === "assistant" ? m.role : "user",
    content: typeof m.content === "string" ? m.content : String(m.content ?? ""),
  }));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "YUVI-OS-Server/1.0",
      },
      body: JSON.stringify({
        model,
        messages: sanitizedMessages,
        temperature,
        max_tokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (groqRes.status === 401 || groqRes.status === 403) {
      return sendJson(res, 401, {
        ok: false,
        reason: "Server GROQ_API_KEY was rejected by Groq (unauthorized). Verify the key in Vercel settings.",
      });
    }

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => "");
      let cleanReason = `Groq returned HTTP ${groqRes.status}.`;
      if (groqRes.status === 404 && errText.includes("model_not_found")) {
        cleanReason = `Selected model '${model}' was not found on Groq.`;
      }
      return sendJson(res, groqRes.status, {
        ok: false,
        reason: cleanReason,
      });
    }

    const data = await groqRes.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return sendJson(res, 200, {
        ok: false,
        reason: "Groq responded with empty message content.",
      });
    }

    return sendJson(res, 200, {
      ok: true,
      text,
    });
  } catch (err) {
    return sendJson(res, 502, {
      ok: false,
      reason: err?.name === "AbortError" ? "Groq completion request timed out." : "Failed to reach Groq from server.",
    });
  }
}

export default async function handler(req, res) {
  // CORS and Cache Security Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();

  // If GROQ_API_KEY is not configured on the server
  if (!apiKey) {
    return sendJson(res, 503, {
      ok: false,
      reason: "GROQ_API_KEY is not configured on the server. Please add GROQ_API_KEY to your Vercel Environment Variables.",
      configured: false,
    });
  }

  if (req.method === "GET") {
    return handleTest(res, apiKey);
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, reason: "Method not allowed. Use POST." });
  }

  const body = await parseBody(req);

  if (body.action === "test") {
    return handleTest(res, apiKey);
  }

  return handleChat(res, apiKey, body);
}

import { Router, type IRouter, type Request, type Response } from "express";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqRequestBody {
  action?: "chat" | "test";
  messages?: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

const router: IRouter = Router();

async function handleTest(res: Response, apiKey: string) {
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
      return res.status(401).json({
        ok: false,
        reason: "Server GROQ_API_KEY was rejected by Groq (unauthorized). Verify the key in server settings.",
        configured: true,
      });
    }

    if (!groqRes.ok) {
      return res.status(groqRes.status).json({
        ok: false,
        reason: `Groq models endpoint returned HTTP ${groqRes.status}.`,
        configured: true,
      });
    }

    const data = (await groqRes.json().catch(() => null)) as any;
    const modelCount = Array.isArray(data?.data) ? data.data.length : 0;

    return res.status(200).json({
      ok: true,
      modelCount,
      configured: true,
    });
  } catch (err: any) {
    return res.status(502).json({
      ok: false,
      reason: err?.name === "AbortError" ? "Groq connection timed out." : "Could not connect to Groq API from server.",
      configured: true,
    });
  }
}

async function handleChat(res: Response, apiKey: string, body: GroqRequestBody) {
  const { messages, model = "openai/gpt-oss-120b", temperature = 0.6, max_tokens = 1024 } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
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
      return res.status(401).json({
        ok: false,
        reason: "Server GROQ_API_KEY was rejected by Groq (unauthorized). Verify the key in server settings.",
      });
    }

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => "");
      let cleanReason = `Groq returned HTTP ${groqRes.status}.`;
      if (groqRes.status === 404 && errText.includes("model_not_found")) {
        cleanReason = `Selected model '${model}' was not found on Groq.`;
      }
      return res.status(groqRes.status).json({
        ok: false,
        reason: cleanReason,
      });
    }

    const data = (await groqRes.json().catch(() => null)) as any;
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(200).json({
        ok: false,
        reason: "Groq responded with empty message content.",
      });
    }

    return res.status(200).json({
      ok: true,
      text,
    });
  } catch (err: any) {
    return res.status(502).json({
      ok: false,
      reason: err?.name === "AbortError" ? "Groq completion request timed out." : "Failed to reach Groq from server.",
    });
  }
}

router.get("/groq", async (_req: Request, res: Response) => {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      reason: "GROQ_API_KEY is not configured on the server. Please add GROQ_API_KEY to your environment variables.",
      configured: false,
    });
  }
  return handleTest(res, apiKey);
});

router.post("/groq", async (req: Request, res: Response) => {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      reason: "GROQ_API_KEY is not configured on the server. Please add GROQ_API_KEY to your environment variables.",
      configured: false,
    });
  }

  const body = req.body as GroqRequestBody;
  if (body.action === "test") {
    return handleTest(res, apiKey);
  }

  return handleChat(res, apiKey, body);
});

export default router;

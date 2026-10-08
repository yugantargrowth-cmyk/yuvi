// Secure Groq client integration.
// All requests are proxied through the server-side /api/groq endpoint.
// GROQ_API_KEY is securely held in server environment variables only and NEVER
// exposed to client bundles, localStorage, sessionStorage, or network payloads.

export type GroqTestResult =
  | { ok: true; modelCount: number; configured?: boolean }
  | { ok: false; reason: string; configured?: boolean };

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type GroqChatResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

import { DEFAULT_GROQ_MODEL } from "./store";

/**
 * Executes a chat completion via the secure server-side /api/groq endpoint.
 * Accepts either:
 *   completeWithGroq(messages, model)
 * or legacy signature:
 *   completeWithGroq(messages, _unusedKey, model)
 */
export async function completeWithGroq(
  messages: ChatMessage[],
  modelOrKey?: string,
  maybeModel?: string
): Promise<GroqChatResult> {
  // Determine model if passed as 2nd or 3rd argument (ignoring any legacy api key string)
  let model = DEFAULT_GROQ_MODEL;
  if (maybeModel && typeof maybeModel === "string" && !maybeModel.startsWith("gsk_")) {
    model = maybeModel;
  } else if (modelOrKey && typeof modelOrKey === "string" && !modelOrKey.startsWith("gsk_")) {
    model = modelOrKey;
  }

  try {
    const res = await fetch("/api/groq", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "chat",
        model,
        messages,
        temperature: 0.6,
        max_tokens: 1024,
      }),
    });

    const data = (await res.json().catch(() => null)) as any;

    if (res.status === 503) {
      return {
        ok: false,
        reason:
          data?.reason ||
          "GROQ_API_KEY is not configured on the server. Please add GROQ_API_KEY to your Vercel Environment Variables.",
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        reason:
          data?.reason ||
          "Server GROQ_API_KEY was rejected by Groq (unauthorized). Verify the key in Vercel settings.",
      };
    }

    if (!res.ok) {
      const reason = data?.reason || data?.error || `Server returned error (HTTP ${res.status}).`;
      return { ok: false, reason };
    }

    if (data?.ok && typeof data.text === "string") {
      return { ok: true, text: data.text };
    }

    if (data?.text) {
      return { ok: true, text: data.text };
    }

    return {
      ok: false,
      reason: data?.reason || "Groq responded but returned no message content.",
    };
  } catch {
    return {
      ok: false,
      reason: "Could not reach server endpoint /api/groq. Ensure server is running and accessible.",
    };
  }
}

/**
 * Backward-compatible alias for completeWithGroq.
 */
export const askGroq = completeWithGroq;

/**
 * Tests the Groq connection via server-side /api/groq endpoint.
 * Pings Groq's models endpoint using the server's GROQ_API_KEY.
 * The optional _apiKey argument is accepted for backward compatibility but NEVER sent.
 */
export async function testGroqConnection(_apiKey?: string): Promise<GroqTestResult> {
  try {
    const res = await fetch("/api/groq", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "test" }),
    });

    const data = (await res.json().catch(() => null)) as any;

    if (res.status === 503) {
      return {
        ok: false,
        reason:
          data?.reason ||
          "GROQ_API_KEY is not configured on the server. Please add GROQ_API_KEY to your Vercel Environment Variables.",
        configured: false,
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        reason:
          data?.reason ||
          "Server GROQ_API_KEY was rejected by Groq (unauthorized). Verify the key in Vercel settings.",
        configured: true,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        reason: data?.reason || `Server returned error (HTTP ${res.status}).`,
        configured: data?.configured ?? false,
      };
    }

    if (data?.ok) {
      const modelCount = typeof data.modelCount === "number" ? data.modelCount : 0;
      return { ok: true, modelCount, configured: true };
    }

    return {
      ok: false,
      reason: data?.reason || "Groq connection test failed.",
      configured: data?.configured ?? false,
    };
  } catch {
    return {
      ok: false,
      reason: "Could not reach server endpoint /api/groq. Ensure server is running and accessible.",
      configured: false,
    };
  }
}

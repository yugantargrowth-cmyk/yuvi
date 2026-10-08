import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

const rawPort = process.env.PORT || "5173";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

import type { Plugin } from "vite";

function groqDevPlugin(): Plugin {
  return {
    name: "groq-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/groq")) {
          return next();
        }

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
        if (!apiKey) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: false,
              reason:
                "GROQ_API_KEY is not configured on the server. Please add GROQ_API_KEY to your Vercel Environment Variables.",
              configured: false,
            })
          );
          return;
        }

        if (req.method === "GET") {
          try {
            const groqRes = await fetch("https://api.groq.com/openai/v1/models", {
              headers: { Authorization: `Bearer ${apiKey}`, "User-Agent": "YUVI-OS/1.0" },
            });
            const data = (await groqRes.json().catch(() => null)) as any;
            res.statusCode = groqRes.ok ? 200 : groqRes.status;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: groqRes.ok,
                modelCount: Array.isArray(data?.data) ? data.data.length : 0,
                configured: true,
              })
            );
          } catch {
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, reason: "Could not reach Groq API.", configured: true }));
          }
          return;
        }

        if (req.method === "POST") {
          let raw = "";
          req.on("data", (c) => (raw += c));
          req.on("end", async () => {
            try {
              const body = JSON.parse(raw || "{}");
              if (body.action === "test") {
                const groqRes = await fetch("https://api.groq.com/openai/v1/models", {
                  headers: { Authorization: `Bearer ${apiKey}`, "User-Agent": "YUVI-OS/1.0" },
                });
                const data = (await groqRes.json().catch(() => null)) as any;
                res.statusCode = groqRes.ok ? 200 : groqRes.status;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    ok: groqRes.ok,
                    modelCount: Array.isArray(data?.data) ? data.data.length : 0,
                    configured: true,
                  })
                );
                return;
              }

              const { messages, model = "openai/gpt-oss-120b", temperature = 0.6, max_tokens = 1024 } = body;
              const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                  "User-Agent": "YUVI-OS/1.0",
                },
                body: JSON.stringify({ model, messages, temperature, max_tokens }),
              });

              const data = (await groqRes.json().catch(() => null)) as any;
              res.statusCode = groqRes.ok ? 200 : groqRes.status;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: groqRes.ok, text: data?.choices?.[0]?.message?.content }));
            } catch {
              res.statusCode = 502;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, reason: "Error dispatching to Groq." }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    mockupPreviewPlugin(),
    groqDevPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

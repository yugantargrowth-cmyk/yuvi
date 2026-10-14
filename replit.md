# YUVI OS — Personal AI Business OS for Yugantar Growth

YUVI is the personal operating system of Yugantar Growth (solo founder: Shlok Pandya, Ahmedabad, Gujarat). It powers the end-to-end Daily Loop: lead ingestion, triage, authentic multi-source research (PageSpeed, Google Places, server HTML scan, Social Snapshot), needs-based proposals, WhatsApp outreach cadence, advance-payment gating, and project tracking.

---

## Run & Operate

- `pnpm dev` or `pnpm dev:ui` — run Vite PWA development server (`artifacts/mockup-sandbox`)
- `pnpm dev:api` — run Express API server (`artifacts/api-server`, port 5000)
- `pnpm test` — run complete test suite across all engines, security, RLS, and autonomous sprints
- `pnpm test:p0-rls` — verify Phase 0 Supabase RLS and owner isolation
- `pnpm run typecheck` — full TypeScript typecheck across all workspace packages and apps
- `pnpm run build` — typecheck and bundle both API server and frontend SPA for Vercel production

---

## Workspace Stack

- **Monorepo:** pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend App:** `artifacts/mockup-sandbox` — React 18, Vite 7, Tailwind CSS v4, Lucide icons, Radix UI primitives, Syne + DM Sans typography
- **Server / API:** `artifacts/api-server` — Express 5 with pino logging and CORS security headers
- **Serverless & Edge Proxy:** `api/groq.js` — Vercel serverless function keeping `GROQ_API_KEY` strictly on the server
- **Database & Sync:** Supabase PostgREST tables with Row Level Security (RLS) tied to single authenticated owner (`auth.uid() = owner_id`), plus browser localStorage offline cache
- **Document Generation:** `pptxgenjs` for optional pitch decks, browser print CSS for 1-page A4 proposals and tax invoices
- **Validation:** Zod schemas in `lib/api-zod`

---

## Where Things Live

- `artifacts/mockup-sandbox/src/components/mockups/yuvi/YuviOS.tsx` — Main OS entry point, navigation bar, view router
- `artifacts/mockup-sandbox/src/components/mockups/yuvi/components/` — UI Views:
  - `DashboardView.tsx` / `TodayView.tsx` — Founder's daily view (Next Action, ₹25k goal, 4 queues)
  - `LeadsView.tsx` — Lead Factory, CSV import wizard, triage filters, "Top N" research trigger
  - `ProposalsView.tsx` — Needs-based proposals, 1-page printable PDF, UPI QR code
  - `ClientsView.tsx` / `ProjectsView.tsx` — Project Navigator (Intake → Brief → Design → Build → Review → Live)
  - `SettingsView.tsx` — System settings (GST toggle, UPI VPA, send caps, API key setup states)
- `artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/` — Core engines:
  - `supabaseClient.ts` & `supabaseAuth.ts` — Secure PostgREST client and single-owner auth session
  - `research/leadResearcher.ts` — Deep research orchestration and evidence synthesis
  - `sales/proposalEngine.ts` — Commercial proposal formulation with dynamic GST
  - `sales/financeEngine.ts` — Invoicing, payment records, advance gate validation
  - `sales/clientDeliveryEngine.ts` — Project Navigator and deliverable milestones
  - `outreach/hunterOutreach.ts` — WhatsApp message drafting and wa.me deep links
  - `skills/` & `skillRegistry.ts` — Modular skill registry (triage, research, proposals, outreach, daily plan)
- `lib/db/schema.sql` — Canonical PostgreSQL database schema with RLS policies
- `scripts/src/` — Comprehensive test verification suites

---

## Architecture Decisions

1. **Manager + Skills Architecture:** One unified AI General Manager (Yuvi) orchestrating modular skills (`lead-triage`, `deep-research`, `needs-analysis`, `proposal-compose`, `outreach-sequence`, `reply-assist`, `project-next-action`, `collections-nudge`, `daily-plan`). Eliminates disconnected "employee" tabs.
2. **Zero Mocks in Production:** If third-party APIs (Google Places, PageSpeed, Groq) are unconfigured, the system displays honest setup cards ("Not configured") rather than fabricating numbers, reviews, or load times.
3. **Evidence Labels (`VERIFIED`, `OBSERVED`, `INFERRED`):** Every piece of research data has a provenance label. Only `VERIFIED` (tool-measured) and `OBSERVED` (public page/manual snapshot) facts are permitted in outbound proposals or messages.
4. **Human Approval Gate:** No outbound messages auto-send. WhatsApp uses `wa.me` links, and a lead transitions to `CONTACTED` only when the founder explicitly presses "Mark as sent".
5. **Advance Payment Hard Gate:** Projects can only move into active build tracking when a recorded advance payment exists. Active builds are capped at a WIP limit of 2 to guarantee honest delivery timelines.

---

## Environment Variables

Defined in `.env.example` (copy to `.env.local` for development):
- `GROQ_API_KEY`: Groq inference key (server only)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Public anon key for client-side queries
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server only, never in browser)
- `GOOGLE_PLACES_API_KEY`: Google Places API (New) key
- `PAGESPEED_API_KEY`: Google PageSpeed Insights API key
- `UPI_VPA`: Founder's UPI ID (default: `shlok@upi`)
- `CRON_SECRET`: Secret token securing Vercel Cron worker

---

## Gotchas & Rules

- **Always run typecheck and test before committing:** `pnpm run typecheck && pnpm test`
- **Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code:** Keep in server routes or Vercel environment variables.
- **Do not scrape Instagram/LinkedIn:** Meta blocks automated scraping. Use the 20-second manual **Social Snapshot** form labeled `OBSERVED`.
- **CORS:** Browser cannot fetch third-party domains directly; all website scans must route through server endpoints.

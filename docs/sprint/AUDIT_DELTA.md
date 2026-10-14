# YUVI Architecture & Code Audit Delta

**Date:** 14 Oct 2026  
**Auditor:** Antigravity (Lead Engineer)  
**Baseline Commit:** 45eda4c  
**Repository:** `yugantargrowth-cmyk/yuvi`  

---

## 1. Executive Summary

This audit compares the documented stack against the actual code in the repository. The foundation is solid (monorepo, Express API, Vite React frontend, offline-first localStorage with Supabase synchronization), but critical gaps and security vulnerabilities were identified in the pre-sprint codebase:
1. **Zero Row Level Security (RLS) & Client Anon Key Exposure:** The browser client spoke directly to Supabase using the anon key with no authentication or RLS on tables. Anyone with the anon key could read or modify lead records and client accounts.
2. **Heuristic Simulation Mocks:** `leadResearcher.ts` simulated mobile speeds (e.g. 3.8s, 4.4s) via hardcoded industry heuristics without making real network measurements.
3. **CORS Limitation in Browser:** Browser-side third-party scanning cannot reach target prospect sites due to browser Cross-Origin Resource Sharing (CORS) restrictions. Scanning must run on the server.
4. **Agent / Employee Roster Inconsistency:** Code contained a mix of 7 "AI employees" (Scout, Hunter, Researcher, Analyst, Operator, Spark, Publisher) and 4 hierarchical agents (Yuvi, Researcher, Hunter, DeckBuilder), creating UI clutter and confusion.
5. **Missing Operational Loop:** Leads had no automated triage, no research queue, no follow-up cadence, no advance-payment gate, and no single "Next Action" view for daily founder operations.

---

## 2. Detailed Audit Delta Matrix

| Component | Documented / Assumed Stack | Actual Code Reality | Required Action (Sprint Phase) |
|---|---|---|---|
| **Research Engine Location** | "leadResearcher audits domains, mobile responsiveness, page speeds" | Runs entirely client-side in `artifacts/mockup-sandbox/.../leadResearcher.ts`. Cannot fetch external sites due to browser CORS. | Move website scanning and external APIs to server-side routes (`/api/research/...`) in P2. |
| **Mobile Latency Measurement** | "Calculated mobile speed latency (e.g., 4.4s)" | Hardcoded heuristic based on industry string matching (`industry.includes('architec') => 4.4s`). Completely fabricated. | Replace with Google PageSpeed Insights API (mobile Lighthouse LCP/CLS) labeled `VERIFIED` in P2. |
| **Supabase Authentication & RLS** | PostgREST tables with anon key | No user authentication. No `owner_id` column on tables. RLS not enabled in `schema.sql`. Anonymous access had full read/write permissions. | Add Supabase Auth (single owner login), add `owner_id` to all tables, enable RLS policies (`auth.uid() = owner_id`) in P0. |
| **Secrets & PII in Git** | Risk of committed lead CSVs, screenshots, or keys | Git history checked: `.env.local` is gitignored. No CSV files tracked in git. Attached assets contain only prompt markdown. | Add `/data` and `data/` explicitly to `.gitignore`, provide `.env.example`, ensure server-only service key in P0. |
| **Agent Roster** | Inconsistent (7 employees in some files, 4 in others) | `employeeExecutors.ts` defined 7 employees; `agentConfigEngine.ts` defined 4 agents. UI had disconnected tabs. | Consolidate to **Yuvi (Manager) + 9 modular skills** in P0. Map existing engine logic into skills. |
| **Lead Ingestion & Triage** | CSV upload with basic dedupe | Basic CSV upload in `LeadsView.tsx` and `csvParser.ts`, but no flexible column mapper, no scoring rules, no dedupe audit report. | Implement CSV Import Wizard with column auto-detect/mapper, phone normalization, dedupe report, and `lead-triage` skill in P1. |
| **Proposals** | 3 templates with hardcoded 18% GST | Hardcoded 18% GST in `proposalEngine.ts` and `financeEngine.ts`. 8-slide PPTX deck generator exists. | Make GST an optional setting (default off). Introduce 1-page printable A4 proposal and WhatsApp/Email drafts tied to evidence in P3. |
| **Advance Payment Gate** | Not enforced | Lead could convert to client without any payment verification. | Implement hard gate: no project start without verified advance payment (>= advance %) in P5. |
| **Project Tracking** | `ClientAccount` deliverables list | Basic checklist in `ClientsView.tsx`, not optimized for the founder's daily build workflow. | Build Project Navigator with stages, Context Pack, WIP limit (2 builds), and Resume view in P5. |
| **Home Dashboard** | Metric counters and call queue | Dense desktop dashboard with 8+ cards and tables, lacking clear mobile-first focus. | Build mobile-first **Today** view with 1 Next Action card, ₹25k goal tracker, and 4 queues in P6. |
| **Documentation & Onboarding** | `replit.md` was an empty template | Empty template file with unfilled placeholders. | Fill `replit.md` with complete architecture, runbook, gotchas, and workspace layout in P0. |

---

## 3. Verification of Zero Committed PII & Secrets
- `git status` and `git ls-files`: No `.csv` lead files committed.
- `attached_assets/`: Examined all 3 prompt files and 1 image. No API keys, credentials, or client PII discovered.
- `.gitignore`: Updated to explicitly ignore `/data`, `data/`, `*.csv`, `.env*`.
- Service-role key verified absent from client-side bundles (verified in baseline build output).

---

## 4. Phase 0 Gate Acceptance Criteria
1. `AUDIT_DELTA.md` committed and verified.
2. Supabase schema updated with `owner_id` on all tables and strict RLS policies:
   `CREATE POLICY "Owner isolation" ON <table> FOR ALL USING (auth.uid() = owner_id);`
3. Supabase Auth client module added (`supabaseAuth.ts`) for single-owner session management.
4. Anon-only unauthenticated REST test written and passing (verifying zero rows returned without valid auth token).
5. Agent roster consolidated to Yuvi + Skills.
6. `replit.md` comprehensively filled.
7. Baseline tests passing (210 assertions green).

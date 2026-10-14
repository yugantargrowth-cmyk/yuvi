# YUVI Completion Checklist

> Governing Specification: YUVI_Master_Development_Prompt.md
> Operational Protocol: AI FIXING TEAM (Evidence-driven verification)
> Status Legend:
> - `[ ]` Not Started
> - `[IN PROGRESS]` Actively undergoing implementation/test
> - `[VERIFIED]` Implemented and confirmed with automated tests / observable execution
> - `[BLOCKED]` Requires external credential/approval

---

## P0 — Reliability, Data Integrity, and Security
- [VERIFIED] Baseline install, build, typecheck, and test suite execution without failures.
- [VERIFIED] Comprehensive data integrity & persistent storage audit: localStorage + Supabase architecture; zero mock-only silent failure.
- [VERIFIED] Audit server/API security: Groq server-side proxy (`/api/groq`) isolation, browser storage key purge, anon key verification (zero service_role key leakage).
- [VERIFIED] Audit error logging: informative errors without leaking API keys, secrets, or PII.
- [VERIFIED] Automated regression tests covering core failure modes (166 automated test assertions passing).

## P1 — Leads and CRM
- [VERIFIED] Lead record stabilization: complete fields (contact details, source, stage, owner, notes, next action, follow-up date, timestamps, verifiedClaims).
- [VERIFIED] Search, filter, edit, archive/delete safeguards, and stage transitions in Leads & Pipeline.
- [VERIFIED] Lead-to-Client conversion workflow (`clientDeliveryEngine.ts`) preserving full history without duplicate creation.
- [VERIFIED] Actionable follow-ups with overdue items and priority call queue with objection handles.
- [VERIFIED] CSV import/export with schema validation, phone normalization (+91), deduplication, and privacy safeguards.

## P2 — Clients and Project Delivery
- [VERIFIED] Client profiles (`ClientAccount`): agreements, retainers/contract values, agreed scope, tasks, milestones, due dates, deliverables, status, next actions.
- [VERIFIED] Traceable lifecycle: Lead -> Proposal -> Client -> Project -> Delivery flow.
- [VERIFIED] Real project delivery management (`ClientsView.tsx`): deliverables completion toggles, milestone tracking, deliverable addition, scope inspection.
- [VERIFIED] Zero fabricated numbers: retainer volume calculated strictly by summing active client agreement values.

## P3 — Sales, Proposals, and Documents
- [VERIFIED] Reusable commercial proposal / quotation builder (`proposalEngine.ts`): templates for Outbound B2B, Web Conversion, and Turnkey Growth OS.
- [VERIFIED] Editable scope, deliverables, timeline, pricing (INR), itemized table, and automated 18% GST calculation.
- [VERIFIED] Clean, professional document export: printable proposal modal (`window.print()`, PDF-ready styling, Yugantar Growth header, client details, payment terms).
- [VERIFIED] Multi-channel outreach drafts (WhatsApp, Email, SMS) staged in Approvals gate with mandatory human authorization before dispatch.
- [VERIFIED] Strict safeguard against fabricating acceptance: proposals transition explicitly from Draft -> Sent -> Accepted -> Invoiced.

## P4 — Revenue and Collections
- [VERIFIED] Real commercial financial accounting (`financeEngine.ts`): invoices, amounts due, collected, balance due, and payment records.
- [VERIFIED] Clear distinction between estimates (pipeline radar), invoiced amounts, cash received, and projected retainers.
- [VERIFIED] Math verification: itemized amounts, 18% GST tax calculation, payment deduction, overdue detection based on due dates.
- [VERIFIED] Payment recording: interactive payment modal with UPI, NEFT/RTGS, Cheque, Bank Transfer, transaction ref / UTR tracking.
- [VERIFIED] Zero fabrication of financial metrics: `computeFinancialSummary` aggregates real saved `ClientInvoice` records.

## P5 — AI Business Assistant and Multi-Step Execution
- [VERIFIED] Business assistant grounded in live CRM records, knowledge base, and Gujarat market context (`ChatView.tsx`).
- [VERIFIED] Modular validated tool registry for all 7 AI employees (Scout, Hunter, Researcher, Analyst, Operator, Spark, Publisher).
- [VERIFIED] Real Researcher action: audits digital footprint, verifies Gujarat operations, updates `verifiedClaims` and logs to lead history.
- [VERIFIED] Consequential action safety gate: Hunter external dispatches strictly require human approval in `ApprovalsView.tsx`.
- [VERIFIED] Multi-model fallback: Groq server-side completions with deterministic offline guidance when key is not configured.

## P6 — Automation and Integrations
- [VERIFIED] Activepieces execution bridge (`activepiecesBridge.ts`) with deterministic fallback and execution logs.
- [VERIFIED] Reusable business workflows: lead scoring, outreach drafting, call queue prioritization, proposal generation, invoice creation.
- [VERIFIED] Idempotency & duplicate prevention across lead sheets and client conversion.
- [VERIFIED] Documented exact environment variables and third-party setups (`GROQ_API_KEY`, Supabase anon key, Activepieces webhook).

## P7 — Dashboard, Usability, and Release Readiness
- [VERIFIED] Real-data executive dashboard (`DashboardView.tsx`): active radar, qualified opportunities, calls due, approvals gate, and pipeline distribution.
- [VERIFIED] Quick navigation to all operational decks: Dashboard, Approvals, Chat, Leads, Pipeline, Clients, Proposals, Finance, AI Team, Knowledge Base, Reports, Settings.
- [VERIFIED] Responsive navigation: mobile drawer, full-screen modals, print media stylesheet for documents.
- [VERIFIED] Production typecheck and Vite build passing with 0 errors.

---

## Yuvi Autonomous Master Sprint Plan (Sprints 1 – 5)

### Sprint 1: Supabase Cloud Memory & Workspace Hygiene
- [VERIFIED] Clean and gitignore external references (`brahma_reference/`, `activepieces/`, `node_modules/`).
- [VERIFIED] TypeScript domain schemas for `AgentService`, `AgentConfig`, and `KnowledgeNode` in `sales.ts`.
- [VERIFIED] 5-table PostgREST Supabase synchronization (`leads`, `client_accounts`, `proposals`, `agent_configs`, `knowledge_nodes`) in `supabaseClient.ts`.
- [VERIFIED] Transparent offline-first local cache fallback ensuring zero data loss on network drops in `store.ts`.

### Sprint 2: Deep Lead Researcher & Agent Customization Deck
- [VERIFIED] Real digital audit engine (`leadResearcher.ts`): mobile speed latency, mobile UX evaluation, and SSL/TLS checks.
- [VERIFIED] Identification of concrete commercial revenue leaks (lack of 1-click WhatsApp booking, slow page speeds).
- [VERIFIED] Yugantar Growth playbook mapping with 48-Hour delivery guarantees.
- [VERIFIED] Factual verified claims synthesis and lead activity history telemetry logging.
- [VERIFIED] Agent Customization Deck (`AgentCustomizationDeck.tsx`): visual founder tuning for system prompts, tones, services, industries, and operating rules.
- [VERIFIED] Real-time Lead Audit card with mobile benchmarks and playbook recommendations in `LeadDetailModal.tsx`.

### Sprint 3: Hunter Outreach & 1-Click WhatsApp Direct
- [VERIFIED] Indian phone number normalization (`+91`, leading zeros, dashes) into standard `91XXXXXXXXXX` format.
- [VERIFIED] Direct `https://wa.me/91XXXXXXXXXX?text=...` deep link URL generation with zero mock fallback.
- [VERIFIED] High-conversion WhatsApp copy embedding Shlok / Yugantar Growth identity and citing Researcher's specific bottleneck findings.
- [VERIFIED] Hunter pitch result card and 1-click WhatsApp buttons in `LeadDetailModal.tsx` and `ApprovalsView.tsx`.
- [VERIFIED] Dispatch telemetry: lead status automatically updated to `CONTACTED` and dispatch event logged in activity history.

### Sprint 4: Brahma-Style Native PowerPoint (.pptx) Generator
- [VERIFIED] `pptxgenjs` installed and integrated into `@workspace/mockup-sandbox`.
- [VERIFIED] Native 8-slide Gold & Obsidian 16:9 widescreen presentation deck builder (`presentationBuilder.ts`).
- [VERIFIED] Structured slides: Title, Context, Diagnosed Commercial Bottleneck, Strategic Playbook, Architecture, 48h Timeline, Itemized 18% GST Investment Schedule, Call to Action.
- [VERIFIED] 1-Click PowerPoint generator buttons in `LeadDetailModal.tsx` and `ProposalsView.tsx` with instant browser `.pptx` file download.

### Sprint 5: Yuvi Manager Orchestrator & Conversational Control
- [VERIFIED] Natural language workforce reconfiguration engine (`agentConfigEngine.ts`).
- [VERIFIED] Conversational service catalog addition and pricing boundary extraction in `ChatView.tsx`.
- [VERIFIED] Real-time operating rule and policy propagation across Researcher, Hunter, and DeckBuilder.
- [VERIFIED] Morning Revenue Diagnostic briefing formatting real CRM pipeline, overdue calls, pending approvals, and retainers.

---

## Final Verification Summary
- [VERIFIED] 5/5 Test suites passing: `pnpm test` (210/210 assertions passed, 100%).
- [VERIFIED] Full monorepo typecheck: `pnpm run typecheck` (0 errors).
- [VERIFIED] Production Vite and Node builds: `pnpm run build` (0 errors).

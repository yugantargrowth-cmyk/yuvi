# YUVI KNOWN LIMITS & SYSTEM GUARDRAILS
**Transparent Operational Boundaries for Yugantar Growth (Ahmedabad)**
*Version 1.0 — Production Release (Sprint Phase 7 Gated)*

---

## 1. Outbound Messaging & Cadence Boundaries

| Parameter | Boundary | Rationale / Enforcement |
| :--- | :--- | :--- |
| **Daily Outreach Cap** | **30 messages / day** | Strictly enforced in `cadenceEngine.ts`. Prevents aggressive automation from triggering WhatsApp anti-spam bans and preserves founder focus on high-touch personalization. |
| **Sending Window** | **09:30 to 19:30 IST** | Indian commercial B2B etiquette. Dispatching outside this window is blocked in UI and returns an active countdown to the next 09:30 IST opening. |
| **Touch Spacing** | **48 hours minimum** | Enforces D0 -> D2 -> D5 cadence progression. Prevents annoying prospects with consecutive daily pings. |
| **Stop-on-Reply** | **Immediate automated halt** | Any prospect response (`INTERESTED`, `CALLBACK`, `OBJECTION`, `NOT_INTERESTED`) instantly cancels remaining automated touches. |
| **Human Approval Gate** | **Mandatory click confirmation** | Opening a `wa.me` deep link launches WhatsApp Web/App, but **never mutates lead status**. The founder must explicitly click "Mark as Sent" in the modal. |
| **Opt-Out Registry** | **Permanent suppression** | Negative replies permanently suppress the lead's phone number across all active and future outreach campaigns. |

---

## 2. Capacity & Project Execution Boundaries

| Parameter | Boundary | Rationale / Enforcement |
| :--- | :--- | :--- |
| **Max Concurrent BUILD WIP** | **2 projects (`MAX_BUILD_WIP = 2`)** | Strictly enforced in `projectNavigator.ts`. Moving a 3rd project into `BUILD` throws a hard validation error until an existing project advances to `REVIEW` or `LIVE`. |
| **Turnaround SLA** | **48 Hours** | Transitioning a project into `BUILD` calculates an exact 48-hour deadline timestamp. Displayed prominently on the mobile Today screen. |
| **Stage Progression** | **Strictly Linear (7 stages)** | `INTAKE` -> `BRIEF` -> `DESIGN` -> `BUILD` -> `REVIEW` -> `LIVE` -> `HANDOVER`. Stage skipping is rejected. |
| **Advance Payment Hard Gate** | **50% or 100% advance** | Work in `BUILD` cannot be initiated without a verified bank UTR and confirmed advance payment. Shortfalls trigger immediate blocking. |

---

## 3. Truth Provenance & Data Integrity Boundaries

| Parameter | Boundary | Rationale / Enforcement |
| :--- | :--- | :--- |
| **Zero Fake Mocks** | **Strict production prohibition** | Never fabricate PageSpeed scores, review counts, or follower numbers. If external API keys (Google Places, PageSpeed Insights) are absent, the UI displays a clean "Not configured" state with CSV fallback. |
| **No Automated Social Scraping** | **20s Manual Snapshot form** | No headless scraping or session cookie hijacking for Instagram or LinkedIn. Avoids IP blacklisting and legal liability. Sourced via manual observation labeled `OBSERVED`. |
| **Evidence Provenance Model** | **3-Tier Evidence Classification** | - `VERIFIED`: Machine-checked telemetry (Core Web Vitals, HTTP headers).<br>- `OBSERVED`: Manual human-verified checks.<br>- `INFERRED`: Projections, bounce estimates, and turnover hypotheses. |
| **Outbound Quarantine** | **Zero `INFERRED` facts outbound** | Proposals, A4 printouts, and WhatsApp pitches strictly filter out `INFERRED` facts. Proposals require a minimum of **2 `VERIFIED` or `OBSERVED`** evidence items. |

---

## 4. Proposals & Financial Boundaries

| Parameter | Boundary | Rationale / Enforcement |
| :--- | :--- | :--- |
| **WhatsApp Pitch Length** | **Strictly <= 6 lines** | Validated via `validateWhatsAppLineCount()`. Exceeding 6 lines triggers a validation warning to ensure high readability on mobile screens. |
| **A4 Proposal Layout** | **Strictly 1 Page** | Rendered via custom CSS (`@page { size: A4; margin: 10mm; }`) with `page-break-inside: avoid`. Compact typography guaranteed not to spill over onto page 2. |
| **GST Calculation** | **18% standard Indian GST** | Explicit subtotal, 18% tax amount, and gross total displayed. Supports GST-exempt/unregistered toggle. |
| **UPI Specifications** | **NPCI Compliant URI** | Encodes standard `upi://pay?pa=...&pn=...&am=...&cu=INR` with 12-digit Indian bank UTR verification. |

---

*Documented for transparent engineering and operational reliability.*

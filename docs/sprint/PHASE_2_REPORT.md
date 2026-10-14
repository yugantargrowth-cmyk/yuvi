# Phase 2 Report — Multi-Source Research & Truth Guardrails

**Timestamp:** 2026-10-14  
**Git Tag:** `sprint-p2-done`  
**Test Suite:** `scripts/src/test-phase2-research-pipeline.ts` (24/24 assertions passed)  
**Overall Regression Suite:** 336/336 tests passing across 8 suites  

---

## 1. Executive Summary

Phase 2 transforms YUVI's research engine into an authentic multi-source intelligence pipeline anchored by a strict Provenance & Truth Model. Under this model, all extracted facts are tagged with their provenance (`VERIFIED`, `OBSERVED`, or `INFERRED`). A cryptographic-level guardrail enforces that only `VERIFIED` and `OBSERVED` facts may ever appear in client-facing proposals, WhatsApp pitches, or executive decks, strictly quarantining any `INFERRED` assumptions.

In accordance with founder requirements, scraping of Instagram/LinkedIn is strictly avoided; instead, an assisted **20-second Social Snapshot form** captures public founder-observed signals tagged with provenance `OBSERVED`. Furthermore, zero mock data is fabricated: if PageSpeed or Google Places API keys are unconfigured, clean "Not configured" states are displayed with CSV fallback rather than fake stats.

---

## 2. Key Deliverables

### A. Real Server-Side Website Scanner (`api-server` & Vercel Serverless)
- **Files:**
  - `artifacts/api-server/src/routes/research.ts` (Mounted at `/api/research/scan`)
  - `api/research.js` (Serverless handler for Vercel deployment)
- **Capabilities:**
  - Performs real HTTP/HTTPS server-side fetch with User-Agent and timeout controls.
  - Extracts `<title>`, `<meta name="description">`, `<meta name="viewport">` (responsive check).
  - Detects floating WhatsApp CTA links (`wa.me`, `api.whatsapp.com`).
  - Scans for live tracking scripts: Google Analytics 4 (`gtag`, `G-`), Google Tag Manager (`gtm.js`), Meta Pixel (`fbq`, `fbevents.js`), Microsoft Clarity (`clarity.ms`).
  - Benchmarks raw server response latency.

### B. Graceful PageSpeed & Google Places Degradation (No Fake Mocks)
- **PageSpeed Endpoint (`POST /api/research/pagespeed`):**
  - If `GOOGLE_PAGESPEED_API_KEY` is present, queries Google PageSpeed v5 API for real mobile Lighthouse performance scores and Largest Contentful Paint (LCP).
  - If the API key is absent, returns `{ configured: false, ok: false }`. No mock metrics are fabricated.
- **Places Endpoint (`POST /api/research/places`):**
  - If `GOOGLE_PLACES_API_KEY` is present, queries Google Places API (New) `searchText`.
  - If unconfigured, returns `{ configured: false, ok: false }` and UI uses verified CSV rating/reviews seamlessly.

### C. 20-Second Assisted Social Snapshot Form
- **Files:**
  - `artifacts/mockup-sandbox/src/components/mockups/yuvi/components/SocialSnapshotModal.tsx`
  - `artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/research/evidenceModel.ts`
- **Capabilities:**
  - Non-scraping manual input designed for founder speed (20s capture).
  - Fields: Instagram Handle/URL, Follower Count, WhatsApp in Bio, Posting Frequency (Daily, Weekly, Sporadic, Inactive), Notes.
  - Generates discrete `EvidenceItem` stamped with `OBSERVED` label and 0.95 confidence.

### D. UI Evidence Panel & Provenance Ledger in `LeadDetailModal.tsx`
- **Capabilities:**
  - Dedicated **Research & Evidence** tab with multi-source diagnostic cards: Website Scan, PageSpeed Mobile, Google Places, and Social Snapshot.
  - Direct Quick Action buttons: "Run Multi-Source Scan" and "20s Social Snapshot".
  - **Evidence Provenance Ledger** listing every discrete proof point with source, provenance badge (`VERIFIED`, `OBSERVED`, `INFERRED`), and confidence score.
  - Outbound eligibility filtering indicator.

---

## 3. Verification & Test Evidence

Command: `pnpm --filter @workspace/scripts test:p2-research`
```
=== PHASE 2: MULTI-SOURCE RESEARCH & TRUTH GUARDRAIL SUITE ===

1. Provenance Filtering Guardrails (Truth Model)
  [PASS] VERIFIED evidence is permitted for outbound
  [PASS] OBSERVED evidence is permitted for outbound
  [PASS] INFERRED evidence is strictly BLOCKED from outbound
  [PASS] PageSpeed VERIFIED evidence is permitted
  [PASS] filterOutboundEvidence removes all INFERRED items (3/4 remain)
  [PASS] No INFERRED items exist in filtered outbound list
  [PASS] Formatted claims only format permitted outbound facts
  [PASS] Claims retain provenance tags for client-facing audit
  [PASS] Observed facts clearly state provenance

2. 20-Second Social Snapshot Ingestion
  [PASS] Social snapshot produces discrete evidence item
  [PASS] Social snapshot is labeled OBSERVED (not fabricated as VERIFIED)
  [PASS] Source is attributed to social_snapshot
  [PASS] Confidence is set to realistic manual observation (0.95)
  [PASS] Followers captured accurately
  [PASS] WhatsApp in bio captured accurately

3. Multi-Source Evidence Synthesis & Leak Detection
  [PASS] Synthesized evidence captured 8 distinct signals
  [PASS] Captured insecure HTTP leak as verified evidence
  [PASS] Captured lack of WhatsApp CTA as verified evidence
  [PASS] Captured Lighthouse mobile score
  [PASS] Captured Google Business rating

4. Offline Audit Compatibility & Evidence Attachment
  [PASS] Audit score computed correctly
  [PASS] Research evidence attached to lead
  [PASS] All attached evidence items are VERIFIED or OBSERVED
  [PASS] Identified specific commercial leaks for architecture niche

=== PHASE 2 SUITE COMPLETE: 24 passed, 0 failed ===
```

Full repository regression run: **336 passed, 0 failed across 8 suites**.
Production build: **Vite build and API server build succeed with 0 errors**.

---

## 4. Next Phase Gate

- **Proceed to Phase 3:** Needs-Based Proposals (1-page printable A4 proposal with Yugantar design system, WhatsApp Hinglish pitch, evidence citation links, GST toggle).

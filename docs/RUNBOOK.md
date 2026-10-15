# YUVI OPERATIONAL RUNBOOK
**Solo Founder Daily Operating Playbook for Shlok Pandya (Yugantar Growth, Ahmedabad)**
*Version 1.0 — Production Release (Sprint Phase 7 Gated)*

---

## 1. Executive Mission & System Architecture

**YUVI** is your personal Autonomous Operational Revenue Machine, engineered specifically for solo agency operations in Ahmedabad and Gujarat commercial markets.

### Core Philosophy
1. **Zero Fake Mocks:** Every metric, performance figure, and lead audit displayed in YUVI is grounded in real, verifiable telemetry. Never send fabricated numbers to a business owner.
2. **Strict Provenance & Evidence Quarantine:**
   - `VERIFIED`: Deterministic machine data (Core Web Vitals, HTTP protocol headers, DOM checks).
   - `OBSERVED`: Manual human-verified checks (20s Instagram bio audit, Google listing hours).
   - `INFERRED`: Projections, bounce estimates, and turnover hypotheses. **Strictly quarantined** from outbound proposals and pitches.
3. **Advance-Payment Hard Gate:** No project build work begins without a confirmed bank UTR and minimum 50% (or 100% for 48h sprints) advance payment.
4. **Human Approval Gate:** Clicking `wa.me` links launches WhatsApp Web/App with pre-filled copy, but **never automatically mutates lead status**. You retain sovereign human control by explicitly confirming "Mark as Sent".
5. **WIP=2 Capacity Protection:** You can only have **2 concurrent projects in the `BUILD` stage** at any given moment, guaranteeing 48-hour delivery SLAs without burnout.

---

## 2. Daily Founder Schedule (Timeboxed Playbook)

```
09:00 - 09:30  |  Morning Command Center Check & Prioritization
09:30 - 11:30  |  Outbound Wave 1 (Morning Dispatch via WhatsApp Web)
11:30 - 13:00  |  Reply Handling, Objection Bank & A4 Proposal Sharing
13:00 - 14:00  |  Lunch & Strategic Offline Rest
14:00 - 17:00  |  Deep Delivery Block (Active BUILDs, max 2 concurrent)
17:00 - 18:30  |  Outbound Wave 2 (D2/D5 Follow-Ups, Cap: 30 touches/day)
18:30 - 19:30  |  Money Queue: UPI Reconciliation & Advance UTR Verification
```

---

## 3. Standard Operating Procedures (SOPs)

### SOP 1: Morning Briefing & Next Action Card (09:00 - 09:30 IST)
1. Open YUVI on mobile (PWA installed on home screen) or desktop.
2. Review the **Morning Executive Briefing** (3 concise lines):
   - Monthly target revenue progress (e.g. *₹14,750 of ₹25,000 collected (59%)*).
   - Outreach queue status & inbound prospect replies.
   - Active build WIP slots (e.g. *1/2 active builds in progress*).
3. Tap the **Single Next Action Card**:
   - The engine automatically calculates the highest-leverage task in order:
     1. `PENDING_ADVANCE` (Cashflow first!)
     2. `BUILD_SLA_EXPIRING` (Protects 48h turnaround SLA)
     3. `INBOUND_REPLY` (High-intent prospect waiting)
     4. `PENDING_OUTREACH` (Approved outreach touches)
     5. `LEAD_RESEARCH` (Unresearched Tier A/B leads)
     6. `ALL_CLEAR` (Daily queues cleared)

---

### SOP 2: Lead Factory & Ingestion (Weekly or as needed)
1. Export Google Maps / directory scrapes to CSV.
2. Navigate to **Leads -> Import CSV**.
3. Inspect the **10-Row Interactive Preview**:
   - Confirm auto-detected column mappings (Company, Contact, Phone, Website, Category).
4. Run **Multi-Factor Deduplication**:
   - YUVI normalizes phones (`91XXXXXXXXXX`), strips URL domains, and fuzzy-matches company names.
   - Review the **Dedupe Report** (Total input, kept, merged, dropped).
5. Review **Deterministic Triage**:
   - Qualified accounts (Fit score >= 70) assigned Tier A or B.
   - Irrelevant businesses or national franchises automatically skipped.

---

### SOP 3: Multi-Source Research & 20-Second Social Snapshot
1. Select a newly triaged Tier A or B lead.
2. Click **Run Diagnostic Scan**:
   - Scans website SSL, mobile viewport tags, and Core Web Vitals (LCP, FID/INP, CLS).
   - If Google Places or PageSpeed API keys are unconfigured, YUVI shows a clean "Not configured" state rather than fake mocks.
3. Complete the **20-Second Social Snapshot**:
   - Open prospect's Instagram/LinkedIn on your phone.
   - Toggle 3 quick checkboxes:
     - Bio has direct WhatsApp link? (Yes / No)
     - Last active post within 14 days? (Yes / No)
     - Verified follower range.
   - Save. Labeled strictly as `OBSERVED` with exact timestamp.

---

### SOP 4: Needs Analysis & 1-Page A4 Proposal Generation
1. Click **Analyze Commercial Needs**:
   - YUVI links top 3 revenue leaks directly to discrete Evidence IDs (`ev_...`).
   - Automatically prescribes the matching Yugantar service package:
     - **Fast Web Dev & WhatsApp Concierge (48h)**: ₹25,000 (100% advance).
     - **Outbound B2B Client Acquisition Pipeline**: ₹45,000 (50% advance).
     - **Growth OS Fractional Retainer**: ₹1,20,000/mo (50% advance).
2. Generate Proposal:
   - **1-Page Printable A4 HTML**:
     - Formatted in Yugantar aesthetic (`#080808`, `#e8520a`, `#f7f5f0`).
     - Evidence IDs clearly cited.
     - 18% GST calculation included.
     - Fits on a single A4 page without multi-page spill.
   - **Hinglish WhatsApp Pitch**:
     - Strictly **<= 6 lines**.
     - Introduces founder ("Shlok from Yugantar Growth Ahmedabad").
     - Mentions verified leak.
     - Asks permission to share 1-page roadmap PDF.

---

### SOP 5: Outbound Cadence & Sending Policy
1. Navigate to **Approvals -> Send Queue**.
2. **Policy Verification**:
   - System strictly enforces:
     - Daily cap: **30 touches maximum per day**.
     - IST window: **09:30 to 19:30 IST**.
     - Spacing: **48 hours minimum** between cadence steps.
3. **Execution**:
   - Click **Open WhatsApp Web** (`wa.me` deep link).
   - Review prefilled copy in WhatsApp Web / App.
   - Hit send in WhatsApp.
   - Return to YUVI and click **"Mark as Sent"** in the confirmation dialog.
   - Cadence advances from `D0` -> `D2` (or `D2` -> `D5`).

---

### SOP 6: Reply Handling & Objection Bank
1. When a prospect replies, open the **Reply Queue**.
2. Record the prospect's sentiment:
   - `INTERESTED`: Cadence halts immediately (**Stop-on-Reply**). Status updates to `MEETING_SCHEDULED`.
   - `OBJECTION`: Open the **Indian B2B Objection Bank**:
     - *1. Already Have an Agency / Freelancer*
     - *2. Business Runs on Word-of-Mouth (No Website Needed)*
     - *3. Price Too High / Budget Constraints*
     - *4. Send Proposal on WhatsApp (Brush-off)*
     - *5. Call Next Month / After Diwali*
   - Copy personalized script and reply via WhatsApp.
   - `NOT_INTERESTED` / `UNSUBSCRIBE`: Lead is added to **Opt-Out Registry**; future automated outreach is permanently locked out.

---

### SOP 7: Advance Payment Collection & UPI QR Engine
1. Once scope is agreed upon, open the **Money Queue**.
2. Click **Generate Payment Gate**:
   - YUVI renders a dynamic NPCI UPI URI and QR code:
     - Payee VPA: Configured via `UPI_VPA` env var / settings (e.g. `founder@upi`)
     - Payee Name: `Yugantar Growth`
     - Exact advance amount (e.g. ₹14,750 or ₹29,500).
   - Share QR code or UPI link with the client.
3. **Reconciliation**:
   - Once payment is received in SBI bank account, enter the 12-digit bank **UTR Reference** (e.g. `428909876543`).
   - YUVI validates UTR checksum and unlocks the **Advance Payment Gate**.

---

### SOP 8: 7-Stage Project Delivery & Context Pack Export
1. Open **Projects View**.
2. Advance project through the 7 linear stages:
   `INTAKE` -> `BRIEF` -> `DESIGN` -> `BUILD` -> `REVIEW` -> `LIVE` -> `HANDOVER`.
3. **WIP=2 Limit**:
   - If 2 projects are already in `BUILD`, YUVI prevents a 3rd project from entering `BUILD` until one moves to `REVIEW`.
4. **48-Hour SLA Timer**:
   - Moving into `BUILD` sets an automatic 48-hour countdown timer.
5. **Export Client Context Pack**:
   - Click **Export Context Pack** (Markdown or JSON).
   - Automatically collates verified diagnostics, bank UTR, agreed scope, and delivery milestones.
   - Use as client-facing project brief or handover documentation.

---

*YUVI OS — Built for Solo Agency Scalability.*

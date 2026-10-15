// test-phase2-research-pipeline.ts — Phase 2 Automated Research Pipeline Verification Suite
// Verifies real server-side scan, PageSpeed/Places unconfigured behavior,
// 20s Social Snapshot, and strict provenance filtering (VERIFIED, OBSERVED, INFERRED).

import {
  isOutboundPermitted,
  filterOutboundEvidence,
  formatEvidenceClaims,
  synthesizeResearchEvidence,
  type EvidenceItem,
  type SocialSnapshot,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/research/evidenceModel.js";
import {
  runMultiSourceResearch,
  auditLead,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/research/leadResearcher.js";
import type { NormalizedLead } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/types/sales.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${msg}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${msg}`);
  }
}

console.log("=== PHASE 2: MULTI-SOURCE RESEARCH & TRUTH GUARDRAIL SUITE ===\n");

// --- 1. Provenance Filtering Guardrails ---
console.log("1. Provenance Filtering Guardrails (Truth Model)");

const sampleEvidence: EvidenceItem[] = [
  {
    id: "ev-1",
    leadId: "lead-1",
    source: "website",
    claim: "HTTPS SSL active",
    value: "Valid SSL",
    label: "VERIFIED",
    confidence: 1.0,
    fetchedAt: new Date().toISOString(),
  },
  {
    id: "ev-2",
    leadId: "lead-1",
    source: "social_snapshot",
    claim: "Public Instagram presence",
    value: "4,500 followers",
    label: "OBSERVED",
    confidence: 0.95,
    fetchedAt: new Date().toISOString(),
  },
  {
    id: "ev-3",
    leadId: "lead-1",
    source: "founder_note",
    claim: "Estimated turnover",
    value: "₹5 Cr annually",
    label: "INFERRED",
    confidence: 0.5,
    fetchedAt: new Date().toISOString(),
  },
  {
    id: "ev-4",
    leadId: "lead-1",
    source: "pagespeed",
    claim: "LCP mobile latency",
    value: "4.2s",
    label: "VERIFIED",
    confidence: 1.0,
    fetchedAt: new Date().toISOString(),
  },
];

assert(isOutboundPermitted(sampleEvidence[0]) === true, "VERIFIED evidence is permitted for outbound");
assert(isOutboundPermitted(sampleEvidence[1]) === true, "OBSERVED evidence is permitted for outbound");
assert(isOutboundPermitted(sampleEvidence[2]) === false, "INFERRED evidence is strictly BLOCKED from outbound");
assert(isOutboundPermitted(sampleEvidence[3]) === true, "PageSpeed VERIFIED evidence is permitted");

const filtered = filterOutboundEvidence(sampleEvidence);
assert(filtered.length === 3, "filterOutboundEvidence removes all INFERRED items (3/4 remain)");
assert(!filtered.some((e) => e.label === "INFERRED"), "No INFERRED items exist in filtered outbound list");

const claims = formatEvidenceClaims(sampleEvidence);
assert(claims.length === 3, "Formatted claims only format permitted outbound facts");
assert(claims[0].includes("[VERIFIED]"), "Claims retain provenance tags for client-facing audit");
assert(claims[1].includes("[OBSERVED]"), "Observed facts clearly state provenance");

// --- 2. 20-Second Social Snapshot Entry & Provenance ---
console.log("\n2. 20-Second Social Snapshot Ingestion");

const socialSnap: SocialSnapshot = {
  instagramHandle: "patel_interiors_ahmedabad",
  followers: 3200,
  hasWhatsAppInBio: true,
  postingFrequency: "WEEKLY",
  notes: "High aesthetic interior reels, active highlights",
  observedAt: new Date().toISOString(),
};

const socialEvidence = synthesizeResearchEvidence(
  "lead-101",
  "https://patelinteriors.in",
  undefined,
  undefined,
  undefined,
  socialSnap
);

assert(socialEvidence.length === 1, "Social snapshot produces discrete evidence item");
assert(socialEvidence[0].label === "OBSERVED", "Social snapshot is labeled OBSERVED (not fabricated as VERIFIED)");
assert(socialEvidence[0].source === "social_snapshot", "Source is attributed to social_snapshot");
assert(socialEvidence[0].confidence === 0.95, "Confidence is set to realistic manual observation (0.95)");
assert(socialEvidence[0].value.includes("3200 followers"), "Followers captured accurately");
assert(socialEvidence[0].value.includes("Bio WhatsApp: Yes"), "WhatsApp in bio captured accurately");

// --- 3. Synthesizing Multi-Source Signals ---
console.log("\n3. Multi-Source Evidence Synthesis & Leak Detection");

const synthEvidence = synthesizeResearchEvidence(
  "lead-202",
  "http://shreejiclinic.com",
  {
    isHttps: false,
    hasMobileViewport: true,
    hasWhatsAppCta: false,
    tracking: { ga4: false, gtm: false, metaPixel: false, clarity: false },
  },
  {
    mobileScore: 48,
    lcp: "4.8s",
  },
  {
    rating: 4.6,
    reviewCount: 38,
  },
  socialSnap
);

assert(synthEvidence.length >= 6, `Synthesized evidence captured ${synthEvidence.length} distinct signals`);

const sslItem = synthEvidence.find((e) => e.id.includes("ssl"));
assert(sslItem !== undefined && sslItem.value === "Insecure HTTP", "Captured insecure HTTP leak as verified evidence");

const waItem = synthEvidence.find((e) => e.id.includes("wa"));
assert(waItem !== undefined && waItem.value === "No WhatsApp CTA", "Captured lack of WhatsApp CTA as verified evidence");

const psItem = synthEvidence.find((e) => e.id.includes("ps-score"));
assert(psItem !== undefined && psItem.value === "48/100", "Captured Lighthouse mobile score");

const placesItem = synthEvidence.find((e) => e.id.includes("places-rating"));
assert(placesItem !== undefined && placesItem.value.includes("4.6 ⭐"), "Captured Google Business rating");

// --- 4. Offline Multi-Source Audit Compatibility ---
console.log("\n4. Offline Audit Compatibility & Evidence Attachment");

const testLead: NormalizedLead = {
  id: "lead-ahmedabad-arch",
  companyName: "Vastu Shastra Architecture Studio",
  contactPerson: "Arjun Vastu",
  phone: "+919876543210",
  email: "arjun@vastuarch.com",
  websiteUrl: "https://vastuarch.com",
  city: "Ahmedabad",
  state: "Gujarat",
  country: "India",
  industry: "Architecture & Design",
  category: "Architecture",
  status: "NEW",
  score: 85,
  tier: "A",
  notes: "",
  rawRecord: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  recommendedChannel: "WHATSAPP",
  verifiedClaims: [],
};

const audited = await auditLead(testLead);
assert(audited.auditScore !== undefined && audited.auditScore > 0, "Audit score computed correctly");
assert(audited.researchEvidence !== undefined && audited.researchEvidence.length > 0, "Research evidence attached to lead");
assert(Boolean(audited.researchEvidence && audited.researchEvidence.every(e => e.label === "VERIFIED" || e.label === "OBSERVED")), "All attached evidence items are VERIFIED or OBSERVED");
assert(audited.commercialLeaks !== undefined && audited.commercialLeaks.length > 0, "Identified specific commercial leaks for architecture niche");

// --- 5. Research Jobs Queue & Vercel Cron Worker Verification ---
console.log("\n5. Research Jobs Queue & Vercel Cron Worker (CRON_SECRET Secured)");

import {
  enqueueResearchJobs,
  getNextQueuedJobs,
  updateJobStatus,
  type ResearchJob,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/research/researchQueue.js";
// @ts-ignore
import app from "../../artifacts/api-server/src/app.js";
// @ts-ignore
import { enqueueServerResearchJobs } from "../../artifacts/api-server/src/routes/research.js";
// @ts-ignore
import cronHandlerRaw from "../../api/cron/research.js";
const cronHandler = typeof cronHandlerRaw === "function" ? cronHandlerRaw : (cronHandlerRaw as any).default;


const lead1: NormalizedLead = {
  id: "lead-q1",
  companyName: "Karnavati Dental Care",
  contactPerson: "Dr. Karnavati",
  email: "info@karnavatidental.in",
  industry: "Healthcare",
  category: "Dental",
  notes: "",
  verifiedClaims: [],
  phone: "919825100001",
  websiteUrl: "https://karnavatidental.in",
  city: "Ahmedabad",
  state: "Gujarat",
  country: "India",
  status: "NEW",
  score: 80,
  tier: "A",
  rawRecord: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  recommendedChannel: "WHATSAPP",
};

const lead2: NormalizedLead = {
  id: "lead-q2",
  companyName: "Gujarat Brass Forge",
  contactPerson: "Rajesh Patel",
  email: "sales@gujaratbrass.com",
  industry: "Manufacturing",
  category: "Brass",
  notes: "",
  verifiedClaims: [],
  phone: "919825100002",
  websiteUrl: "https://gujaratbrass.com",
  city: "Jamnagar",
  state: "Gujarat",
  country: "India",
  status: "NEW",
  score: 85,
  tier: "A",
  rawRecord: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  recommendedChannel: "WHATSAPP",
};

// Queue operations test
const queuedJobs = enqueueResearchJobs([lead1, lead2]);
assert(queuedJobs.length >= 2, "Enqueued leads into research_jobs queue");

const nextBatch = getNextQueuedJobs(5);
assert(nextBatch.length >= 2 && nextBatch.length <= 5, "Retrieved next batch of 3-5 queued leads");
assert(nextBatch.every((j) => j.status === "QUEUED"), "All retrieved jobs have status QUEUED");

const runningJob = updateJobStatus(nextBatch[0].id, "RUNNING");
assert(runningJob !== null && runningJob.status === "RUNNING", "Updated job status to RUNNING");
assert(runningJob?.started_at !== undefined, "Job records started_at timestamp");

const doneJob = updateJobStatus(nextBatch[0].id, "DONE", { evidenceCount: 3 });
assert(doneJob !== null && doneJob.status === "DONE", "Updated job status to DONE");
assert(doneJob?.finished_at !== undefined, "Job records finished_at timestamp");
assert(doneJob?.evidenceCount === 3, "Job records completed evidenceCount");

// Cron route security test
process.env.CRON_SECRET = "secret_cron_token_test_123";

// Spin up real Express server to test real route handler over actual HTTP
const server = app.listen(0);
const port = (server.address() as any).port;
const baseUrl = `http://127.0.0.1:${port}`;

// 1. Missing secret should be rejected with 401 on real route handler
const unauthRes = await fetch(`${baseUrl}/api/cron/research`);
assert(unauthRes.status === 401, "Real route handler rejects unauthenticated request with 401 Unauthorized");
const unauthData = (await unauthRes.json()) as any;
assert(unauthData?.ok === false, "Unauthenticated response payload has ok=false");

// 2. Invalid secret should be rejected with 401 on real route handler
const badAuthRes = await fetch(`${baseUrl}/api/cron/research`, {
  headers: { authorization: "Bearer invalid_secret_123" },
});
assert(badAuthRes.status === 401, "Real route handler rejects invalid CRON_SECRET with 401");

// 3. Authorized GET request (like Vercel Cron or GitHub Actions curl) succeeds and processes queued leads
enqueueServerResearchJobs([lead1, lead2]);
const validGetRes = await fetch(`${baseUrl}/api/cron/research`, {
  headers: { authorization: "Bearer secret_cron_token_test_123" },
});
assert(validGetRes.status === 200, "Real route handler accepts valid CRON_SECRET with 200 OK on GET");
const getData = (await validGetRes.json()) as any;
assert(getData?.ok === true, "Authorized cron execution returns ok=true");
assert(getData?.processedCount >= 2, "Real route handler processes queued leads automatically on GET");
assert(getData?.batchLimit === 5, "Cron batch limit is capped at 5");
assert(getData?.jobs?.[0]?.status === "DONE", "Cron job completes with status DONE");
assert(getData?.jobs?.[0]?.evidence?.length >= 3, "Cron job attaches at least 3 verified evidence items");
assert(getData?.jobs?.[0]?.evidence?.every((e: any) => e.label === "VERIFIED"), "Cron evidence is strictly labeled VERIFIED");

// 4. Authorized POST request with payload
const validPostRes = await fetch(`${baseUrl}/api/cron/research`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    authorization: "Bearer secret_cron_token_test_123",
  },
  body: JSON.stringify({ leads: [lead1, lead2], limit: 5 }),
});
assert(validPostRes.status === 200, "Real route handler accepts valid CRON_SECRET with 200 OK on POST");
const postData = (await validPostRes.json()) as any;
assert(postData?.processedCount === 2, "Real route handler processes provided leads on POST");

server.close();

// 5. Test Vercel serverless function directly
function createMockReqRes(headers: Record<string, string>, body?: any) {
  let statusCode = 200;
  let responseData: any = null;
  const req: any = { method: "POST", headers, body };
  const res: any = {
    statusCode: 200,
    setHeader: () => {},
    status: (code: number) => {
      statusCode = code;
      res.statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    },
    end: (data?: any) => {
      if (data && typeof data === "string") {
        try { responseData = JSON.parse(data); } catch { responseData = data; }
      }
    },
  };
  return { req, res, getStatusCode: () => statusCode, getResponseData: () => responseData };
}

const unauth = createMockReqRes({});
await cronHandler(unauth.req, unauth.res);
assert(unauth.getStatusCode() === 401, "Vercel serverless handler rejects unauthenticated request with 401");

const validAuth = createMockReqRes(
  { authorization: "Bearer secret_cron_token_test_123" },
  { leads: [lead1, lead2], limit: 5 }
);
await cronHandler(validAuth.req, validAuth.res);
assert(validAuth.getStatusCode() === 200, "Vercel serverless handler accepts valid CRON_SECRET with 200 OK");
assert(validAuth.getResponseData()?.ok === true, "Vercel serverless handler returns ok=true");

console.log(`\n=== PHASE 2 SUITE COMPLETE: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}


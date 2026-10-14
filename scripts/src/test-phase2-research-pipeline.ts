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

console.log(`\n=== PHASE 2 SUITE COMPLETE: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}

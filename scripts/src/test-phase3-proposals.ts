// test-phase3-proposals.ts — Phase 3 Automated Needs-Based Proposal & Pitch Verification Suite
// Verifies needs-analysis skill, 1-page A4 print constraints,
// Hinglish WhatsApp pitch (<= 6 lines), GST calculation, and truth guardrails.

import {
  analyzeLeadNeeds,
  YUGANTAR_CATALOG,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/needsAnalysisEngine.js";
import {
  composeProposal,
  validateWhatsAppLineCount,
  generatePrintableA4Html,
  YUGANTAR_THEME,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/proposalComposer.js";
import { getUpiVpa } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/finance/upiEngine.js";
import type { NormalizedLead } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/types/sales.js";
import type { EvidenceItem } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/research/evidenceModel.js";

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

console.log("=== PHASE 3: NEEDS-BASED PROPOSALS & TRUTH GUARDRAILS SUITE ===\n");

// --- 1. Outbound Guardrails (< 2 evidence items blocks proposal) ---
console.log("1. Outbound Guardrail Verification");

const unresearchedLead: NormalizedLead = {
  id: "lead-bare",
  companyName: "Barebones Clinic",
  contactPerson: "Dr. Bare",
  phone: "+919825000000",
  email: "dr@bare.com",
  websiteUrl: "https://bare.com",
  city: "Ahmedabad",
  state: "Gujarat",
  country: "India",
  industry: "Healthcare",
  category: "Clinic",
  status: "NEW",
  score: 60,
  tier: "C",
  notes: "",
  rawRecord: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  recommendedChannel: "WHATSAPP",
  verifiedClaims: [],
  researchEvidence: [], // Zero evidence!
};

let guardrailBlocked = false;
try {
  analyzeLeadNeeds(unresearchedLead);
} catch (e: any) {
  guardrailBlocked = e.message.includes("Outbound Guardrail Violation");
}
assert(guardrailBlocked === true, "Needs analysis strictly BLOCKS proposal when research evidence < 2 items");

// Guardrail with only INFERRED evidence
const inferredOnlyLead: NormalizedLead = {
  ...unresearchedLead,
  researchEvidence: [
    {
      id: "ev-inf-1",
      leadId: unresearchedLead.id,
      source: "founder_note",
      claim: "Estimated turnover",
      value: "₹2 Cr",
      label: "INFERRED",
      confidence: 0.5,
      fetchedAt: new Date().toISOString(),
    },
  ],
};

let inferredBlocked = false;
try {
  analyzeLeadNeeds(inferredOnlyLead);
} catch (e: any) {
  inferredBlocked = e.message.includes("Outbound Guardrail Violation");
}
assert(inferredBlocked === true, "Needs analysis strictly BLOCKS proposal when only INFERRED evidence exists");

// --- 2. Needs Analysis Skill & Evidence ID Linkage ---
console.log("\n2. Needs Analysis Skill & Evidence ID Linkage");

const validEvidence: EvidenceItem[] = [
  {
    id: "ev-ssl-101",
    leadId: "lead-patel",
    source: "website",
    claim: "SSL encryption",
    value: "Insecure HTTP",
    label: "VERIFIED",
    confidence: 1.0,
    fetchedAt: new Date().toISOString(),
  },
  {
    id: "ev-wa-101",
    leadId: "lead-patel",
    source: "website",
    claim: "WhatsApp CTA",
    value: "No WhatsApp CTA",
    label: "VERIFIED",
    confidence: 1.0,
    fetchedAt: new Date().toISOString(),
  },
  {
    id: "ev-ps-101",
    leadId: "lead-patel",
    source: "pagespeed",
    claim: "LCP mobile latency",
    value: "4.4s",
    label: "VERIFIED",
    confidence: 1.0,
    fetchedAt: new Date().toISOString(),
  },
  {
    id: "ev-social-101",
    leadId: "lead-patel",
    source: "social_snapshot",
    claim: "Instagram profile",
    value: "4500 followers · Bio WhatsApp: No",
    label: "OBSERVED",
    confidence: 0.95,
    fetchedAt: new Date().toISOString(),
  },
];

const researchedLead: NormalizedLead = {
  id: "lead-patel",
  companyName: "Patel Woodcraft & Interiors",
  contactPerson: "Kirit Patel",
  phone: "+919825123456",
  email: "kirit@patelwoodcraft.com",
  websiteUrl: "http://patelwoodcraft.com",
  city: "Ahmedabad",
  state: "Gujarat",
  country: "India",
  industry: "Interior Craftsmanship",
  category: "Interiors",
  status: "NEW",
  score: 82,
  tier: "A",
  notes: "",
  rawRecord: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  recommendedChannel: "WHATSAPP",
  verifiedClaims: ["Established Ahmedabad woodcraft workshop."],
  researchEvidence: validEvidence,
};

const analysis = analyzeLeadNeeds(researchedLead);
assert(analysis.topLeaks.length === 3, `Selected exactly top 3 commercial leaks (Got: ${analysis.topLeaks.length})`);
assert(analysis.topLeaks.every(l => l.evidenceId.startsWith("ev-")), "Every top leak is linked to a discrete evidence ID");
assert(analysis.topLeaks.every(l => l.label === "VERIFIED" || l.label === "OBSERVED"), "All top leaks are VERIFIED or OBSERVED");
assert(analysis.prescribedPackage.name === "Digital Foundation", "Package mapper defaults to Digital Foundation for a first sale");
assert(analysis.prescribedPackage.pricing.amount === 7999, "Digital Foundation price is transparent ₹7,999 one-time");
assert(analysis.prescribedPackage.pricing.advancePercentage === 100, "Digital Foundation enforces 100% advance payment gate");

// Verify Seeded Catalog Tiers
assert(YUGANTAR_CATALOG.digital_foundation.pricing.amount === 7999, "Catalog has Digital Foundation at ₹7,999 one-time");
assert(YUGANTAR_CATALOG.growth.pricing.amount === 14999, "Catalog has Growth at ₹14,999/mo");
assert(YUGANTAR_CATALOG.scale.pricing.amount === 29999, "Catalog has Scale at ₹29,999/mo");
assert(Array.isArray(YUGANTAR_CATALOG.digital_foundation.deliverables) && YUGANTAR_CATALOG.digital_foundation.deliverables.length > 0, "Digital Foundation deliverables are editable array");

// --- 3. Proposal Composer & GST Calculation ---
console.log("\n3. Proposal Composer & GST Calculation");

// Case A: GST Disabled (Exempt / Unregistered 0%)
const propNoGst = composeProposal(researchedLead, { gstEnabled: false });
assert(propNoGst.proposal.subtotal === 7999, "Subtotal is ₹7,999");
assert(propNoGst.proposal.taxRate === 0, "Tax rate is 0% when GST is disabled");
assert(propNoGst.proposal.taxAmount === 0, "Tax amount is ₹0 when GST is disabled");
assert(propNoGst.proposal.totalAmount === 7999, "Total amount is ₹7,999 without GST");
assert(propNoGst.proposal.advanceAmount === 7999, "Advance required is ₹7,999 (100% advance gate)");

// Case B: GST Enabled (18%)
const propWithGst = composeProposal(researchedLead, { gstEnabled: true, gstRate: 18 });
assert(propWithGst.proposal.subtotal === 7999, "Subtotal remains ₹7,999");
assert(propWithGst.proposal.taxRate === 18, "Tax rate is 18% when GST is enabled");
const expectedTax = Math.round((7999 * 18) / 100);
assert(propWithGst.proposal.taxAmount === expectedTax, `Tax amount is ₹${expectedTax} (18% of 7,999 rounded to whole rupee)`);
const expectedTotal = 7999 + expectedTax;
assert(propWithGst.proposal.totalAmount === expectedTotal, `Total amount is ₹${expectedTotal} with GST`);
assert(propWithGst.proposal.advanceAmount === expectedTotal, `Advance required is ₹${expectedTotal} with GST`);



// --- 4. WhatsApp Hinglish Pitch Constraint (Strictly <= 6 lines) ---
console.log("\n4. WhatsApp Hinglish Pitch (<= 6 Lines Guardrail)");

const whatsappDraft = propNoGst.pitches.whatsappHinglish;
const lineCheck = validateWhatsAppLineCount(whatsappDraft);

assert(lineCheck.valid === true, `WhatsApp draft strictly complies with <= 6 lines (Got: ${lineCheck.lineCount} lines)`);
assert(lineCheck.lineCount <= 6, "Line count is <= 6");
assert(whatsappDraft.includes("Shlok from Yugantar Growth"), "Includes founder identity (Shlok from Yugantar Growth)");
assert(whatsappDraft.includes("Ahmedabad"), "Anchors local credibility in Ahmedabad");
assert(whatsappDraft.toLowerCase().includes("roadmap"), "Includes low-friction roadmap conversation ask");

// --- 5. 1-Page Printable A4 Layout & Yugantar Brand Palette ---
console.log("\n5. 1-Page Printable A4 HTML & Yugantar Brand Palette");

const a4Html = propNoGst.printHtml;

assert(a4Html.includes("@page {"), "Print stylesheet contains @page directive");
assert(a4Html.includes("size: A4 portrait"), "Explicitly specifies A4 portrait geometry");
assert(a4Html.includes("margin: 10mm"), "Specifies tight 10mm print margin to fit 1 page");
assert(a4Html.includes(YUGANTAR_THEME.orange), "Uses Yugantar electric orange palette token (#e8520a)");
assert(a4Html.includes(YUGANTAR_THEME.black), "Uses Yugantar deep black palette token (#080808)");
assert(a4Html.includes(YUGANTAR_THEME.cream), "Uses Yugantar warm cream palette token (#f7f5f0)");
const expectedVpa = getUpiVpa();
assert(a4Html.includes(expectedVpa), `Includes instant UPI payment gateway (${expectedVpa})`);
const customVpaProposal = composeProposal(researchedLead, { gstRate: 0, upiVpa: "custom-billing@okhdfcbank" });
assert(customVpaProposal.printHtml.includes("custom-billing@okhdfcbank"), "Supports dynamic custom UPI VPA override in proposal");
assert(a4Html.includes("Advance Gate:"), "Includes clear advance payment gate statement");
assert(a4Html.includes("ev-ssl-101") || a4Html.includes("Ref:"), "Contains discrete evidence ID provenance citations");

console.log(`\n=== PHASE 3 SUITE COMPLETE: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}

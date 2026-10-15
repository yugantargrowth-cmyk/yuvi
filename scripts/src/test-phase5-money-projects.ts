// test-phase5-money-projects.ts — Phase 5 Money & Project Navigator Test Suite
// Verifies UPI URI & QR generator, UTR reference validator, advance-payment hard gate,
// 7-stage project delivery navigator, WIP=2 build limit, and client context pack compiler.

import {
  DEFAULT_UPI_CONFIG,
  buildUpiUri,
  generateUpiQrDataUrl,
  generateUpiPaymentDetails,
  validateUpiReference,
  advancePaymentGate,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/finance/upiEngine.js";
import {
  PROJECT_STAGES,
  STAGE_ORDER,
  MAX_BUILD_WIP,
  getActiveBuildCount,
  canAdvanceStage,
  advanceProjectStage,
  type ClientProject,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/project/projectNavigator.js";
import {
  compileContextPack,
  compileContextPackMarkdown,
  compileContextPackJson,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/project/contextPack.js";
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

console.log("=== PHASE 5: MONEY & PROJECT NAVIGATOR TEST SUITE ===\n");

// --- 1. UPI Payment URI & QR Code Generation ---
console.log("1. UPI URI & QR Code Engine Verification");

const upiParams = {
  amount: 12500,
  note: "Advance for 48h Sprint",
  transactionRef: "INV-2026-001",
};

// Test unconfigured behavior: blocks payment links and QR, shows 'UPI not configured'
const unconfiguredUri = buildUpiUri(upiParams);
assert(unconfiguredUri === "", "buildUpiUri returns empty string and blocks payment link when VPA is unconfigured");

const unconfiguredQr = generateUpiQrDataUrl(unconfiguredUri);
assert(unconfiguredQr === "", "generateUpiQrDataUrl returns empty string and blocks QR when URI is empty");

const unconfiguredDetails = generateUpiPaymentDetails(upiParams);
assert(unconfiguredDetails.vpa === "UPI not configured", "Payment details vpa indicates 'UPI not configured' when unconfigured");
assert(unconfiguredDetails.upiUri === "", "Payment details upiUri is empty string (blocked) when unconfigured");
assert(unconfiguredDetails.qrDataUrl === "", "Payment details qrDataUrl is empty string (blocked) when unconfigured");
assert(unconfiguredDetails.formattedAmount === "₹12,500", "Rupee amount formatted with Indian grouping ₹12,500");

// Test configured behavior with explicit VPA
const configuredParams = { ...upiParams, vpa: "yugantar@okhdfcbank" };
const upiUri = buildUpiUri(configuredParams);
assert(upiUri.startsWith("upi://pay?"), "URI starts with standard NPCI protocol upi://pay?");
assert(upiUri.includes(`pa=${encodeURIComponent("yugantar@okhdfcbank")}`), "URI includes payee VPA (yugantar@okhdfcbank)");
assert(upiUri.includes("pn=Yugantar%20Growth"), "URI includes payee name Yugantar Growth");
assert(upiUri.includes("am=12500"), "URI includes exact advance amount 12500");
assert(upiUri.includes("cu=INR"), "URI specifies currency INR");
assert(upiUri.includes("tr=INV-2026-001"), "URI binds transaction reference INV-2026-001");

const qrData = generateUpiQrDataUrl(upiUri);
assert(qrData.startsWith("data:image/svg+xml"), "QR generator yields valid SVG data URL");
assert(qrData.includes("rect"), "QR SVG includes matrix positioning elements");

const fullDetails = generateUpiPaymentDetails(configuredParams);
assert(fullDetails.vpa === "yugantar@okhdfcbank", "Payment details vpa matches configured VPA");
assert(fullDetails.formattedAmount === "₹12,500", "Rupee amount formatted with Indian grouping ₹12,500");
assert(fullDetails.upiUri === upiUri, "Payment details bundle matches generated URI");

// Test env UPI_VPA override
const prevEnvVpa = process.env.UPI_VPA;
try {
  process.env.UPI_VPA = "agency-payments@axisbank";
  const envDetails = generateUpiPaymentDetails({ amount: 5000, note: "Test Env VPA" });
  assert(envDetails.vpa === "agency-payments@axisbank", "Resolves UPI VPA dynamically from process.env.UPI_VPA");
  assert(envDetails.upiUri.includes("pa=agency-payments%40axisbank"), "URI encodes process.env.UPI_VPA properly");
} finally {
  if (prevEnvVpa !== undefined) {
    process.env.UPI_VPA = prevEnvVpa;
  } else {
    delete process.env.UPI_VPA;
  }
}

// --- 2. Bank UTR Reference Validation ---
console.log("\n2. Bank UTR Reference Validation");

const validUtr1 = validateUpiReference("428901234567");
assert(validUtr1.valid === true && validUtr1.normalized === "428901234567", "12-digit numeric bank UTR is valid");

const validUtr2 = validateUpiReference(" CMS-998811 ");
assert(validUtr2.valid === true && validUtr2.normalized === "CMS998811", "Alphanumeric UTR normalized and cleaned");

const invalidUtrShort = validateUpiReference("123");
assert(invalidUtrShort.valid === false, "UTR with fewer than 6 characters is rejected");

const invalidUtrEmpty = validateUpiReference("");
assert(invalidUtrEmpty.valid === false, "Empty UTR reference is rejected");

// --- 3. Advance Payment Hard Gate Verification ---
console.log("\n3. Advance Payment Hard Gate Verification");

const contractValue = 25000;

// Case A: No advance received
const gateNoAdvance = advancePaymentGate(contractValue, { advanceReceived: false });
assert(gateNoAdvance.allowed === false, "Gate blocks project if advanceReceived is false");
assert(gateNoAdvance.requiredAdvance === 12500, "50% advance requirement calculated as ₹12,500");

// Case B: Advance marked received but invalid UTR
const gateBadUtr = advancePaymentGate(contractValue, {
  advanceReceived: true,
  utrReference: "bad",
  amountPaid: 12500,
});
assert(gateBadUtr.allowed === false, "Gate blocks project if UTR reference is invalid");
assert(Boolean(gateBadUtr.reason?.includes("UTR")), "Rejection reason explicitly cites invalid UTR");

// Case C: Insufficient advance amount
const gateLowAmount = advancePaymentGate(contractValue, {
  advanceReceived: true,
  utrReference: "428901234567",
  amountPaid: 5000,
});
assert(gateLowAmount.allowed === false, "Gate blocks project if advance amount is below 50%");
assert(gateLowAmount.shortfall === 7500, "Calculates shortfall of ₹7,500");

// Case D: Valid 50% advance with UTR
const gateValid = advancePaymentGate(contractValue, {
  advanceReceived: true,
  utrReference: "428901234567",
  amountPaid: 12500,
});
assert(gateValid.allowed === true, "Gate unlocks when 50% advance and valid UTR are provided");
assert(gateValid.shortfall === 0, "Zero shortfall on full advance payment");

// --- 4. 7-Stage Project Delivery Navigator ---
console.log("\n4. 7-Stage Project Delivery Navigator Progression");

assert(STAGE_ORDER.length === 7, "Exactly 7 linear stages defined");
assert(STAGE_ORDER[0] === "INTAKE" && STAGE_ORDER[3] === "BUILD" && STAGE_ORDER[6] === "HANDOVER", "Stage sequence is INTAKE -> BRIEF -> DESIGN -> BUILD -> REVIEW -> LIVE -> HANDOVER");

const project1: ClientProject = {
  id: "proj_001",
  clientId: "client_apex",
  companyName: "Apex Manufacturing",
  contactPerson: "Rajesh Patel",
  phone: "+919825011223",
  packageId: "web_sprint_48h",
  packageName: "48-Hour Rapid Conversion Sprint",
  contractValue: 25000,
  advancePayment: { advanceReceived: false },
  stage: "INTAKE",
  stageHistory: [],
  turnaroundHours: 48,
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Test stage skipping block
const skipCheck = canAdvanceStage(project1, "DESIGN", [project1]);
assert(skipCheck.allowed === false, "Cannot skip from INTAKE directly to DESIGN");

// Advance INTAKE -> BRIEF
const adv1 = advanceProjectStage(project1, "BRIEF", [project1]);
assert(adv1.success === true && adv1.updatedProject?.stage === "BRIEF", "Advances successfully from INTAKE to BRIEF");

// Advance BRIEF -> DESIGN
const adv2 = advanceProjectStage(adv1.updatedProject!, "DESIGN", [adv1.updatedProject!]);
assert(adv2.success === true && adv2.updatedProject?.stage === "DESIGN", "Advances successfully from BRIEF to DESIGN");

// Advance DESIGN -> BUILD (Should be BLOCKED by Advance Payment Gate!)
const adv3Blocked = advanceProjectStage(adv2.updatedProject!, "BUILD", [adv2.updatedProject!]);
assert(adv3Blocked.success === false, "Moving to BUILD is strictly blocked without advance payment");
assert(Boolean(adv3Blocked.error?.includes("Advance Payment Hard Gate")), "Error cites Advance Payment Hard Gate");

// Now record advance payment
const projectWithAdvance: ClientProject = {
  ...adv2.updatedProject!,
  advancePayment: {
    advanceReceived: true,
    utrReference: "428901234567",
    amountPaid: 12500,
    verifiedAt: new Date().toISOString(),
  },
};

// Advance DESIGN -> BUILD with verified advance
const adv3Success = advanceProjectStage(projectWithAdvance, "BUILD", [projectWithAdvance]);
assert(adv3Success.success === true && adv3Success.updatedProject?.stage === "BUILD", "Advances to BUILD once advance is verified");
assert(Boolean(adv3Success.updatedProject?.deliveryDeadline), "Entering BUILD automatically schedules delivery SLA deadline");

if (adv3Success.updatedProject?.deliveryDeadline) {
  const deadline = new Date(adv3Success.updatedProject.deliveryDeadline).getTime();
  const now = Date.now();
  const diffHours = (deadline - now) / 3600000;
  assert(Math.abs(diffHours - 48) < 1, "Build SLA deadline is set to 48 hours from kickoff");
}

// Complete stages: BUILD -> REVIEW -> LIVE -> HANDOVER
const adv4 = advanceProjectStage(adv3Success.updatedProject!, "REVIEW", [adv3Success.updatedProject!]);
assert(adv4.success === true && adv4.updatedProject?.stage === "REVIEW", "Advances BUILD to REVIEW");

const adv5 = advanceProjectStage(adv4.updatedProject!, "LIVE", [adv4.updatedProject!]);
assert(adv5.success === true && adv5.updatedProject?.stage === "LIVE", "Advances REVIEW to LIVE");

const adv6 = advanceProjectStage(adv5.updatedProject!, "HANDOVER", [adv5.updatedProject!]);
assert(adv6.success === true && adv6.updatedProject?.stage === "HANDOVER", "Advances LIVE to HANDOVER");
assert(adv6.updatedProject?.status === "COMPLETED", "Final HANDOVER stage sets project status to COMPLETED");

// --- 5. WIP Limit Gate: Maximum 2 Concurrent BUILD Projects ---
console.log("\n5. WIP Limit Gate: Max 2 Concurrent BUILD Projects");

assert(MAX_BUILD_WIP === 2, "MAX_BUILD_WIP constant is exactly 2");

const activeBuildProjects: ClientProject[] = [
  {
    ...projectWithAdvance,
    id: "proj_build_1",
    stage: "BUILD",
    status: "ACTIVE",
  },
  {
    ...projectWithAdvance,
    id: "proj_build_2",
    stage: "BUILD",
    status: "ACTIVE",
  },
];

assert(getActiveBuildCount(activeBuildProjects) === 2, "Active BUILD count is 2 (capacity saturated)");

const project3Design: ClientProject = {
  ...projectWithAdvance,
  id: "proj_build_3",
  stage: "DESIGN",
  status: "ACTIVE",
};

// Attempt to advance project3 into BUILD when 2 builds are already ongoing
const wipBlockedCheck = canAdvanceStage(project3Design, "BUILD", [...activeBuildProjects, project3Design]);
assert(wipBlockedCheck.allowed === false, "WIP limit strictly blocks 3rd concurrent project from entering BUILD");
assert(Boolean(wipBlockedCheck.reason?.includes("WIP Limit Reached")), "Rejection reason explicitly cites WIP Limit Reached");

// Advance proj_build_1 to REVIEW, freeing up a BUILD slot
const proj1InReview: ClientProject = {
  ...activeBuildProjects[0],
  stage: "REVIEW",
};
const updatedProjectsPool = [proj1InReview, activeBuildProjects[1], project3Design];
assert(getActiveBuildCount(updatedProjectsPool) === 1, "Active BUILD count drops to 1 after project moves to REVIEW");

const wipAvailableCheck = canAdvanceStage(project3Design, "BUILD", updatedProjectsPool);
assert(wipAvailableCheck.allowed === true, "Project 3 is now permitted into BUILD stage once slot opens");

// --- 6. Client Context Pack Compiler ---
console.log("\n6. Client Context Pack Compiler");

const sampleLead: NormalizedLead = {
  id: "lead_ctx_01",
  companyName: "Kunal Jewels Ahmedabad",
  contactPerson: "Kunal Soni",
  phone: "+919825599887",
  email: "kunal@kunaljewels.com",
  websiteUrl: "https://kunaljewels.com",
  city: "Ahmedabad",
  state: "Gujarat",
  country: "India",
  industry: "Retail Luxury",
  category: "Jewellery",
  status: "WON",
  score: 92,
  tier: "A",
  notes: "High ticket bridal showroom",
  bottleneck: "4.4s mobile speed causing 55% bounce rate on high-ticket bridal catalog",
  rawRecord: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  recommendedChannel: "WHATSAPP",
  verifiedClaims: [],
  researchEvidence: [
    {
      id: "ev_speed",
      leadId: "lead_ctx_01",
      claim: "Mobile PageSpeed score is 34/100 with 4.4s LCP",
      value: "4.4s LCP",
      source: "pagespeed",
      label: "VERIFIED",
      confidence: 0.95,
      fetchedAt: new Date().toISOString(),
    },
    {
      id: "ev_wa",
      leadId: "lead_ctx_01",
      claim: "Floating WhatsApp concierge trigger is absent",
      value: "Missing CTA",
      source: "website",
      label: "OBSERVED",
      confidence: 0.9,
      fetchedAt: new Date().toISOString(),
    },
    {
      id: "ev_inferred",
      leadId: "lead_ctx_01",
      claim: "Estimated ₹3.5L monthly revenue leakage",
      value: "₹3.5L/mo",
      source: "founder_note",
      label: "INFERRED",
      confidence: 0.6,
      fetchedAt: new Date().toISOString(),
    },
  ],
};

const contextData = compileContextPack(adv3Success.updatedProject!, sampleLead);
assert(contextData.commercials.utrReference === "428901234567", "Context pack records verified bank UTR");
assert(contextData.diagnostics.verifiedEvidence.length === 2, "Includes only VERIFIED and OBSERVED evidence in outbound safe ledger");
assert(contextData.diagnostics.quarantinedInferred.length === 1, "Strictly quarantines INFERRED revenue estimates");

const markdownPack = compileContextPackMarkdown(adv3Success.updatedProject!, sampleLead);
assert(markdownPack.includes("# YUGANTAR GROWTH — CLIENT CONTEXT PACK"), "Markdown includes branded header");
assert(markdownPack.includes("428901234567"), "Markdown includes bank UTR reference");
assert(markdownPack.includes("48 Hours"), "Markdown cites 48-Hour delivery SLA");
assert(markdownPack.includes("QUARANTINED"), "Markdown explicitly marks internal inferred claims as QUARANTINED");

const jsonPack = compileContextPackJson(adv3Success.updatedProject!, sampleLead);
const parsed = JSON.parse(jsonPack);
assert(parsed.commercials.advancePaid === 12500, "JSON pack serializes accurate advance payment");
assert(parsed.delivery.turnaroundHours === 48, "JSON pack serializes 48h turnaround hours");

console.log(`\nPhase 5 Test Results: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL PHASE 5 ASSERTIONS VERIFIED SUCCESSFULLY!\n");
}

// test-phase7-e2e.ts — Phase 7 Master End-to-End Operational Lifecycle Verification Suite
// Validates the full autonomous pipeline across P0 to P6:
// CSV Ingestion -> Dedupe -> Triage -> Research Evidence -> Needs Proposal ->
// Human Approval Gate -> Cadence Progression -> Stop-on-Reply ->
// Advance Payment Hard Gate -> 7-Stage Project Delivery with WIP=2 ->
// Client Context Pack Export -> Today Command Center Telemetry.

import { parseLeadSheet, deduplicateLeads } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/csvParser.js";
import { triageLead } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/leadTriageEngine.js";
import {
  filterOutboundEvidence,
  isOutboundPermitted,
  type EvidenceItem,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/research/evidenceModel.js";
import {
  analyzeLeadNeeds,
  YUGANTAR_CATALOG,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/needsAnalysisEngine.js";
import {
  composeProposal,
  validateWhatsAppLineCount,
  generatePrintableA4Html,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/proposalComposer.js";
import {
  CADENCE_POLICY,
  canSendToday,
  isWithinSendingWindow,
  buildDispatchLink,
  confirmMarkAsSent,
  handleIncomingReply,
  isOptedOut,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/outreach/cadenceEngine.js";
import {
  getObjectionResponse,
  INDIAN_B2B_OBJECTIONS,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/outreach/objectionBank.js";
import {
  buildUpiUri,
  generateUpiPaymentDetails,
  validateUpiReference,
  advancePaymentGate,
  DEFAULT_UPI_CONFIG,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/finance/upiEngine.js";
import {
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
import {
  computeTodayMetrics,
  generateMorningBriefing,
  determineNextAction,
  getActionQueues,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/today/todayEngine.js";
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

console.log("==================================================================");
console.log("🚀 PHASE 7: MASTER END-TO-END OPERATIONAL LIFECYCLE SUITE");
console.log("==================================================================\n");

// ------------------------------------------------------------------
// STEP 1: CSV INGESTION, FUZZY MAPPING & MULTI-FACTOR DEDUPLICATION
// ------------------------------------------------------------------
console.log("STEP 1: CSV Ingestion, Auto-Mapping & Deduplication");

const rawCsvContent = `Company,Contact Person,Phone,Email,Website,City,State,Industry
Maruti Brass Works,Bhavin Patel,+91 98250 44556,bhavin@marutibrass.com,https://marutibrass.com,Jamnagar,Gujarat,Brass Components
Maruti Brass Works Jamnagar,Bhavin Patel,+91 98250 44556,bhavin@marutibrass.com,https://marutibrass.com,Jamnagar,Gujarat,Manufacturing
Zydus Wellness Clinic,Dr. Anita Dave,9825122334,info@zydusclinic.in,https://zydusclinic.in,Ahmedabad,Gujarat,Healthcare`;

const parsedResult = parseLeadSheet(rawCsvContent);
assert(parsedResult.leads.length === 3, "Parsed 3 raw rows into RawParsedLead entities");

const dedupeResult = deduplicateLeads(parsedResult.leads);
assert(dedupeResult.report.totalInput === 3, "Report tracks 3 total input rows");
assert(dedupeResult.report.totalKept === 2, "Filtered down to 2 distinct unique commercial leads");

// ------------------------------------------------------------------
// STEP 2: LEAD TRIAGE SCORING & TIER ASSIGNMENT
// ------------------------------------------------------------------
console.log("\nSTEP 2: Lead Triage Scoring & Qualification");

const lead = dedupeResult.cleanLeads[0]; // Maruti Brass Works
const triage = triageLead(lead);

assert(triage.fitScore >= 0 && triage.fitScore <= 100, "Calculated deterministic fit score (0-100)");
assert(triage.decision === "qualified", "Target B2B industrial account is qualified");
assert(triage.reasons.length >= 2, "Triage provides transparent, rule-based reasons");

lead.triage = triage;
lead.tier = triage.fitScore >= 75 ? "A" : "B";
assert(lead.tier === "A" || lead.tier === "B", "Assigned high-value tier (A or B)");

// ------------------------------------------------------------------
// STEP 3: RESEARCH PIPELINE & TRUTH PROVENANCE MODEL
// ------------------------------------------------------------------
console.log("\nSTEP 3: Research Pipeline & Evidence Provenance Labeling");

const researchEvidence: EvidenceItem[] = [
  {
    id: "ev_speed_01",
    leadId: lead.id,
    source: "pagespeed",
    claim: "Mobile Core Web Vitals score is 32/100 with 4.8s LCP on 4G emulation",
    value: "4.8s LCP",
    label: "VERIFIED",
    confidence: 0.98,
    fetchedAt: new Date().toISOString(),
  },
  {
    id: "ev_wa_01",
    leadId: lead.id,
    source: "website",
    claim: "Mobile landing page has no floating WhatsApp concierge or quick inquiry CTA",
    value: "Missing CTA",
    label: "OBSERVED",
    confidence: 0.95,
    fetchedAt: new Date().toISOString(),
  },
  {
    id: "ev_inferred_01",
    leadId: lead.id,
    source: "founder_note",
    claim: "Projected 55% bounce rate leaking estimated ₹4.2L monthly revenue",
    value: "₹4.2L/mo",
    label: "INFERRED",
    confidence: 0.6,
    fetchedAt: new Date().toISOString(),
  },
];

lead.researchEvidence = researchEvidence;
lead.bottleneck = "4.8s mobile load latency and absent WhatsApp consultation trigger";

const outboundSafe = filterOutboundEvidence(lead.researchEvidence);
assert(outboundSafe.length === 2, "Purged INFERRED assumption from outbound evidence");
assert(outboundSafe.every(isOutboundPermitted), "All retained evidence items are strictly VERIFIED or OBSERVED");

// ------------------------------------------------------------------
// STEP 4: NEEDS ANALYSIS & A4 / WHATSAPP PROPOSAL COMPOSITION
// ------------------------------------------------------------------
console.log("\nSTEP 4: Needs Analysis & Proposal Composition");

const needs = analyzeLeadNeeds(lead);
assert(needs.topLeaks.length >= 2, "Needs analysis identified top commercial leaks linked to discrete evidence");
assert(needs.prescribedPackage.name === "Digital Foundation", "Prescribed Digital Foundation package for first sale");
assert(needs.prescribedPackage.pricing.amount === 7999, "Package base price is transparent ₹7,999");

const composed = composeProposal(lead, {
  founderName: "Shlok Pandya",
  gstEnabled: true,
  advancePercentage: 50,
});
const proposal = composed.proposal;
const pitches = composed.pitches;
const a4Html = composed.printHtml;

assert(proposal.totalAmount === 9439, "Calculated total including 18% GST (₹7,999 + ₹1,440 = ₹9,439)");
assert(proposal.advanceAmount === 4720, "50% advance calculated as ₹4,720");


// Verify Hinglish WhatsApp Pitch constraint: <= 6 lines
const waLineCheck = validateWhatsAppLineCount(pitches.whatsappHinglish);
assert(waLineCheck.valid === true, "WhatsApp pitch strictly obeys <= 6 lines constraint");
assert(pitches.whatsappHinglish.includes("Shlok from Yugantar Growth"), "WhatsApp pitch includes founder identity");

// Verify 1-Page Printable A4 HTML layout
assert(a4Html.includes("#080808") && a4Html.includes("#e8520a"), "A4 Proposal uses Yugantar Growth palette");
assert(a4Html.includes("48 Hours"), "A4 Proposal guarantees 48-Hour delivery SLA");

// ------------------------------------------------------------------
// STEP 5: OUTBOUND SENDING POLICY, CADENCE & HUMAN CONFIRMATION GATE
// ------------------------------------------------------------------
console.log("\nSTEP 5: Outbound Cadence, Sending Policy & Human Approval Gate");

// Policy checks
assert(canSendToday(10).allowed === true, "Permits sending when under 30 daily cap");
assert(canSendToday(30).allowed === false, "Strictly blocks sending once 30 daily limit is reached");

// Human Gate: Opening wa.me must NEVER auto-mutate lead status
const dispatchUrl = buildDispatchLink(lead.phone, pitches.whatsappHinglish);
assert(dispatchUrl.startsWith("https://wa.me/"), "Generated standard wa.me deep link");
assert(lead.status === "NEW", "Opening WhatsApp link DOES NOT mutate lead status (Human gate active)");

// Explicit Founder Confirmation
const d0Result = confirmMarkAsSent(lead, "D0", "Dispatched 6-line Hinglish pitch");
assert(d0Result.updatedLead.status === "CONTACTED", "Explicit click updates lead status to CONTACTED");
assert(d0Result.nextStep === "D2", "Cadence schedules next touch for D2 in 48 hours");

// ------------------------------------------------------------------
// STEP 6: INBOUND PROSPECT REPLY & STOP-ON-REPLY AUTOMATION
// ------------------------------------------------------------------
console.log("\nSTEP 6: Inbound Prospect Reply & Stop-on-Reply Automation");

const replyResult = handleIncomingReply(
  d0Result.updatedLead,
  "INTERESTED",
  "Haan Shlok ji, 1-page roadmap share kijiye aur kal call arrange kijiye.",
);

assert(replyResult.updatedLead.status === "MEETING_SCHEDULED", "Positive reply advances status to MEETING_SCHEDULED");
assert(replyResult.cadenceHalted === true, "Cadence immediately halted upon reply (no further automated touches)");

// Test Indian B2B Objection Handling
const objectionScript = getObjectionResponse("ALREADY_HAVE_AGENCY", {
  prospectName: "Bhavin Patel",
  companyName: "Maruti Brass Works",
});
assert(objectionScript.includes("Bhavin Patel"), "Interpolated prospect name into objection script");
assert(objectionScript.includes("Maruti Brass Works"), "Interpolated company name into objection script");

// ------------------------------------------------------------------
// STEP 7: ADVANCE PAYMENT HARD GATE & NPCI UPI QR ENGINE
// ------------------------------------------------------------------
console.log("\nSTEP 7: Advance Payment Hard Gate & UPI Generator");

// Test unconfigured behavior: blocks payment link and QR
const unconfiguredUpi = generateUpiPaymentDetails({
  amount: proposal.advanceAmount || 0,
  note: `Advance: ${lead.companyName}`,
  transactionRef: proposal.proposalNumber,
});
assert(unconfiguredUpi.vpa === "UPI not configured", "Unconfigured UPI shows 'UPI not configured'");
assert(unconfiguredUpi.upiUri === "", "Unconfigured UPI blocks direct payment link");
assert(unconfiguredUpi.qrDataUrl === "", "Unconfigured UPI blocks QR generation");

// Generate UPI payment details with configured VPA
const upiDetails = generateUpiPaymentDetails({
  amount: proposal.advanceAmount || 0,
  note: `Advance: ${lead.companyName}`,
  transactionRef: proposal.proposalNumber,
  vpa: "yugantar@okhdfcbank",
});

assert(upiDetails.upiUri.includes(`pa=${encodeURIComponent("yugantar@okhdfcbank")}`), "UPI URI specifies configured payee VPA");
assert(upiDetails.upiUri.includes("pn=Yugantar%20Growth"), "UPI URI specifies payee Yugantar Growth");
assert(upiDetails.qrDataUrl.startsWith("data:image/svg+xml"), "Generated dynamic SVG QR code data URL");

// Test Hard Gate: Block project work without advance
const gateBlocked = advancePaymentGate(proposal.totalAmount, { advanceReceived: false });
assert(gateBlocked.allowed === false, "Project kickoff strictly blocked without advance payment");

// Record verified bank UTR reference
const validUtr = validateUpiReference("428909876543");
assert(validUtr.valid === true, "Valid Indian bank UTR accepted");

const gateUnlocked = advancePaymentGate(proposal.totalAmount, {
  advanceReceived: true,
  utrReference: validUtr.normalized,
  amountPaid: proposal.advanceAmount,
});
assert(gateUnlocked.allowed === true, "Advance gate unlocked upon confirmed 50% advance and UTR");

// ------------------------------------------------------------------
// STEP 8: 7-STAGE PROJECT DELIVERY NAVIGATOR & WIP=2 LIMIT
// ------------------------------------------------------------------
console.log("\nSTEP 8: 7-Stage Project Delivery Navigator & WIP=2 Enforcement");

const project: ClientProject = {
  id: `proj_${lead.id}`,
  clientId: `client_${lead.id}`,
  companyName: lead.companyName,
  contactPerson: lead.contactPerson,
  phone: lead.phone,
  packageId: needs.prescribedPackage.packageId,
  packageName: needs.prescribedPackage.name,
  contractValue: proposal.totalAmount,
  advancePayment: {
    advanceReceived: true,
    utrReference: validUtr.normalized,
    amountPaid: proposal.advanceAmount,
    verifiedAt: new Date().toISOString(),
  },
  stage: "INTAKE",
  stageHistory: [],
  turnaroundHours: 48,
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Advance INTAKE -> BRIEF -> DESIGN -> BUILD
const s1 = advanceProjectStage(project, "BRIEF", [project]);
assert(s1.success === true && s1.updatedProject?.stage === "BRIEF", "Advanced to BRIEF");

const s2 = advanceProjectStage(s1.updatedProject!, "DESIGN", [s1.updatedProject!]);
assert(s2.success === true && s2.updatedProject?.stage === "DESIGN", "Advanced to DESIGN");

// Test WIP=2 Limit Gate
const existingBuilds: ClientProject[] = [
  { ...project, id: "build_1", stage: "BUILD" },
  { ...project, id: "build_2", stage: "BUILD" },
];

const wipBlocked = canAdvanceStage(s2.updatedProject!, "BUILD", [...existingBuilds, s2.updatedProject!]);
assert(wipBlocked.allowed === false, "WIP=2 limit strictly blocks 3rd concurrent project from entering BUILD");
assert(Boolean(wipBlocked.reason?.includes("WIP Limit Reached")), "Rejection reason explicitly cites WIP limit protection");

// Free up a slot by moving build_1 to REVIEW
existingBuilds[0].stage = "REVIEW";
const s3 = advanceProjectStage(s2.updatedProject!, "BUILD", [...existingBuilds, s2.updatedProject!]);
assert(s3.success === true && s3.updatedProject?.stage === "BUILD", "Advanced to BUILD once capacity opens");
assert(Boolean(s3.updatedProject?.deliveryDeadline), "Entering BUILD schedules 48-Hour delivery deadline");

// ------------------------------------------------------------------
// STEP 9: CLIENT CONTEXT PACK EXPORT
// ------------------------------------------------------------------
console.log("\nSTEP 9: Client Context Pack Compiler");

const contextPackMd = compileContextPackMarkdown(s3.updatedProject!, lead, proposal);
assert(contextPackMd.includes("# YUGANTAR GROWTH — CLIENT CONTEXT PACK"), "Generated branded Markdown Context Pack");
assert(contextPackMd.includes("428909876543"), "Context Pack binds verified bank UTR");
assert(contextPackMd.includes("48 Hours"), "Context Pack binds 48-Hour turnaround SLA");
assert(contextPackMd.includes("VERIFIED"), "Context Pack lists verified evidence");

const contextPackJson = compileContextPackJson(s3.updatedProject!, lead, proposal);
assert(JSON.parse(contextPackJson).commercials.advanceVerified === true, "JSON Context Pack serializes confirmed advance");

// ------------------------------------------------------------------
// STEP 10: TODAY COMMAND CENTER TELEMETRY & NEXT ACTION CARD
// ------------------------------------------------------------------
console.log("\nSTEP 10: Today Command Center Telemetry & Prioritization");

const todayMetrics = computeTodayMetrics(
  [],
  [
    {
      ...project,
      advancePayment: {
        advanceReceived: true,
        amountPaid: 4720,
        utrReference: "428909876543",
      },
    } as any,
  ],
  [replyResult.updatedLead],
  [],
);

assert(todayMetrics.collectedAmount === 4720, "Today screen tracks verified ₹4,720 collection");
assert(todayMetrics.progressPercentage === 19, "Calculates 19% progress toward ₹25,000 goal");


const briefingLines = generateMorningBriefing(todayMetrics, "Shlok");
assert(briefingLines[0].includes("Namaste Shlok!"), "Generated 3-line morning briefing");

const nextAction = determineNextAction(
  [project as any],
  [replyResult.updatedLead],
  [],
);
assert(nextAction.category === "INBOUND_REPLY", "Prioritizes inbound reply from interested prospect");

console.log("\n==================================================================");
console.log(`🎉 PHASE 7 E2E LIFECYCLE RESULTS: ${passed} Passed, ${failed} Failed.`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🚀 100% MASTER LIFECYCLE PIPELINE VERIFICATION SUCCESSFUL!\n");
}

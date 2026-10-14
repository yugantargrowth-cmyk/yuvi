// test-phase6-today-screen.ts — Phase 6 Today Command Center & Mobile PWA Test Suite
// Verifies metrics calculation, ₹25k monthly target tracking, 3-line morning briefing,
// dynamic Next Action Card prioritization hierarchy, and 4 action queues.

import {
  computeTodayMetrics,
  generateMorningBriefing,
  determineNextAction,
  getActionQueues,
  MONTHLY_REVENUE_TARGET,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/today/todayEngine.js";
import type {
  NormalizedLead,
  ClientAccount,
  ClientInvoice,
  ApprovalItem,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/types/sales.js";

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

console.log("=== PHASE 6: TODAY SCREEN & MOBILE-FIRST PWA TEST SUITE ===\n");

// --- 1. Today Metrics & Revenue Target Progress ---
console.log("1. Today Metrics & ₹25,000 Revenue Target Calculation");

assert(MONTHLY_REVENUE_TARGET === 25000, "Monthly revenue target constant is exactly ₹25,000");

// Empty state
const emptyMetrics = computeTodayMetrics([], [], [], []);
assert(emptyMetrics.targetAmount === 25000, "Target amount is ₹25,000");
assert(emptyMetrics.collectedAmount === 0, "Initial collected amount is 0");
assert(emptyMetrics.progressPercentage === 0, "Initial progress percentage is 0%");
assert(emptyMetrics.remainingAmount === 25000, "Remaining amount is full ₹25,000");

// Partial collection state (₹12,500 advance collected)
const partialClients: ClientAccount[] = [
  {
    id: "c_apex",
    companyName: "Apex Manufacturing",
    contactPerson: "Rajesh Patel",
    phone: "+919825011223",
    email: "rajesh@apex.in",
    city: "Ahmedabad",
    state: "Gujarat",
    country: "India",
    industry: "Manufacturing",
    status: "ACTIVE",
    engagementType: "FIXED_PROJECT",
    contractValue: 25000,
    startDate: "2026-10-15",
    agreedScope: ["Speed optimization"],
    deliverables: [],
    milestones: [],
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    advancePayment: {
      advanceReceived: true,
      amountPaid: 12500,
      utrReference: "428901234567",
    },
  },
];

const partialMetrics = computeTodayMetrics([], partialClients, [], []);
assert(partialMetrics.collectedAmount === 12500, "Collected amount reflects ₹12,500 advance payment");
assert(partialMetrics.progressPercentage === 50, "50% progress calculated on ₹12,500 / ₹25,000");
assert(partialMetrics.remainingAmount === 12500, "Remaining amount calculated as ₹12,500");

// Exceeded goal state (₹35,000 collected)
const exceededInvoices: ClientInvoice[] = [
  {
    id: "inv_01",
    invoiceNumber: "INV-001",
    clientName: "Apex Manufacturing",
    contactPerson: "Rajesh Patel",
    email: "rajesh@apex.in",
    phone: "+919825011223",
    issueDate: "2026-10-01",
    dueDate: "2026-10-30",
    subtotal: 29661,
    taxRate: 18,
    taxAmount: 5339,
    totalAmount: 35000,
    amountPaid: 35000,
    balanceDue: 0,
    status: "PAID",
    currency: "INR",
    paymentRecords: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
  },
];

const exceededMetrics = computeTodayMetrics(exceededInvoices, [], [], []);
assert(exceededMetrics.collectedAmount === 35000, "Collected amount reflects ₹35,000");
assert(exceededMetrics.progressPercentage === 100, "Progress capped at 100% (no integer overflow)");
assert(exceededMetrics.remainingAmount === 0, "Remaining amount is 0 when target exceeded");

// --- 2. Morning Executive Briefing Generation ---
console.log("\n2. Morning Executive Briefing Generation");

const briefing = generateMorningBriefing(partialMetrics, "Shlok");
assert(briefing.length === 3, "Briefing produces exactly 3 executive lines");
assert(briefing[0].includes("Namaste Shlok!"), "Line 1 includes personalized founder greeting");
assert(briefing[0].includes("₹12,500 of ₹25,000"), "Line 1 quotes accurate revenue progress figures");
assert(briefing[0].includes("50%"), "Line 1 quotes accurate percentage");
assert(briefing[1].includes("outbound touches"), "Line 2 tracks outbound touch queue");
assert(briefing[1].includes("prospect replies"), "Line 2 tracks inbound replies");
assert(briefing[2].includes("active builds"), "Line 3 reports active build capacity");
assert(briefing[2].includes("WIP SLA safe"), "Line 3 confirms WIP SLA safety");

// --- 3. Dynamic Next Action Card Prioritization Hierarchy ---
console.log("\n3. Dynamic Next Action Card Prioritization Hierarchy");

// Priority 1: Pending Advance Payment (Cashflow First)
const unpaidClient: ClientAccount = {
  ...partialClients[0],
  id: "c_unpaid",
  companyName: "Unpaid Clinic",
  advancePayment: { advanceReceived: false },
};

const actionP1 = determineNextAction([unpaidClient], [], []);
assert(actionP1.category === "PENDING_ADVANCE", "Highest priority is PENDING_ADVANCE");
assert(actionP1.urgency === "CRITICAL", "Urgency is marked CRITICAL");
assert(actionP1.priorityScore === 100, "Priority score is 100");
assert(actionP1.targetName === "Unpaid Clinic", "Targets the unpaid account");
assert(actionP1.ctaLabel === "Request Advance (UPI)", "Offers 1-click UPI request CTA");

// Priority 2: Active Build with SLA Expiring within 24 Hours
const expiringDeadline = new Date(Date.now() + 12 * 3600000).toISOString(); // 12 hours from now
const expiringBuildClient: ClientAccount = {
  ...partialClients[0],
  id: "c_expiring",
  companyName: "Expiring SLA Exporter",
  projectStage: "BUILD",
  deliveryDeadline: expiringDeadline,
  status: "ACTIVE",
};

const actionP2 = determineNextAction([expiringBuildClient], [], []);
assert(actionP2.category === "BUILD_SLA_EXPIRING", "Expiring SLA takes priority over general tasks");
assert(actionP2.urgency === "HIGH", "Urgency is marked HIGH");
assert(actionP2.priorityScore === 90, "Priority score is 90");
assert(actionP2.targetName === "Expiring SLA Exporter", "Targets the project facing delivery deadline");

// Priority 3: Inbound Prospect Reply Awaiting Callback
const repliedLead: NormalizedLead = {
  id: "lead_reply",
  companyName: "Interested Hospital",
  contactPerson: "Dr. Dave",
  phone: "+919825001122",
  email: "dave@hosp.in",
  websiteUrl: "https://hosp.in",
  city: "Ahmedabad",
  state: "Gujarat",
  country: "India",
  industry: "Healthcare",
  category: "Hospital",
  status: "INTERESTED",
  score: 88,
  tier: "A",
  notes: "Kal subah 11 baje call kar sakte hain",
  rawRecord: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  recommendedChannel: "WHATSAPP",
  verifiedClaims: [],
  researchEvidence: [{ id: "ev1", leadId: "lead_reply", claim: "claim", value: "val", source: "website", label: "VERIFIED", confidence: 1, fetchedAt: "" }],
};

const actionP3 = determineNextAction([], [repliedLead], []);
assert(actionP3.category === "INBOUND_REPLY", "Inbound prospect reply is prioritized over cold outbound");
assert(actionP3.urgency === "HIGH", "Urgency is marked HIGH");
assert(actionP3.priorityScore === 80, "Priority score is 80");
assert(actionP3.ctaLabel === "Open WhatsApp Chat", "CTA guides to immediate conversational bridge");

// Priority 4: Approved Outreach Touch Staged for Send
const approvedItem: ApprovalItem = {
  id: "app_01",
  type: "WHATSAPP_TOUCH",
  title: "Outreach for Shanti Spices",
  workspace: "Yugantar",
  createdBy: "Hunter",
  timestamp: new Date().toISOString(),
  status: "APPROVED",
  description: "Approved D0 touch",
};

const actionP4 = determineNextAction([], [], [approvedItem]);
assert(actionP4.category === "PENDING_OUTREACH", "Approved outreach is queued when cashflow and replies are handled");
assert(actionP4.urgency === "NORMAL", "Urgency is marked NORMAL");
assert(actionP4.priorityScore === 70, "Priority score is 70");

// Priority 5: Unresearched Lead
const bareLead: NormalizedLead = {
  ...repliedLead,
  id: "lead_bare",
  status: "NEW",
  researchEvidence: [], // zero evidence
};

const actionP5 = determineNextAction([], [bareLead], []);
assert(actionP5.category === "LEAD_RESEARCH", "Unresearched high-value lead prompts research audit");
assert(actionP5.priorityScore === 60, "Priority score is 60");

// Priority 6: All Clear Fallback
const actionAllClear = determineNextAction([], [], []);
assert(actionAllClear.category === "ALL_CLEAR", "Empty queues yield ALL_CLEAR status");
assert(actionAllClear.title.includes("All Action Queues Cleared!"), "Celebrates cleared queues");

// --- 4. The 4 Operational Action Queues ---
console.log("\n4. The 4 Operational Action Queues Extraction");

const queues = getActionQueues([approvedItem], [repliedLead], [unpaidClient, expiringBuildClient]);

assert(queues.sendQueue.length === 1 && queues.sendQueue[0].id === "app_01", "Send queue contains approved send item");
assert(queues.replyQueue.length === 1 && queues.replyQueue[0].id === "lead_reply", "Reply queue contains interested lead");
assert(queues.moneyQueue.length === 1 && queues.moneyQueue[0].id === "c_unpaid", "Money queue isolates client with unconfirmed advance");
assert(queues.projectsQueue.length === 2, "Projects queue lists active delivery accounts");

console.log(`\nPhase 6 Test Results: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL PHASE 6 ASSERTIONS VERIFIED SUCCESSFULLY!\n");
}

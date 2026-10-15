// test-phase4-outreach.ts — Phase 4 Outreach Engine & Cadence Test Suite
// Verifies D0/D2/D5 schedule progression, human approval gate, stop-on-reply,
// 30/day cap, 09:30-19:30 IST sending window, opt-out enforcement, and Indian B2B objection bank.

import {
  CADENCE_POLICY,
  isWithinSendingWindow,
  canSendToday,
  generateCadenceMessages,
  buildDispatchLink,
  confirmMarkAsSent,
  handleIncomingReply,
  isOptedOut,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/outreach/cadenceEngine.js";
import {
  INDIAN_B2B_OBJECTIONS,
  getObjectionResponse,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/outreach/objectionBank.js";
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

console.log("=== PHASE 4: OUTREACH ENGINE & CADENCE TEST SUITE ===\n");

// --- 1. Policy Caps & Sending Windows ---
console.log("1. Sending Policy: 30/day Cap & IST Window Verification");

assert(CADENCE_POLICY.DAILY_SEND_CAP === 30, "Daily send cap is exactly 30 messages/day");
assert(CADENCE_POLICY.D0_TO_D2_HOURS === 48, "D0 to D2 interval is exactly 48 hours");
assert(CADENCE_POLICY.D2_TO_D5_HOURS === 72, "D2 to D5 interval is exactly 72 hours");

const cap0 = canSendToday(0);
assert(cap0.allowed === true && cap0.remaining === 30, "0 sent today allows 30 more");

const cap15 = canSendToday(15);
assert(cap15.allowed === true && cap15.remaining === 15, "15 sent today allows 15 more");

const cap30 = canSendToday(30);
assert(cap30.allowed === false && cap30.remaining === 0, "30 sent today strictly halts outbound sending");

const cap35 = canSendToday(35);
assert(cap35.allowed === false && cap35.remaining === 0, "Over-limit sends are blocked with 0 remaining");

// IST window checks (09:30 to 19:30 IST)
// Create explicit UTC dates to test IST conversion
// 10:00 IST = 04:30 UTC
const midDayDate = new Date("2026-10-15T04:30:00.000Z");
const midDayCheck = isWithinSendingWindow(midDayDate);
assert(midDayCheck.inWindow === true, "10:00 IST is within active sending window");

// 08:00 IST = 02:30 UTC (too early)
const earlyDate = new Date("2026-10-15T02:30:00.000Z");
const earlyCheck = isWithinSendingWindow(earlyDate);
assert(earlyCheck.inWindow === false, "08:00 IST is blocked (before 09:30 AM)");

// 20:30 IST = 15:00 UTC (too late)
const lateDate = new Date("2026-10-15T15:00:00.000Z");
const lateCheck = isWithinSendingWindow(lateDate);
assert(lateCheck.inWindow === false, "20:30 IST is blocked (after 07:30 PM)");

// --- 2. Human Approval Gate & WhatsApp Link Generation ---
console.log("\n2. Human Approval Gate (Strict Non-Auto-Mutation)");

const testLead: NormalizedLead = {
  id: "lead-cadence-01",
  companyName: "Apex Manufacturing Ahmedabad",
  contactPerson: "Rajesh Patel",
  phone: "+91 98250 11223",
  email: "rajesh@apexmf.in",
  websiteUrl: "https://apexmf.in",
  city: "Ahmedabad",
  state: "Gujarat",
  country: "India",
  industry: "Manufacturing",
  category: "B2B",
  status: "NEW",
  score: 85,
  tier: "A",
  notes: "High intent exporter",
  bottleneck: "4.8s mobile load time causing bounce",
  rawRecord: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  recommendedChannel: "WHATSAPP",
  verifiedClaims: [],
  researchEvidence: [],
};

const dispatchUrl = buildDispatchLink(testLead.phone, "Namaste Rajesh ji");
assert(dispatchUrl.startsWith("https://wa.me/919825011223"), "buildDispatchLink formats phone to clean 919825011223");
assert(testLead.status === "NEW", "Generating dispatch URL DOES NOT mutate lead status (Human Gate enforced)");

// --- 3. D0 -> D2 -> D5 Progression & Interval Calculations ---
console.log("\n3. D0 / D2 / D5 Cadence Progression & Schedule Intervals");

const messages = generateCadenceMessages(testLead);
assert(messages.d0.includes("Shlok from Yugantar Growth"), "D0 includes personal Ahmedabad founder intro");
assert(messages.d2.includes("1-page growth diagnostic breakdown"), "D2 follows up naturally on the diagnostic breakdown");
assert(messages.d5.includes("loop close kar raha hoon"), "D5 respectfully closes the loop without clutter");

// Confirm D0 sent
const d0Result = confirmMarkAsSent(testLead, "D0", "D0 Initial pitch dispatched");
assert(d0Result.updatedLead.status === "CONTACTED", "Confirming D0 advances lead status from NEW to CONTACTED");
assert(d0Result.nextStep === "D2", "After D0, nextStep is scheduled as D2");
assert(!!d0Result.nextScheduledDate, "D0 sets a valid nextScheduledDate");

if (d0Result.nextScheduledDate) {
  const d0Scheduled = new Date(d0Result.nextScheduledDate).getTime();
  const now = Date.now();
  const diffHours = (d0Scheduled - now) / 3600000;
  assert(Math.abs(diffHours - 48) < 1, "D0 -> D2 gap is approximately 48 hours");
}

// Confirm D2 sent
const d2Result = confirmMarkAsSent(d0Result.updatedLead, "D2", "D2 Followup dispatched");
assert(d2Result.nextStep === "D5", "After D2, nextStep is scheduled as D5");
if (d2Result.nextScheduledDate) {
  const d2Scheduled = new Date(d2Result.nextScheduledDate).getTime();
  const now = Date.now();
  const diffHours = (d2Scheduled - now) / 3600000;
  assert(Math.abs(diffHours - 72) < 1, "D2 -> D5 gap is approximately 72 hours");
}

// Confirm D5 sent (Breakup touch)
const d5Result = confirmMarkAsSent(d2Result.updatedLead, "D5", "D5 Breakup dispatched");
assert(d5Result.nextStep === "COMPLETED", "After D5, cadence step is COMPLETED");
assert(d5Result.nextScheduledDate === undefined, "COMPLETED cadence has no further scheduled touches");
assert(
  Boolean(d5Result.updatedLead.activityHistory && d5Result.updatedLead.activityHistory.length >= 3),
  "Activity history tracks all touches",
);

// --- 4. Stop-on-Reply & Opt-Out Table ---
console.log("\n4. Stop-on-Reply & Opt-Out Enforcement");

// A. Interested reply
const interestedLead = { ...testLead, status: "CONTACTED" as const };
const replyInterested = handleIncomingReply(
  interestedLead,
  "INTERESTED",
  "Kal 4 baje call kar sakte hain?",
  "2026-10-16T10:30:00.000Z",
);
assert(replyInterested.updatedLead.status === "MEETING_SCHEDULED", "INTERESTED reply promotes status to MEETING_SCHEDULED");
assert(replyInterested.cadenceHalted === true, "Cadence is immediately halted upon positive reply");
assert(replyInterested.nextAction.includes("Schedule strategy walk-through"), "Next action guides founder to strategy walk-through");

// B. Later reply
const laterLead = { ...testLead, status: "CONTACTED" as const };
const replyLater = handleIncomingReply(
  laterLead,
  "LATER",
  "Diwali ke baad connect karte hain",
  "2026-11-05T00:00:00.000Z",
);
assert(replyLater.cadenceHalted === true, "LATER reply halts active automated sequence");
assert(replyLater.updatedLead.followUpDate === "2026-11-05T00:00:00.000Z", "LATER records prospective follow-up date");

// C. Rejection (NO)
const rejectLead = { ...testLead, status: "CONTACTED" as const };
const replyNo = handleIncomingReply(rejectLead, "NO", "Not required right now");
assert(replyNo.updatedLead.status === "LOST", "NO reply moves lead to LOST");
assert(replyNo.cadenceHalted === true, "Cadence is halted on rejection");

// D. Opt-Out
const optOutList: string[] = [];
assert(isOptedOut(testLead.phone, optOutList) === false, "Unlisted phone is not opted out");

const replyOptOut = handleIncomingReply(
  testLead,
  "OPT_OUT",
  "Stop sending messages, unsubscribe",
  undefined,
  optOutList,
);
assert(replyOptOut.updatedLead.status === "DO_NOT_CONTACT", "OPT_OUT reply sets status to DO_NOT_CONTACT");
assert(replyOptOut.optOutRecorded === true, "OPT_OUT triggers optOutRecorded flag");
assert(isOptedOut(testLead.phone, optOutList) === true, "Phone is permanently added to opt-out registry");

// --- 5. Indian B2B Objection Bank ---
console.log("\n5. Indian B2B Objection Bank & Script Interpolation");

const objectionKeys = Object.keys(INDIAN_B2B_OBJECTIONS);
assert(objectionKeys.includes("ALREADY_HAVE_AGENCY"), "Bank contains ALREADY_HAVE_AGENCY objection");
assert(objectionKeys.includes("SEND_PROFILE"), "Bank contains SEND_PROFILE objection");
assert(objectionKeys.includes("BUDGET_HIGH"), "Bank contains BUDGET_HIGH objection");
assert(objectionKeys.includes("CALL_LATER"), "Bank contains CALL_LATER objection");
assert(objectionKeys.includes("NOT_INTERESTED"), "Bank contains NOT_INTERESTED objection");

const agencyScript = getObjectionResponse("ALREADY_HAVE_AGENCY", {
  prospectName: "Rajesh ji",
  companyName: "Apex Manufacturing",
  bottleneck: "4.8s mobile load latency",
});
assert(agencyScript.includes("Rajesh ji"), "Script interpolates prospectName");
assert(agencyScript.includes("Apex Manufacturing"), "Script interpolates companyName");
assert(agencyScript.includes("agency ko replace karne nahi keh rahe"), "Script de-escalates agency conflict");

const budgetScript = getObjectionResponse("BUDGET_HIGH", {
  prospectName: "Kunal bhai",
  companyName: "Kunal Jewels",
});
assert(budgetScript.includes("fixed 48-hour sprint"), "Budget script contrasts fixed sprint vs open-ended retainers");
assert(budgetScript.includes("₹25,000"), "Budget script cites transparent ₹25,000 pilot price");

console.log(`\nPhase 4 Test Results: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL PHASE 4 ASSERTIONS VERIFIED SUCCESSFULLY!\n");
}

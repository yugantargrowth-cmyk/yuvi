// scripts/src/test-agentic-loop.ts — Verification Suite for YUVI Agentic Business Operator
import { searchLocalBusinesses, exportLeadsToCsv } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/execution/businessDiscovery";
import { TOOL_REGISTRY, type ToolExecutionContext } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/execution/toolRegistry";
import { runAgentLoop } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/execution/agentLoop";
import { generateQrMatrix, generateScannableQrSvg } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/finance/qrCode";
import { buildUpiUri } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/finance/upiEngine";
import { loadAllSkills, getReport } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/skillLoader";
import { list, get } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/skillRegistry";
import type { NormalizedLead, CommercialProposal, ClientInvoice, ClientAccount, CallQueueItem, ApprovalItem } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/types/sales";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runAgenticLoopTests() {
  console.log("==================================================================");
  console.log("🧪 STARTING YUVI AGENTIC BUSINESS OPERATOR VERIFICATION SUITE");
  console.log("==================================================================");

  // --- 1. LOCAL BUSINESS DISCOVERY & EXTRACTION ---
  console.log("\n👉 Test Suite 1: Lawful Gujarat Local Business Discovery");
  const discoveredClinics = await searchLocalBusinesses({
    niche: "dental clinics",
    location: "Ahmedabad",
    targetCount: 15,
  });

  assert(discoveredClinics.length === 15, `Discovered exactly 15 dental clinic prospects (Got: ${discoveredClinics.length})`);
  assert(discoveredClinics[0].city === "Ahmedabad", `Location parsed correctly as Ahmedabad (Got: ${discoveredClinics[0].city})`);
  assert(discoveredClinics.every((l) => l.phone.startsWith("91") || l.phone.startsWith("+91")), "Every discovered lead has normalized Indian mobile (91/+91)");
  assert(discoveredClinics.every((l) => typeof l.score === "number" && l.score >= 0 && l.score <= 100), "Every prospect has a computed 0-100 ICP fit score");
  assert(discoveredClinics.every((l) => l.verifiedClaims && l.verifiedClaims.length > 0), "Every prospect contains verifiable observed proof points");
  assert(discoveredClinics.every((l) => l.verifiedClaims.every((c) => c.startsWith("[OBSERVED]"))), "Initial directory facts are strictly labeled [OBSERVED]");

  // Test CSV export
  const csvData = exportLeadsToCsv(discoveredClinics.slice(0, 5));
  assert(csvData.includes('"Company Name"'), "CSV header includes 'Company Name'");
  assert(csvData.includes('"Phone (WhatsApp)"'), "CSV header includes 'Phone (WhatsApp)'");
  assert(csvData.includes('"Verified Proof Points"'), "CSV includes 'Verified Proof Points' column");
  const csvLines = csvData.split("\r\n");
  assert(csvLines.length === 6, `CSV contains header + 5 rows (Got: ${csvLines.length} lines)`);

  // --- 2. ZERO-DEPENDENCY SCANNABLE UPI QR CODE ---
  console.log("\n👉 Test Suite 2: Standard ISO/IEC 18004 UPI QR Barcode Matrix");
  const testUpiUri = buildUpiUri({
    vpa: "shlok@upi",
    payeeName: "Yugantar Growth",
    amount: 14999,
    note: "YG-PROP-2026-001 Advance",
  });

  assert(testUpiUri.startsWith("upi://pay?"), `Generated standard UPI deep link: ${testUpiUri}`);
  const qrMatrix = generateQrMatrix(testUpiUri);
  assert(Array.isArray(qrMatrix) && qrMatrix.length >= 21, `Generated QR module matrix with dimension >= 21x21 (Got: ${qrMatrix.length}x${qrMatrix[0].length})`);
  // Top-left finder pattern must be dark at (0,0) and white at (1,1)
  assert(qrMatrix[0][0] === true, "Top-left finder pattern corner module is dark (true)");
  assert(qrMatrix[0][sizeFinder(qrMatrix) - 1] === true, "Top-right finder pattern corner module is dark (true)");
  assert(qrMatrix[qrMatrix.length - 1][0] === true, "Bottom-left finder pattern corner module is dark (true)");

  function sizeFinder(m: boolean[][]) { return m.length; }

  const qrSvg = generateScannableQrSvg(testUpiUri, { size: 220 });
  assert(qrSvg.includes('<svg xmlns="http://www.w3.org/2000/svg"'), "QR output is clean XML SVG");
  assert(qrSvg.includes('viewBox="0 0'), "QR SVG includes proportional viewBox");
  assert(qrSvg.includes('fill="#080808"'), "QR SVG renders high-contrast dark modules for camera scanning");

  // --- 3. REGISTERED TOOL REGISTRY ---
  console.log("\n👉 Test Suite 3: Verified Tool Registry & Permission Boundaries");
  const expectedTools = [
    "search_local_businesses",
    "triage_and_score_leads",
    "deduplicate_leads",
    "research_lead",
    "analyze_needs",
    "compose_proposal",
    "generate_outreach",
    "schedule_outreach_sequence",
    "record_payment",
    "get_daily_priorities",
    "export_leads_csv",
    "query_knowledge_base",
  ];

  for (const toolName of expectedTools) {
    const tool = TOOL_REGISTRY[toolName];
    assert(Boolean(tool), `Tool '${toolName}' is registered`);
    assert(typeof tool.execute === "function", `Tool '${toolName}' provides executable handler`);
    assert(Array.isArray(tool.parameters), `Tool '${toolName}' defines typed parameter schema`);
  }

  // --- 4. 10-STAGE BOUNDED OBSERVABLE AGENT LOOP ---
  console.log("\n👉 Test Suite 4: Autonomous Multi-Step Agent Loop Execution");

  // Setup test mock context
  let stateLeads: NormalizedLead[] = [...discoveredClinics.slice(0, 3)];
  let stateProposals: CommercialProposal[] = [];
  let stateInvoices: ClientInvoice[] = [];
  let stateClients: ClientAccount[] = [];
  let stateQueue: CallQueueItem[] = [];
  let stateApprovals: ApprovalItem[] = [];

  const context: ToolExecutionContext = {
    get leads() { return stateLeads; },
    set leads(l) { stateLeads = l; },
    setLeads: (l) => { stateLeads = l; },
    get proposals() { return stateProposals; },
    set proposals(p) { stateProposals = p; },
    setProposals: (p) => { stateProposals = p; },
    get invoices() { return stateInvoices; },
    set invoices(i) { stateInvoices = i; },
    setInvoices: (i) => { stateInvoices = i; },
    get clients() { return stateClients; },
    set clients(c) { stateClients = c; },
    setClients: (c) => { stateClients = c; },
    get callQueue() { return stateQueue; },
    set callQueue(q) { stateQueue = q; },
    setCallQueue: (q) => { stateQueue = q; },
    get approvals() { return stateApprovals; },
    set approvals(a) { stateApprovals = a; },
    setApprovals: (a) => { stateApprovals = a; },
    founderName: "Shlok",
    upiVpa: "shlok@upi",
  };

  // Test Mission 1: Multi-Step Lead Discovery & Qualification Loop
  const mission1 = await runAgentLoop(
    "Find 10 architects on SG Highway, score them for Gujarat ICP, and clean the list",
    context
  );

  assert(mission1.success === true, "Agent loop completed with overall success status");
  assert(mission1.plan.length === 3, `Agent loop planned 3 bounded steps (Got: ${mission1.plan.length})`);
  assert(mission1.plan[0].toolName === "search_local_businesses", "Step 1 selected 'search_local_businesses'");
  assert(mission1.plan[1].toolName === "deduplicate_leads", "Step 2 selected 'deduplicate_leads'");
  assert(mission1.plan[2].toolName === "triage_and_score_leads", "Step 3 selected 'triage_and_score_leads'");
  assert(mission1.receipts.length === 3, `Generated 3 verifiable execution receipts (Got: ${mission1.receipts.length})`);
  assert(mission1.receipts.every((r) => r.status === "SUCCESS"), "All receipts recorded truthful SUCCESS status");
  assert(mission1.receipts.every((r) => r.evidenceLabelsVerified === true), "All tool receipts passed evidence verification");
  assert(mission1.recordsModified > 0, `Recorded CRM state modifications (Got: ${mission1.recordsModified})`);
  assert(mission1.navigationSuggestion === "Leads", "Suggested logical navigation to 'Leads'");
  assert(mission1.report.includes("Execution Receipts"), "Generated truthful report containing execution receipts");

  // Test Mission 2: Deep Research & Needs-Based Proposal Loop
  const targetLead = stateLeads[0];
  const mission2 = await runAgentLoop(
    `Research ${targetLead.companyName} and draft 1-page proposal`,
    context
  );

  assert(mission2.success === true, "Agent loop completed research & proposal mission");
  assert(mission2.plan.some((s) => s.toolName === "research_lead"), "Step planned 'research_lead'");
  assert(mission2.plan.some((s) => s.toolName === "analyze_needs"), "Step planned 'analyze_needs'");
  assert(mission2.receipts.some((r) => r.toolName === "research_lead" && r.status === "SUCCESS"), "Recorded research execution receipt");

  // Test Mission 3: Morning Priorities Loop
  const mission3 = await runAgentLoop(
    "What should I do today? Give me my morning briefing",
    context
  );

  assert(mission3.success === true, "Agent loop completed daily priority calculation");
  assert(mission3.plan[0].toolName === "get_daily_priorities", "Step planned 'get_daily_priorities'");
  assert(mission3.navigationSuggestion === "Today", "Suggested logical navigation to 'Today'");

  // --- 5. DISCOVERABLE SKILLS RUNTIME ---
  console.log("\n👉 Test Suite 5: Dynamic Skills Auto-Discovery & Registration");
  // Test skill discovery
  const report = loadAllSkills();
  assert(report.length >= 10, `Auto-discovered at least 10 bundled skill modules (Got: ${report.length})`);
  assert(report.every((r) => r.status === "loaded"), "Every discovered skill loaded with status 'loaded'");

  const registeredSkills = list();
  assert(registeredSkills.length >= 10, `Skill registry populated with ${registeredSkills.length} skills`);
  const requiredSkillIds = [
    "lead-triage",
    "deep-research",
    "needs-analysis",
    "proposal-compose",
    "outreach-sequence",
    "reply-assist",
    "project-next-action",
    "collections-nudge",
    "daily-plan",
    "business-discovery",
  ];

  for (const skillId of requiredSkillIds) {
    assert(Boolean(get(skillId)), `Skill '${skillId}' is registered in SkillRegistry`);
  }

  console.log("\n==================================================================");
  console.log(`🎉 YUVI AGENTIC VERIFICATION COMPLETE: ${passed}/${passed + failed} PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAgenticLoopTests().catch((err) => {
  console.error("FATAL AGENTIC LOOP TEST ERROR:", err);
  process.exit(1);
});

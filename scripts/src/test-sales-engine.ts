/**
 * Comprehensive Validation & E2E Test Suite for YUVI OS Daily Sales Engine
 * Covers:
 *  1. CSV Parser & Fuzzy Header Detection (parseLeadSheet)
 *  2. Data Normalization (Phone, URL, TitleCase)
 *  3. Gujarat B2B Scoring & Tier Qualification (A/B/C/D)
 *  4. 3-Part Personalized Outreach Generation (WhatsApp, Email, SMS/DM)
 *  5. Prioritized Call Queue Generation with tel: Links & Talking Points
 *  6. End-to-End Pipeline Execution (runDailySalesEngine) with Dedup & Metrics
 *  7. Human Approval Gate for Consequential Hunter & Operator Actions
 *  8. Daily Intent Router (All 10 Daily Commands)
 *  9. Activepieces Bridge & Reusable Employee Task Contracts
 */

import { parseLeadSheet } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/csvParser.ts";
import {
  normalizePhone,
  normalizeWebsite,
  toTitleCase,
  generateDeterministicLeadId,
  scoreAndQualifyLead,
  generateOutreachDrafts,
  buildCallQueueItem,
  runDailySalesEngine,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/salesEngine.ts";
import {
  createEmployeeTask,
  EMPLOYEES,
  isConsequentialAction,
  appendTaskLog,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/execution/taskSystem.ts";
import { dispatchTaskViaBridge } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/execution/activepiecesBridge.ts";
import { detectDailyIntent, handleDailyCommand } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/intentRouter.ts";

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? "- " + details : ""}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTestSuite() {
  console.log("==================================================================");
  console.log("🧪 STARTING YUVI OS SALES ENGINE COMPREHENSIVE TEST SUITE");
  console.log("==================================================================\n");

  // -------------------------------------------------------------------------
  // TEST SUITE 1: CSV Parser & Header Resolution
  // -------------------------------------------------------------------------
  console.log("👉 Test Suite 1: CSV Parser & Column Validation");
  {
    const validCsv = `Company Name,Contact Person,Phone Number,Email Address,City,Category,Notes
Patel Pharma Ltd,Rajesh Patel,+91 98250 11223,rajesh@patelpharma.com,Ahmedabad,Industrial,Expansion to Naroda
Surat Diamond Tech,Priya Shah,0261 2548900,priya@suratdiamond.co,Surat,Jewelry,High ticket
Baroda Chemicals,Kiran Mehta,9898012345,kiran@barodachem.in,Vadodara,Manufacturer,Large setup`;

    const parsed = parseLeadSheet(validCsv);
    assert(parsed.success === true, "Successfully parses valid CSV sheet");
    assert(parsed.leads.length === 3, "Parses 3 valid rows from CSV");
    assert(parsed.leads[0].companyName === "Patel Pharma Ltd", "Extracts company name properly");
    assert(parsed.leads[0].contactPerson === "Rajesh Patel", "Extracts contact name properly");
    assert(parsed.leads[0].city === "Ahmedabad", "Extracts city properly");

    // Test with fuzzy/alternative headers
    const fuzzyCsv = `Organization,Decision Maker,Mobile,Business Email,Location,Sector
Zydus Vendor Sol,Amit Dave,9824055555,amit@zydusvendor.com,Ahmedabad,Healthcare`;
    const fuzzyParsed = parseLeadSheet(fuzzyCsv);
    assert(fuzzyParsed.success === true, "Parses CSV with fuzzy alternative headers");
    assert(fuzzyParsed.leads.length === 1, "Resolves fuzzy headers to single lead");
    assert(fuzzyParsed.leads[0].companyName === "Zydus Vendor Sol", "Resolved Organization header to companyName");
    assert(fuzzyParsed.leads[0].phone === "9824055555", "Resolved Mobile header to phone");

    // Test empty sheet
    const emptyParsed = parseLeadSheet("");
    assert(emptyParsed.success === false, "Fails gracefully for empty sheet");
    assert(emptyParsed.errors.length > 0, "Returns descriptive error for empty content");
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 2: Data Normalization
  // -------------------------------------------------------------------------
  console.log("\n👉 Test Suite 2: Data Normalization");
  {
    assert(normalizePhone("+91 98250-12345") === "+919825012345", "Normalizes +91 formatted phone with dashes and spaces");
    assert(normalizePhone("09825012345") === "+919825012345", "Normalizes 11-digit leading-zero Indian phone");
    assert(normalizePhone("9825012345") === "+919825012345", "Normalizes 10-digit raw Indian mobile to +91");
    assert(normalizePhone("919825012345") === "+919825012345", "Normalizes 12-digit 91 prefix to +91");

    assert(normalizeWebsite("example.com") === "https://example.com", "Normalizes bare domain to https URL");
    assert(normalizeWebsite("http://mycompany.co.in/") === "http://mycompany.co.in", "Preserves http and strips trailing slash");
    assert(normalizeWebsite("") === "", "Handles empty website gracefully");

    assert(toTitleCase("AHMEDABAD INDUSTRIAL GEARS") === "Ahmedabad Industrial Gears", "Converts uppercase to Title Case");
    assert(toTitleCase("shlok   pandya") === "Shlok Pandya", "Cleans multiple spaces in names");
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 3: Deterministic Idempotency & Gujarat Scoring
  // -------------------------------------------------------------------------
  console.log("\n👉 Test Suite 3: Deterministic ID & Gujarat B2B Scoring");
  {
    const id1 = generateDeterministicLeadId("Gujarat Gears Ltd", "+919825088888");
    const id2 = generateDeterministicLeadId("Gujarat Gears Ltd", "+919825088888");
    assert(id1 === id2, "Generates deterministic identical lead IDs for identical data");

    // Tier A Lead (Ahmedabad + Phone + Email + Web + Commercial Niche)
    const tierAScore = scoreAndQualifyLead({
      companyName: "Adani Solar Ancillary",
      city: "Ahmedabad",
      state: "Gujarat",
      phone: "+919825011111",
      email: "contact@adanisolar.com",
      websiteUrl: "https://adanisolar.com",
      category: "Industrial Manufacturer",
    });
    assert(tierAScore.tier === "A", `Adani Solar classified as Tier A (Actual: ${tierAScore.tier})`);
    assert(tierAScore.score >= 80, `Tier A score >= 80 (Actual: ${tierAScore.score})`);
    assert(tierAScore.primaryService.length > 5, "Derives strategic growth service");
    assert(tierAScore.bottleneck.length > 5, "Derives specific commercial bottleneck");

    // Tier D Lead (No contact signals, non-Gujarat)
    const tierDScore = scoreAndQualifyLead({
      companyName: "Remote Freelancer",
      city: "Nowhere",
      state: "Unknown",
      phone: "",
      email: "",
      websiteUrl: "",
      category: "Personal",
    });
    assert(tierDScore.tier === "D", `Uncontactable entity placed in Tier D (Actual: ${tierDScore.tier})`);
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 4: 3-Part Outreach Generation & Call Queue Creation
  // -------------------------------------------------------------------------
  console.log("\n👉 Test Suite 4: Outreach Generation & Prioritized Call Queue");
  {
    const mockLead = {
      id: "lead_test_123",
      companyName: "Surat Diamond Lab",
      contactPerson: "Priya Shah",
      phone: "+919825099999",
      email: "priya@suratdiamond.co",
      websiteUrl: "https://suratdiamond.co",
      city: "Surat",
      state: "Gujarat",
      country: "India",
      industry: "Luxury Jewelry",
      category: "Luxury",
      status: "NEW" as const,
      score: 85,
      tier: "A" as const,
      notes: "High value retail showroom",
      rawRecord: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bottleneck: "Local competitor saturation",
      strategicRationale: "High local buying power",
      primaryService: "Outbound Pipeline Architecture",
      recommendedService: "Outbound Pipeline Architecture",
      recommendedChannel: "WHATSAPP" as const,
      verifiedClaims: ["Verified business presence"],
      approvalToken: "appv_token_123",
      approvalStatus: "PENDING_APPROVAL" as const,
      nextAction: { type: "Call", dueDate: "2026-10-06", notes: "Conduct first call" },
    };

    const drafts = generateOutreachDrafts(mockLead);
    assert(drafts.whatsapp.includes("Priya"), "WhatsApp draft personalized with first name Priya");
    assert(drafts.whatsapp.includes("Surat Diamond Lab"), "WhatsApp draft references company name");
    assert(drafts.whatsapp.includes("Yugantar Growth"), "WhatsApp mentions Yugantar Growth agency signature");
    assert(drafts.email.subject.includes("Surat Diamond Lab"), "Email subject mentions company");
    assert(drafts.sms.length > 20, "SMS concise draft generated");

    const callItem = buildCallQueueItem(mockLead);
    assert(callItem.clickToCallUrl === "tel:+919825099999", "Builds tel: click-to-call link");
    assert(callItem.priority === "URGENT", "Tier A lead receives URGENT call priority");
    assert(callItem.talkingPoints.length >= 4, "Generates comprehensive talking points");
    assert(callItem.callStatus === "PENDING", "Initial call status is PENDING");
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 5: Full End-to-End Pipeline Execution (runDailySalesEngine)
  // -------------------------------------------------------------------------
  console.log("\n👉 Test Suite 5: Full End-to-End Sales Engine Execution");
  {
    const rawLeadsInput = [
      {
        companyName: "Ahmedabad Automation Ltd",
        contactPerson: "Nilesh Dave",
        phone: "+91 98250 33445",
        email: "nilesh@ahmedabadauto.in",
        websiteUrl: "ahmedabadauto.in",
        city: "Ahmedabad",
        state: "Gujarat",
        country: "India",
        industry: "Industrial Automation",
        category: "Industrial",
        notes: "Looking to scale outside Gujarat",
        rawRecord: {},
      },
      {
        companyName: "Baroda Solar Components",
        contactPerson: "Sneha Parikh",
        phone: "098250 77889",
        email: "sneha@barodasolar.com",
        websiteUrl: "barodasolar.com",
        city: "Vadodara",
        state: "Gujarat",
        country: "India",
        industry: "Renewable Energy",
        category: "Manufacturer",
        notes: "GIDC cluster",
        rawRecord: {},
      },
      // Intentional duplicate of Ahmedabad Automation
      {
        companyName: "Ahmedabad Automation Ltd",
        contactPerson: "Nilesh Dave",
        phone: "9825033445",
        email: "nilesh@ahmedabadauto.in",
        websiteUrl: "https://ahmedabadauto.in",
        city: "Ahmedabad",
        state: "Gujarat",
        country: "India",
        industry: "Industrial Automation",
        category: "Industrial",
        notes: "Duplicate row in sheet",
        rawRecord: {},
      },
      // Low quality / incomplete lead
      {
        companyName: "Anonymous Store",
        contactPerson: "",
        phone: "",
        email: "",
        websiteUrl: "",
        city: "Remote",
        state: "",
        country: "",
        industry: "",
        category: "",
        notes: "",
        rawRecord: {},
      },
    ];

    const engineResult = await runDailySalesEngine(rawLeadsInput, []);

    assert(engineResult.processedLeads.length === 3, "Processes exactly 3 unique leads (filtered 1 duplicate)");
    assert(engineResult.duplicateCount === 1, "Detects and counts 1 duplicate");
    assert(engineResult.callQueue.length >= 2, "Generates prioritized call queue for leads with phones");
    assert(engineResult.dashboardMetrics.totalLeads === 3, "Metrics show total 3 leads");
    assert(engineResult.dashboardMetrics.qualifiedLeads >= 2, "Identified at least 2 qualified leads (Tier A/B)");
    assert(engineResult.dashboardMetrics.outreachDue >= 2, "Staged outreach drafts in approval gate");
    assert(engineResult.report.urgentCalls.length >= 1, "Report highlights urgent calls for the morning");
    assert(engineResult.report.executiveSummary.includes("Sales Engine sprint processed"), "Generates executive summary");
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 6: Consequential Action Safety Gate (Hunter & Consequential Gating)
  // -------------------------------------------------------------------------
  console.log("\n👉 Test Suite 6: Consequential Action Safety Gate");
  {
    // Low risk: Scout extracting data, drafting outreach, scoring
    assert(isConsequentialAction("scout", "clean_data") === false, "Scout data cleaning is safe to auto-run");
    assert(isConsequentialAction("scout", "score_leads") === false, "Scout scoring is safe to auto-run");
    assert(isConsequentialAction("hunter", "generate_outreach_draft") === false, "Hunter drafting is safe to auto-run");
    assert(isConsequentialAction("analyst", "calculate_metrics") === false, "Analyst reporting is safe to auto-run");

    // High risk: Hunter sending messages externally, Operator bulk deletions
    assert(isConsequentialAction("hunter", "send_whatsapp_message") === true, "Hunter send_whatsapp_message is CONSEQUENTIAL (requires approval)");
    assert(isConsequentialAction("hunter", "send_email") === true, "Hunter send_email is CONSEQUENTIAL (requires approval)");
    assert(isConsequentialAction("hunter", "send_sms") === true, "Hunter send_sms is CONSEQUENTIAL (requires approval)");
    assert(isConsequentialAction("operator", "bulk_delete_records") === true, "Operator bulk delete is CONSEQUENTIAL (requires approval)");
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 7: Daily Intent Router (All 10 Daily Commands)
  // -------------------------------------------------------------------------
  console.log("\n👉 Test Suite 7: Daily Command & Intent Router");
  {
    const commandsToTest = [
      { text: "Work on my leads today", expectedIntent: "RUN_SALES_ENGINE" },
      { text: "Give me todays calls", expectedIntent: "GET_TODAYS_CALLS" },
      { text: "Prepare todays outreach", expectedIntent: "PREPARE_OUTREACH" },
      { text: "Follow up with yesterdays leads", expectedIntent: "FOLLOW_UP_LEADS" },
      { text: "Show hot leads", expectedIntent: "SHOW_HOT_LEADS" },
      { text: "Prepare WhatsApp messages", expectedIntent: "PREPARE_WHATSAPP" },
      { text: "Prepare emails", expectedIntent: "PREPARE_EMAILS" },
      { text: "Show who needs a callback", expectedIntent: "SHOW_CALLBACKS" },
      { text: "Run the sales engine", expectedIntent: "RUN_SALES_ENGINE" },
      { text: "What should I do today?", expectedIntent: "WHAT_SHOULD_I_DO_TODAY" },
      { text: "Give me todays sales report", expectedIntent: "GET_SALES_REPORT" },
    ];

    for (const item of commandsToTest) {
      const intent = detectDailyIntent(item.text);
      assert(
        intent === item.expectedIntent,
        `Routes daily command "${item.text}" -> ${item.expectedIntent} (Got: ${intent})`
      );
    }
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 8: Activepieces Reusable Execution Bridge
  // -------------------------------------------------------------------------
  console.log("\n👉 Test Suite 8: Activepieces Execution Bridge & Fallback");
  {
    const analystTask = createEmployeeTask({
      employeeId: "analyst",
      objective: "Compute Daily Conversion Telemetry",
      instructions: "Calculate qualification rate and pipeline velocity",
      context: { date: new Date().toISOString().slice(0, 10) },
      tools: ["calculate_metrics"],
    });

    // Test local execution / bridge fallback (when Activepieces endpoint is offline)
    const result = await dispatchTaskViaBridge(analystTask, undefined);
    assert(result.success === true, "Bridge executes successfully with deterministic local fallback");
    assert(result.executionMode === "local_runtime", "Identifies local runtime execution mode");
    assert(analystTask.status === "COMPLETED", "Task state updated to COMPLETED");
    assert(analystTask.logs.length >= 2, "Generates verifiable execution logs");
    assert(analystTask.logs[0].message.includes("Task initialized"), "First log records task initiation");
  }

  console.log("\n==================================================================");
  console.log(`🎉 ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED (100%)`);
  console.log("==================================================================\n");
}

runTestSuite().catch((err) => {
  console.error("\n❌ TEST SUITE RUNNER FAILED:", err);
  process.exit(1);
});

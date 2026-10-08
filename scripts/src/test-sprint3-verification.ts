// scripts/src/test-sprint3-verification.ts — Comprehensive Verification Suite for Sprint 3
import {
  normalizePhone,
  normalizeWebsite,
  toTitleCase,
  scoreAndQualifyLead,
  runDailySalesEngine,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/salesEngine";
import {
  EMPLOYEES,
  createEmployeeTask,
  isConsequentialAction,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/execution/taskSystem";
import {
  executeEmployeeAction,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/execution/employeeExecutors";
import {
  testSupabaseConnection,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/supabaseClient";
import {
  INITIAL_KNOWLEDGE_ARTICLES,
  buildKnowledgeContextPrompt,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/knowledgeBase";
import type { NormalizedLead, CallQueueItem } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/types/sales";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
    failed++;
  }
}

async function runAllTests() {
  console.log("==================================================================");
  console.log("🧪 STARTING SPRINT 3 COMPREHENSIVE VERIFICATION SUITE");
  console.log("==================================================================");

  // --- SUITE 1: CRM LEAD CRUD & DEDUPLICATION ---
  console.log("\n👉 Test Suite 1: CRM Lead CRUD, Normalization & Deduplication");
  const rawLead = {
    companyName: "  MARUTI INTERIOR ARCHITECTS  ",
    contactPerson: "vikram patel",
    phone: "9825599887",
    email: "vikram@maruti.in",
    websiteUrl: "maruti-interiors.com",
    city: "ahmedabad",
    state: "gujarat",
    category: "Architecture & Luxury Interiors",
  };

  const normPhone = normalizePhone(rawLead.phone);
  assert(normPhone === "+919825599887", "Normalizes 10-digit Indian phone to +919825599887");

  const normWeb = normalizeWebsite(rawLead.websiteUrl);
  assert(normWeb === "https://maruti-interiors.com", "Normalizes bare domain to https URL");

  const normName = toTitleCase(rawLead.companyName);
  assert(normName === "Maruti Interior Architects", "Normalizes company name to Title Case");

  const scoreResult = scoreAndQualifyLead({
    companyName: normName,
    city: rawLead.city,
    state: rawLead.state,
    phone: normPhone,
    email: rawLead.email,
    websiteUrl: normWeb,
    category: rawLead.category,
  });

  assert(scoreResult.score >= 80, `Classifies Ahmedabad architecture lead with score >= 80 (Got: ${scoreResult.score})`);
  assert(scoreResult.tier === "A", `Classifies qualified lead as Tier A (Got: ${scoreResult.tier})`);
  assert(Boolean(scoreResult.bottleneck), "Identifies commercial bottleneck");
  assert(Boolean(scoreResult.primaryService), "Assigns strategic growth service");

  // --- SUITE 2: ALL 7 EMPLOYEES VERIFICATION ---
  console.log("\n👉 Test Suite 2: All 7 AI Employees Responsibilities & Safety Gates");
  const employeeKeys = Object.keys(EMPLOYEES);
  assert(employeeKeys.length === 7, `Registered exactly 7 employees in workforce (Got: ${employeeKeys.length})`);
  assert(employeeKeys.includes("scout"), "Scout is registered");
  assert(employeeKeys.includes("hunter"), "Hunter is registered");
  assert(employeeKeys.includes("researcher"), "Researcher is registered");
  assert(employeeKeys.includes("analyst"), "Analyst is registered");
  assert(employeeKeys.includes("operator"), "Operator is registered");
  assert(employeeKeys.includes("spark"), "Spark is registered");
  assert(employeeKeys.includes("publisher"), "Publisher is registered");

  // Consequential actions verification
  assert(!isConsequentialAction("scout", "clean_data"), "Scout clean_data does not require approval");
  assert(isConsequentialAction("hunter", "send_whatsapp_message"), "Hunter send_whatsapp_message REQUIRES approval");
  assert(isConsequentialAction("hunter", "send_email"), "Hunter send_email REQUIRES approval");
  assert(isConsequentialAction("operator", "bulk_delete_records"), "Operator bulk_delete_records REQUIRES approval");
  assert(isConsequentialAction("publisher", "publish_to_platform"), "Publisher publish_to_platform REQUIRES approval");

  // --- SUITE 3: EMPLOYEE EXECUTIONS (REAL WORKFLOW RUN) ---
  console.log("\n👉 Test Suite 3: Real Employee Task Execution & Outputs");
  const testLeads: NormalizedLead[] = [
    {
      id: "lead_t1",
      companyName: "Acme Designs",
      contactPerson: "Kavita Rao",
      phone: "+919825123456",
      email: "kavita@acme.in",
      websiteUrl: "https://acme.in",
      city: "Ahmedabad",
      state: "Gujarat",
      country: "India",
      industry: "Architecture",
      category: "Architecture",
      status: "NEW",
      score: 90,
      tier: "A",
      notes: "Test lead",
      rawRecord: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recommendedChannel: "WHATSAPP",
      verifiedClaims: [],
    },
  ];
  let leadsState = [...testLeads];
  let callQueueState: CallQueueItem[] = [];

  // 1. Scout Execution
  const scoutTask = await executeEmployeeAction(
    "scout",
    "scout_clean_dedup",
    undefined,
    {
      leads: leadsState,
      setLeads: l => { leadsState = l; },
      callQueue: callQueueState,
      setCallQueue: q => { callQueueState = q; },
    }
  );
  assert(scoutTask.status === "COMPLETED", "Scout task completed execution");
  assert(scoutTask.logs.length > 0, "Scout produced execution logs");
  assert(Boolean(scoutTask.output), "Scout returned structured output");

  // 2. Hunter Execution
  const hunterTask = await executeEmployeeAction(
    "hunter",
    "hunter_generate_drafts",
    undefined,
    {
      leads: leadsState,
      setLeads: l => { leadsState = l; },
      callQueue: callQueueState,
      setCallQueue: q => { callQueueState = q; },
    }
  );
  assert(hunterTask.status === "COMPLETED", "Hunter task completed execution");
  assert(Boolean(hunterTask.output), "Hunter returned structured output");

  // 3. Researcher Execution
  const researcherTask = await executeEmployeeAction(
    "researcher",
    "researcher_deep_audit",
    undefined,
    {
      leads: leadsState,
      setLeads: l => { leadsState = l; },
      callQueue: callQueueState,
      setCallQueue: q => { callQueueState = q; },
    }
  );
  assert(researcherTask.status === "COMPLETED", "Researcher task completed execution");
  assert(Boolean((researcherTask.output as any)?.verifiedClaims), "Researcher synthesized verified claims");

  // 4. Analyst Execution
  const analystTask = await executeEmployeeAction(
    "analyst",
    "analyst_executive_report",
    undefined,
    {
      leads: leadsState,
      setLeads: l => { leadsState = l; },
      callQueue: callQueueState,
      setCallQueue: q => { callQueueState = q; },
    }
  );
  assert(analystTask.status === "COMPLETED", "Analyst task completed execution");
  assert(Boolean((analystTask.output as any)?.executiveSummary), "Analyst generated executive summary");

  // 5. Operator Execution
  const operatorTask = await executeEmployeeAction(
    "operator",
    "operator_hygiene_check",
    undefined,
    {
      leads: leadsState,
      setLeads: l => { leadsState = l; },
      callQueue: callQueueState,
      setCallQueue: q => { callQueueState = q; },
    }
  );
  assert(operatorTask.status === "COMPLETED", "Operator task completed execution");
  assert((operatorTask.output as any)?.databaseSyncStatus === "READY", "Operator validated CRM data health");

  // 6. Spark Execution
  const sparkTask = await executeEmployeeAction(
    "spark",
    "spark_draft_b2b_post",
    undefined,
    {
      leads: leadsState,
      setLeads: l => { leadsState = l; },
      callQueue: callQueueState,
      setCallQueue: q => { callQueueState = q; },
    }
  );
  assert(sparkTask.status === "COMPLETED", "Spark task completed execution");
  assert(Boolean((sparkTask.output as any)?.copy), "Spark generated B2B conversion copy");

  // 7. Publisher Execution
  const publisherTask = await executeEmployeeAction(
    "publisher",
    "publisher_format_queue",
    undefined,
    {
      leads: leadsState,
      setLeads: l => { leadsState = l; },
      callQueue: callQueueState,
      setCallQueue: q => { callQueueState = q; },
    }
  );
  assert(publisherTask.status === "COMPLETED", "Publisher task completed execution");
  assert(Array.isArray((publisherTask.output as any)?.distributionPlan), "Publisher generated multi-platform schedule");

  // --- SUITE 4: SUPABASE CLOUD CONNECTION VERIFICATION ---
  console.log("\n👉 Test Suite 4: Supabase Live Database Connection & Security");
  const dbTest = await testSupabaseConnection(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);
  assert(dbTest.ok, `Supabase connection verified (Latency: ${dbTest.latencyMs}ms)`);
  assert(Boolean(dbTest.activeTables && dbTest.activeTables.includes("leads")), "Verified public.leads table accessibility");
  assert(Boolean(dbTest.activeTables && dbTest.activeTables.includes("approvals")), "Verified public.approvals table accessibility");
  assert(!DEFAULT_SUPABASE_ANON_KEY.includes("service_role"), "Confirmed Anon Key does NOT contain service_role token");

  // --- SUITE 5: KNOWLEDGE BASE PROMPT INJECTION ---
  console.log("\n👉 Test Suite 5: Agency Knowledge Base Context Generator");
  assert(INITIAL_KNOWLEDGE_ARTICLES.length >= 5, `Knowledge base contains ${INITIAL_KNOWLEDGE_ARTICLES.length} core business records`);
  const promptInjection = buildKnowledgeContextPrompt(INITIAL_KNOWLEDGE_ARTICLES);
  assert(promptInjection.includes("YUGANTAR GROWTH"), "Context includes Yugantar Growth agency header");
  assert(promptInjection.includes("High-Ticket B2B Outbound"), "Context includes core service specifications");
  assert(promptInjection.includes("Ahmedabad"), "Context includes Gujarat geographical focus");

  console.log("\n==================================================================");
  console.log(`🎉 SPRINT 3 VERIFICATION COMPLETE: ${passed}/${passed + failed} PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error("FATAL TEST RUN ERROR:", err);
  process.exit(1);
});

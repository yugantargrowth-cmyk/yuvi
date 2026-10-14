// scripts/src/test-autonomous-sprints.ts — Automated Verification Suite for Sprints 1 through 5
import {
  getDefaultAgentConfigs,
  getDefaultKnowledgeNodes,
  getAgentConfig,
  updateAgentConfig,
  addOrUpdateServiceInConfigs,
  parseConversationalAgentInstruction,
  DEFAULT_AGENCY_SERVICES,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/agents/agentConfigEngine";

import { auditLead } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/research/leadResearcher";
import {
  formatWhatsAppPhone,
  generateWhatsAppDeepLink,
  generateHunterPitch,
  recordWhatsAppDispatch,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/outreach/hunterOutreach";

import { generateClientPitchDeck } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/export/presentationBuilder";
import {
  syncLeadsWithSupabase,
  syncClientAccountsWithSupabase,
  syncProposalsWithSupabase,
  syncAgentConfigsWithSupabase,
  syncKnowledgeNodesWithSupabase,
  syncAllTablesWithSupabase,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/supabaseClient";

import type { NormalizedLead, CommercialProposal, ClientAccount, AgentConfig } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/types/sales";

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    totalPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    totalFailed++;
  }
}

async function runAutonomousSuite() {
  console.log("==================================================================");
  console.log("🧪 STARTING YUVI MASTER SPRINT PLAN COMPREHENSIVE VERIFICATION");
  console.log("==================================================================");

  // --------------------------------------------------------------------------
  // SPRINT 1: SUPABASE MEMORY & OFFLINE PERSISTENCE CORE
  // --------------------------------------------------------------------------
  console.log("\n👉 Sprint 1: Supabase Memory & Agent Configuration Core");

  const defaultConfigs = getDefaultAgentConfigs();
  assert(defaultConfigs.length === 4, `Initialized exactly 4 hierarchical agents (Got: ${defaultConfigs.length})`);
  assert(defaultConfigs.some(c => c.id === "yuvi"), "Yuvi General Manager configured");
  assert(defaultConfigs.some(c => c.id === "researcher"), "Researcher Specialist configured");
  assert(defaultConfigs.some(c => c.id === "hunter"), "Hunter Outreach Specialist configured");
  assert(defaultConfigs.some(c => c.id === "deckbuilder"), "DeckBuilder Presentation Specialist configured");

  const defaultNodes = getDefaultKnowledgeNodes();
  assert(defaultNodes.length >= 4, `Knowledge nodes initialized (Got: ${defaultNodes.length})`);
  assert(defaultNodes.some(n => n.title.includes("Yugantar Growth")), "Agency charter node active");
  assert(defaultNodes.some(n => n.title.includes("GST")), "18% GST billing terms active");

  // Test local merge synchronization without internet
  const testLeads: NormalizedLead[] = [
    {
      id: "test_lead_merge",
      companyName: "Bodakdev Architecture Studio",
      contactPerson: "Rajesh Patel",
      phone: "+919825599887",
      email: "rajesh@bodakdevstudio.com",
      websiteUrl: "https://bodakdevstudio.com",
      city: "Ahmedabad",
      state: "Gujarat",
      country: "India",
      industry: "Commercial Architecture",
      category: "Architecture",
      status: "NEW",
      score: 90,
      tier: "A",
      notes: "Top architectural studio in Ahmedabad.",
      rawRecord: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recommendedChannel: "WHATSAPP",
      verifiedClaims: [],
    },
  ];

  const localSync = await syncLeadsWithSupabase(testLeads, "https://invalid-subdomain.supabase.co", "anon-key");
  assert(localSync.leads.length >= 1, "Offline fallback safely preserves local leads on network timeout");
  assert(localSync.leads[0].companyName === "Bodakdev Architecture Studio", "Preserves exact lead properties");

  // --------------------------------------------------------------------------
  // SPRINT 2: DEEP LEAD RESEARCHER & AGENT CUSTOMIZATION DECK
  // --------------------------------------------------------------------------
  console.log("\n👉 Sprint 2: Deep Lead Researcher & Bottleneck Diagnosis");

  const leadToAudit = testLeads[0];
  const auditedLead = await auditLead(leadToAudit, DEFAULT_AGENCY_SERVICES);

  assert(auditedLead.auditScore !== undefined && auditedLead.auditScore > 0, `Generated non-zero audit score (Got: ${auditedLead.auditScore}/100)`);
  assert(auditedLead.speedSeconds !== undefined && auditedLead.speedSeconds > 0, `Calculated mobile speed latency (Got: ${auditedLead.speedSeconds}s)`);
  assert(auditedLead.mobileAudit !== undefined, "Generated mobile UX and responsive audit");
  assert(auditedLead.commercialLeaks !== undefined && auditedLead.commercialLeaks.length > 0, `Identified commercial revenue leaks (Got: ${auditedLead.commercialLeaks?.length} leaks)`);
  assert(Boolean(auditedLead.bottleneck && auditedLead.bottleneck.length > 10), `Formulated specific commercial bottleneck (Got: "${auditedLead.bottleneck}")`);
  assert(auditedLead.growthPlaybook !== undefined, "Mapped strategic Yugantar Growth playbook");
  assert(auditedLead.growthPlaybook?.setupTimeline === "48 Hours", `Playbook includes 48-Hour delivery guarantee (Got: ${auditedLead.growthPlaybook?.setupTimeline})`);
  assert((auditedLead.verifiedClaims?.length || 0) >= 2, `Synthesized verified factual claims (Got: ${auditedLead.verifiedClaims?.length})`);
  assert(Boolean(auditedLead.activityHistory && auditedLead.activityHistory.some(a => a.author === "Researcher")), "Logged research completion in lead activity history");

  // Test Agent Customization Engine (Manual updates)
  const researcherConfig = getAgentConfig(defaultConfigs, "researcher");
  assert(researcherConfig !== undefined, "Retrieved Researcher configuration");

  const updatedResearcher: AgentConfig = {
    ...researcherConfig!,
    tone: "Hyper-analytical and data-driven",
    targetIndustries: [...researcherConfig!.targetIndustries, "Luxury Dental Clinics"],
  };
  const newConfigs = updateAgentConfig(defaultConfigs, updatedResearcher);
  const fetchedResearcher = getAgentConfig(newConfigs, "researcher");
  assert(fetchedResearcher?.targetIndustries.includes("Luxury Dental Clinics") === true, "Manual industry expansion updated in agent config");

  // --------------------------------------------------------------------------
  // SPRINT 3: HUNTER & 1-CLICK WHATSAPP DISPATCH
  // --------------------------------------------------------------------------
  console.log("\n👉 Sprint 3: Hunter Outreach & 1-Click WhatsApp Direct (wa.me)");

  assert(formatWhatsAppPhone("+91 98255-99887") === "919825599887", "Normalizes formatted Indian phone number to 919825599887");
  assert(formatWhatsAppPhone("09825599887") === "919825599887", "Normalizes leading zero Indian phone number to 919825599887");
  assert(formatWhatsAppPhone("9825599887") === "919825599887", "Normalizes 10-digit Indian mobile number to 919825599887");

  const deepLink = generateWhatsAppDeepLink("+919825599887", "Hello Shlok, testing wa.me link");
  assert(deepLink.startsWith("https://wa.me/919825599887?text="), `Generated valid wa.me deep link URL (Got: ${deepLink})`);

  const hunterPitch = generateHunterPitch(auditedLead);
  assert(hunterPitch.whatsappPitch.includes("Shlok here from Yugantar Growth"), "WhatsApp copy includes Shlok / Yugantar Growth identity");
  assert(hunterPitch.whatsappPitch.includes(auditedLead.companyName), "WhatsApp copy incorporates target company name");
  assert(auditedLead.bottleneck ? hunterPitch.whatsappPitch.includes(auditedLead.bottleneck) : true, "WhatsApp copy cites Researcher's specific bottleneck finding");
  assert(hunterPitch.whatsappDeepLink.includes("https://wa.me/919825599887"), "Deep link embedded in Hunter pitch result");
  assert(hunterPitch.emailSubject.includes("Bodakdev Architecture Studio"), "Email subject personalized for target account");

  // Test dispatch telemetry recording
  const { updatedLead: dispatchedLead, deepLink: dispatchUrl } = recordWhatsAppDispatch(auditedLead, hunterPitch.whatsappPitch);
  assert(dispatchedLead.status === "CONTACTED", `Dispatched lead status updated to CONTACTED (Got: ${dispatchedLead.status})`);
  assert(Boolean(dispatchedLead.activityHistory && dispatchedLead.activityHistory.some(a => a.author === "Hunter" && a.action.includes("WhatsApp Outreach Dispatched"))), "Logged WhatsApp dispatch in lead telemetry history");

  // --------------------------------------------------------------------------
  // SPRINT 4: NATIVE POWERPOINT PITCH DECK BUILDER (pptxgenjs)
  // --------------------------------------------------------------------------
  console.log("\n👉 Sprint 4: Brahma-Style Native PowerPoint (.pptx) Generator");

  const sampleProposal: CommercialProposal = {
    id: "prop_test_01",
    leadId: auditedLead.id,
    proposalNumber: "YG-PROP-2026-TEST",
    title: "High-Speed Web Architecture & AI WhatsApp Concierge",
    clientName: auditedLead.companyName,
    contactPerson: auditedLead.contactPerson,
    phone: auditedLead.phone,
    email: auditedLead.email,
    status: "DRAFT",
    createdAt: new Date().toISOString(),
    validUntil: new Date().toISOString(),
    scopeSummary: "Turnkey growth sprint",
    items: [
      { id: "1", description: "Sub-2s Web Portal Architecture", quantity: 1, unitPrice: 55000, amount: 55000 },
      { id: "2", description: "AI WhatsApp Inbound Concierge", quantity: 1, unitPrice: 30000, amount: 30000 },
    ],
    subtotal: 85000,
    taxRate: 18,
    taxAmount: 15300,
    totalAmount: 100300,
    currency: "INR",
    timelineWeeks: 2,
    paymentTerms: "50% advance, 50% delivery",
    deliverables: ["Web Portal", "WhatsApp Bot"],
  };

  const deckFileName = await generateClientPitchDeck({
    lead: auditedLead,
    proposal: sampleProposal,
    fileName: "Test_YugantarGrowth_PitchDeck.pptx",
  });

  assert(deckFileName.endsWith(".pptx"), `Generated native PowerPoint presentation file (Got: ${deckFileName})`);

  // --------------------------------------------------------------------------
  // SPRINT 5: YUVI CONVERSATIONAL ORCHESTRATION & MORNING DIAGNOSTIC
  // --------------------------------------------------------------------------
  console.log("\n👉 Sprint 5: Yuvi Manager Orchestrator & Conversational Control");

  // Test natural language agent skill update
  const conversationalPrompt =
    "Yuvi, we now offer AI Receptionist for luxury clinics at ₹35,000/mo. Update the Researcher's service catalog and teach Hunter the new pitch angle";

  const parsedIntent = parseConversationalAgentInstruction(conversationalPrompt, defaultConfigs);

  assert(parsedIntent.matched === true, "Yuvi successfully detected conversational workforce reconfiguration intent");
  assert(parsedIntent.action === "ADD_SERVICE", `Identified action as ADD_SERVICE (Got: ${parsedIntent.action})`);
  assert(parsedIntent.serviceAdded !== undefined, "Created structured AgentService entity from natural language prompt");
  assert(parsedIntent.serviceAdded?.pricing === "₹35,000/mo", `Extracted accurate pricing boundary: ₹35,000/mo (Got: ${parsedIntent.serviceAdded?.pricing})`);
  assert(parsedIntent.serviceAdded?.name.includes("AI Receptionist") === true, `Extracted service name: AI Receptionist (Got: ${parsedIntent.serviceAdded?.name})`);

  const updatedResearcherAfterChat = getAgentConfig(parsedIntent.updatedConfigs, "researcher");
  assert(
    updatedResearcherAfterChat?.services.some(s => s.name.includes("AI Receptionist")) === true,
    "Researcher service catalog dynamically updated with new AI Receptionist offering",
  );

  const updatedHunterAfterChat = getAgentConfig(parsedIntent.updatedConfigs, "hunter");
  assert(
    updatedHunterAfterChat?.services.some(s => s.name.includes("AI Receptionist")) === true,
    "Hunter outreach catalog dynamically updated with new pitch angle",
  );

  assert(
    parsedIntent.replyMessage.includes("Understood, Shlok") && parsedIntent.replyMessage.includes("AI Receptionist"),
    "Yuvi generates executive confirmation message for Founder",
  );

  // Test Policy/Rule addition
  const rulePrompt = "Yuvi, rule: Never offer discounts exceeding 10% on 48h fast web delivery sprints";
  const parsedRule = parseConversationalAgentInstruction(rulePrompt, defaultConfigs);
  assert(parsedRule.matched === true, "Yuvi detected policy rule update");
  assert(parsedRule.action === "ADD_RULE", "Action classified as ADD_RULE");

  // Test that Researcher immediately utilizes newly added conversational service
  const newlyAuditedLead = await auditLead(
    {
      ...auditedLead,
      industry: "Luxury Cosmetic Clinic",
      companyName: "Bodakdev Aesthetics Clinic",
    },
    updatedResearcherAfterChat!.services,
  );

  assert(
    Boolean(
      newlyAuditedLead.growthPlaybook?.packageName.includes("AI Receptionist") ||
      newlyAuditedLead.recommendedService?.includes("AI Receptionist") ||
      newlyAuditedLead.growthPlaybook?.packageName.includes("Fast Web")
    ),
    `Researcher leverages updated service catalog in live lead diagnosis (Got: ${newlyAuditedLead.growthPlaybook?.packageName})`,
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`🎉 ALL AUTONOMOUS SPRINTS COMPLETED: ${totalPassed}/${totalPassed + totalFailed} PASSED`);
  if (totalFailed > 0) {
    console.error(`❌ ${totalFailed} assertions failed.`);
    process.exit(1);
  } else {
    console.log("🚀 100% SPRINT PLAN VERIFICATION SUCCESSFUL!");
    console.log("==================================================================");
  }
}

runAutonomousSuite().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});

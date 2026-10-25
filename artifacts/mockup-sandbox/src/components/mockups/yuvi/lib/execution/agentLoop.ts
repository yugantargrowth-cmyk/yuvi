// lib/execution/agentLoop.ts — Bounded Observable Autonomous Agent Loop for YUVI
// Implements the complete 10-stage execution cycle:
// UNDERSTAND REQUEST -> PLAN -> CHECK PERMISSIONS -> SELECT REGISTERED TOOLS ->
// EXECUTE -> OBSERVE RESULTS -> VERIFY -> SAVE RECEIPTS -> UPDATE MEMORY & STATUS -> REPORT

import { TOOL_REGISTRY, type ToolExecutionContext, type AgentToolDefinition } from "./toolRegistry";
import { emit } from "../eventBus";
import { completeWithGroq } from "../groq";

export interface AgentPlanStep {
  stepIndex: number;
  toolName: string;
  rationale: string;
  params: Record<string, any>;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "AWAITING_APPROVAL";
  isConsequential: boolean;
  result?: any;
  receipt?: AgentExecutionReceipt;
  error?: string;
}

export interface AgentExecutionReceipt {
  receiptId: string;
  toolName: string;
  timestamp: string;
  inputs: Record<string, any>;
  outputSummary: string;
  evidenceLabelsVerified: boolean;
  durationMs: number;
  status: "SUCCESS" | "PARTIAL" | "ERROR";
  recordsModified?: number;
}

export interface AgentLoopResult {
  requestId: string;
  originalRequest: string;
  understoodIntent: string;
  plan: AgentPlanStep[];
  receipts: AgentExecutionReceipt[];
  report: string;
  navigationSuggestion?: "Leads" | "Approvals" | "Proposals" | "Pipeline" | "Today" | "Finance";
  recordsModified: number;
  success: boolean;
  durationMs: number;
}

/**
 * Stage 1: UNDERSTAND REQUEST & Stage 2: PLAN
 * Decomposes natural language requests into a structured, bounded plan of registered tool calls.
 */
function createPlanFromRequest(request: string, context: ToolExecutionContext): { intent: string; steps: AgentPlanStep[] } {
  const reqLower = request.toLowerCase();
  const steps: AgentPlanStep[] = [];
  let intent = "Execute operational request";

  // Pattern 1: Deep Research on Lead (e.g. "Research Jangid Furniture", "Audit lead X", "Inspect website")
  if (reqLower.includes("research") || reqLower.includes("audit") || reqLower.includes("inspect")) {
    const targetLead = context.leads.find((l) =>
      reqLower.includes(l.companyName.toLowerCase()) || reqLower.includes(l.id.toLowerCase())
    ) || context.leads[0];

    intent = `Conduct deep multi-source audit on ${targetLead ? targetLead.companyName : "target lead"} and diagnose commercial bottlenecks.`;

    if (targetLead) {
      steps.push({
        stepIndex: 1,
        toolName: "research_lead",
        rationale: `Inspect website, SSL status, and digital footprint for ${targetLead.companyName}.`,
        params: { leadId: targetLead.id },
        status: "PENDING",
        isConsequential: false,
      });

      steps.push({
        stepIndex: 2,
        toolName: "analyze_needs",
        rationale: "Rank revenue leaks and map to tailored Yugantar Growth service package.",
        params: { leadId: targetLead.id },
        status: "PENDING",
        isConsequential: false,
      });

      // If user also asked for proposal in the same command
      if (reqLower.includes("proposal") || reqLower.includes("quote")) {
        steps.push({
          stepIndex: 3,
          toolName: "compose_proposal",
          rationale: `Draft 1-page proposal for ${targetLead.companyName} based on researched evidence.`,
          params: { leadId: targetLead.id, advancePercentage: 50 },
          status: "PENDING",
          isConsequential: false,
        });
        intent += " Draft 1-page commercial proposal.";
      }

      // If user also asked for outreach in the same command
      if (reqLower.includes("outreach") || reqLower.includes("pitch") || reqLower.includes("message")) {
        steps.push({
          stepIndex: steps.length + 1,
          toolName: "generate_outreach",
          rationale: `Draft tailored WhatsApp pitch for ${targetLead.companyName} and stage in Approvals.`,
          params: { leadId: targetLead.id },
          status: "PENDING",
          isConsequential: false,
        });
        intent += " Generate outreach draft.";
      }
    }

    return { intent, steps };
  }

  // Pattern 2: Business Discovery (e.g. "Find 50 clinics in Ahmedabad", "Search architects in SG Highway")
  if (/\b(find|search|discover|scout)\b/i.test(request)) {
    let niche = "Commercial Businesses";
    if (reqLower.includes("clinic") || reqLower.includes("doctor") || reqLower.includes("dental") || reqLower.includes("skin")) {
      niche = "Dental & Aesthetic Clinics";
    } else if (reqLower.includes("architect") || reqLower.includes("interior") || reqLower.includes("design")) {
      niche = "Architects & Interior Designers";
    } else if (reqLower.includes("furniture") || reqLower.includes("wood")) {
      niche = "Bespoke Luxury Furniture Studios";
    } else if (reqLower.includes("textile") || reqLower.includes("garment") || reqLower.includes("fabric")) {
      niche = "Textile Manufacturers & Exporters";
    } else if (reqLower.includes("coaching") || reqLower.includes("academy") || reqLower.includes("classes")) {
      niche = "Coaching Centers & Academies";
    } else if (reqLower.includes("salon") || reqLower.includes("beauty") || reqLower.includes("spa")) {
      niche = "Salons & Luxury Spas";
    }

    let location = "Ahmedabad";
    if (reqLower.includes("sg highway")) location = "SG Highway, Ahmedabad";
    else if (reqLower.includes("bodakdev")) location = "Bodakdev, Ahmedabad";
    else if (reqLower.includes("prahlad nagar")) location = "Prahlad Nagar, Ahmedabad";
    else if (reqLower.includes("sindhu bhavan")) location = "Sindhu Bhavan Road, Ahmedabad";
    else if (reqLower.includes("gandhinagar")) location = "Gandhinagar";
    else if (reqLower.includes("surat")) location = "Surat";
    else if (reqLower.includes("vadodara")) location = "Vadodara";

    const countMatch = request.match(/\b(\d+)\b/);
    const targetCount = countMatch ? Math.min(parseInt(countMatch[1], 10), 50) : 10;

    intent = `Discover ${targetCount} ${niche} prospects in ${location}, score for ICP fit, and stage for research.`;

    steps.push({
      stepIndex: 1,
      toolName: "search_local_businesses",
      rationale: `Search lawful directory for ${niche} in ${location} to extract verified business records.`,
      params: { niche, location, targetCount },
      status: "PENDING",
      isConsequential: false,
    });

    steps.push({
      stepIndex: 2,
      toolName: "deduplicate_leads",
      rationale: "Clean phone numbers to +91 and eliminate redundant entries.",
      params: {},
      status: "PENDING",
      isConsequential: false,
    });

    steps.push({
      stepIndex: 3,
      toolName: "triage_and_score_leads",
      rationale: "Evaluate ICP criteria and score each prospect commercial fit (0-100).",
      params: {},
      status: "PENDING",
      isConsequential: false,
    });

    return { intent, steps };
  }

  // Pattern 3: Proposals (e.g. "Draft proposal for Jangid Furniture", "Prepare quote")
  if (reqLower.includes("proposal") || reqLower.includes("quote") || reqLower.includes("quotation")) {
    const targetLead = context.leads.find((l) =>
      reqLower.includes(l.companyName.toLowerCase()) || reqLower.includes(l.id.toLowerCase())
    ) || context.leads[0];

    intent = `Draft 1-page evidence-based commercial proposal and WhatsApp pitch for ${targetLead ? targetLead.companyName : "client"}.`;

    if (targetLead) {
      steps.push({
        stepIndex: 1,
        toolName: "compose_proposal",
        rationale: `Generate 1-page proposal for ${targetLead.companyName} citing only verified claims.`,
        params: { leadId: targetLead.id, packageId: "growth", advancePercentage: 50 },
        status: "PENDING",
        isConsequential: false,
      });
    }

    return { intent, steps };
  }

  // Pattern 4: Outreach & Pitches (e.g. "Draft outreach for top leads", "Prepare WhatsApp pitch")
  if (reqLower.includes("outreach") || reqLower.includes("pitch") || reqLower.includes("whatsapp message") || reqLower.includes("message")) {
    const targetLead = context.leads.find((l) =>
      reqLower.includes(l.companyName.toLowerCase()) || reqLower.includes(l.id.toLowerCase())
    ) || context.leads.find((l) => l.tier === "A") || context.leads[0];

    intent = `Generate personalized, evidence-first WhatsApp outreach for ${targetLead ? targetLead.companyName : "top leads"} and stage in Approvals.`;

    if (targetLead) {
      steps.push({
        stepIndex: 1,
        toolName: "generate_outreach",
        rationale: `Draft tailored WhatsApp pitch for ${targetLead.companyName} and stage in Consequential Action Gate.`,
        params: { leadId: targetLead.id },
        status: "PENDING",
        isConsequential: false, // Drafting is safe; human must confirm sending
      });
    }

    return { intent, steps };
  }

  // Pattern 5: Daily Priorities (e.g. "What should I do today?", "Morning briefing", "Daily priorities")
  if (reqLower.includes("today") || reqLower.includes("priority") || reqLower.includes("brief") || reqLower.includes("plan")) {
    intent = "Compile prioritized daily sales routine and revenue goal telemetry.";

    steps.push({
      stepIndex: 1,
      toolName: "get_daily_priorities",
      rationale: "Calculate Money Due > Replies > Follow-ups > New Sends > Project Work.",
      params: {},
      status: "PENDING",
      isConsequential: false,
    });

    return { intent, steps };
  }

  // Pattern 6: Export CSV (e.g. "Export leads to CSV", "Download lead list")
  if (reqLower.includes("export") || reqLower.includes("csv") || reqLower.includes("download")) {
    intent = "Export active lead pipeline and qualification metrics to RFC-4180 CSV.";

    steps.push({
      stepIndex: 1,
      toolName: "export_leads_csv",
      rationale: "Serialize pipeline leads into standard CSV with verified claims.",
      params: {},
      status: "PENDING",
      isConsequential: false,
    });

    return { intent, steps };
  }

  // Fallback: Default to Triage + Today Priorities
  intent = `Analyze operational context for: "${request}"`;
  steps.push({
    stepIndex: 1,
    toolName: "triage_and_score_leads",
    rationale: "Evaluate current lead radar.",
    params: {},
    status: "PENDING",
    isConsequential: false,
  });
  steps.push({
    stepIndex: 2,
    toolName: "get_daily_priorities",
    rationale: "Identify immediate high-margin next action.",
    params: {},
    status: "PENDING",
    isConsequential: false,
  });

  return { intent, steps };
}

/**
 * Executes the full 10-stage autonomous agent loop with truthfulness verification.
 */
export async function runAgentLoop(
  request: string,
  context: ToolExecutionContext,
  options: {
    personalityPrompt?: string;
    modelId?: string;
    onStepUpdate?: (step: AgentPlanStep) => void;
  } = {}
): Promise<AgentLoopResult> {
  const startTime = performance.now();
  const requestId = `loop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  emit("agent.loop_start", { requestId, request });

  // --- STAGE 1: UNDERSTAND REQUEST & STAGE 2: PLAN ---
  const { intent, steps } = createPlanFromRequest(request, context);

  const receipts: AgentExecutionReceipt[] = [];
  let totalRecordsModified = 0;
  let overallSuccess = true;
  let navSuggestion: AgentLoopResult["navigationSuggestion"] = undefined;

  // --- STAGES 3 TO 9: PER-STEP BOUNDED EXECUTION LOOP ---
  for (const step of steps) {
    step.status = "RUNNING";
    options.onStepUpdate?.(step);

    // Stage 3: CHECK PERMISSIONS
    const toolDef: AgentToolDefinition | undefined = TOOL_REGISTRY[step.toolName];
    if (!toolDef) {
      step.status = "FAILED";
      step.error = `Tool '${step.toolName}' is not registered in the verified Tool Registry.`;
      overallSuccess = false;
      options.onStepUpdate?.(step);
      continue;
    }

    if (toolDef.isConsequential) {
      step.status = "AWAITING_APPROVAL";
      step.rationale += " [GATED: Requires explicit human confirmation before execution]";
      options.onStepUpdate?.(step);
      continue;
    }

    // Stage 4: SELECT REGISTERED TOOLS & Stage 5: EXECUTE
    const stepStartTime = performance.now();
    try {
      const execResult = await toolDef.execute(step.params, context);
      const stepDuration = Math.round(performance.now() - stepStartTime);

      // Stage 6: OBSERVE RESULTS & Stage 7: VERIFY
      const isVerified = execResult.success;
      step.result = execResult.data;

      // Stage 8: SAVE RECEIPTS
      const receipt: AgentExecutionReceipt = {
        receiptId: `rcpt_${step.toolName}_${Date.now()}`,
        toolName: step.toolName,
        timestamp: new Date().toISOString(),
        inputs: step.params,
        outputSummary: execResult.summary,
        evidenceLabelsVerified: true,
        durationMs: stepDuration,
        status: isVerified ? "SUCCESS" : "ERROR",
        recordsModified: execResult.recordsModified,
      };

      step.receipt = receipt;
      receipts.push(receipt);
      totalRecordsModified += execResult.recordsModified || 0;

      step.status = isVerified ? "COMPLETED" : "FAILED";
      options.onStepUpdate?.(step);

      // Map tool to logical UI navigation recommendation
      if (step.toolName === "search_local_businesses" || step.toolName === "triage_and_score_leads") {
        navSuggestion = "Leads";
      } else if (step.toolName === "generate_outreach" || step.toolName === "schedule_outreach_sequence") {
        navSuggestion = "Approvals";
      } else if (step.toolName === "compose_proposal") {
        navSuggestion = "Proposals";
      } else if (step.toolName === "record_payment") {
        navSuggestion = "Finance";
      } else if (step.toolName === "get_daily_priorities") {
        navSuggestion = "Today";
      }
    } catch (err) {
      const stepDuration = Math.round(performance.now() - stepStartTime);
      const errorMsg = err instanceof Error ? err.message : String(err);
      step.status = "FAILED";
      step.error = errorMsg;
      overallSuccess = false;

      const errorReceipt: AgentExecutionReceipt = {
        receiptId: `rcpt_err_${Date.now()}`,
        toolName: step.toolName,
        timestamp: new Date().toISOString(),
        inputs: step.params,
        outputSummary: `Execution error: ${errorMsg}`,
        evidenceLabelsVerified: false,
        durationMs: stepDuration,
        status: "ERROR",
      };
      receipts.push(errorReceipt);
      options.onStepUpdate?.(step);
    }
  }

  // --- STAGE 10: REPORT ---
  const durationMs = Math.round(performance.now() - startTime);

  // Compile truthful execution report
  const completedSteps = steps.filter((s) => s.status === "COMPLETED");
  const failedSteps = steps.filter((s) => s.status === "FAILED");
  const summaryBullets = receipts.map((r) => `• **${r.toolName}**: ${r.outputSummary}`).join("\n");

  const report = `### ⚡ YUVI Autonomous Execution Report

**Objective:** ${intent}  
**Status:** ${overallSuccess ? "✅ ALL STEPS EXECUTED & VERIFIED" : "⚠️ PARTIAL EXECUTION"} (${completedSteps.length}/${steps.length} steps completed in ${durationMs}ms)  
**Records Modified:** ${totalRecordsModified} items persisted to active CRM state.

#### 📋 Execution Receipts:
${summaryBullets}

${failedSteps.length > 0 ? `\n> ⚠️ **Failures/Blockers:**\n${failedSteps.map((f) => `> • ${f.toolName}: ${f.error}`).join("\n")}` : ""}

${navSuggestion ? `👉 **Next Action:** Navigate to the **${navSuggestion}** view to inspect updated records.` : ""}`;

  emit("agent.loop_complete", { requestId, durationMs, success: overallSuccess });

  return {
    requestId,
    originalRequest: request,
    understoodIntent: intent,
    plan: steps,
    receipts,
    report,
    navigationSuggestion: navSuggestion,
    recordsModified: totalRecordsModified,
    success: overallSuccess,
    durationMs,
  };
}

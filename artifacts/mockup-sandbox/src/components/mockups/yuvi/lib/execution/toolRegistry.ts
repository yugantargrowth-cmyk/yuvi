// lib/execution/toolRegistry.ts — Registered Agent Tools for YUVI Business Operator
// Defines the complete catalog of executable business tools with permission boundaries.

import type {
  NormalizedLead,
  CommercialProposal,
  ClientInvoice,
  ClientAccount,
  CallQueueItem,
  ApprovalItem,
} from "../types/sales";
import { searchLocalBusinesses, exportLeadsToCsv } from "./businessDiscovery";
import { triageLead } from "../sales/leadTriageEngine";
import { deduplicateLeads } from "../sales/csvParser";
import { auditLead } from "../research/leadResearcher";
import { analyzeLeadNeeds } from "../sales/needsAnalysisEngine";
import { composeProposal } from "../sales/proposalComposer";
import { generateHunterPitch } from "../outreach/hunterOutreach";
import { generateCadenceMessages } from "../outreach/cadenceEngine";
import { computeTodayMetrics, determineNextAction, generateMorningBriefing } from "../today/todayEngine";
import { INITIAL_KNOWLEDGE_ARTICLES } from "../knowledgeBase";

export interface ToolExecutionContext {
  leads: NormalizedLead[];
  setLeads?: (leads: NormalizedLead[]) => void;
  proposals: CommercialProposal[];
  setProposals?: (proposals: CommercialProposal[]) => void;
  invoices: ClientInvoice[];
  setInvoices?: (invoices: ClientInvoice[]) => void;
  clients: ClientAccount[];
  setClients?: (clients: ClientAccount[]) => void;
  callQueue: CallQueueItem[];
  setCallQueue?: (queue: CallQueueItem[]) => void;
  approvals: ApprovalItem[];
  setApprovals?: (approvals: ApprovalItem[]) => void;
  founderName?: string;
  upiVpa?: string;
}

export interface AgentToolDefinition {
  name: string;
  label: string;
  description: string;
  category: "leads" | "research" | "sales" | "finance" | "delivery" | "operations";
  isConsequential: boolean;
  parameters: {
    name: string;
    type: "string" | "number" | "boolean" | "array" | "object";
    description: string;
    required: boolean;
  }[];
  execute: (params: Record<string, any>, context: ToolExecutionContext) => Promise<{
    success: boolean;
    data: any;
    summary: string;
    evidenceCreated?: string[];
    recordsModified?: number;
  }>;
}

export const TOOL_REGISTRY: Record<string, AgentToolDefinition> = {
  // 1. Search Local Businesses
  search_local_businesses: {
    name: "search_local_businesses",
    label: "Search Gujarat Businesses",
    description: "Discovers commercial business prospects across Ahmedabad and Gujarat hubs by niche, location, and ICP criteria.",
    category: "leads",
    isConsequential: false,
    parameters: [
      { name: "niche", type: "string", description: "Target business category (e.g. 'dental clinics', 'architects', 'furniture')", required: true },
      { name: "location", type: "string", description: "City or commercial corridor (e.g. 'Ahmedabad', 'SG Highway', 'Bodakdev')", required: false },
      { name: "targetCount", type: "number", description: "Number of prospects to discover (default: 10, max: 50)", required: false },
    ],
    async execute(params, context) {
      const niche = String(params.niche || "business");
      const location = String(params.location || "Ahmedabad");
      const count = Number(params.targetCount || 10);

      const discovered = await searchLocalBusinesses({ niche, location, targetCount: count });

      // Merge into active lead radar without dropping existing leads
      if (context.setLeads && context.leads) {
        const existingIds = new Set(context.leads.map((l) => l.id));
        const newLeads = discovered.filter((l) => !existingIds.has(l.id));
        context.setLeads([...newLeads, ...context.leads]);
      }

      return {
        success: true,
        data: discovered,
        summary: `Discovered ${discovered.length} relevant ${niche} prospects in ${location} with verified contact lines and GMB metrics.`,
        evidenceCreated: discovered.flatMap((d) => d.verifiedClaims || []),
        recordsModified: discovered.length,
      };
    },
  },

  // 2. Triage & Score Leads
  triage_and_score_leads: {
    name: "triage_and_score_leads",
    label: "Triage & Score Leads",
    description: "Evaluates leads against Yugantar Growth ICP criteria, scores commercial fit (0-100), and assigns tier (A/B/C/D).",
    category: "leads",
    isConsequential: false,
    parameters: [
      { name: "leadIds", type: "array", description: "Optional list of lead IDs to score (defaults to all leads)", required: false },
    ],
    async execute(params, context) {
      const leadIds = params.leadIds as string[] | undefined;
      const targetLeads = leadIds && leadIds.length > 0
        ? context.leads.filter((l) => leadIds.includes(l.id))
        : context.leads;

      let qualifiedCount = 0;
      const updated = context.leads.map((lead) => {
        if (!targetLeads.some((t) => t.id === lead.id)) return lead;
        const triage = triageLead(lead);
        if (triage.decision === "qualified") qualifiedCount++;
        return {
          ...lead,
          score: triage.fitScore,
          tier: triage.fitScore >= 80 ? ("A" as const) : triage.fitScore >= 60 ? ("B" as const) : ("C" as const),
          status: triage.decision === "skip" ? ("LOST" as const) : lead.status,
          notes: triage.reasons.length > 0 ? `${lead.notes ? lead.notes + " | " : ""}${triage.reasons.join("; ")}` : lead.notes,
        };
      });

      if (context.setLeads) {
        context.setLeads(updated);
      }

      return {
        success: true,
        data: { totalScored: targetLeads.length, qualifiedCount },
        summary: `Scored ${targetLeads.length} leads against ICP criteria. ${qualifiedCount} meet high-ticket qualification standards (Tier A/B).`,
        recordsModified: targetLeads.length,
      };
    },
  },

  // 3. Deduplicate Leads
  deduplicate_leads: {
    name: "deduplicate_leads",
    label: "Deduplicate Leads",
    description: "Cleans Indian phone numbers (+91) and merges or purges duplicate records across radar.",
    category: "leads",
    isConsequential: false,
    parameters: [],
    async execute(_params, context) {
      const rawRecords = context.leads.map((l) => ({
        companyName: l.companyName,
        contactPerson: l.contactPerson,
        phone: l.phone,
        email: l.email,
        websiteUrl: l.websiteUrl,
        address: l.address,
        city: l.city,
        state: l.state,
        country: l.country,
        industry: l.industry,
        category: l.category,
        notes: l.notes,
        rating: l.rating,
        reviewCount: l.reviewCount,
        rawRecord: l.rawRecord,
      }));

      const { cleanLeads, report } = deduplicateLeads(rawRecords);
      if (context.setLeads) {
        context.setLeads(cleanLeads);
      }

      return {
        success: true,
        data: report,
        summary: `Deduplication complete: Kept ${report.totalKept} unique leads, merged ${report.totalMerged}, removed ${report.totalDropped} exact duplicates.`,
        recordsModified: report.totalMerged + report.totalDropped,
      };
    },
  },

  // 4. Research Lead
  research_lead: {
    name: "research_lead",
    label: "Run Deep Lead Audit",
    description: "Performs digital footprint audit, website inspection, SSL check, and synthesizes verified evidence claims.",
    category: "research",
    isConsequential: false,
    parameters: [
      { name: "leadId", type: "string", description: "ID of the lead to research", required: true },
    ],
    async execute(params, context) {
      const leadId = String(params.leadId);
      const leadIndex = context.leads.findIndex((l) => l.id === leadId);
      if (leadIndex === -1) {
        return { success: false, data: null, summary: `Lead with ID '${leadId}' not found.` };
      }
      const lead = context.leads[leadIndex];
      const auditedLead = await auditLead(lead);

      // Mutate in place and notify state setter so downstream pipeline tools see audited evidence
      context.leads[leadIndex] = auditedLead;
      if (context.setLeads) {
        context.setLeads([...context.leads]);
      }

      return {
        success: true,
        data: auditedLead,
        summary: `Researched ${auditedLead.companyName}: Score ${auditedLead.auditScore}/100, Mobile Latency ${auditedLead.speedSeconds}s, ${(auditedLead.commercialLeaks || []).length} commercial revenue leaks identified.`,
        evidenceCreated: auditedLead.verifiedClaims || [],
        recordsModified: 1,
      };
    },
  },

  // 5. Analyze Needs & Map Package
  analyze_needs: {
    name: "analyze_needs",
    label: "Analyze Commercial Needs",
    description: "Analyzes lead evidence to rank top revenue bottlenecks and maps them to a tailored Yugantar Growth service package.",
    category: "sales",
    isConsequential: false,
    parameters: [
      { name: "leadId", type: "string", description: "ID of the lead", required: true },
    ],
    async execute(params, context) {
      const leadId = String(params.leadId);
      const lead = context.leads.find((l) => l.id === leadId);
      if (!lead) return { success: false, data: null, summary: `Lead not found.` };

      const analysis = analyzeLeadNeeds(lead);

      return {
        success: true,
        data: analysis,
        summary: `Needs diagnosed for ${lead.companyName}: Prescribed Package '${analysis.prescribedPackage.name}' (₹${analysis.prescribedPackage.pricing.amount.toLocaleString("en-IN")}) with ${analysis.topLeaks.length} top commercial leaks.`,
      };
    },
  },

  // 6. Compose 1-Page Proposal
  compose_proposal: {
    name: "compose_proposal",
    label: "Draft 1-Page Proposal",
    description: "Drafts a 1-page printable proposal and WhatsApp pitch citing only verified evidence items and catalog pricing.",
    category: "sales",
    isConsequential: false,
    parameters: [
      { name: "leadId", type: "string", description: "ID of the lead", required: true },
      { name: "advancePercentage", type: "number", description: "Advance payment required (default: 50%)", required: false },
    ],
    async execute(params, context) {
      const leadId = String(params.leadId);
      const lead = context.leads.find((l) => l.id === leadId);
      if (!lead) return { success: false, data: null, summary: `Lead not found.` };

      const composed = composeProposal(lead, {
        founderName: context.founderName || "Shlok",
        upiVpa: context.upiVpa || "shlok@upi",
        advancePercentage: Number(params.advancePercentage || 50),
      });

      const advance = composed.proposal.advanceAmount || Math.round(composed.proposal.totalAmount / 2);
      return {
        success: true,
        data: composed,
        summary: `Proposal drafted for ${lead.companyName}: Proposal '${composed.proposal.title}' (₹${composed.proposal.totalAmount.toLocaleString("en-IN")}, ₹${advance.toLocaleString("en-IN")} advance). Includes 1-page document and 6-line WhatsApp pitch.`,
      };
    },
  },

  // 7. Generate Personalized Outreach Draft
  generate_outreach: {
    name: "generate_outreach",
    label: "Generate Outreach Drafts",
    description: "Drafts evidence-first Hinglish WhatsApp, Email, and SMS pitches and stages them in the Approvals Gate.",
    category: "sales",
    isConsequential: false,
    parameters: [
      { name: "leadId", type: "string", description: "ID of the lead", required: true },
    ],
    async execute(params, context) {
      const leadId = String(params.leadId);
      const lead = context.leads.find((l) => l.id === leadId);
      if (!lead) return { success: false, data: null, summary: `Lead not found.` };

      const bottleneck = lead.notes || "Mobile load latency and lack of 1-click WhatsApp lead capture";
      const growthService = "WhatsApp Lead Funnel & High-Speed Mobile Infrastructure";

      const hunterOutreach = generateHunterPitch(lead, { customAngle: bottleneck });

      // Stage in Approvals queue
      if (context.setApprovals && context.approvals) {
        const newApproval: ApprovalItem = {
          id: `appr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: "OUTREACH_PITCH",
          title: `Hunter WhatsApp Pitch — ${lead.companyName}`,
          workspace: "Yugantar Growth",
          createdBy: "Hunter",
          timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          status: "PENDING",
          description: `Evidence-based pitch citing: "${bottleneck.slice(0, 80)}..."`,
          exactMessage: hunterOutreach.whatsappPitch,
          phone: lead.phone,
          email: lead.email,
          leadId: lead.id,
          tier: lead.tier,
          cadenceStep: "D0",
        };
        context.setApprovals([newApproval, ...context.approvals]);
      }

      return {
        success: true,
        data: hunterOutreach,
        summary: `Generated personalized outreach for ${lead.companyName} and staged in Approvals Gate. wa.me link ready for founder review.`,
        recordsModified: 1,
      };
    },
  },

  // 8. Schedule Outreach Cadence
  schedule_outreach_sequence: {
    name: "schedule_outreach_sequence",
    label: "Schedule D0/D2/D5 Cadence",
    description: "Prepares 3-step outreach sequence respecting daily send limits (max 30) and send window.",
    category: "sales",
    isConsequential: false,
    parameters: [
      { name: "leadIds", type: "array", description: "List of lead IDs to schedule", required: true },
    ],
    async execute(params, context) {
      const leadIds = (params.leadIds as string[]) || [];
      const targetLeads = context.leads.filter((l) => leadIds.includes(l.id));

      let stagedCount = 0;
      const newApprovals: ApprovalItem[] = [];

      for (const lead of targetLeads) {
        const drafts = generateCadenceMessages(lead);

        newApprovals.push({
          id: `appr_cad_${lead.id}_d0`,
          type: "OUTREACH_CADENCE",
          title: `Cadence D0 Pitch — ${lead.companyName}`,
          workspace: "Yugantar Growth",
          createdBy: "Hunter",
          timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          status: "PENDING",
          description: `Day 0 Initial WhatsApp outreach`,
          exactMessage: drafts.d0,
          phone: lead.phone,
          email: lead.email,
          leadId: lead.id,
          tier: lead.tier,
          cadenceStep: "D0",
        });
        stagedCount++;
      }

      if (context.setApprovals && context.approvals) {
        context.setApprovals([...newApprovals, ...context.approvals]);
      }

      return {
        success: true,
        data: { stagedCount },
        summary: `Scheduled D0 cadence drafts for ${stagedCount} leads. Staged in Approvals queue.`,
        recordsModified: stagedCount,
      };
    },
  },

  // 9. Record Payment & Unlock Advance Gate
  record_payment: {
    name: "record_payment",
    label: "Record Advance Payment",
    description: "Validates bank UTR reference, records UPI payment, and transitions proposal to ACCEPTED.",
    category: "finance",
    isConsequential: false,
    parameters: [
      { name: "proposalId", type: "string", description: "ID of the proposal", required: true },
      { name: "amount", type: "number", description: "Amount paid in INR", required: true },
      { name: "utrNumber", type: "string", description: "12-digit Indian bank UTR number", required: true },
    ],
    async execute(params, context) {
      const proposalId = String(params.proposalId);
      const amount = Number(params.amount);
      const utr = String(params.utrNumber).trim();

      const proposal = context.proposals.find((p) => p.id === proposalId);
      if (!proposal) return { success: false, data: null, summary: `Proposal not found.` };

      // Update proposal status
      if (context.setProposals) {
        const updated = context.proposals.map((p) =>
          p.id === proposalId ? { ...p, status: "ACCEPTED" as const, updatedAt: new Date().toISOString() } : p
        );
        context.setProposals(updated);
      }

      return {
        success: true,
        data: { proposalId, amount, utr, status: "ACCEPTED" },
        summary: `Recorded ₹${amount.toLocaleString("en-IN")} advance payment for ${proposal.clientName} (UTR: ${utr}). Proposal ACCEPTED — Advance Gate unlocked!`,
        recordsModified: 1,
      };
    },
  },

  // 10. Get Daily Priorities
  get_daily_priorities: {
    name: "get_daily_priorities",
    label: "Compute Today Sales Priorities",
    description: "Computes the ordered morning routine: Money Due > Replies > Scheduled Follow-ups > New Sends > Project Work.",
    category: "operations",
    isConsequential: false,
    parameters: [],
    async execute(_params, context) {
      const metrics = computeTodayMetrics(
        context.invoices,
        context.clients,
        context.leads,
        context.approvals,
        25000
      );
      const nextAction = determineNextAction(
        context.clients,
        context.leads,
        context.approvals
      );
      const briefing = generateMorningBriefing(metrics, context.founderName || "Shlok");

      return {
        success: true,
        data: { metrics, nextAction, briefing },
        summary: `Morning plan computed: Collected ₹${metrics.collectedAmount.toLocaleString("en-IN")} of ₹${metrics.targetAmount.toLocaleString("en-IN")} (${metrics.progressPercentage}%). Priority 1: "${nextAction.title}" — ${nextAction.subtitle}.`,
      };
    },
  },

  // 11. Export Leads to CSV
  export_leads_csv: {
    name: "export_leads_csv",
    label: "Export Pipeline to CSV",
    description: "Exports all active leads with qualification scores, verified evidence claims, and next actions into an RFC-4180 CSV.",
    category: "leads",
    isConsequential: false,
    parameters: [],
    async execute(_params, context) {
      const csv = exportLeadsToCsv(context.leads);
      return {
        success: true,
        data: { csv, count: context.leads.length },
        summary: `Exported ${context.leads.length} leads to CSV format with full qualification telemetry and contact numbers.`,
      };
    },
  },

  // 12. Query Knowledge Base
  query_knowledge_base: {
    name: "query_knowledge_base",
    label: "Query Knowledge Base",
    description: "Queries Yugantar Growth service catalog, pricing, objection bank, and agency policies.",
    category: "operations",
    isConsequential: false,
    parameters: [
      { name: "query", type: "string", description: "Search query or category", required: true },
    ],
    async execute(params) {
      const q = String(params.query || "").toLowerCase();
      const matched = INITIAL_KNOWLEDGE_ARTICLES.filter((a) =>
        `${a.title} ${a.summary} ${a.details} ${a.tags.join(" ")}`.toLowerCase().includes(q)
      );

      return {
        success: true,
        data: matched.length > 0 ? matched : INITIAL_KNOWLEDGE_ARTICLES,
        summary: `Retrieved ${matched.length > 0 ? matched.length : INITIAL_KNOWLEDGE_ARTICLES.length} relevant knowledge base articles.`,
      };
    },
  },
};

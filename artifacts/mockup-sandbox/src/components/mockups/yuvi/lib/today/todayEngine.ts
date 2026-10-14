// lib/today/todayEngine.ts — Today Command Center & Daily Action Prioritization Engine
// Mobile-first telemetry, ₹25,000 revenue target progress, 3-line morning executive briefing,
// dynamic Next Action Card prioritization, and 4 operational queues.

import type { NormalizedLead, ClientAccount, ClientInvoice, ApprovalItem } from "../types/sales";
import { getActiveBuildCount } from "../project/projectNavigator";

export interface TodayMetrics {
  targetAmount: number;
  collectedAmount: number;
  progressPercentage: number;
  remainingAmount: number;
  dueOutreachCount: number;
  activeBuildsCount: number;
  pendingAdvancesCount: number;
  inboundRepliesCount: number;
}

export type ActionCategory =
  | "PENDING_ADVANCE"
  | "BUILD_SLA_EXPIRING"
  | "INBOUND_REPLY"
  | "PENDING_OUTREACH"
  | "LEAD_RESEARCH"
  | "ALL_CLEAR";

export interface NextActionCardData {
  category: ActionCategory;
  priorityScore: number;
  title: string;
  subtitle: string;
  urgency: "CRITICAL" | "HIGH" | "NORMAL";
  targetName: string;
  targetId: string;
  ctaLabel: string;
  actionPayload?: Record<string, unknown>;
}

export const MONTHLY_REVENUE_TARGET = 25000; // ₹25,000 monthly pilot revenue target

/**
 * Computes live metrics for the Today Command Center without fake mocks.
 */
export function computeTodayMetrics(
  invoices: ClientInvoice[] = [],
  clients: ClientAccount[] = [],
  leads: NormalizedLead[] = [],
  approvals: ApprovalItem[] = [],
  target: number = MONTHLY_REVENUE_TARGET,
): TodayMetrics {
  // Sum verified collections from invoices + direct client advances
  const invoiceCollected = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
  const clientAdvanceCollected = clients.reduce((sum, c) => {
    // avoid double counting if already invoiced
    return sum + (c.advancePayment?.advanceReceived ? c.advancePayment.amountPaid || 0 : 0);
  }, 0);

  const collectedAmount = Math.max(invoiceCollected, clientAdvanceCollected);
  const progressPercentage = target > 0 ? Math.min(100, Math.round((collectedAmount / target) * 100)) : 0;
  const remainingAmount = Math.max(0, target - collectedAmount);

  const dueOutreachCount = approvals.filter(
    (a) => a.status === "APPROVED" || a.status === "PENDING",
  ).length;

  const activeBuildsCount = clients.filter(
    (c) => c.projectStage === "BUILD" && c.status === "ACTIVE",
  ).length;

  const pendingAdvancesCount = clients.filter(
    (c) => !c.advancePayment?.advanceReceived && c.status !== "COMPLETED",
  ).length;

  const inboundRepliesCount = leads.filter(
    (l) => l.status === "REPLIED" || l.status === "CALLBACK" || l.status === "INTERESTED",
  ).length;

  return {
    targetAmount: target,
    collectedAmount,
    progressPercentage,
    remainingAmount,
    dueOutreachCount,
    activeBuildsCount,
    pendingAdvancesCount,
    inboundRepliesCount,
  };
}

/**
 * Generates the standardized 3-line morning executive briefing for Shlok.
 */
export function generateMorningBriefing(
  metrics: TodayMetrics,
  founderName: string = "Shlok",
): [string, string, string] {
  const line1 = `Namaste ${founderName}! Month Target: ₹${metrics.collectedAmount.toLocaleString("en-IN")} of ₹${metrics.targetAmount.toLocaleString("en-IN")} collected (${metrics.progressPercentage}%).`;
  const line2 = `${metrics.dueOutreachCount} outbound touches ready for send · ${metrics.inboundRepliesCount} prospect replies awaiting action.`;
  const line3 = `${metrics.activeBuildsCount}/2 active builds in progress (WIP SLA safe) · ${metrics.pendingAdvancesCount} client advances awaiting UPI verification.`;

  return [line1, line2, line3];
}

/**
 * Evaluates all operational queues and returns the single highest-priority next action.
 */
export function determineNextAction(
  clients: ClientAccount[] = [],
  leads: NormalizedLead[] = [],
  approvals: ApprovalItem[] = [],
): NextActionCardData {
  const now = Date.now();

  // 1. Critical Priority: Pending Advance Payment (Cashflow First!)
  const unpaidClient = clients.find(
    (c) => !c.advancePayment?.advanceReceived && c.status !== "COMPLETED",
  );
  if (unpaidClient) {
    const advanceAmount = Math.round((unpaidClient.contractValue || 25000) * 0.5);
    return {
      category: "PENDING_ADVANCE",
      priorityScore: 100,
      title: "Collect Advance Payment",
      subtitle: `Generate UPI QR and request ₹${advanceAmount.toLocaleString("en-IN")} advance before starting build.`,
      urgency: "CRITICAL",
      targetName: unpaidClient.companyName,
      targetId: unpaidClient.id,
      ctaLabel: "Request Advance (UPI)",
      actionPayload: { clientId: unpaidClient.id, amount: advanceAmount },
    };
  }

  // 2. High Priority: Build SLA Expiring within 24 hours
  const buildProjectNearSla = clients.find((c) => {
    if (c.projectStage === "BUILD" && c.deliveryDeadline) {
      const deadline = new Date(c.deliveryDeadline).getTime();
      const diffHours = (deadline - now) / 3600000;
      return diffHours > 0 && diffHours <= 24;
    }
    return false;
  });
  if (buildProjectNearSla) {
    return {
      category: "BUILD_SLA_EXPIRING",
      priorityScore: 90,
      title: "48-Hour SLA Expiring Soon",
      subtitle: `Build deadline is within 24 hours. Finalize sub-2.0s speed optimization and prepare walkthrough.`,
      urgency: "HIGH",
      targetName: buildProjectNearSla.companyName,
      targetId: buildProjectNearSla.id,
      ctaLabel: "Open Project QA",
      actionPayload: { clientId: buildProjectNearSla.id },
    };
  }

  // 3. High Priority: Inbound Prospect Reply Awaiting Callback
  const repliedLead = leads.find(
    (l) => l.status === "INTERESTED" || l.status === "CALLBACK" || l.status === "REPLIED",
  );
  if (repliedLead) {
    return {
      category: "INBOUND_REPLY",
      priorityScore: 80,
      title: "Respond to Prospect Reply",
      subtitle: `${repliedLead.contactPerson} replied: "${(repliedLead.notes || "Interested in diagnostic").slice(0, 60)}..."`,
      urgency: "HIGH",
      targetName: repliedLead.companyName,
      targetId: repliedLead.id,
      ctaLabel: "Open WhatsApp Chat",
      actionPayload: { leadId: repliedLead.id, phone: repliedLead.phone },
    };
  }

  // 4. Normal Priority: Approved Outreach Touch Ready to Send
  const approvedSend = approvals.find((a) => a.status === "APPROVED");
  if (approvedSend) {
    return {
      category: "PENDING_OUTREACH",
      priorityScore: 70,
      title: "Dispatch Approved Outreach",
      subtitle: `Staged copy approved for ${approvedSend.title}. Review and dispatch via WhatsApp Web.`,
      urgency: "NORMAL",
      targetName: approvedSend.title,
      targetId: approvedSend.id,
      ctaLabel: "Open Send Gate",
      actionPayload: { approvalId: approvedSend.id },
    };
  }

  // 5. Normal Priority: Unresearched High-Value Lead
  const unresearchedLead = leads.find(
    (l) => (l.researchEvidence?.length || 0) === 0 && (l.tier === "A" || l.tier === "B"),
  );
  if (unresearchedLead) {
    return {
      category: "LEAD_RESEARCH",
      priorityScore: 60,
      title: "Run Deep Audit & Telemetry",
      subtitle: `Tier ${unresearchedLead.tier} prospect has 0 evidence logged. Scan website & PageSpeed.`,
      urgency: "NORMAL",
      targetName: unresearchedLead.companyName,
      targetId: unresearchedLead.id,
      ctaLabel: "Run Diagnostic Scan",
      actionPayload: { leadId: unresearchedLead.id },
    };
  }

  // Fallback: All clear
  return {
    category: "ALL_CLEAR",
    priorityScore: 10,
    title: "All Action Queues Cleared!",
    subtitle: "No urgent actions due. Review pipeline metrics or scout new Gujarat B2B leads.",
    urgency: "NORMAL",
    targetName: "Yugantar Growth",
    targetId: "yuvi-hq",
    ctaLabel: "Explore Leads",
  };
}

/**
 * Formats the 4 Action Queues for the mobile Today Screen.
 */
export function getActionQueues(
  approvals: ApprovalItem[] = [],
  leads: NormalizedLead[] = [],
  clients: ClientAccount[] = [],
) {
  const sendQueue = approvals.filter(
    (a) => a.status === "APPROVED" || a.status === "PENDING",
  );

  const replyQueue = leads.filter(
    (l) => l.status === "INTERESTED" || l.status === "CALLBACK" || l.status === "REPLIED",
  );

  const moneyQueue = clients.filter(
    (c) => !c.advancePayment?.advanceReceived && c.status !== "COMPLETED",
  );

  const projectsQueue = clients.filter((c) => c.status === "ACTIVE");

  return {
    sendQueue,
    replyQueue,
    moneyQueue,
    projectsQueue,
  };
}

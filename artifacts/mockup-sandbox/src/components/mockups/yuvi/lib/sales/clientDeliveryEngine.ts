// lib/sales/clientDeliveryEngine.ts — Lead-to-Client Conversion & Project Delivery Engine
import type {
  NormalizedLead,
  ClientAccount,
  ClientDeliverable,
  ClientMilestone,
} from "../types/sales";

export interface ConvertLeadOptions {
  engagementType: "MONTHLY_RETAINER" | "FIXED_PROJECT";
  monthlyRetainer?: number; // e.g. 120000
  contractValue?: number;   // e.g. 150000
  startDate?: string;
  agreedScope?: string[];
  initialDeliverables?: string[];
  author?: string;
}

/**
 * Converts a qualified lead into a full client account without losing history or duplicating records.
 * Updates the lead status to WON and logs the conversion.
 */
export function convertLeadToClient(
  lead: NormalizedLead,
  options: ConvertLeadOptions
): { updatedLead: NormalizedLead; client: ClientAccount } {
  const clientId = `client_${lead.id}`;
  const now = new Date().toISOString();
  const startDate = options.startDate || now.split("T")[0];

  const defaultScope = options.agreedScope && options.agreedScope.length > 0
    ? options.agreedScope
    : [
        lead.primaryService || "Growth Operating System & Outbound Pipeline",
        "Target ICP acquisition & high-converting messaging framework",
        "Weekly pipeline synchronization & conversion audit"
      ];

  const deliverables: ClientDeliverable[] = (options.initialDeliverables || [
    "ICP Mapping & Gujarat Market Telemetry Setup",
    "B2B Conversion Architecture & Pitch Angle Calibration",
    "First Outbound Sprint Launch & Meeting Pipeline Setup"
  ]).map((title, idx) => ({
    id: `deliv_${idx + 1}`,
    title,
    status: idx === 0 ? "IN_PROGRESS" : "PENDING",
    dueDate: new Date(Date.now() + (idx + 1) * 7 * 24 * 3600 * 1000).toISOString().split("T")[0]
  }));

  const milestones: ClientMilestone[] = [
    {
      id: "m_01",
      title: "Kickoff & Onboarding Workshop",
      amount: options.engagementType === "MONTHLY_RETAINER" ? options.monthlyRetainer : Math.round((options.contractValue || 0) * 0.5),
      status: "COMPLETED",
      completedAt: now,
      dueDate: startDate
    },
    {
      id: "m_02",
      title: "Pipeline Infrastructure Go-Live",
      amount: options.engagementType === "MONTHLY_RETAINER" ? options.monthlyRetainer : Math.round((options.contractValue || 0) * 0.5),
      status: "PENDING",
      dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split("T")[0]
    }
  ];

  const client: ClientAccount = {
    id: clientId,
    leadId: lead.id,
    companyName: lead.companyName,
    contactPerson: lead.contactPerson || "Founder / Decision Maker",
    phone: lead.phone,
    email: lead.email,
    websiteUrl: lead.websiteUrl,
    city: lead.city,
    state: lead.state,
    country: lead.country,
    industry: lead.industry || lead.category,
    status: "ACTIVE",
    engagementType: options.engagementType,
    monthlyRetainer: options.engagementType === "MONTHLY_RETAINER" ? (options.monthlyRetainer || 120000) : undefined,
    contractValue: options.contractValue || (options.monthlyRetainer ? options.monthlyRetainer * 3 : 150000),
    startDate,
    agreedScope: defaultScope,
    deliverables,
    milestones,
    nextAction: {
      title: "Deliver Milestone 2: Pipeline Infrastructure Go-Live",
      dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split("T")[0]
    },
    notes: `Converted from CRM Lead (${lead.id}). Prior bottleneck: "${lead.bottleneck || "None recorded"}".`,
    createdAt: now,
    updatedAt: now
  };

  const conversionActivity = {
    id: `act_${Date.now()}_conv`,
    timestamp: now,
    action: "Lead Converted to Active Client Account",
    note: `Agreement Type: ${options.engagementType}. Value: ₹${(client.monthlyRetainer || client.contractValue || 0).toLocaleString("en-IN")}.`,
    author: options.author || "Shlok Pandya"
  };

  const updatedLead: NormalizedLead = {
    ...lead,
    status: "WON",
    activityHistory: [conversionActivity, ...(lead.activityHistory || [])],
    updatedAt: now
  };

  return { updatedLead, client };
}

/**
 * Updates deliverable status on a client account.
 */
export function updateDeliverableStatus(
  client: ClientAccount,
  deliverableId: string,
  newStatus: ClientDeliverable["status"]
): ClientAccount {
  const updatedDeliverables = client.deliverables.map(d => {
    if (d.id === deliverableId) {
      return {
        ...d,
        status: newStatus,
        completedAt: newStatus === "COMPLETED" ? new Date().toISOString() : undefined
      };
    }
    return d;
  });

  return {
    ...client,
    deliverables: updatedDeliverables,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Updates milestone status on a client account.
 */
export function updateMilestoneStatus(
  client: ClientAccount,
  milestoneId: string,
  newStatus: ClientMilestone["status"]
): ClientAccount {
  const updatedMilestones = client.milestones.map(m => {
    if (m.id === milestoneId) {
      return {
        ...m,
        status: newStatus,
        completedAt: newStatus === "COMPLETED" ? new Date().toISOString() : undefined
      };
    }
    return m;
  });

  return {
    ...client,
    milestones: updatedMilestones,
    updatedAt: new Date().toISOString()
  };
}

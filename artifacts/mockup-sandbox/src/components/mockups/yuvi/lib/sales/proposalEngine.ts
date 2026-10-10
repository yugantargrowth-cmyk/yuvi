// lib/sales/proposalEngine.ts — Commercial Proposal & Quotation Engine
import type { NormalizedLead, CommercialProposal, ProposalItem } from "../types/sales";

export interface ProposalTemplate {
  key: string;
  title: string;
  scopeSummary: string;
  deliverables: string[];
  defaultItems: { description: string; quantity: number; unitPrice: number }[];
  timelineWeeks: number;
  paymentTerms: string;
}

export const PROPOSAL_TEMPLATES: Record<string, ProposalTemplate> = {
  outbound_b2b: {
    key: "outbound_b2b",
    title: "Direct B2B Outbound Acquisition & Pipeline Infrastructure",
    scopeSummary: "End-to-end outbound client acquisition system targeting high-ticket commercial accounts in the Gujarat corridor. Includes lead intelligence, qualification architecture, and multi-channel introduction protocols.",
    deliverables: [
      "Target market ICP mapping & verifiable lead sourcing (Gujarat region)",
      "Multi-channel outreach architecture (Phone, WhatsApp, Executive Email)",
      "Dedicated objection-handling & discovery call scripts",
      "Bi-weekly pipeline velocity reports & conversion telemetry"
    ],
    defaultItems: [
      { description: "Outbound Pipeline Architecture & ICP Setup", quantity: 1, unitPrice: 45000 },
      { description: "Multi-Channel Introduction & Conversion Funnel", quantity: 1, unitPrice: 55000 },
      { description: "Lead Qualification & Verification Gate Integration", quantity: 1, unitPrice: 25000 }
    ],
    timelineWeeks: 4,
    paymentTerms: "50% advance on agreement signing, 50% upon milestone 2 delivery (Net 15)."
  },
  web_conversion: {
    key: "web_conversion",
    title: "Conversion Architecture & High-Speed Commercial Web Portal",
    scopeSummary: "Complete restructuring of digital presence into a high-converting commercial anchor designed for Gujarat builders, architects, and corporate decision-makers. Sub-1.2s load speeds and mobile-first consultation flows.",
    deliverables: [
      "Bespoke commercial showcase architecture with fast loading guarantees",
      "Executive consultation scheduling portal with automated qualification",
      "Direct WhatsApp and call routing with conversion attribution",
      "Local Gujarat SEO & high-authority business profile integration"
    ],
    defaultItems: [
      { description: "Commercial UX/UI & Conversion Architecture", quantity: 1, unitPrice: 60000 },
      { description: "Full-Stack Web Portal Build & CDN Deployment", quantity: 1, unitPrice: 75000 },
      { description: "WhatsApp Routing & Lead Capture Instrumentation", quantity: 1, unitPrice: 15000 }
    ],
    timelineWeeks: 3,
    paymentTerms: "50% upfront deposit, 30% on staging review, 20% on production deployment."
  },
  turnkey_growth_os: {
    key: "turnkey_growth_os",
    title: "Full Turnkey Growth Operating System Retainer",
    scopeSummary: "Comprehensive monthly agency partnership providing continuous pipeline acquisition, commercial asset development, follow-up management, and executive growth advisory.",
    deliverables: [
      "Dedicated outbound pipeline development (continuous weekly sprints)",
      "Commercial brand asset creation & high-authority LinkedIn positioning",
      "Inbound inquiry triage, response drafting, and call queue prioritization",
      "Weekly strategic executive review with agency founder"
    ],
    defaultItems: [
      { description: "Monthly Growth OS Retainer (Sprints 1-4)", quantity: 1, unitPrice: 120000 }
    ],
    timelineWeeks: 12,
    paymentTerms: "Monthly retainer payable in advance on the 1st of each calendar month (Net 7)."
  }
};

/**
 * Calculates item totals, subtotal, tax amount, and grand total.
 */
export function calculateProposalTotals(
  items: ProposalItem[],
  taxRate: number = 18
): { subtotal: number; taxAmount: number; totalAmount: number } {
  const subtotal = items.reduce((sum, item) => sum + Math.max(0, item.quantity * item.unitPrice), 0);
  const taxAmount = Math.round((subtotal * Math.max(0, taxRate)) / 100);
  const totalAmount = subtotal + taxAmount;
  return { subtotal, taxAmount, totalAmount };
}

/**
 * Creates a structured proposal from a lead record and selected template.
 */
export function createProposalFromLead(
  lead: NormalizedLead,
  templateKey: string = "outbound_b2b",
  overrides?: Partial<CommercialProposal>
): CommercialProposal {
  const template = PROPOSAL_TEMPLATES[templateKey] || PROPOSAL_TEMPLATES.outbound_b2b;
  const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const proposalNumber = `YG-PROP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const items: ProposalItem[] = template.defaultItems.map((item, idx) => ({
    id: `item_${idx + 1}`,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.quantity * item.unitPrice
  }));

  const { subtotal, taxAmount, totalAmount } = calculateProposalTotals(items, 18);

  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + 30);

  const proposal: CommercialProposal = {
    id: proposalId,
    leadId: lead.id,
    proposalNumber,
    title: `${lead.companyName} — ${template.title}`,
    clientName: lead.companyName,
    contactPerson: lead.contactPerson || "Managing Director",
    phone: lead.phone,
    email: lead.email,
    status: "DRAFT",
    createdAt: new Date().toISOString(),
    validUntil: validUntilDate.toISOString().split("T")[0],
    scopeSummary: template.scopeSummary,
    items,
    subtotal,
    taxRate: 18,
    taxAmount,
    totalAmount,
    currency: "INR",
    timelineWeeks: template.timelineWeeks,
    paymentTerms: template.paymentTerms,
    deliverables: [...template.deliverables],
    notes: lead.bottleneck ? `Key Bottleneck Addressed: ${lead.bottleneck}` : undefined,
    ...overrides
  };

  return proposal;
}

/**
 * Validates proposal integrity.
 */
export function validateProposal(proposal: CommercialProposal): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!proposal.clientName || !proposal.clientName.trim()) {
    errors.push("Client / Company name is required.");
  }
  if (!proposal.proposalNumber || !proposal.proposalNumber.trim()) {
    errors.push("Proposal number is required.");
  }
  if (!Array.isArray(proposal.items) || proposal.items.length === 0) {
    errors.push("At least one proposal line item is required.");
  }
  for (const item of proposal.items || []) {
    if (item.quantity <= 0) errors.push(`Invalid quantity for line item: "${item.description}"`);
    if (item.unitPrice < 0) errors.push(`Invalid price for line item: "${item.description}"`);
  }
  if (proposal.totalAmount < 0) {
    errors.push("Total amount cannot be negative.");
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

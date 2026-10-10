// scripts/src/test-crm-delivery-finance.ts — Verification of P1, P2, P3, P4 Engines
import { convertLeadToClient, updateDeliverableStatus, updateMilestoneStatus } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/clientDeliveryEngine";
import {
  createProposalFromLead,
  calculateProposalTotals,
  validateProposal,
  PROPOSAL_TEMPLATES
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/proposalEngine";
import {
  calculateInvoiceTotals,
  createInvoiceFromProposal,
  recordInvoicePayment,
  computeFinancialSummary,
  determineInvoiceStatus
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/financeEngine";
import type { NormalizedLead, CommercialProposal, ClientInvoice } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/types/sales";

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

const dummyLead: NormalizedLead = {
  id: "lead_test_01",
  companyName: "Vrajesh Textiles",
  contactPerson: "Vrajesh Shah",
  phone: "+919825099887",
  email: "vrajesh@vrakeshtextiles.com",
  websiteUrl: "https://vrakeshtextiles.com",
  city: "Surat",
  state: "Gujarat",
  country: "India",
  industry: "Textile Exports",
  category: "Industrial",
  status: "QUALIFIED",
  score: 88,
  tier: "A",
  notes: "High value textile exporter looking for GCC buyers.",
  bottleneck: "Lacks digital export acquisition engine.",
  primaryService: "Direct Outbound & High-Value B2B Pipeline Acquisition",
  recommendedChannel: "WHATSAPP",
  verifiedClaims: ["Export unit registered in Surat."],
  rawRecord: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  activityHistory: [
    {
      id: "act_1",
      timestamp: new Date().toISOString(),
      action: "Lead Created",
      author: "Scout"
    }
  ]
};

console.log("==================================================================");
console.log("🧪 TESTING P1 & P2: LEAD-TO-CLIENT CONVERSION & PROJECT DELIVERY");
console.log("==================================================================");

// 1. Conversion
const conversion = convertLeadToClient(dummyLead, {
  engagementType: "MONTHLY_RETAINER",
  monthlyRetainer: 120000,
  author: "Shlok Pandya"
});

assert(conversion.updatedLead.status === "WON", "Lead status updated to WON");
assert(conversion.updatedLead.activityHistory?.length === 2, "Conversion recorded in lead activity history");
assert(conversion.client.id === `client_${dummyLead.id}`, "Client ID links to lead ID");
assert(conversion.client.companyName === dummyLead.companyName, "Client retains company name");
assert(conversion.client.monthlyRetainer === 120000, "Retainer matches specified value");
assert(conversion.client.deliverables.length >= 3, "Initial project deliverables generated");
assert(conversion.client.milestones.length >= 2, "Initial project milestones generated");

// 2. Deliverable update
const updatedDeliv = updateDeliverableStatus(conversion.client, conversion.client.deliverables[0].id, "COMPLETED");
assert(updatedDeliv.deliverables[0].status === "COMPLETED", "Deliverable marked as COMPLETED");
assert(Boolean(updatedDeliv.deliverables[0].completedAt), "Completion timestamp recorded");

// 3. Milestone update
const updatedMilestone = updateMilestoneStatus(conversion.client, conversion.client.milestones[1].id, "COMPLETED");
assert(updatedMilestone.milestones[1].status === "COMPLETED", "Milestone marked as COMPLETED");

console.log("\n==================================================================");
console.log("🧪 TESTING P3: PROPOSALS & QUOTATION ENGINE");
console.log("==================================================================");

const totalsCalc = calculateProposalTotals([
  { id: "1", description: "Design", quantity: 1, unitPrice: 50000, amount: 50000 },
  { id: "2", description: "Development", quantity: 2, unitPrice: 25000, amount: 50000 }
], 18);

assert(totalsCalc.subtotal === 100000, "Calculates subtotal accurately (100,000)");
assert(totalsCalc.taxAmount === 18000, "Calculates 18% GST accurately (18,000)");
assert(totalsCalc.totalAmount === 118000, "Calculates total amount accurately (118,000)");

const proposal = createProposalFromLead(dummyLead, "outbound_b2b");
assert(proposal.clientName === dummyLead.companyName, "Proposal client name matches lead");
assert(proposal.items.length === PROPOSAL_TEMPLATES.outbound_b2b.defaultItems.length, "Uses template items");
assert(proposal.status === "DRAFT", "Initial proposal status is DRAFT");
assert(proposal.taxRate === 18, "Standard GST rate is 18%");
assert(proposal.totalAmount === proposal.subtotal + proposal.taxAmount, "Proposal total matches subtotal + tax");

const validation = validateProposal(proposal);
assert(validation.valid === true, "Generated proposal passes validation");

console.log("\n==================================================================");
console.log("🧪 TESTING P4: INVOICING, ACCOUNTING & FINANCIAL SUMMARY");
console.log("==================================================================");

const invoice = createInvoiceFromProposal(proposal, 15);
assert(invoice.clientName === proposal.clientName, "Invoice client matches proposal");
assert(invoice.totalAmount === proposal.totalAmount, "Invoice total matches proposal total");
assert(invoice.balanceDue === proposal.totalAmount, "Initial balance due equals total amount");
assert(invoice.status === "SENT", "Invoice initial status is SENT");

// Partial payment
const partialPayInvoice = recordInvoicePayment(invoice, {
  amount: 50000,
  paymentMethod: "NEFT_RTGS",
  transactionRef: "RTGS-99882233"
});
assert(partialPayInvoice.amountPaid === 50000, "Records partial payment (50,000)");
assert(partialPayInvoice.balanceDue === invoice.totalAmount - 50000, "Recalculates balance due");
assert(partialPayInvoice.status === "PARTIALLY_PAID", "Invoice status changes to PARTIALLY_PAID");
assert(partialPayInvoice.paymentRecords.length === 1, "Payment record stored with transaction reference");

// Full payment
const fullPayInvoice = recordInvoicePayment(partialPayInvoice, {
  amount: partialPayInvoice.balanceDue,
  paymentMethod: "UPI",
  transactionRef: "UPI-44332211"
});
assert(fullPayInvoice.balanceDue === 0, "Full payment results in zero balance due");
assert(fullPayInvoice.status === "PAID", "Invoice status changes to PAID");
assert(fullPayInvoice.paymentRecords.length === 2, "Second payment record stored");

// Financial Summary
const summary = computeFinancialSummary([invoice, fullPayInvoice], [conversion.client]);
assert(summary.totalInvoiced === invoice.totalAmount + fullPayInvoice.totalAmount, "Total invoiced matches sum");
assert(summary.totalCollected === invoice.amountPaid + fullPayInvoice.amountPaid, "Total collected matches sum");
assert(summary.outstandingBalance === invoice.balanceDue + fullPayInvoice.balanceDue, "Outstanding balance accurate");
assert(summary.activeRetainersMonthly === 120000, "Active monthly retainers computed from client contracts");

console.log("\n==================================================================");
console.log(`🎉 TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
console.log("==================================================================");

if (totalFailed > 0) {
  process.exit(1);
}

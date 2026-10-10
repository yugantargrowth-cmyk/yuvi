// lib/sales/financeEngine.ts — Commercial Accounting, Invoices & Collections Engine
import type {
  ClientInvoice,
  InvoiceItem,
  InvoicePaymentRecord,
  FinancialSummary,
  CommercialProposal,
  ClientAccount,
} from "../types/sales";

/**
 * Calculates item totals, taxes, paid amount, and outstanding balance due.
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[],
  taxRate: number = 18,
  amountPaid: number = 0
): {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
} {
  const subtotal = items.reduce((sum, item) => sum + Math.max(0, item.quantity * item.unitPrice), 0);
  const taxAmount = Math.round((subtotal * Math.max(0, taxRate)) / 100);
  const totalAmount = subtotal + taxAmount;
  const safePaid = Math.max(0, Math.min(amountPaid, totalAmount));
  const balanceDue = Math.max(0, totalAmount - safePaid);

  return {
    subtotal,
    taxAmount,
    totalAmount,
    amountPaid: safePaid,
    balanceDue,
  };
}

/**
 * Evaluates whether an invoice is overdue based on due date and balance due.
 */
export function determineInvoiceStatus(
  dueDate: string,
  totalAmount: number,
  amountPaid: number,
  currentStatus: ClientInvoice["status"]
): ClientInvoice["status"] {
  if (currentStatus === "DRAFT") return "DRAFT";
  if (amountPaid >= totalAmount && totalAmount > 0) return "PAID";
  if (amountPaid > 0 && amountPaid < totalAmount) {
    const isPastDue = new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
    return isPastDue ? "OVERDUE" : "PARTIALLY_PAID";
  }
  const isPastDue = new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
  return isPastDue ? "OVERDUE" : currentStatus === "SENT" ? "SENT" : "DRAFT";
}

/**
 * Creates a formal invoice directly from an accepted or active proposal.
 */
export function createInvoiceFromProposal(
  proposal: CommercialProposal,
  dueDateDays: number = 15
): ClientInvoice {
  const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const invoiceNumber = `YG-INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const items: InvoiceItem[] = proposal.items.map((pi, idx) => ({
    id: `inv_item_${idx + 1}`,
    description: pi.description,
    quantity: pi.quantity,
    unitPrice: pi.unitPrice,
    amount: pi.amount,
  }));

  const issueDate = new Date().toISOString().split("T")[0];
  const due = new Date();
  due.setDate(due.getDate() + dueDateDays);
  const dueDate = due.toISOString().split("T")[0];

  const totals = calculateInvoiceTotals(items, proposal.taxRate || 18, 0);

  return {
    id: invoiceId,
    invoiceNumber,
    clientId: proposal.clientId,
    leadId: proposal.leadId,
    clientName: proposal.clientName,
    contactPerson: proposal.contactPerson,
    email: proposal.email,
    phone: proposal.phone,
    issueDate,
    dueDate,
    status: "SENT",
    items,
    subtotal: totals.subtotal,
    taxRate: proposal.taxRate || 18,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
    amountPaid: 0,
    balanceDue: totals.balanceDue,
    currency: proposal.currency || "INR",
    paymentRecords: [],
    notes: `Generated from Proposal ${proposal.proposalNumber}: ${proposal.title}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Records a real verified payment against an invoice.
 */
export function recordInvoicePayment(
  invoice: ClientInvoice,
  payment: {
    amount: number;
    paymentMethod: InvoicePaymentRecord["paymentMethod"];
    transactionRef: string;
    notes?: string;
  }
): ClientInvoice {
  if (payment.amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const paymentRecord: InvoicePaymentRecord = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    amount: payment.amount,
    paidAt: new Date().toISOString(),
    paymentMethod: payment.paymentMethod,
    transactionRef: payment.transactionRef.trim() || `TXN-${Date.now()}`,
    notes: payment.notes?.trim(),
  };

  const newAmountPaid = invoice.amountPaid + payment.amount;
  const newBalanceDue = Math.max(0, invoice.totalAmount - newAmountPaid);
  const newStatus: ClientInvoice["status"] =
    newBalanceDue === 0 ? "PAID" : "PARTIALLY_PAID";

  return {
    ...invoice,
    amountPaid: newAmountPaid,
    balanceDue: newBalanceDue,
    status: newStatus,
    paymentRecords: [paymentRecord, ...(invoice.paymentRecords || [])],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Computes live, un-fabricated financial summary metrics based strictly on saved records.
 */
export function computeFinancialSummary(
  invoices: ClientInvoice[],
  clients: ClientAccount[] = []
): FinancialSummary {
  let totalInvoiced = 0;
  let totalCollected = 0;
  let outstandingBalance = 0;
  let overdueAmount = 0;

  let paidCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;

  for (const inv of invoices) {
    totalInvoiced += inv.totalAmount;
    totalCollected += inv.amountPaid;
    outstandingBalance += inv.balanceDue;

    const effectiveStatus = determineInvoiceStatus(
      inv.dueDate,
      inv.totalAmount,
      inv.amountPaid,
      inv.status
    );

    if (effectiveStatus === "PAID") {
      paidCount++;
    } else if (effectiveStatus === "OVERDUE") {
      overdueCount++;
      overdueAmount += inv.balanceDue;
    } else {
      pendingCount++;
    }
  }

  // Active retainers sum strictly from active client contracts
  const activeRetainersMonthly = clients
    .filter((c) => c.status === "ACTIVE" && c.engagementType === "MONTHLY_RETAINER")
    .reduce((sum, c) => sum + (c.monthlyRetainer || 0), 0);

  return {
    totalInvoiced,
    totalCollected,
    outstandingBalance,
    overdueAmount,
    activeRetainersMonthly,
    invoicesCount: {
      total: invoices.length,
      paid: paidCount,
      pending: pendingCount,
      overdue: overdueCount,
    },
  };
}

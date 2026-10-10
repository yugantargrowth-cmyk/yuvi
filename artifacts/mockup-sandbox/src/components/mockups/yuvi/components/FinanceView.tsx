// components/FinanceView.tsx — Commercial Revenue, Invoicing & Collections Deck
import React, { useState } from "react";
import type { ClientInvoice, ClientAccount, InvoicePaymentRecord } from "../lib/types/sales";
import {
  calculateInvoiceTotals,
  recordInvoicePayment,
  computeFinancialSummary,
  determineInvoiceStatus
} from "../lib/sales/financeEngine";
import { Button, Panel, ViewHeading } from "./ui";
import {
  IndianRupee, Plus, Download, Printer, CheckCircle2, Clock, AlertTriangle,
  CreditCard, Eye, X, ArrowUpRight, DollarSign, ShieldCheck
} from "lucide-react";

interface FinanceViewProps {
  invoices: ClientInvoice[];
  setInvoices: React.Dispatch<React.SetStateAction<ClientInvoice[]>>;
  clients: ClientAccount[];
  notify: (text: string) => void;
}

export function FinanceView({
  invoices,
  setInvoices,
  clients,
  notify,
}: FinanceViewProps) {
  const [filter, setFilter] = useState<string>("ALL");
  const [activeInvoiceForDoc, setActiveInvoiceForDoc] = useState<ClientInvoice | null>(null);
  const [recordingPaymentInvoice, setRecordingPaymentInvoice] = useState<ClientInvoice | null>(null);

  // Record payment form
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<InvoicePaymentRecord["paymentMethod"]>("NEFT_RTGS");
  const [payRef, setPayRef] = useState<string>("");
  const [payNotes, setPayNotes] = useState<string>("");

  // Create invoice form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || "");
  const [invDesc, setInvDesc] = useState("Monthly Growth OS Partner Retainer (Sprints 1-4)");
  const [invAmount, setInvAmount] = useState<number>(120000);
  const [invDueDays, setInvDueDays] = useState<number>(15);

  const summary = computeFinancialSummary(invoices, clients);

  const shown = invoices.filter(inv => {
    if (filter === "ALL") return true;
    const effStatus = determineInvoiceStatus(inv.dueDate, inv.totalAmount, inv.amountPaid, inv.status);
    return effStatus === filter;
  });

  const handleOpenRecordPayment = (inv: ClientInvoice) => {
    setRecordingPaymentInvoice(inv);
    setPayAmount(inv.balanceDue);
    setPayRef(`RTGS-${Date.now().toString().slice(-6)}`);
    setPayNotes("");
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingPaymentInvoice) return;

    try {
      const updated = recordInvoicePayment(recordingPaymentInvoice, {
        amount: Number(payAmount),
        paymentMethod: payMethod,
        transactionRef: payRef,
        notes: payNotes,
      });

      setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
      setRecordingPaymentInvoice(null);
      notify(`Recorded payment of ₹${Number(payAmount).toLocaleString("en-IN")} against ${updated.invoiceNumber}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Payment recording failed: ${msg}`);
    }
  };

  const handleCreateDirectInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) {
      notify("Please select a retained client.");
      return;
    }

    const items = [{
      id: "item_1",
      description: invDesc.trim() || "Agency Growth Retainer",
      quantity: 1,
      unitPrice: Number(invAmount),
      amount: Number(invAmount)
    }];

    const totals = calculateInvoiceTotals(items, 18, 0);
    const issueDate = new Date().toISOString().split("T")[0];
    const due = new Date();
    due.setDate(due.getDate() + invDueDays);
    const dueDate = due.toISOString().split("T")[0];

    const newInvoice: ClientInvoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber: `YG-INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      clientId: client.id,
      leadId: client.leadId,
      clientName: client.companyName,
      contactPerson: client.contactPerson,
      email: client.email,
      phone: client.phone,
      issueDate,
      dueDate,
      status: "SENT",
      items,
      subtotal: totals.subtotal,
      taxRate: 18,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      amountPaid: 0,
      balanceDue: totals.balanceDue,
      currency: "INR",
      paymentRecords: [],
      notes: `Billing for ${client.companyName} (${client.city}, Gujarat).`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setInvoices(prev => [newInvoice, ...prev]);
    setShowCreateModal(false);
    notify(`Created Invoice ${newInvoice.invoiceNumber} for ${client.companyName}.`);
  };

  return (
    <div className="rise space-y-5 p-4 sm:p-7">
      <ViewHeading
        view="Finance"
        description="Revenue, Invoicing & Collections — Computed strictly from real accounting receipts & contract retainers."
        action={
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={14} /> Create Invoice
          </Button>
        }
      />

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Total Invoiced</div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            ₹{(summary.totalInvoiced / 100000).toFixed(2)}L
          </div>
          <div className="mt-1 text-[9px] text-slate-400">
            {summary.invoicesCount.total} total invoices issued
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Cash Collected</div>
          <div className="mt-2 text-2xl font-bold text-emerald-300 font-mono">
            ₹{(summary.totalCollected / 100000).toFixed(2)}L
          </div>
          <div className="mt-1 text-[9px] text-emerald-200">
            {summary.invoicesCount.paid} fully settled
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Outstanding Balance</div>
          <div className="mt-2 text-2xl font-bold text-cyan-300 font-mono">
            ₹{(summary.outstandingBalance / 100000).toFixed(2)}L
          </div>
          <div className="mt-1 text-[9px] text-cyan-200">
            {summary.invoicesCount.pending} pending collection
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Active Retainers Volume</div>
          <div className="mt-2 text-2xl font-bold text-violet-300 font-mono">
            ₹{(summary.activeRetainersMonthly / 100000).toFixed(2)}L <span className="text-xs font-normal text-slate-400">/ mo</span>
          </div>
          <div className="mt-1 text-[9px] text-slate-400">
            From {clients.filter(c => c.status === "ACTIVE").length} active accounts
          </div>
        </Panel>
      </div>

      {/* Invoices Table */}
      <Panel className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
          <div className="text-xs font-semibold text-white">Commercial Invoice & Collections Register</div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none"
            >
              <option value="ALL">All Invoices ({invoices.length})</option>
              <option value="PAID">Paid ({summary.invoicesCount.paid})</option>
              <option value="SENT">Pending Payment</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="OVERDUE">Overdue ({summary.invoicesCount.overdue})</option>
            </select>
          </div>
        </div>

        <div className="mt-4 divide-y divide-white/5">
          {shown.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No invoices matching current filter. Click "Create Invoice" to issue a billing statement.
            </div>
          ) : (
            shown.map(inv => {
              const effStatus = determineInvoiceStatus(inv.dueDate, inv.totalAmount, inv.amountPaid, inv.status);
              const statusColor =
                effStatus === "PAID" ? "emerald" :
                effStatus === "OVERDUE" ? "rose" :
                effStatus === "PARTIALLY_PAID" ? "amber" : "cyan";

              return (
                <div key={inv.id} className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono text-xs font-bold">
                      <IndianRupee size={18} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-cyan-300 font-semibold">{inv.invoiceNumber}</span>
                        <span className={`rounded-full border border-${statusColor}-400/30 bg-${statusColor}-500/10 px-2 py-0.5 text-[9px] font-bold text-${statusColor}-300`}>
                          {effStatus}
                        </span>
                      </div>
                      <h4 className="mt-0.5 text-sm font-bold text-white">{inv.clientName}</h4>
                      <div className="text-xs text-slate-400">
                        Attn: {inv.contactPerson} · Issued: {inv.issueDate}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500">
                        Due Date: <b className={effStatus === "OVERDUE" ? "text-rose-400" : "text-slate-400"}>{inv.dueDate}</b>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <div className="text-right mr-3">
                      <div className="text-sm font-bold text-white font-mono">
                        ₹{inv.totalAmount.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {inv.balanceDue > 0 ? (
                          <span className="text-amber-300 font-mono">Due: ₹{inv.balanceDue.toLocaleString("en-IN")}</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">Fully Settled</span>
                        )}
                      </div>
                    </div>

                    <Button onClick={() => setActiveInvoiceForDoc(inv)}>
                      <Eye size={13} /> View / Print
                    </Button>

                    {inv.balanceDue > 0 && (
                      <Button variant="primary" onClick={() => handleOpenRecordPayment(inv)}>
                        <CreditCard size={13} /> Record Payment
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Panel>

      {/* CREATE DIRECT INVOICE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-violet-500/30 bg-[#0d0f22] p-6 shadow-2xl text-left my-8">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <IndianRupee size={18} className="text-violet-400" /> Create Commercial Invoice
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Issue an itemized billing invoice with 18% GST calculation.
            </p>

            <form onSubmit={handleCreateDirectInvoice} className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-300">Target Client Account</label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.city}) — {c.engagementType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-300">Service Description</label>
                <input
                  type="text"
                  value={invDesc}
                  onChange={e => setInvDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-300">Subtotal Amount (₹)</label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={invAmount}
                    onChange={e => setInvAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-300">Payment Due In (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={invDueDays}
                    onChange={e => setInvDueDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div className="border border-white/10 rounded-xl p-3 bg-black/20 text-xs font-mono space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>₹{invAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST (18%):</span>
                  <span>₹{Math.round(invAmount * 0.18).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-emerald-300 font-bold border-t border-white/10 pt-1">
                  <span>Total Due:</span>
                  <span>₹{Math.round(invAmount * 1.18).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">
                  Generate & Send Invoice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {recordingPaymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[#0d0f22] p-6 shadow-2xl text-left my-8">
            <button
              onClick={() => setRecordingPaymentInvoice(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-400" /> Record Client Payment
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Record verified bank receipt for <b>{recordingPaymentInvoice.clientName}</b> ({recordingPaymentInvoice.invoiceNumber}).
            </p>

            <form onSubmit={handleConfirmPayment} className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-300">Amount Received (₹)</label>
                <input
                  type="number"
                  min={1}
                  max={recordingPaymentInvoice.balanceDue}
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white font-mono outline-none"
                  required
                />
                <div className="mt-1 text-[9px] text-slate-500">
                  Total outstanding balance due: ₹{recordingPaymentInvoice.balanceDue.toLocaleString("en-IN")}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-300">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="NEFT_RTGS">NEFT / RTGS Bank Transfer</option>
                  <option value="UPI">UPI Direct / QR</option>
                  <option value="BANK_TRANSFER">IMPS / Direct Wire</option>
                  <option value="CHEQUE">Commercial Cheque</option>
                  <option value="OTHER">Other Verified Rail</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-300">Transaction Reference / UTR</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                  placeholder="e.g. UTR-9988223311"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-300">Notes (Optional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="e.g. Month 1 Retainer advance payment"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setRecordingPaymentInvoice(null)}>Cancel</Button>
                <Button variant="success" type="submit">
                  Confirm Payment Receipt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE DOCUMENT VIEWER */}
      {activeInvoiceForDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-white/20 bg-white text-slate-900 p-8 shadow-2xl text-left my-8 print:m-0 print:p-0 print:border-none print:shadow-none">
            <button
              onClick={() => setActiveInvoiceForDoc(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:text-slate-900 print:hidden"
            >
              <X size={20} />
            </button>

            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <div className="text-xl font-black tracking-tight text-slate-900">YUGANTAR GROWTH</div>
                <div className="text-xs text-slate-600 font-medium">B2B Commercial Architecture & Revenue Systems</div>
                <div className="text-xs text-slate-500 mt-1">Ahmedabad, Gujarat, India · contact@yugantargrowth.com</div>
              </div>
              <div className="text-right">
                <span className="inline-block rounded bg-cyan-100 text-cyan-800 px-2.5 py-0.5 text-xs font-bold font-mono">
                  TAX INVOICE
                </span>
                <div className="text-xs font-mono font-bold text-slate-800 mt-1.5">{activeInvoiceForDoc.invoiceNumber}</div>
                <div className="text-xs text-slate-500">Issue Date: {activeInvoiceForDoc.issueDate}</div>
                <div className="text-xs text-slate-500 font-bold">Due Date: {activeInvoiceForDoc.dueDate}</div>
              </div>
            </div>

            {/* Bill To */}
            <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-200/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Billed To:</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{activeInvoiceForDoc.clientName}</div>
              <div className="text-xs text-slate-700">Attn: {activeInvoiceForDoc.contactPerson}</div>
              <div className="text-xs text-slate-600">{activeInvoiceForDoc.phone} · {activeInvoiceForDoc.email}</div>
            </div>

            {/* Line Items Table */}
            <div className="mt-6">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Service / Scope Item</th>
                    <th className="py-2.5 px-3 text-center w-16">Qty</th>
                    <th className="py-2.5 px-3 text-right w-28">Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right w-28">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {activeInvoiceForDoc.items.map(item => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3">{item.description}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹{item.unitPrice.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">₹{item.amount.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{activeInvoiceForDoc.subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18%):</span>
                    <span>₹{activeInvoiceForDoc.taxAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold text-sm text-slate-900">
                    <span>Invoice Total:</span>
                    <span>₹{activeInvoiceForDoc.totalAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 pt-1 border-t border-slate-200">
                    <span>Paid to Date:</span>
                    <span>- ₹{activeInvoiceForDoc.amountPaid.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold text-sm">
                    <span>Balance Due:</span>
                    <span>₹{activeInvoiceForDoc.balanceDue.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {activeInvoiceForDoc.paymentRecords && activeInvoiceForDoc.paymentRecords.length > 0 && (
              <div className="mt-6 border-t border-slate-200 pt-4">
                <div className="text-xs font-bold text-slate-800 mb-2">Verified Payment Records</div>
                <div className="space-y-1.5">
                  {activeInvoiceForDoc.paymentRecords.map(pay => (
                    <div key={pay.id} className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs flex justify-between items-center text-emerald-900 font-mono">
                      <span>{pay.paidAt.split("T")[0]} · {pay.paymentMethod} (Ref: {pay.transactionRef})</span>
                      <span className="font-bold">+ ₹{pay.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="mt-8 flex justify-end gap-3 print:hidden border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setActiveInvoiceForDoc(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 flex items-center gap-1.5 shadow"
              >
                <Printer size={14} /> Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// components/ProposalsView.tsx — Commercial Proposals & Quotation Deck
import React, { useState } from "react";
import type { CommercialProposal, NormalizedLead, ProposalItem } from "../lib/types/sales";
import { PROPOSAL_TEMPLATES, createProposalFromLead, calculateProposalTotals, validateProposal } from "../lib/sales/proposalEngine";
import { Button, Panel, ViewHeading } from "./ui";
import {
  FileText, Plus, Download, Printer, CheckCircle2, XCircle, Send,
  ArrowRight, ShieldCheck, X, Eye, Edit3, Trash2
} from "lucide-react";

interface ProposalsViewProps {
  proposals: CommercialProposal[];
  setProposals: React.Dispatch<React.SetStateAction<CommercialProposal[]>>;
  leads: NormalizedLead[];
  onGenerateInvoice: (proposal: CommercialProposal) => void;
  notify: (text: string) => void;
}

export function ProposalsView({
  proposals,
  setProposals,
  leads,
  onGenerateInvoice,
  notify,
}: ProposalsViewProps) {
  const [filter, setFilter] = useState<string>("ALL");
  const [activeProposalForDoc, setActiveProposalForDoc] = useState<CommercialProposal | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New proposal form state
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id || "");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("outbound_b2b");
  const [customTitle, setCustomTitle] = useState("");
  const [customTerms, setCustomTerms] = useState("");
  const [items, setItems] = useState<ProposalItem[]>([
    { id: "1", description: "Outbound Pipeline Architecture & ICP Setup", quantity: 1, unitPrice: 45000, amount: 45000 },
    { id: "2", description: "Multi-Channel Introduction & Conversion Funnel", quantity: 1, unitPrice: 55000, amount: 55000 }
  ]);
  const [taxRate, setTaxRate] = useState<number>(18);

  const shown = proposals.filter(p => filter === "ALL" || p.status === filter);

  const totalValue = proposals.reduce((sum, p) => sum + p.totalAmount, 0);
  const acceptedValue = proposals.filter(p => p.status === "ACCEPTED").reduce((sum, p) => sum + p.totalAmount, 0);

  const handleOpenCreateModal = () => {
    const template = PROPOSAL_TEMPLATES[selectedTemplateKey] || PROPOSAL_TEMPLATES.outbound_b2b;
    setItems(template.defaultItems.map((item, idx) => ({
      id: String(idx + 1),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice
    })));
    setCustomTerms(template.paymentTerms);
    setShowCreateModal(true);
  };

  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplateKey(templateKey);
    const template = PROPOSAL_TEMPLATES[templateKey];
    if (template) {
      setItems(template.defaultItems.map((item, idx) => ({
        id: String(idx + 1),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice
      })));
      setCustomTerms(template.paymentTerms);
    }
  };

  const handleItemChange = (idx: number, field: "description" | "quantity" | "unitPrice", val: any) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    next[idx].amount = Math.max(0, Number(next[idx].quantity) * Number(next[idx].unitPrice));
    setItems(next);
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: String(Date.now()), description: "Additional Scope Deliverable", quantity: 1, unitPrice: 20000, amount: 20000 }
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveNewProposal = (e: React.FormEvent) => {
    e.preventDefault();
    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead) {
      notify("Please select a target client or lead.");
      return;
    }

    const totals = calculateProposalTotals(items, taxRate);
    const template = PROPOSAL_TEMPLATES[selectedTemplateKey] || PROPOSAL_TEMPLATES.outbound_b2b;

    const newProp: CommercialProposal = {
      id: `prop_${Date.now()}`,
      leadId: lead.id,
      proposalNumber: `YG-PROP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      title: customTitle.trim() || `${lead.companyName} — ${template.title}`,
      clientName: lead.companyName,
      contactPerson: lead.contactPerson || "Founder / Decision Maker",
      phone: lead.phone,
      email: lead.email,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
      scopeSummary: template.scopeSummary,
      items,
      subtotal: totals.subtotal,
      taxRate,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      currency: "INR",
      timelineWeeks: template.timelineWeeks,
      paymentTerms: customTerms || template.paymentTerms,
      deliverables: [...template.deliverables],
      notes: `Target Market: ${lead.city}, Gujarat. Primary service: ${lead.primaryService || "Growth OS"}.`
    };

    const validation = validateProposal(newProp);
    if (!validation.valid) {
      notify(`Validation error: ${validation.errors.join(", ")}`);
      return;
    }

    setProposals(prev => [newProp, ...prev]);
    setShowCreateModal(false);
    notify(`Created Proposal ${newProp.proposalNumber} for ${lead.companyName}.`);
  };

  const updateProposalStatus = (id: string, newStatus: CommercialProposal["status"]) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    notify(`Proposal marked as ${newStatus}.`);
  };

  return (
    <div className="rise space-y-5 p-4 sm:p-7">
      <ViewHeading
        view="Proposals"
        description="Commercial Proposals & Quotations — Formal agreements, deliverables, pricing, and tax calculation."
        action={
          <Button variant="primary" onClick={handleOpenCreateModal}>
            <Plus size={14} /> Create Proposal
          </Button>
        }
      />

      {/* Telemetry Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Total Quotations Staged</div>
          <div className="mt-2 text-2xl font-bold text-white">{proposals.length}</div>
          <div className="mt-1 text-[9px] text-violet-300">₹{(totalValue / 100000).toFixed(1)}L Total Quoted</div>
        </Panel>
        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Accepted Proposals</div>
          <div className="mt-2 text-2xl font-bold text-emerald-300">
            {proposals.filter(p => p.status === "ACCEPTED").length}
          </div>
          <div className="mt-1 text-[9px] text-emerald-200">₹{(acceptedValue / 100000).toFixed(1)}L Contracted</div>
        </Panel>
        <Panel className="p-4 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Standard GST Calibration</div>
          <div className="mt-2 text-2xl font-bold text-cyan-300">18% GST</div>
          <div className="mt-1 text-[9px] text-slate-400">Itemized automated calculation</div>
        </Panel>
      </div>

      {/* Proposals Directory */}
      <Panel className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
          <div className="text-xs font-semibold text-white">Commercial Proposal Directory</div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none"
            >
              <option value="ALL">All Proposals ({proposals.length})</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent to Client</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Declined</option>
            </select>
          </div>
        </div>

        <div className="mt-4 divide-y divide-white/5">
          {shown.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No proposals matching current filter. Click "Create Proposal" to generate your first quotation.
            </div>
          ) : (
            shown.map(p => {
              const statusColor =
                p.status === "ACCEPTED" ? "emerald" :
                p.status === "SENT" ? "cyan" :
                p.status === "REJECTED" ? "rose" : "amber";

              return (
                <div key={p.id} className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/30 font-mono text-xs font-bold">
                      <FileText size={18} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-violet-300 font-semibold">{p.proposalNumber}</span>
                        <span className={`rounded-full border border-${statusColor}-400/30 bg-${statusColor}-500/10 px-2 py-0.5 text-[9px] font-bold text-${statusColor}-300`}>
                          {p.status}
                        </span>
                      </div>
                      <h4 className="mt-0.5 text-sm font-bold text-white">{p.title}</h4>
                      <div className="text-xs text-slate-400">
                        Client: <b className="text-slate-200">{p.clientName}</b> · Attn: {p.contactPerson}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500">
                        Valid Until: {p.validUntil} · {p.timelineWeeks} Weeks Timeline
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <div className="text-right mr-3">
                      <div className="text-sm font-bold text-white font-mono">
                        ₹{p.totalAmount.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        ₹{p.subtotal.toLocaleString("en-IN")} + 18% GST
                      </div>
                    </div>

                    <Button onClick={() => setActiveProposalForDoc(p)}>
                      <Eye size={13} /> View / Print
                    </Button>

                    {p.status === "DRAFT" && (
                      <Button variant="primary" onClick={() => updateProposalStatus(p.id, "SENT")}>
                        <Send size={13} /> Mark Sent
                      </Button>
                    )}

                    {p.status === "SENT" && (
                      <Button variant="success" onClick={() => updateProposalStatus(p.id, "ACCEPTED")}>
                        <CheckCircle2 size={13} /> Mark Accepted
                      </Button>
                    )}

                    {p.status === "ACCEPTED" && (
                      <Button variant="primary" onClick={() => onGenerateInvoice(p)}>
                        <ArrowRight size={13} /> Generate Invoice
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Panel>

      {/* CREATE PROPOSAL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-violet-500/30 bg-[#0d0f22] p-6 shadow-2xl text-left my-8">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText size={18} className="text-violet-400" /> Create Commercial Proposal
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Select client and quotation template. Customize line items, deliverables, and payment terms.
            </p>

            <form onSubmit={handleSaveNewProposal} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-300">Select Client / Lead</label>
                  <select
                    value={selectedLeadId}
                    onChange={e => setSelectedLeadId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
                  >
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.companyName} ({l.city}) — Tier {l.tier}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-300">Proposal Template</label>
                  <select
                    value={selectedTemplateKey}
                    onChange={e => handleTemplateChange(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="outbound_b2b">Direct B2B Outbound Acquisition</option>
                    <option value="web_conversion">Conversion Architecture & Web Portal</option>
                    <option value="turnkey_growth_os">Full Turnkey Growth OS Retainer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-300">Proposal Title</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="e.g. Jangid Furniture Studio — Direct B2B Outbound Acquisition"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              {/* Line Items */}
              <div className="border border-white/10 rounded-xl p-3 bg-black/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-violet-300">Deliverable Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[10px] text-cyan-300 hover:text-white flex items-center gap-1"
                  >
                    <Plus size={11} /> Add Item
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-[1fr_60px_100px_30px] gap-2 items-center text-xs">
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => handleItemChange(idx, "description", e.target.value)}
                      className="rounded border border-white/10 bg-black/30 px-2 py-1 text-white text-xs"
                    />
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, "quantity", Number(e.target.value))}
                      className="rounded border border-white/10 bg-black/30 px-2 py-1 text-white text-xs text-center"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={item.unitPrice}
                      onChange={e => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                      className="rounded border border-white/10 bg-black/30 px-2 py-1 text-white text-xs text-right font-mono"
                    />
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-500 hover:text-rose-400 disabled:opacity-20"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                <div className="border-t border-white/5 pt-2 flex justify-between text-xs font-mono text-slate-300">
                  <span>Subtotal: ₹{calculateProposalTotals(items, taxRate).subtotal.toLocaleString("en-IN")}</span>
                  <span>GST (18%): ₹{calculateProposalTotals(items, taxRate).taxAmount.toLocaleString("en-IN")}</span>
                  <span className="font-bold text-emerald-300">
                    Grand Total: ₹{calculateProposalTotals(items, taxRate).totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-300">Commercial Terms</label>
                <input
                  type="text"
                  value={customTerms}
                  onChange={e => setCustomTerms(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">
                  Save & Stage Proposal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE PROPOSAL DOCUMENT VIEWER MODAL */}
      {activeProposalForDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-white/20 bg-white text-slate-900 p-8 shadow-2xl text-left my-8 print:m-0 print:p-0 print:border-none print:shadow-none">
            <button
              onClick={() => setActiveProposalForDoc(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:text-slate-900 print:hidden"
            >
              <X size={20} />
            </button>

            {/* Document Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <div className="text-xl font-black tracking-tight text-slate-900">YUGANTAR GROWTH</div>
                <div className="text-xs text-slate-600 font-medium">B2B Commercial Architecture & Revenue Systems</div>
                <div className="text-xs text-slate-500 mt-1">Ahmedabad, Gujarat, India · contact@yugantargrowth.com</div>
              </div>
              <div className="text-right">
                <span className="inline-block rounded bg-violet-100 text-violet-800 px-2 py-0.5 text-xs font-bold font-mono">
                  PROPOSAL
                </span>
                <div className="text-xs font-mono font-bold text-slate-800 mt-1.5">{activeProposalForDoc.proposalNumber}</div>
                <div className="text-xs text-slate-500">Date: {activeProposalForDoc.createdAt.split("T")[0]}</div>
                <div className="text-xs text-slate-500">Valid Until: {activeProposalForDoc.validUntil}</div>
              </div>
            </div>

            {/* Client Addressee */}
            <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-200/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Prepared For:</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{activeProposalForDoc.clientName}</div>
              <div className="text-xs text-slate-700">Attn: {activeProposalForDoc.contactPerson}</div>
              <div className="text-xs text-slate-600">{activeProposalForDoc.phone} · {activeProposalForDoc.email}</div>
            </div>

            {/* Title & Scope */}
            <div className="mt-5 space-y-2">
              <h3 className="text-sm font-bold text-slate-900">{activeProposalForDoc.title}</h3>
              <p className="text-xs leading-relaxed text-slate-700">{activeProposalForDoc.scopeSummary}</p>
            </div>

            {/* Deliverables List */}
            {activeProposalForDoc.deliverables && activeProposalForDoc.deliverables.length > 0 && (
              <div className="mt-4 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Agreed Project Deliverables
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {activeProposalForDoc.deliverables.map((deliv, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-bold text-violet-600">•</span>
                      <span>{deliv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Itemized Table */}
            <div className="mt-6">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Scope Description</th>
                    <th className="py-2.5 px-3 text-center w-16">Qty</th>
                    <th className="py-2.5 px-3 text-right w-28">Unit Price</th>
                    <th className="py-2.5 px-3 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {activeProposalForDoc.items.map(item => (
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
                    <span>₹{activeProposalForDoc.subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18%):</span>
                    <span>₹{activeProposalForDoc.taxAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold text-sm text-slate-900">
                    <span>Total Quoted:</span>
                    <span>₹{activeProposalForDoc.totalAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="mt-6 border-t border-slate-200 pt-4 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">Commercial Terms:</div>
              <div>• {activeProposalForDoc.paymentTerms}</div>
              <div>• All prices are in INR, inclusive of specified taxes. Proposal valid for 30 calendar days from issue.</div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-8 flex justify-end gap-3 print:hidden border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setActiveProposalForDoc(null)}
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

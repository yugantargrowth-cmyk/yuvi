// components/ProposalsView.tsx — Commercial Proposals & Quotation Deck
import React, { useState } from "react";
import type { CommercialProposal, NormalizedLead, ProposalItem } from "../lib/types/sales";
import { PROPOSAL_TEMPLATES, createProposalFromLead, calculateProposalTotals, validateProposal } from "../lib/sales/proposalEngine";
import { composeProposal, validateWhatsAppLineCount } from "../lib/sales/proposalComposer";
import { Button, Panel, ViewHeading } from "./ui";
import {
  FileText, Plus, Download, Printer, CheckCircle2, XCircle, Send,
  ArrowRight, ShieldCheck, X, Eye, Edit3, Trash2, Presentation,
  Copy, MessageCircle, Mail, Sparkles
} from "lucide-react";
import { generateClientPitchDeck } from "../lib/export/presentationBuilder";

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
  const [docTab, setDocTab] = useState<"document" | "whatsapp" | "email">("document");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New proposal form state
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id || "");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("outbound_b2b");
  const [customTitle, setCustomTitle] = useState("");
  const [customTerms, setCustomTerms] = useState("");
  const [gstEnabled, setGstEnabled] = useState<boolean>(false);
  const [items, setItems] = useState<ProposalItem[]>([
    { id: "1", description: "Outbound Pipeline Architecture & ICP Setup", quantity: 1, unitPrice: 45000, amount: 45000 },
    { id: "2", description: "Multi-Channel Introduction & Conversion Funnel", quantity: 1, unitPrice: 55000, amount: 55000 }
  ]);
  const [taxRate, setTaxRate] = useState<number>(0);

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

  const handleAutoCompose = () => {
    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead) {
      notify("Please select a target client or lead first.");
      return;
    }
    try {
      const composed = composeProposal(lead, { gstEnabled, gstRate: 18 });
      setItems(composed.proposal.items);
      setCustomTitle(composed.proposal.title);
      setCustomTerms(composed.proposal.paymentTerms);
      setTaxRate(gstEnabled ? 18 : 0);
      notify(`Needs analysis complete! Prescribed: ${composed.needsAnalysis.prescribedPackage.name} (${composed.needsAnalysis.prescribedPackage.timeline})`);
    } catch (err: any) {
      notify(err.message || String(err));
    }
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

    let composedLeaks: any = undefined;
    let composedPitches: any = undefined;
    let advanceAmount = totals.totalAmount;
    let advancePercentage = 100;

    try {
      const composed = composeProposal(lead, { gstEnabled, gstRate: 18 });
      composedLeaks = composed.needsAnalysis.topLeaks;
      composedPitches = composed.pitches;
      advanceAmount = composed.proposal.advanceAmount || totals.totalAmount;
      advancePercentage = composed.proposal.advancePercentage || 100;
    } catch {
      // Offline fallback
    }

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
      notes: `Target Market: ${lead.city}, Gujarat. Primary service: ${lead.primaryService || "Growth OS"}.`,
      topLeaks: composedLeaks,
      evidenceIds: composedLeaks?.map((l: any) => l.evidenceId),
      advancePercentage,
      advanceAmount,
      outreachPitches: composedPitches,
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

                    <button
                      type="button"
                      onClick={async () => {
                        notify(`DeckBuilder generating PowerPoint presentation for ${p.clientName}...`);
                        const lead = leads.find(l => l.id === p.leadId) || {
                          id: p.leadId || "lead",
                          companyName: p.clientName,
                          contactPerson: p.contactPerson,
                          phone: p.phone,
                          email: p.email,
                          websiteUrl: "",
                          city: "Ahmedabad",
                          state: "Gujarat",
                          country: "India",
                          industry: "Commercial",
                          category: "Commercial",
                          status: "PROPOSAL" as const,
                          score: 85,
                          tier: "A" as const,
                          notes: "",
                          rawRecord: {},
                          createdAt: p.createdAt,
                          updatedAt: p.createdAt,
                          recommendedChannel: "WHATSAPP" as const,
                          verifiedClaims: [],
                        };
                        try {
                          const fileName = await generateClientPitchDeck({ lead, proposal: p });
                          notify(`Downloaded pitch deck: ${fileName}`);
                        } catch (err) {
                          notify(`Presentation error: ${String(err)}`);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 transition-all"
                    >
                      <Presentation size={13} /> Pitch Deck (.pptx)
                    </button>

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

              {/* Auto-Compose from Research Button */}
              <button
                type="button"
                onClick={handleAutoCompose}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/15 py-2.5 text-xs font-bold text-orange-200 hover:bg-orange-500/25 transition-all shadow-sm"
              >
                <Sparkles size={14} className="text-orange-400" />
                Auto-Analyze Needs & Prescribe Catalog Package (Truth Guardrail)
              </button>

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

                {/* GST Toggle */}
                <div className="border-t border-white/5 pt-2 flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gstEnabled}
                      onChange={e => {
                        const checked = e.target.checked;
                        setGstEnabled(checked);
                        setTaxRate(checked ? 18 : 0);
                      }}
                      className="rounded border-white/20 bg-black/40 text-orange-500"
                    />
                    <span>Apply 18% GST (Tax Invoice)</span>
                  </label>
                  <span className="font-mono text-[10px] text-slate-400">
                    {gstEnabled ? "GST Active (18%)" : "GST Exempt (0%)"}
                  </span>
                </div>

                <div className="border-t border-white/5 pt-2 flex justify-between text-xs font-mono text-slate-300">
                  <span>Subtotal: ₹{calculateProposalTotals(items, taxRate).subtotal.toLocaleString("en-IN")}</span>
                  {gstEnabled && <span>GST (18%): ₹{calculateProposalTotals(items, taxRate).taxAmount.toLocaleString("en-IN")}</span>}
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

      {/* 3-TAB COMMERCIAL PROPOSAL & PITCH VIEWER MODAL */}
      {activeProposalForDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-white/20 bg-zinc-950 text-white p-6 shadow-2xl text-left my-8 print:m-0 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
            {/* Top Navigation & Close */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDocTab("document")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    docTab === "document"
                      ? "bg-orange-500 text-white shadow-[0_0_12px_rgba(232,82,10,0.4)]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <FileText size={14} /> 1-Page Printable A4
                </button>
                <button
                  type="button"
                  onClick={() => setDocTab("whatsapp")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    docTab === "whatsapp"
                      ? "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <MessageCircle size={14} /> WhatsApp Pitch (Hinglish)
                </button>
                <button
                  type="button"
                  onClick={() => setDocTab("email")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    docTab === "email"
                      ? "bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Mail size={14} /> Cold Email
                </button>
              </div>

              <button
                onClick={() => setActiveProposalForDoc(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* TAB 1: 1-PAGE PRINTABLE A4 PROPOSAL */}
            {docTab === "document" && (
              <div className="mt-4 rounded-xl bg-white text-slate-900 p-6 border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none">
                {/* Document Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-4">
                  <div>
                    <div className="text-xl font-black tracking-tight text-black">YUGANTAR GROWTH</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#e8520a]">
                      B2B Commercial Architecture & Revenue Systems
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Founder: Shlok Pandya · Ahmedabad, Gujarat · UPI: <b className="font-mono text-black">shlokpandya@oksbi</b>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded bg-black text-white px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider font-mono">
                      CONFIDENTIAL PROPOSAL
                    </span>
                    <div className="text-xs font-mono font-bold text-slate-900 mt-1.5">{activeProposalForDoc.proposalNumber}</div>
                    <div className="text-[10px] text-slate-500">Date: {activeProposalForDoc.createdAt.split("T")[0]}</div>
                  </div>
                </div>

                {/* Client Addressee Bar */}
                <div className="mt-4 rounded-lg bg-[#fcfbf8] p-3 border border-[#ede7dc] flex justify-between items-start">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Prepared For:</div>
                    <div className="text-sm font-extrabold text-black mt-0.5">{activeProposalForDoc.clientName}</div>
                    <div className="text-xs text-slate-700">Attn: {activeProposalForDoc.contactPerson}</div>
                    <div className="text-[11px] text-slate-600 font-mono">{activeProposalForDoc.phone} · {activeProposalForDoc.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Prescribed Timeline:</div>
                    <div className="text-xs font-bold text-[#e8520a]">
                      {activeProposalForDoc.timelineWeeks === 1 ? "48-Hour Rapid Sprint" : `${activeProposalForDoc.timelineWeeks} Weeks`}
                    </div>
                  </div>
                </div>

                {/* Diagnosed Commercial Revenue Leaks (Provenance Linked) */}
                {activeProposalForDoc.topLeaks && activeProposalForDoc.topLeaks.length > 0 && (
                  <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50/50 p-3 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#e8520a] flex items-center gap-1.5">
                      <ShieldCheck size={13} /> Diagnosed Commercial Revenue Leaks (Multi-Source Provenance)
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-800">
                      {activeProposalForDoc.topLeaks.map((leak, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-2 border-b border-orange-100 last:border-none pb-1">
                          <div>
                            <span className="font-bold text-[#e8520a]">• Leak {idx + 1} [{leak.label}]: </span>
                            <span>{leak.leak}</span>
                          </div>
                          <span className="font-mono text-[9px] text-slate-500 whitespace-nowrap">
                            Ref: {leak.evidenceId}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Title & Scope */}
                <div className="mt-4 space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">{activeProposalForDoc.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-700">{activeProposalForDoc.scopeSummary}</p>
                </div>

                {/* Deliverables List */}
                {activeProposalForDoc.deliverables && activeProposalForDoc.deliverables.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Agreed Scope of Deliverables
                    </div>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {activeProposalForDoc.deliverables.map((deliv, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="font-bold text-[#e8520a]">✔</span>
                          <span>{deliv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Itemized Table */}
                <div className="mt-4">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-[#f7f5f0] text-slate-800 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Deliverable Scope</th>
                        <th className="py-2 px-3 text-center w-14">Qty</th>
                        <th className="py-2 px-3 text-right w-24">Unit Price</th>
                        <th className="py-2 px-3 text-right w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {activeProposalForDoc.items.map(item => (
                        <tr key={item.id}>
                          <td className="py-2 px-3">{item.description}</td>
                          <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                          <td className="py-2 px-3 text-right font-mono">₹{item.unitPrice.toLocaleString("en-IN")}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">₹{item.amount.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals & Advance Terms */}
                  <div className="mt-3 flex justify-between items-start border-t border-slate-300 pt-2 text-xs">
                    <div className="text-[10px] text-slate-600 max-w-[60%] space-y-0.5">
                      <div><b>Commercial Terms:</b> {activeProposalForDoc.paymentTerms}</div>
                      <div>
                        <b>Advance Gate:</b> Project kick-off occurs immediately upon receipt of advance deposit (₹{(activeProposalForDoc.advanceAmount || activeProposalForDoc.totalAmount).toLocaleString("en-IN")}).
                      </div>
                      <div><b>Direct UPI:</b> <span className="font-mono font-bold text-black">shlokpandya@oksbi</span></div>
                    </div>
                    <div className="w-48 space-y-1 font-mono text-xs text-right">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span>₹{activeProposalForDoc.subtotal.toLocaleString("en-IN")}</span>
                      </div>
                      {activeProposalForDoc.taxRate > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>GST ({activeProposalForDoc.taxRate}%):</span>
                          <span>₹{activeProposalForDoc.taxAmount.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-black pt-1 font-extrabold text-sm text-black">
                        <span>Grand Total:</span>
                        <span>₹{activeProposalForDoc.totalAmount.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sign-off Line */}
                <div className="mt-6 border-t border-dashed border-slate-300 pt-3 flex justify-between items-end text-[10px] text-slate-600">
                  <div>
                    <b>Yugantar Growth:</b> Shlok Pandya (Authorized Signatory)<br />
                    contact@yugantargrowth.com · +91 98255 99887
                  </div>
                  <div className="text-right">
                    Client Acceptance Signature: _______________________<br />
                    Date: _______________
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-6 flex justify-end gap-3 print:hidden border-t border-slate-200 pt-3">
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
                    className="px-4 py-2 rounded-lg bg-black text-xs font-semibold text-white hover:bg-zinc-800 flex items-center gap-1.5 shadow"
                  >
                    <Printer size={14} /> Print / Save as PDF (A4)
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: WHATSAPP PITCH (HINGLISH <= 6 LINES) */}
            {docTab === "whatsapp" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <MessageCircle size={14} /> 1-Click WhatsApp Pitch (Natural Indian Founder Tone)
                    </span>
                    <span className="font-mono text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      Line Count: {validateWhatsAppLineCount(
                        activeProposalForDoc.outreachPitches?.whatsappHinglish ||
                        `Namaste,\nShlok from Yugantar Growth here.\nAapki website scan ki aur commercial revenue leaks identify kiye.\nHumne 48-hour turn-around me sub-2s load aur WhatsApp concierge plan banaya hai.\n1-page confidential roadmap ready hai.\nKya main yahan share kar sakta hoon?`
                      ).lineCount}/6 (Strict Guardrail)
                    </span>
                  </div>

                  <div className="whitespace-pre-line rounded-lg bg-black/40 p-4 text-xs font-mono text-emerald-100 border border-emerald-500/20 leading-relaxed">
                    {activeProposalForDoc.outreachPitches?.whatsappHinglish ||
                      `Namaste ${activeProposalForDoc.contactPerson || "ji"}, Shlok from Yugantar Growth (Ahmedabad) here.
Aapki website scan ki toh dekha: mobile load latency 4.2s hai aur floating WhatsApp booking CTA missing hai.
Is wajah se high-intent commercial clients inquiry kiye bina bounce ho rahe hain.
Humne 48-hour turn-around me isko sub-2s aur 1-click WhatsApp concierge se fix karne ka plan banaya hai.
1-page confidential roadmap PDF ready hai aapke liye.
Kya main yahan share kar sakta hoon?`}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const pitch = activeProposalForDoc.outreachPitches?.whatsappHinglish ||
                          `Namaste ${activeProposalForDoc.contactPerson || "ji"}, Shlok from Yugantar Growth here.`;
                        navigator.clipboard.writeText(pitch);
                        notify("Copied WhatsApp pitch to clipboard!");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                    >
                      <Copy size={13} /> Copy WhatsApp Pitch
                    </button>
                    {activeProposalForDoc.phone && (
                      <a
                        href={`https://wa.me/${activeProposalForDoc.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                          activeProposalForDoc.outreachPitches?.whatsappHinglish || "Hello"
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                      >
                        <MessageCircle size={13} /> Open in WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: COLD EMAIL PITCH */}
            {docTab === "email" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <Mail size={14} /> Executive Cold Email Draft
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const fullEmail = `Subject: ${activeProposalForDoc.outreachPitches?.coldEmail?.subject || `Commercial Growth: ${activeProposalForDoc.clientName}`}\n\n${activeProposalForDoc.outreachPitches?.coldEmail?.body || ""}`;
                        navigator.clipboard.writeText(fullEmail);
                        notify("Copied full email draft to clipboard!");
                      }}
                      className="inline-flex items-center gap-1 rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-400/20"
                    >
                      <Copy size={11} /> Copy Full Email
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Subject:</span>
                      <div className="mt-0.5 rounded border border-white/10 bg-black/40 p-2 font-mono text-cyan-200">
                        {activeProposalForDoc.outreachPitches?.coldEmail?.subject || `Commercial Growth Diagnostic & 48h Roadmap: ${activeProposalForDoc.clientName}`}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Body:</span>
                      <div className="mt-0.5 whitespace-pre-wrap rounded border border-white/10 bg-black/40 p-3 font-mono text-slate-200 leading-relaxed">
                        {activeProposalForDoc.outreachPitches?.coldEmail?.body || `Dear ${activeProposalForDoc.contactPerson},\n\nI reviewed ${activeProposalForDoc.clientName}'s digital acquisition pipeline in Gujarat...\n\nBest regards,\nShlok Pandya`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

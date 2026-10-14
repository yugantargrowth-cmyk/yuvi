// components/ClientsView.tsx — Won & Retained Agency Client Accounts & Project Delivery
import React, { useState } from "react";
import type { ClientAccount, ClientDeliverable, ClientMilestone, NormalizedLead } from "../lib/types/sales";
import { updateDeliverableStatus, updateMilestoneStatus } from "../lib/sales/clientDeliveryEngine";
import { Button, Panel, ViewHeading } from "./ui";
import {
  UsersRound, Phone, Mail, Globe, MapPin, Calendar, CheckCircle2,
  Clock, Eye, Plus, CheckSquare, Layers, FileText, IndianRupee, X,
  ShieldCheck, AlertTriangle, QrCode, ArrowRight, Copy, ExternalLink, HardDrive
} from "lucide-react";
import {
  generateUpiPaymentDetails,
  validateUpiReference,
  advancePaymentGate,
  type AdvancePaymentState,
} from "../lib/finance/upiEngine";
import {
  PROJECT_STAGES,
  STAGE_ORDER,
  MAX_BUILD_WIP,
  getActiveBuildCount,
  canAdvanceStage,
  type ProjectStage,
  type ClientProject,
} from "../lib/project/projectNavigator";
import { compileContextPackMarkdown } from "../lib/project/contextPack";

interface ClientsViewProps {
  clients: ClientAccount[];
  setClients: React.Dispatch<React.SetStateAction<ClientAccount[]>>;
  leads: NormalizedLead[];
  onOpenAddModal: () => void;
  onNavigateToProposals?: () => void;
  onNavigateToFinance?: () => void;
  notify: (text: string) => void;
}

export function ClientsView({
  clients,
  setClients,
  leads,
  onOpenAddModal,
  onNavigateToProposals,
  onNavigateToFinance,
  notify,
}: ClientsViewProps) {
  const [query, setQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientAccount | null>(null);
  const [newDeliverableTitle, setNewDeliverableTitle] = useState("");
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [utrInput, setUtrInput] = useState("");
  const [advanceAmountInput, setAdvanceAmountInput] = useState<number>(12500);
  const [stageErrorMessage, setStageErrorMessage] = useState<string | null>(null);

  const filtered = clients.filter(c =>
    `${c.companyName} ${c.contactPerson} ${c.city} ${c.industry}`.toLowerCase().includes(query.toLowerCase())
  );

  const activeClients = clients.filter(c => c.status === "ACTIVE");
  const totalMonthlyRetainers = activeClients
    .filter(c => c.engagementType === "MONTHLY_RETAINER")
    .reduce((sum, c) => sum + (c.monthlyRetainer || 0), 0);

  const totalDeliverablesCount = clients.reduce((sum, c) => sum + c.deliverables.length, 0);
  const completedDeliverablesCount = clients.reduce(
    (sum, c) => sum + c.deliverables.filter(d => d.status === "COMPLETED").length,
    0
  );

  const handleToggleDeliverable = (client: ClientAccount, delivId: string, currentStatus: ClientDeliverable["status"]) => {
    const nextStatus = currentStatus === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";
    const updated = updateDeliverableStatus(client, delivId, nextStatus);
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (selectedClient?.id === updated.id) setSelectedClient(updated);
    notify(`Deliverable marked as ${nextStatus}.`);
  };

  const handleToggleMilestone = (client: ClientAccount, milestoneId: string, currentStatus: ClientMilestone["status"]) => {
    const nextStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    const updated = updateMilestoneStatus(client, milestoneId, nextStatus);
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (selectedClient?.id === updated.id) setSelectedClient(updated);
    notify(`Milestone marked as ${nextStatus}.`);
  };

  const handleAddDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !newDeliverableTitle.trim()) return;

    const newDeliv: ClientDeliverable = {
      id: `deliv_${Date.now()}`,
      title: newDeliverableTitle.trim(),
      status: "PENDING",
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0]
    };

    const updated: ClientAccount = {
      ...selectedClient,
      deliverables: [...selectedClient.deliverables, newDeliv],
      updatedAt: new Date().toISOString()
    };

    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedClient(updated);
    setNewDeliverableTitle("");
    notify("Added new deliverable to client project scope.");
  };

  const toClientProject = (c: ClientAccount): ClientProject => ({
    id: c.id,
    clientId: c.id,
    companyName: c.companyName,
    contactPerson: c.contactPerson,
    phone: c.phone,
    packageId: c.packageId || "web_sprint_48h",
    packageName: c.packageName || "48-Hour Rapid Conversion Sprint",
    contractValue: c.contractValue || c.monthlyRetainer || 25000,
    advancePayment: c.advancePayment || { advanceReceived: false },
    stage: c.projectStage || "INTAKE",
    stageHistory: [],
    deliveryDeadline: c.deliveryDeadline,
    turnaroundHours: c.turnaroundHours || 48,
    status: c.status === "COMPLETED" ? "COMPLETED" : "ACTIVE",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  });

  const allProjects = clients.map(toClientProject);
  const activeBuildCount = getActiveBuildCount(allProjects);

  const handleAdvanceStage = (client: ClientAccount) => {
    setStageErrorMessage(null);
    const currStage = client.projectStage || "INTAKE";
    const currIdx = STAGE_ORDER.indexOf(currStage);
    if (currIdx >= STAGE_ORDER.length - 1) {
      notify("Project is already at final HANDOVER stage.");
      return;
    }
    const nextStage = STAGE_ORDER[currIdx + 1];
    const project = toClientProject(client);
    const check = canAdvanceStage(project, nextStage, allProjects);

    if (!check.allowed) {
      setStageErrorMessage(check.reason || "Stage progression blocked by policy gate.");
      notify(check.reason || "Action blocked by gate policy.");
      return;
    }

    const updated: ClientAccount = {
      ...client,
      projectStage: nextStage,
      status: nextStage === "HANDOVER" ? "COMPLETED" : client.status,
      updatedAt: new Date().toISOString(),
    };

    setClients(prev => prev.map(c => (c.id === updated.id ? updated : c)));
    setSelectedClient(updated);
    notify(`Advanced project to ${PROJECT_STAGES[nextStage].label}!`);
  };

  const handleRecordAdvancePayment = (client: ClientAccount) => {
    const utrCheck = validateUpiReference(utrInput);
    if (!utrCheck.valid) {
      notify(utrCheck.error || "Invalid UTR reference number.");
      return;
    }

    const updatedPayment: AdvancePaymentState = {
      advanceReceived: true,
      utrReference: utrCheck.normalized,
      amountPaid: advanceAmountInput,
      verifiedAt: new Date().toISOString(),
    };

    const updated: ClientAccount = {
      ...client,
      advancePayment: updatedPayment,
      updatedAt: new Date().toISOString(),
    };

    setClients(prev => prev.map(c => (c.id === updated.id ? updated : c)));
    setSelectedClient(updated);
    setShowUpiModal(false);
    setStageErrorMessage(null);
    notify(`Verified & recorded advance of ₹${advanceAmountInput.toLocaleString("en-IN")} via UTR ${utrCheck.normalized}. Advance gate unlocked!`);
  };

  const handleExportContextPack = (client: ClientAccount) => {
    const project = toClientProject(client);
    const associatedLead = leads.find(l => l.id === client.leadId);
    const md = compileContextPackMarkdown(project, associatedLead);
    navigator.clipboard?.writeText(md);
    notify("Client Context Pack copied to clipboard as Markdown!");
  };

  return (
    <div className="rise space-y-5 p-4 sm:p-7">
      <ViewHeading
        view="Clients"
        description="Won & Retained Accounts — Yugantar Growth Client Engagements, Project Delivery & Milestones."
        action={
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={onOpenAddModal}>
              <Plus size={14} /> Add Client
            </Button>
          </div>
        }
      />

      {/* Retainer & Delivery WIP Telemetry Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Active Retained Clients</div>
          <div className="mt-2 text-2xl font-bold text-white">{activeClients.length}</div>
          <div className="mt-1 text-[9px] text-emerald-300">
            {clients.length > 0 ? Math.round((activeClients.length / clients.length) * 100) : 0}% Active Accounts
          </div>
        </Panel>
        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Monthly Retainer Volume</div>
          <div className="mt-2 text-2xl font-bold text-emerald-300 font-mono">
            ₹{(totalMonthlyRetainers / 100000).toFixed(2)}L <span className="text-xs text-slate-400 font-normal">/ mo</span>
          </div>
          <div className="mt-1 text-[9px] text-slate-400">Summed from verified agreements</div>
        </Panel>
        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Project Deliverables</div>
          <div className="mt-2 text-2xl font-bold text-cyan-300">
            {completedDeliverablesCount} / {totalDeliverablesCount}
          </div>
          <div className="mt-1 text-[9px] text-cyan-200">
            {totalDeliverablesCount > 0 ? Math.round((completedDeliverablesCount / totalDeliverablesCount) * 100) : 0}% Milestones Delivered
          </div>
        </Panel>
        <Panel className="p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">BUILD Stage WIP</div>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
              activeBuildCount < MAX_BUILD_WIP
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            }`}>
              {activeBuildCount < MAX_BUILD_WIP ? "Capacity Available" : "WIP Capped"}
            </span>
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono ${
            activeBuildCount < MAX_BUILD_WIP ? "text-white" : "text-amber-400"
          }`}>
            {activeBuildCount} / {MAX_BUILD_WIP} <span className="text-xs text-slate-400 font-normal">Active Builds</span>
          </div>
          <div className="mt-1 text-[9px] text-slate-400">Solo SLA Protection (Max 2 concurrent)</div>
        </Panel>
      </div>

      {/* Clients Directory */}
      <Panel className="p-5">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="text-xs font-semibold text-white">Retained Client Directory & Engagement Tracking</div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search clients..."
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none w-48 sm:w-64"
          />
        </div>

        <div className="mt-4 divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {clients.length === 0
                ? "No clients recorded yet. Convert leads to clients in Leads or Pipeline view to populate this directory."
                : "No clients matching search query."}
            </div>
          ) : (
            filtered.map(c => {
              const compDeliv = c.deliverables.filter(d => d.status === "COMPLETED").length;
              const totalDeliv = c.deliverables.length;

              return (
                <div key={c.id} className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-sm font-bold">
                      {c.companyName.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{c.companyName}</h4>
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                          {c.status}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {c.contactPerson} · <span className="text-slate-300">{c.city}, {c.state}</span>
                      </div>
                      <div className="mt-1 text-[10px] text-cyan-300">
                        {c.engagementType === "MONTHLY_RETAINER"
                          ? `Retainer: ₹${(c.monthlyRetainer || 0).toLocaleString("en-IN")} / mo`
                          : `Project Contract: ₹${(c.contractValue || 0).toLocaleString("en-IN")}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:justify-end">
                    <div className="text-right mr-3 hidden sm:block">
                      <div className="text-xs font-bold text-white">
                        {compDeliv}/{totalDeliv} Deliverables
                      </div>
                      <div className="text-[9px] text-slate-400">
                        Next: {c.nextAction?.title ? c.nextAction.title.slice(0, 28) + "..." : "Review"}
                      </div>
                    </div>

                    <Button onClick={() => setSelectedClient(c)}>
                      <Eye size={13} /> Manage Project
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Panel>

      {/* CLIENT PROJECT & DELIVERABLES MANAGEMENT MODAL */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-emerald-500/30 bg-[#0d0f22] p-6 shadow-2xl text-left my-8">
            <button
              onClick={() => setSelectedClient(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {selectedClient.companyName.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedClient.companyName}</h3>
                <div className="text-xs text-slate-400">
                  {selectedClient.contactPerson} · {selectedClient.phone} · {selectedClient.city}, Gujarat
                </div>
              </div>
            </div>

            {/* Contract & Retainer Summary */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Agreement Type</div>
                <div className="font-bold text-white mt-0.5">{selectedClient.engagementType}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Fee / Retainer</div>
                <div className="font-bold text-emerald-300 font-mono mt-0.5">
                  ₹{(selectedClient.monthlyRetainer || selectedClient.contractValue || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Start Date</div>
                <div className="font-bold text-slate-200 mt-0.5">{selectedClient.startDate}</div>
              </div>
            </div>

            {/* Agreed Scope */}
            <div className="mt-4 space-y-2">
              <div className="text-xs font-bold text-white">Agreed Scope of Work</div>
              <ul className="rounded-xl border border-white/5 bg-black/20 p-3 space-y-1.5 text-xs text-slate-300">
                {selectedClient.agreedScope.map((scope, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400">•</span>
                    <span>{scope}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Deliverables Checklist */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Project Deliverables & Milestones</span>
                <span className="text-[10px] text-slate-400">
                  {selectedClient.deliverables.filter(d => d.status === "COMPLETED").length}/{selectedClient.deliverables.length} Completed
                </span>
              </div>

              <div className="space-y-2 rounded-xl border border-white/5 bg-black/20 p-3">
                {selectedClient.deliverables.map(deliv => (
                  <div
                    key={deliv.id}
                    onClick={() => handleToggleDeliverable(selectedClient, deliv.id, deliv.status)}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/[.02] hover:bg-white/[.05] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-4 w-4 items-center justify-center rounded border ${
                        deliv.status === "COMPLETED" ? "bg-emerald-500 border-emerald-400 text-white" : "border-slate-500"
                      }`}>
                        {deliv.status === "COMPLETED" && <CheckSquare size={12} />}
                      </span>
                      <span className={`text-xs ${deliv.status === "COMPLETED" ? "line-through text-slate-500" : "text-white"}`}>
                        {deliv.title}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">{deliv.dueDate || "Due this sprint"}</span>
                  </div>
                ))}

                {/* Add Deliverable Form */}
                <form onSubmit={handleAddDeliverable} className="flex gap-2 pt-2 border-t border-white/5">
                  <input
                    type="text"
                    value={newDeliverableTitle}
                    onChange={e => setNewDeliverableTitle(e.target.value)}
                    placeholder="Add new project deliverable..."
                    className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <Button variant="primary" type="submit">
                    <Plus size={13} /> Add
                  </Button>
                </form>
              </div>
            </div>

            {/* 7-Stage Delivery Navigator */}
            <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    Project Stage Navigator (7 Stages)
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                    <span>Current Stage:</span>
                    <span className="text-[#e8520a] font-mono">
                      {PROJECT_STAGES[selectedClient.projectStage || "INTAKE"]?.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => handleExportContextPack(selectedClient)}
                    className="!text-xs gap-1"
                  >
                    <Copy size={13} /> Export Context Pack
                  </Button>
                </div>
              </div>

              {/* Stage Progress Pills */}
              <div className="grid grid-cols-7 gap-1">
                {STAGE_ORDER.map((stageKey, idx) => {
                  const currIdx = STAGE_ORDER.indexOf(selectedClient.projectStage || "INTAKE");
                  const isCurrent = stageKey === (selectedClient.projectStage || "INTAKE");
                  const isCompleted = idx < currIdx;
                  return (
                    <div
                      key={stageKey}
                      className={`rounded-lg p-2 text-center border text-[9px] font-mono transition-all ${
                        isCurrent
                          ? "border-[#e8520a] bg-[#e8520a]/20 text-white font-bold shadow-[0_0_10px_rgba(232,82,10,0.3)]"
                          : isCompleted
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-white/5 bg-black/20 text-slate-500"
                      }`}
                    >
                      <div className="text-[8px] opacity-70">0{idx + 1}</div>
                      <div className="truncate font-semibold">{stageKey}</div>
                    </div>
                  );
                })}
              </div>

              {/* Advance Payment Hard Gate Status & Transition Actions */}
              <div className="rounded-lg border border-white/5 bg-black/30 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Advance Payment Hard Gate</div>
                  {selectedClient.advancePayment?.advanceReceived ? (
                    <div className="flex items-center gap-1.5 text-emerald-300 font-semibold mt-0.5">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      <span>Verified: UTR {selectedClient.advancePayment.utrReference} (₹{selectedClient.advancePayment.amountPaid?.toLocaleString("en-IN")})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-300 font-semibold mt-0.5">
                      <AlertTriangle size={14} className="text-amber-400" />
                      <span>Pending Advance (Build stage locked until confirmed)</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!selectedClient.advancePayment?.advanceReceived && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetAmt = Math.round(((selectedClient.contractValue || selectedClient.monthlyRetainer || 25000) * 0.5));
                        setAdvanceAmountInput(targetAmt);
                        setUtrInput("");
                        setShowUpiModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8520a] hover:bg-[#ff651a] text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(232,82,10,0.3)] cursor-pointer"
                    >
                      <QrCode size={13} /> Request Advance (UPI QR)
                    </button>
                  )}

                  <Button
                    variant="primary"
                    onClick={() => handleAdvanceStage(selectedClient)}
                    className="!text-xs gap-1"
                  >
                    <span>Advance Stage</span>
                    <ArrowRight size={13} />
                  </Button>
                </div>
              </div>

              {stageErrorMessage && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-200 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <span>{stageErrorMessage}</span>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-white/5 pt-4">
              <Button onClick={() => setSelectedClient(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC UPI QR & ADVANCE CONFIRMATION MODAL */}
      {showUpiModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl border border-[#e8520a]/40 bg-[#0d0f22] p-6 shadow-2xl text-left my-8 space-y-4">
            <button
              onClick={() => setShowUpiModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8520a]/20 text-[#e8520a] border border-[#e8520a]/40 font-bold">
                <QrCode size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">UPI Advance Payment Gate</h3>
                <div className="text-[11px] text-slate-400">Yugantar Growth · Solo SLA Protection</div>
              </div>
            </div>

            {(() => {
              const upiDetails = generateUpiPaymentDetails({
                amount: advanceAmountInput,
                note: `Advance: ${selectedClient.companyName}`,
              });

              return (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-black/50 p-4 text-center space-y-3">
                    <img
                      src={upiDetails.qrDataUrl}
                      alt="UPI QR Code"
                      className="mx-auto h-44 w-44 rounded-xl border border-white/15 bg-white p-2 shadow-lg"
                    />

                    <div>
                      <div className="text-xl font-extrabold font-mono text-emerald-300">
                        {upiDetails.formattedAmount}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Scan with GPay / PhonePe / Paytm / Cred
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <a
                        href={upiDetails.upiUri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-[#e8520a] hover:underline"
                      >
                        <span>Open in UPI App Directly</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  {/* UTR Input Form */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">
                      Enter Bank UTR / Transaction Reference
                    </label>
                    <input
                      type="text"
                      value={utrInput}
                      onChange={e => setUtrInput(e.target.value)}
                      placeholder="e.g. 428901234567 or CMS123456"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-xs text-white uppercase outline-none focus:border-[#e8520a]"
                    />
                    <div className="text-[10px] text-slate-400">
                      Standard Indian banking UTR (min 6 alphanumeric characters).
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="primary"
                      className="w-full !bg-[#e8520a] !text-white font-bold"
                      onClick={() => handleRecordAdvancePayment(selectedClient)}
                    >
                      <ShieldCheck size={14} /> Verify & Unlock Advance Gate
                    </Button>
                    <Button variant="ghost" onClick={() => setShowUpiModal(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

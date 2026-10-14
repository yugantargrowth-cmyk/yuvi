// components/ApprovalsView.tsx — Consequential Action Safety Gate
import React, { useState } from "react";
import type { LeadTier, NormalizedLead, ApprovalStatus, ApprovalItem } from "../lib/types/sales";
import { Button, Panel, TierPill, StatusPill, ViewHeading } from "./ui";
import {
  ShieldCheck, CheckCircle2, XCircle, Edit3, MessageCircle,
  Mail, Send, ExternalLink, Check, Save, Clock, AlertTriangle
} from "lucide-react";
import { isWithinSendingWindow, canSendToday, confirmMarkAsSent } from "../lib/outreach/cadenceEngine";

export type { ApprovalStatus, ApprovalItem };

interface ApprovalsViewProps {
  approvals: ApprovalItem[];
  setApprovals: (approvals: ApprovalItem[]) => void;
  leads?: NormalizedLead[];
  setLeads?: (leads: NormalizedLead[]) => void;
  notify: (text: string) => void;
}

export function ApprovalsView({
  approvals,
  setApprovals,
  leads,
  setLeads,
  notify,
}: ApprovalsViewProps) {
  const [filter, setFilter] = useState<"ALL" | ApprovalStatus>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(approvals[0]?.id || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const shown = approvals.filter(a => filter === "ALL" || a.status === filter);
  const selected = approvals.find(a => a.id === selectedId) || shown[0];

  const updateStatus = (id: string, newStatus: ApprovalStatus) => {
    setApprovals(approvals.map(a => (a.id === id ? { ...a, status: newStatus } : a)));
    notify(newStatus === "APPROVED" ? "Approved! Staged for controlled dispatch." : `Approval marked as ${newStatus}.`);
  };

  const handleSaveEdit = (id: string) => {
    setApprovals(approvals.map(a => (a.id === id ? { ...a, exactMessage: editText, status: "APPROVED" } : a)));
    setIsEditing(false);
    notify("Staged copy updated and marked as APPROVED.");
  };

  const handleConfirmSent = (item: ApprovalItem) => {
    updateStatus(item.id, "PUBLISHED / COMPLETED");
    if (leads && setLeads && item.leadId) {
      const targetLead = leads.find(l => l.id === item.leadId);
      if (targetLead) {
        const { updatedLead } = confirmMarkAsSent(
          targetLead,
          "D0",
          `Approved dispatch via Gate: "${item.exactMessage?.slice(0, 100)}..."`
        );
        setLeads(leads.map(l => (l.id === item.leadId ? updatedLead : l)));
      }
    }
    setShowConfirmDialog(false);
    notify("Sent confirmed! Status updated and cadence step advanced to D2.");
  };

  const cleanPhone = selected?.phone ? selected.phone.replace(/[^0-9]/g, "") : "";
  const whatsappUrl = cleanPhone && selected?.exactMessage
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(selected.exactMessage)}`
    : "";

  return (
    <div className="rise space-y-5 p-4 sm:p-7">
      <ViewHeading
        view="Approvals"
        description="Consequential Action Gate — Hunter will never send unapproved messages. Human authorization is strictly mandatory."
        action={
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-200 outline-none"
            >
              <option value="ALL">All Items ({approvals.length})</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved for Send</option>
              <option value="REJECTED">Rejected</option>
              <option value="PUBLISHED / COMPLETED">Sent / Completed</option>
            </select>
          </div>
        }
      />

      {/* Sending Policy & Budget Bar */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`rounded-xl border p-4 text-xs flex items-center justify-between ${
          canSendToday(approvals.filter(a => a.status === "PUBLISHED / COMPLETED").length).allowed
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            : "border-red-500/30 bg-red-500/10 text-red-200"
        }`}>
          <div className="flex items-center gap-2.5">
            <Send size={16} className="text-emerald-400" />
            <div>
              <div className="font-bold uppercase tracking-wider text-[10px]">Daily Outbound Budget</div>
              <div className="text-sm font-extrabold font-mono text-white">
                {approvals.filter(a => a.status === "PUBLISHED / COMPLETED").length} / 30 Sent Today
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-400/30 bg-emerald-400/20 text-emerald-300 font-bold">
            {canSendToday(approvals.filter(a => a.status === "PUBLISHED / COMPLETED").length).remaining} Remaining
          </span>
        </div>

        <div className={`rounded-xl border p-4 text-xs flex items-center justify-between ${
          isWithinSendingWindow().inWindow
            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
        }`}>
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-cyan-400" />
            <div>
              <div className="font-bold uppercase tracking-wider text-[10px]">Active Sending Window</div>
              <div className="text-sm font-extrabold font-mono text-white">
                09:30 – 19:30 IST ({isWithinSendingWindow().istTimeString})
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
            isWithinSendingWindow().inWindow
              ? "border-cyan-400/30 bg-cyan-400/20 text-cyan-300"
              : "border-amber-400/30 bg-amber-400/20 text-amber-300"
          }`}>
            {isWithinSendingWindow().inWindow ? "Active" : "Outside Window"}
          </span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        {/* Approvals List */}
        <div className="space-y-3">
          {shown.length === 0 ? (
            <Panel className="p-8 text-center text-xs text-slate-500">
              No approval requests matching the current filter.
            </Panel>
          ) : (
            shown.map(item => {
              const isSelected = selected?.id === item.id;
              return (
                <Panel
                  key={item.id}
                  className={`cursor-pointer p-4 transition-all ${
                    isSelected ? "border-violet-400/50 bg-violet-600/10 shadow-lg" : "hover:border-white/20"
                  }`}
                  onClick={() => {
                    setSelectedId(item.id);
                    setIsEditing(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30">
                        {item.type.includes("WhatsApp") ? <MessageCircle size={16} /> : <Mail size={16} />}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-violet-300">{item.type}</span>
                          {item.tier && <TierPill tier={item.tier} />}
                          <StatusPill status={item.status} />
                        </div>
                        <h4 className="mt-0.5 text-sm font-semibold text-white">{item.title}</h4>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{item.timestamp}</span>
                  </div>

                  <p className="mt-3 text-xs text-slate-400 leading-relaxed">{item.description}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Button
                      onClick={() => updateStatus(item.id, "APPROVED")}
                      disabled={item.status === "APPROVED" || item.status === "PUBLISHED / COMPLETED"}
                      variant="success"
                    >
                      <Check size={13} /> Approve
                    </Button>
                    <Button
                      onClick={() => updateStatus(item.id, "REJECTED")}
                      disabled={item.status === "REJECTED"}
                      variant="danger"
                    >
                      <XCircle size={13} /> Reject
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedId(item.id);
                        setEditText(item.exactMessage || "");
                        setIsEditing(true);
                      }}
                    >
                      <Edit3 size={13} /> Edit Copy
                    </Button>
                  </div>
                </Panel>
              );
            })
          )}
        </div>

        {/* Selected Item Review & Direct Dispatch Actions */}
        {selected ? (
          <Panel className="p-5 sm:p-6 space-y-4 h-fit sticky top-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">
                Staged Copy & Action Preview
              </div>
              <StatusPill status={selected.status} />
            </div>

            <h3 className="text-base font-bold text-white">{selected.title}</h3>
            <div className="text-xs text-slate-400">
              Workspace: <b>{selected.workspace}</b> · Authorizing Agent: <b className="text-cyan-300">{selected.createdBy}</b>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-wider text-violet-300">Edit Staged Text</label>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="h-56 w-full rounded-xl border border-violet-400/30 bg-black/50 p-3 font-mono text-xs text-white outline-none leading-relaxed focus:border-violet-400"
                />
                <div className="flex justify-end gap-2">
                  <Button onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button variant="primary" onClick={() => handleSaveEdit(selected.id)}>
                    <Save size={13} /> Save & Mark Approved
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-mono">
                    Staged 3-Part Outreach Copy
                  </div>
                  <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-200">
                    {selected.exactMessage}
                  </div>
                </div>

                {/* Direct Action Dispatch Triggers */}
                <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Execute Approved Send
                  </div>

                  {whatsappUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                        setShowConfirmDialog(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-xs font-bold text-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                    >
                      <MessageCircle size={15} /> Open WhatsApp Web Draft
                    </button>
                  )}

                  {showConfirmDialog && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2.5 text-xs text-amber-200">
                      <div className="flex items-center gap-2 font-bold text-amber-300">
                        <AlertTriangle size={15} /> Did you actually click Send in WhatsApp?
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Opening WhatsApp does <b>NOT</b> send the message. Please hit Send in WhatsApp Web, then click below to verify sent status and advance cadence to D2.
                      </p>
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="primary"
                          className="flex-1 !bg-emerald-500 !text-black font-bold"
                          onClick={() => handleConfirmSent(selected)}
                        >
                          <CheckCircle2 size={13} /> Yes, Mark as Sent
                        </Button>
                        <Button
                          variant="ghost"
                          className="flex-1"
                          onClick={() => setShowConfirmDialog(false)}
                        >
                          Not Sent Yet
                        </Button>
                      </div>
                    </div>
                  )}

                  {selected.email && (
                    <a
                      href={`mailto:${selected.email}?subject=${encodeURIComponent(`Growth Strategy for ${selected.title}`)}&body=${encodeURIComponent(selected.exactMessage || "")}`}
                      onClick={() => handleConfirmSent(selected)}
                      className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      <Mail size={15} /> Send via Email Client
                    </a>
                  )}

                  <Button
                    onClick={() => handleConfirmSent(selected)}
                    className="w-full"
                  >
                    <CheckCircle2 size={13} /> Mark Sent Manually (Direct)
                  </Button>
                </div>
              </div>
            )}
          </Panel>
        ) : (
          <Panel className="p-8 text-center text-xs text-slate-500">
            Select an approval item to inspect.
          </Panel>
        )}
      </div>
    </div>
  );
}

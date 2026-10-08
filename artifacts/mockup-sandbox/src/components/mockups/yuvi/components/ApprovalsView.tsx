// components/ApprovalsView.tsx — Consequential Action Safety Gate
import React, { useState } from "react";
import type { LeadTier } from "../lib/types/sales";
import { Button, Panel, TierPill, StatusPill, ViewHeading } from "./ui";
import {
  ShieldCheck, CheckCircle2, XCircle, Edit3, MessageCircle,
  Mail, Send, ExternalLink, Check, Save
} from "lucide-react";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "PUBLISHED / COMPLETED";

export interface ApprovalItem {
  id: string;
  type: string;
  title: string;
  workspace: string;
  createdBy: string;
  timestamp: string;
  status: ApprovalStatus;
  description: string;
  exactMessage?: string;
  phone?: string;
  email?: string;
  leadId?: string;
  tier?: LeadTier;
}

interface ApprovalsViewProps {
  approvals: ApprovalItem[];
  setApprovals: (approvals: ApprovalItem[]) => void;
  notify: (text: string) => void;
}

export function ApprovalsView({
  approvals,
  setApprovals,
  notify,
}: ApprovalsViewProps) {
  const [filter, setFilter] = useState<"ALL" | ApprovalStatus>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(approvals[0]?.id || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

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

      <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-start gap-3">
        <ShieldCheck size={18} className="shrink-0 mt-0.5 text-amber-300" />
        <div>
          <b>Safe Sending Policy Enforced:</b> No external WhatsApp, email, or SMS messages are dispatched autonomously. Review copy, edit freely, and approve or send directly below.
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
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => updateStatus(selected.id, "PUBLISHED / COMPLETED")}
                      className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-xs font-bold text-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                    >
                      <MessageCircle size={15} /> Open & Send via WhatsApp Web
                    </a>
                  )}

                  {selected.email && (
                    <a
                      href={`mailto:${selected.email}?subject=${encodeURIComponent(`Growth Strategy for ${selected.title}`)}&body=${encodeURIComponent(selected.exactMessage || "")}`}
                      onClick={() => updateStatus(selected.id, "PUBLISHED / COMPLETED")}
                      className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      <Mail size={15} /> Send via Email Client
                    </a>
                  )}

                  <Button
                    onClick={() => updateStatus(selected.id, "PUBLISHED / COMPLETED")}
                    className="w-full"
                  >
                    <CheckCircle2 size={13} /> Mark Sent Manually
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

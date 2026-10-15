// components/TodayView.tsx — Mobile-First Daily Command Center
// Optimized for 390px mobile viewports (iPhone/Android).
// Provides 3-line morning executive briefing, ₹25k revenue goal tracker,
// dynamic Next Action Card, and the 4 Operational Action Queues.

import React, { useState } from "react";
import type { NormalizedLead, ClientAccount, ClientInvoice } from "../lib/types/sales";
import type { ApprovalItem } from "./ApprovalsView";
import type { YuviSettings } from "../lib/store";
import {
  computeTodayMetrics,
  generateMorningBriefing,
  determineNextAction,
  getActionQueues,
  DEFAULT_REVENUE_GOAL,
  type NextActionCardData,
} from "../lib/today/todayEngine";
import { PROJECT_STAGES } from "../lib/project/projectNavigator";
import { isWithinSendingWindow } from "../lib/outreach/cadenceEngine";
import { Button, Panel } from "./ui";
import {
  Sun, Target, ArrowRight, CheckCircle2, AlertTriangle, Clock,
  MessageCircle, Send, QrCode, Layers, ShieldCheck, PhoneCall,
  Sparkles, ChevronRight, IndianRupee, RefreshCw
} from "lucide-react";

interface TodayViewProps {
  invoices: ClientInvoice[];
  clients: ClientAccount[];
  leads: NormalizedLead[];
  approvals: ApprovalItem[];
  settings?: YuviSettings;
  onNavigateToView: (view: any) => void;
  onSelectLead?: (lead: NormalizedLead) => void;
  onSelectClient?: (client: ClientAccount) => void;
  onSelectApproval?: (approval: ApprovalItem) => void;
  notify: (text: string) => void;
}

export function TodayView({
  invoices,
  clients,
  leads,
  approvals,
  settings,
  onNavigateToView,
  onSelectLead,
  onSelectClient,
  onSelectApproval,
  notify,
}: TodayViewProps) {
  const [activeQueueTab, setActiveQueueTab] = useState<"SEND" | "REPLY" | "MONEY" | "PROJECTS">("SEND");

  const targetAmount = settings?.goal_amount ?? DEFAULT_REVENUE_GOAL;
  const founderName = settings?.identity?.founderName || "Shlok";
  const metrics = computeTodayMetrics(invoices, clients, leads, approvals, targetAmount);
  const briefingLines = generateMorningBriefing(metrics, founderName, "Revenue Target");
  const nextAction = determineNextAction(clients, leads, approvals);
  const queues = getActionQueues(approvals, leads, clients);
  const sendingWindow = isWithinSendingWindow();

  const handleNextActionClick = (action: NextActionCardData) => {
    switch (action.category) {
      case "PENDING_ADVANCE": {
        const client = clients.find((c) => c.id === action.targetId);
        if (client && onSelectClient) {
          onSelectClient(client);
        } else {
          onNavigateToView("Clients");
        }
        break;
      }
      case "BUILD_SLA_EXPIRING": {
        const client = clients.find((c) => c.id === action.targetId);
        if (client && onSelectClient) {
          onSelectClient(client);
        } else {
          onNavigateToView("Clients");
        }
        break;
      }
      case "INBOUND_REPLY": {
        const lead = leads.find((l) => l.id === action.targetId);
        if (lead && onSelectLead) {
          onSelectLead(lead);
        } else {
          onNavigateToView("Leads");
        }
        break;
      }
      case "PENDING_OUTREACH": {
        const approval = approvals.find((a) => a.id === action.targetId);
        if (approval && onSelectApproval) {
          onSelectApproval(approval);
        } else {
          onNavigateToView("Approvals");
        }
        break;
      }
      case "LEAD_RESEARCH": {
        const lead = leads.find((l) => l.id === action.targetId);
        if (lead && onSelectLead) {
          onSelectLead(lead);
        } else {
          onNavigateToView("Leads");
        }
        break;
      }
      default:
        onNavigateToView("Leads");
        break;
    }
  };

  return (
    <div className="rise max-w-xl mx-auto space-y-4 p-3.5 sm:p-6 pb-24">
      {/* Top Founder Status & Window Bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8520a] text-black font-extrabold text-xs shadow-[0_0_12px_rgba(232,82,10,0.4)]">
            SP
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Shlok Pandya</span>
              <span className="text-[10px] text-slate-400">· Yugantar</span>
            </div>
            <div className="text-[10px] text-slate-400">Ahmedabad, Gujarat</div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono">
            <span
              className={`h-2 w-2 rounded-full ${
                sendingWindow.inWindow ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className={sendingWindow.inWindow ? "text-emerald-300 font-bold" : "text-amber-300"}>
              {sendingWindow.inWindow ? "Outreach Window Open" : "Outside Hours"}
            </span>
          </div>
          <div className="text-[9px] text-slate-500 font-mono">
            09:30–19:30 IST ({sendingWindow.istTimeString})
          </div>
        </div>
      </div>

      {/* Morning Executive Briefing (3 Lines) */}
      <Panel className="p-4 border border-[#e8520a]/30 bg-gradient-to-br from-[#e8520a]/10 to-black/60 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#e8520a] uppercase tracking-wider">
          <Sun size={14} /> Morning Executive Briefing
        </div>
        <div className="space-y-1.5 text-xs text-slate-200 leading-relaxed font-sans">
          <p className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">•</span>
            <span>{briefingLines[0]}</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-cyan-400 font-bold">•</span>
            <span>{briefingLines[1]}</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-amber-400 font-bold">•</span>
            <span>{briefingLines[2]}</span>
          </p>
        </div>
      </Panel>

      {/* Monthly Revenue Target Progress Bar (₹25,000) */}
      <Panel className="p-4 border border-white/10 bg-black/40 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Target size={14} className="text-emerald-400" />
            <span>Revenue Goal (One-Time): ₹{metrics.targetAmount.toLocaleString("en-IN")}</span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {metrics.progressPercentage}% Achieved
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#e8520a] to-emerald-400 transition-all duration-500"
            style={{ width: `${metrics.progressPercentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
          <span>Collected: <b className="text-emerald-300">₹{metrics.collectedAmount.toLocaleString("en-IN")}</b></span>
          <span>Remaining: <b className="text-white">₹{metrics.remainingAmount.toLocaleString("en-IN")}</b></span>
        </div>
      </Panel>

      {/* HERO: The Single Next Action Card */}
      <div className="rounded-2xl border-2 border-[#e8520a] bg-gradient-to-b from-[#e8520a]/20 to-black/80 p-4 sm:p-5 shadow-[0_0_25px_rgba(232,82,10,0.25)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-extrabold text-[#e8520a]">
            <Sparkles size={13} /> #1 Priority Next Action
          </span>
          <span
            className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-extrabold uppercase ${
              nextAction.urgency === "CRITICAL"
                ? "bg-red-500 text-black animate-pulse"
                : nextAction.urgency === "HIGH"
                ? "bg-amber-400 text-black"
                : "bg-cyan-400 text-black"
            }`}
          >
            {nextAction.urgency}
          </span>
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-black text-white">{nextAction.title}</h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{nextAction.subtitle}</p>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-300 font-semibold truncate max-w-[180px]">
            {nextAction.targetName}
          </div>

          <button
            type="button"
            onClick={() => handleNextActionClick(nextAction)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e8520a] hover:bg-[#ff651a] text-black font-extrabold text-xs transition-all shadow-[0_0_15px_rgba(232,82,10,0.4)] cursor-pointer shrink-0"
          >
            <span>{nextAction.ctaLabel}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* 4 Operational Action Queues (Tabbed) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-white uppercase tracking-wider">Action Queues</div>
          <span className="text-[10px] text-slate-500">Tap to inspect queue</span>
        </div>

        {/* 4 Queue Selector Buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveQueueTab("SEND")}
            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
              activeQueueTab === "SEND"
                ? "border-[#e8520a] bg-[#e8520a]/20 text-white font-bold"
                : "border-white/5 bg-black/30 text-slate-400 hover:text-white"
            }`}
          >
            <div className="text-sm font-extrabold font-mono">{queues.sendQueue.length}</div>
            <div className="text-[9px] uppercase tracking-wider truncate">Send</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveQueueTab("REPLY")}
            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
              activeQueueTab === "REPLY"
                ? "border-cyan-400 bg-cyan-400/20 text-white font-bold"
                : "border-white/5 bg-black/30 text-slate-400 hover:text-white"
            }`}
          >
            <div className="text-sm font-extrabold font-mono text-cyan-300">{queues.replyQueue.length}</div>
            <div className="text-[9px] uppercase tracking-wider truncate">Reply</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveQueueTab("MONEY")}
            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
              activeQueueTab === "MONEY"
                ? "border-emerald-400 bg-emerald-400/20 text-white font-bold"
                : "border-white/5 bg-black/30 text-slate-400 hover:text-white"
            }`}
          >
            <div className="text-sm font-extrabold font-mono text-emerald-300">{queues.moneyQueue.length}</div>
            <div className="text-[9px] uppercase tracking-wider truncate">Money</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveQueueTab("PROJECTS")}
            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
              activeQueueTab === "PROJECTS"
                ? "border-violet-400 bg-violet-400/20 text-white font-bold"
                : "border-white/5 bg-black/30 text-slate-400 hover:text-white"
            }`}
          >
            <div className="text-sm font-extrabold font-mono text-violet-300">{queues.projectsQueue.length}</div>
            <div className="text-[9px] uppercase tracking-wider truncate">Projects</div>
          </button>
        </div>

        {/* Active Queue List */}
        <Panel className="p-3 divide-y divide-white/5 min-h-[160px]">
          {activeQueueTab === "SEND" && (
            <div>
              {queues.sendQueue.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Send Queue is clear! All scheduled touches sent.
                </div>
              ) : (
                queues.sendQueue.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onNavigateToView("Approvals")}
                    className="py-2.5 flex items-center justify-between hover:bg-white/[.02] cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{item.title}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[240px]">
                        {item.exactMessage?.slice(0, 50)}...
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeQueueTab === "REPLY" && (
            <div>
              {queues.replyQueue.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No prospect replies waiting for response.
                </div>
              ) : (
                queues.replyQueue.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => {
                      if (onSelectLead) onSelectLead(lead);
                      else onNavigateToView("Leads");
                    }}
                    className="py-2.5 flex items-center justify-between hover:bg-white/[.02] cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{lead.companyName}</div>
                      <div className="text-[10px] text-slate-400">
                        {lead.contactPerson} · {lead.phone}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {lead.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeQueueTab === "MONEY" && (
            <div>
              {queues.moneyQueue.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No pending advance payments! Cashflow up to date.
                </div>
              ) : (
                queues.moneyQueue.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => {
                      if (onSelectClient) onSelectClient(client);
                      else onNavigateToView("Clients");
                    }}
                    className="py-2.5 flex items-center justify-between hover:bg-white/[.02] cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{client.companyName}</div>
                      <div className="text-[10px] text-amber-300 font-semibold">
                        Pending 50% Advance: ₹{Math.round((client.contractValue || 25000) * 0.5).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <Button variant="ghost" className="!text-[10px] !py-1 !px-2">
                      <QrCode size={12} /> UPI QR
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeQueueTab === "PROJECTS" && (
            <div>
              {queues.projectsQueue.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No active projects in delivery. Convert leads to launch!
                </div>
              ) : (
                queues.projectsQueue.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => {
                      if (onSelectClient) onSelectClient(client);
                      else onNavigateToView("Clients");
                    }}
                    className="py-2.5 flex items-center justify-between hover:bg-white/[.02] cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{client.companyName}</div>
                      <div className="text-[10px] text-slate-400">
                        Stage: <b className="text-[#e8520a] font-mono">{client.projectStage || "INTAKE"}</b>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {client.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

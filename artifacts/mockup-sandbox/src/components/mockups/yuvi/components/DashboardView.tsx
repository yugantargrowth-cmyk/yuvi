// components/DashboardView.tsx — Executive Sales Radar & Daily Command Center
import React from "react";
import type { CallQueueItem, DailySalesDashboardMetrics } from "../lib/types/sales";
import type { View } from "./ui";
import { Button, Panel, Stat } from "./ui";
import {
  Rocket, Target, BadgeCheck, PhoneCall, Send, Phone, Edit3,
  Check, ArrowRight, ShieldCheck, Zap
} from "lucide-react";

interface DashboardViewProps {
  metrics: DailySalesDashboardMetrics;
  callQueue: CallQueueItem[];
  onOpenCall: (item: CallQueueItem) => void;
  onTriggerEngine: () => void;
  setCurrent: (view: View) => void;
}

export function DashboardView({
  metrics,
  callQueue,
  onOpenCall,
  onTriggerEngine,
  setCurrent,
}: DashboardViewProps) {
  const pendingCalls = callQueue.filter(c => c.callStatus === "PENDING");

  return (
    <div className="rise signal-grid relative space-y-5 p-4 sm:p-7">
      {/* Top Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[.2em] text-violet-300 font-semibold">
            Yugantar Growth / Daily Sales Radar
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">Commercial Command Deck</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Real-time pipeline metrics · Activepieces runtime · Supabase cloud database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={onTriggerEngine}>
            <Rocket size={14} /> Run Daily Sales Engine
          </Button>
        </div>
      </div>

      {/* Primary Telemetry Cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Total Leads in Radar"
          value={String(metrics.totalLeads)}
          delta={`${metrics.newLeads} new today`}
          icon={Target}
        />
        <Stat
          label="Qualified Opportunities"
          value={String(metrics.qualifiedLeads)}
          delta={`Tier A: ${metrics.tierBreakdown.A} | Tier B: ${metrics.tierBreakdown.B}`}
          icon={BadgeCheck}
          color="#43e6d0"
        />
        <Stat
          label="Calls Due Today"
          value={String(metrics.callsDue)}
          delta={`${metrics.callsCompleted} completed`}
          icon={PhoneCall}
          color="#ff8a65"
        />
        <Stat
          label="Outreach in Approval Gate"
          value={String(metrics.outreachDue)}
          delta="Human gate armed"
          icon={Send}
          color="#ffc66d"
        />
      </div>

      {/* AI Employees & Today's Action Checklist */}
      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Panel className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">
                Active AI Employees
              </div>
              <div className="text-xs text-slate-400">Universal Task System · Activepieces runtime execution</div>
            </div>
            <button
              onClick={() => setCurrent("AI Team")}
              className="text-xs text-violet-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              Manage Workforce <ArrowRight size={12} />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { name: "Scout", role: "Lead Intel", status: "Active in Sprint", color: "#43e6d0", task: `Scored ${metrics.totalLeads} leads` },
              { name: "Hunter", role: "Outreach & Calls", status: `${metrics.callsDue} calls queued`, color: "#ff8a65", task: "Guards dispatch approvals" },
              { name: "Operator", role: "Business Ops", status: "Syncing DB State", color: "#8b69ff", task: "Deduplication & memory guard" },
              { name: "Researcher", role: "Deep Research", status: "Footprint Armed", color: "#d59aff", task: "Gujarat commercial analysis" },
            ].map(a => (
              <div key={a.name} className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                    style={{ background: `${a.color}22`, color: a.color, border: `1px solid ${a.color}55` }}
                  >
                    {a.name.slice(0, 2)}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-white">{a.name}</div>
                    <div className="text-[10px] text-slate-400">{a.role}</div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[9px] font-semibold" style={{ color: a.color }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.color }} />
                  {a.status}
                </div>
                <div className="mt-1 text-[9px] text-slate-500 truncate">{a.task}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Operating Focus Checklist */}
        <Panel className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">
                Daily Operating Priorities
              </div>
              <span className="rounded-full bg-violet-500/15 border border-violet-400/20 px-2 py-0.5 text-[9px] text-violet-200">
                {metrics.callsDue + metrics.outreachDue} pending
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-2.5 text-xs">
                <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-cyan-400 bg-cyan-400/20 text-cyan-200">
                  <Check size={10} />
                </span>
                <div>
                  <div className="font-semibold text-white">Run Sales Engine on Gujarat lead pool</div>
                  <div className="text-[10px] text-slate-400">Processed, deduplicated & scored for ICP</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs">
                <span className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${
                  metrics.callsCompleted > 0 ? "border-cyan-400 bg-cyan-400/20 text-cyan-200" : "border-slate-600 text-slate-600"
                }`}>
                  {metrics.callsCompleted > 0 && <Check size={10} />}
                </span>
                <div>
                  <div className="font-semibold text-white">Execute {metrics.callsDue} priority discovery calls</div>
                  <div className="text-[10px] text-slate-400">Tier A targets prioritized with talking points</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs">
                <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-slate-600 text-slate-600" />
                <div>
                  <div className="font-semibold text-white">Review & authorize {metrics.outreachDue} staged drafts</div>
                  <div className="text-[10px] text-slate-400">Approvals Gate · Hunter awaiting founder consent</div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCurrent("Approvals")}
            className="mt-4 text-xs text-violet-300 hover:text-white flex items-center gap-1 transition-colors pt-2 border-t border-white/5"
          >
            Review Approvals Queue <ArrowRight size={12} />
          </button>
        </Panel>
      </div>

      {/* Prioritized Call Queue & Sales Pipeline Funnel */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Daily Call Queue Panel */}
        <Panel className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">
                Prioritized Daily Call Queue
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">Click to dial with structured talking points</h3>
            </div>
            <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
              {pendingCalls.length} calls due
            </span>
          </div>

          <div className="mt-3 divide-y divide-white/5">
            {pendingCalls.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Call queue is clear. No calls pending today.
              </div>
            ) : (
              pendingCalls.slice(0, 4).map(c => (
                <div key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{c.companyName}</h4>
                      <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
                        c.priority === "URGENT"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      }`}>
                        {c.priority}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {c.contactPerson} · <span className="font-mono text-cyan-300">{c.phone}</span>
                    </div>
                    <div className="mt-1 truncate text-[9px] text-slate-500">{c.reason}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={c.clickToCallUrl || `tel:${c.phone}`}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-400/20"
                    >
                      <Phone size={12} /> Call
                    </a>
                    <Button onClick={() => onOpenCall(c)}>
                      <Edit3 size={12} /> Log Outcome
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {pendingCalls.length > 4 && (
            <button
              onClick={() => setCurrent("Leads")}
              className="mt-3 text-xs text-violet-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              View all {pendingCalls.length} calls in Leads radar <ArrowRight size={12} />
            </button>
          )}
        </Panel>

        {/* Commercial Pipeline Funnel */}
        <Panel className="p-5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold border-b border-white/5 pb-3">
              Sales Pipeline Distribution
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-violet-600/20 px-3 py-2 text-violet-100">
                <span>New Prospects</span>
                <b className="font-mono">{metrics.newLeads}</b>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-cyan-500/15 px-3 py-2 text-cyan-100">
                <span>In Discovery / Contacted</span>
                <b className="font-mono">{metrics.callsCompleted}</b>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-blue-500/15 px-3 py-2 text-blue-100">
                <span>Qualified (Tier A & B)</span>
                <b className="font-mono">{metrics.qualifiedLeads}</b>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-amber-500/15 px-3 py-2 text-amber-100">
                <span>Opportunities / Interested</span>
                <b className="font-mono">{metrics.interestedProspects}</b>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/15 px-3 py-2 text-emerald-100">
                <span>Won / Retained Clients</span>
                <b className="font-mono">{metrics.won}</b>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              onClick={() => setCurrent("Pipeline")}
              className="text-violet-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              Kanban Pipeline <ArrowRight size={11} />
            </button>
            <button
              onClick={() => setCurrent("Proposals")}
              className="text-cyan-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              Proposals <ArrowRight size={11} />
            </button>
            <button
              onClick={() => setCurrent("Finance")}
              className="text-emerald-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              Finance & Invoices <ArrowRight size={11} />
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

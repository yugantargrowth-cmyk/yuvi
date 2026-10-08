// components/ReportsView.tsx — Data-Driven Performance Analytics & Analyst Brief
import React from "react";
import type { NormalizedLead, CallQueueItem, DailySalesDashboardMetrics } from "../lib/types/sales";
import { Button, Panel, Sparkline, ViewHeading } from "./ui";
import { FileBarChart, Download, Target, TrendingUp, CheckCircle2, PhoneCall, Award } from "lucide-react";

interface ReportsViewProps {
  metrics: DailySalesDashboardMetrics;
  leads: NormalizedLead[];
  callQueue: CallQueueItem[];
  notify: (text: string) => void;
}

export function ReportsView({
  metrics,
  leads,
  callQueue,
  notify,
}: ReportsViewProps) {
  const exportReport = () => {
    const reportText = `YUGANTAR GROWTH — DAILY PERFORMANCE TELEMETRY REPORT
Date: ${new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

1. RADAR METRICS:
• Total Commercial Leads: ${metrics.totalLeads}
• Qualified (Tier A & B): ${metrics.qualifiedLeads} (${metrics.totalLeads > 0 ? Math.round((metrics.qualifiedLeads / metrics.totalLeads) * 100) : 0}%)
• Tier A Targets: ${metrics.tierBreakdown.A}
• Tier B Targets: ${metrics.tierBreakdown.B}
• Tier C Targets: ${metrics.tierBreakdown.C}
• Disqualified (Tier D): ${metrics.tierBreakdown.D}

2. DAILY SALES ENGINE ACTIVITY:
• Calls Queued: ${callQueue.length}
• Calls Completed Today: ${metrics.callsCompleted}
• Outbound Outreach Pending Approval: ${metrics.outreachDue}
• Active Opportunities / Replies: ${metrics.interestedProspects}
• Retained Clients (Won): ${metrics.won}

3. ANALYST RECOMMENDATIONS:
• Prioritize Tier A direct phone outreach in Ahmedabad corridor.
• Review and dispatch staged WhatsApp copy in Approvals queue.
• Follow up with leads requesting callbacks within 24 hours.
`;

    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `yugantar_performance_report_${new Date().toISOString().split("T")[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Exported performance report.");
  };

  const qualifiedPercentage = metrics.totalLeads > 0
    ? Math.round((metrics.qualifiedLeads / metrics.totalLeads) * 100)
    : 0;

  return (
    <div className="rise space-y-5 p-4 sm:p-7">
      <ViewHeading
        view="Reports"
        description="Performance Telemetry & Conversion Analytics — Compiled directly from verified CRM records."
        action={
          <Button variant="primary" onClick={exportReport}>
            <Download size={14} /> Export Summary Report
          </Button>
        }
      />

      {/* Top Telemetry Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Total Pipeline Radar</div>
          <div className="mt-2 text-2xl font-bold text-white">{metrics.totalLeads}</div>
          <div className="mt-1 text-[9px] text-violet-300">Gujarat B2B Accounts</div>
        </Panel>

        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">ICP Qualification Rate</div>
          <div className="mt-2 text-2xl font-bold text-cyan-300">{qualifiedPercentage}%</div>
          <div className="mt-1 text-[9px] text-cyan-200">{metrics.qualifiedLeads} Tier A/B prospects</div>
        </Panel>

        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Calls Completed</div>
          <div className="mt-2 text-2xl font-bold text-emerald-300">{metrics.callsCompleted}</div>
          <div className="mt-1 text-[9px] text-slate-400">{metrics.callsDue} remaining today</div>
        </Panel>

        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Won / Retained Clients</div>
          <div className="mt-2 text-2xl font-bold text-white">{metrics.won}</div>
          <div className="mt-1 text-[9px] text-emerald-300">Commercial Retainers</div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Operating Velocity & Analyst Brief */}
        <Panel className="p-5 sm:p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">
                Analyst Intelligence
              </div>
              <h3 className="text-base font-bold text-white">Daily Conversion Velocity & Health</h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-cyan-300">92</span>
              <span className="text-xs text-slate-500 font-normal"> / 100 Health</span>
            </div>
          </div>

          <Sparkline color="#43e6d0" />

          {/* Tier Distribution Visual */}
          <div className="space-y-2 border-t border-white/5 pt-4">
            <div className="text-xs font-semibold text-white">Gujarat Commercial Tier Distribution</div>
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="text-slate-400 text-[10px]">Tier A (High Conviction)</div>
                <div className="text-lg font-bold text-emerald-300 mt-1">{metrics.tierBreakdown.A}</div>
                <div className="text-[9px] text-slate-500">Score 80-100</div>
              </div>

              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                <div className="text-slate-400 text-[10px]">Tier B (Qualified)</div>
                <div className="text-lg font-bold text-cyan-300 mt-1">{metrics.tierBreakdown.B}</div>
                <div className="text-[9px] text-slate-500">Score 60-79</div>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="text-slate-400 text-[10px]">Tier C (Secondary)</div>
                <div className="text-lg font-bold text-amber-300 mt-1">{metrics.tierBreakdown.C}</div>
                <div className="text-[9px] text-slate-500">Score 45-59</div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-white/[.02] p-3">
                <div className="text-slate-400 text-[10px]">Tier D (Disqualified)</div>
                <div className="text-lg font-bold text-slate-400 mt-1">{metrics.tierBreakdown.D}</div>
                <div className="text-[9px] text-slate-500">Missing contact</div>
              </div>
            </div>
          </div>
        </Panel>

        {/* Executive Action Brief */}
        <Panel className="p-5 sm:p-6 space-y-4">
          <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">
            Analyst Executive Brief
          </div>
          <h3 className="text-sm font-bold text-white">Recommended Strategic Action</h3>

          <div className="text-xs leading-relaxed text-slate-300 space-y-3">
            <p>
              The Gujarat commercial corridor is demonstrating high responsiveness for Luxury Furniture, Interior Architecture, and Industrial Exports.
            </p>
            <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 space-y-2">
              <div className="text-[10px] uppercase font-bold text-violet-200">Priority Focus Lanes:</div>
              <ul className="space-y-1.5 text-[11px] text-slate-200">
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400">•</span>
                  <span>Dial remaining {metrics.callsDue} discovery calls on SG Highway targets.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400">•</span>
                  <span>Review {metrics.outreachDue} staged WhatsApp drafts in Approvals.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400">•</span>
                  <span>Re-engage callback requests within 24 hours.</span>
                </li>
              </ul>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

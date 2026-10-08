// components/PipelineView.tsx — Interactive Kanban Commercial Pipeline
import React from "react";
import type { NormalizedLead, LeadStatus } from "../lib/types/sales";
import { Panel, TierPill, ViewHeading } from "./ui";
import { ArrowLeft, ArrowRight, Building2, Phone, User, DollarSign } from "lucide-react";

interface PipelineViewProps {
  leads: NormalizedLead[];
  onUpdateLead: (lead: NormalizedLead) => void;
  onSelectLead: (lead: NormalizedLead) => void;
  notify: (text: string) => void;
}

const STAGES: { stage: LeadStatus; label: string; color: string }[] = [
  { stage: "NEW", label: "New Prospects", color: "violet" },
  { stage: "CONTACTED", label: "Contacted / Discovery", color: "cyan" },
  { stage: "QUALIFIED", label: "Qualified / Warm", color: "blue" },
  { stage: "INTERESTED", label: "Proposal / Negotiation", color: "amber" },
  { stage: "WON", label: "Won / Retained Clients", color: "emerald" },
  { stage: "LOST", label: "Lost / Disqualified", color: "rose" },
];

export function PipelineView({
  leads,
  onUpdateLead,
  onSelectLead,
  notify,
}: PipelineViewProps) {
  const moveStage = (lead: NormalizedLead, direction: "prev" | "next") => {
    const currentIndex = STAGES.findIndex(s => s.stage === lead.status);
    if (currentIndex === -1) return;

    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= STAGES.length) return;

    const nextStage = STAGES[newIndex].stage;
    const newActivity = {
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: `Moved from ${lead.status} to ${nextStage}`,
      author: "Shlok Pandya",
    };

    const updated: NormalizedLead = {
      ...lead,
      status: nextStage,
      activityHistory: [newActivity, ...(lead.activityHistory || [])],
      updatedAt: new Date().toISOString(),
    };

    onUpdateLead(updated);
    notify(`Moved ${lead.companyName} to ${STAGES[newIndex].label}.`);
  };

  return (
    <div className="rise space-y-5 p-4 sm:p-7">
      <ViewHeading
        view="Pipeline"
        description="Gujarat Commercial Pipeline — Move deals across stages from initial discovery to retained agency client."
      />

      <div className="grid gap-4 overflow-x-auto pb-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 min-w-[1100px]">
        {STAGES.map(({ stage, label, color }, idx) => {
          const stageLeads = leads.filter(l => l.status === stage || (stage === "NEW" && l.status === "IN_RESEARCH"));
          const estimatedValue = stageLeads.length * (stage === "WON" ? 120000 : 85000);

          return (
            <Panel key={stage} className="flex min-h-[550px] flex-col p-3 border-t-2" style={{ borderTopColor: `var(--color-${color}-400, #8b5cf6)` }}>
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div>
                  <h3 className="text-xs font-bold text-white">{label}</h3>
                  <div className="mt-0.5 text-[9px] text-slate-400">
                    Est: ₹{(estimatedValue / 100000).toFixed(1)}L
                  </div>
                </div>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-white">
                  {stageLeads.length}
                </span>
              </div>

              {/* Card List */}
              <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto">
                {stageLeads.length === 0 ? (
                  <div className="py-8 text-center text-[10px] text-slate-600 italic">
                    No leads in this stage
                  </div>
                ) : (
                  stageLeads.map(l => (
                    <div
                      key={l.id}
                      onClick={() => onSelectLead(l)}
                      className="group cursor-pointer rounded-xl border border-white/5 bg-black/30 p-3 hover:border-violet-400/40 hover:bg-black/50 transition-all shadow-md"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-semibold text-white group-hover:text-violet-200 transition-colors line-clamp-1">
                          {l.companyName}
                        </h4>
                        <TierPill tier={l.tier} />
                      </div>

                      <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                        <User size={10} />
                        <span className="truncate">{l.contactPerson || "Founder"}</span>
                      </div>

                      <div className="mt-0.5 flex items-center justify-between text-[9px]">
                        <span className="text-slate-500">{l.city}</span>
                        {l.phone && <span className="font-mono text-cyan-300">{l.phone}</span>}
                      </div>

                      {l.bottleneck && (
                        <div className="mt-2 truncate text-[9px] text-slate-500 border-t border-white/5 pt-1.5">
                          {l.bottleneck}
                        </div>
                      )}

                      {/* Quick Move Stage Controls */}
                      <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveStage(l, "prev")}
                          className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-20"
                          title="Move to previous stage"
                        >
                          <ArrowLeft size={11} />
                        </button>
                        <span className="text-[8px] font-mono text-slate-500 uppercase">Move Stage</span>
                        <button
                          type="button"
                          disabled={idx === STAGES.length - 1}
                          onClick={() => moveStage(l, "next")}
                          className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-20"
                          title="Move to next stage"
                        >
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

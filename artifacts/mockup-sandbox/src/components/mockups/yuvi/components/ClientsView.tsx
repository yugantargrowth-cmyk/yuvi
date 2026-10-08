// components/ClientsView.tsx — Won & Retained Agency Client Accounts
import React, { useState } from "react";
import type { NormalizedLead } from "../lib/types/sales";
import { Button, Panel, ViewHeading } from "./ui";
import { UsersRound, Phone, Mail, Globe, MapPin, Calendar, DollarSign, Eye, Plus } from "lucide-react";

interface ClientsViewProps {
  leads: NormalizedLead[];
  onSelectLead: (lead: NormalizedLead) => void;
  onOpenAddModal: () => void;
}

export function ClientsView({
  leads,
  onSelectLead,
  onOpenAddModal,
}: ClientsViewProps) {
  const [query, setQuery] = useState("");

  const clients = leads.filter(l => l.status === "WON");
  const filtered = clients.filter(c =>
    `${c.companyName} ${c.contactPerson} ${c.city} ${c.category || c.industry}`.toLowerCase().includes(query.toLowerCase())
  );

  const totalRetainerValue = clients.length * 120000;

  return (
    <div className="rise space-y-5 p-4 sm:p-7">
      <ViewHeading
        view="Clients"
        description="Won & Retained Accounts — Yugantar Growth Active Client Engagements & Retainers."
        action={
          <Button variant="primary" onClick={onOpenAddModal}>
            <Plus size={14} /> Add New Client
          </Button>
        }
      />

      {/* Retainer Telemetry Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Active Retained Clients</div>
          <div className="mt-2 text-2xl font-bold text-white">{clients.length}</div>
          <div className="mt-1 text-[9px] text-emerald-300">100% Retention Rate</div>
        </Panel>
        <Panel className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Monthly Retainer Volume</div>
          <div className="mt-2 text-2xl font-bold text-emerald-300">₹{(totalRetainerValue / 100000).toFixed(1)}L <span className="text-xs text-slate-400 font-normal">/ mo</span></div>
          <div className="mt-1 text-[9px] text-slate-400">Gujarat B2B Retainers</div>
        </Panel>
        <Panel className="p-4 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Quarterly Reviews Due</div>
          <div className="mt-2 text-2xl font-bold text-cyan-300">{Math.min(clients.length, 2)}</div>
          <div className="mt-1 text-[9px] text-cyan-200">Scheduled for this month</div>
        </Panel>
      </div>

      {/* Clients Table / Cards */}
      <Panel className="p-5">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="text-xs font-semibold text-white">Retained Client Directory</div>
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
                ? "No clients marked as WON yet. Move leads in Pipeline or Leads radar to 'WON' to populate clients."
                : "No clients matching search query."}
            </div>
          ) : (
            filtered.map(c => (
              <div key={c.id} className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-sm font-bold">
                    {c.companyName.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{c.companyName}</h4>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {c.contactPerson} · <span className="text-slate-300">{c.city}, {c.state}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-cyan-300">
                      Service: {c.primaryService || "Full Growth Operating System"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right mr-3 hidden sm:block">
                    <div className="text-xs font-bold text-white font-mono">₹1,20,000 / mo</div>
                    <div className="text-[9px] text-emerald-400 font-semibold">Active Retainer</div>
                  </div>
                  <Button onClick={() => onSelectLead(c)}>
                    <Eye size={13} /> View Account
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}

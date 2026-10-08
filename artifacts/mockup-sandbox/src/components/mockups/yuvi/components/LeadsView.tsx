// components/LeadsView.tsx — Complete CRM Lead Management Radar
import React, { useState, useRef, type ChangeEvent } from "react";
import type { NormalizedLead, CallQueueItem } from "../lib/types/sales";
import type { YuviSettings } from "../lib/store";
import { Button, Panel, TierPill, StatusPill, ViewHeading } from "./ui";
import {
  UploadCloud, Download, Plus, Rocket, Search, PhoneCall,
  Sparkles, Phone, Eye, Building2, MapPin, RefreshCw, Check
} from "lucide-react";
import { parseLeadSheet } from "../lib/sales/csvParser";
import { runDailySalesEngine } from "../lib/sales/salesEngine";
import { syncLeadsWithSupabase } from "../lib/supabaseClient";

interface LeadsViewProps {
  leads: NormalizedLead[];
  setLeads: (leads: NormalizedLead[]) => void;
  callQueue: CallQueueItem[];
  setCallQueue: (queue: CallQueueItem[]) => void;
  onOpenCall: (item: CallQueueItem) => void;
  onSelectLead: (lead: NormalizedLead) => void;
  onOpenAddModal: () => void;
  onTriggerEngine: () => void;
  notify: (text: string) => void;
  onRunResearch: (lead: NormalizedLead) => void;
  researchingId: string | null;
  settings: YuviSettings;
}

export function LeadsView({
  leads,
  setLeads,
  callQueue,
  setCallQueue,
  onOpenCall,
  onSelectLead,
  onOpenAddModal,
  onTriggerEngine,
  notify,
  onRunResearch,
  researchingId,
  settings,
}: LeadsViewProps) {
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"score" | "name" | "recent">("score");
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract unique cities
  const uniqueCities = Array.from(new Set(leads.map(l => l.city).filter(Boolean)));

  // Filter & Sort
  const filtered = leads.filter(l => {
    const q = query.toLowerCase();
    const matchQ = `${l.companyName} ${l.contactPerson} ${l.city} ${l.category || l.industry} ${l.notes}`.toLowerCase().includes(q);
    const matchTier = tierFilter === "All" || l.tier === tierFilter;
    const matchStatus = statusFilter === "All" || l.status === statusFilter;
    const matchCity = cityFilter === "All" || l.city === cityFilter;
    return matchQ && matchTier && matchStatus && matchCity;
  }).sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "name") return a.companyName.localeCompare(b.companyName);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      notify(`Importing ${file.name}...`);
      const text = await file.text();
      const parseResult = parseLeadSheet(text);

      if (!parseResult.success) {
        notify(`Import error: ${parseResult.errors.join(", ") || "Failed to parse file."}`);
        return;
      }

      notify(`Parsed ${parseResult.validRows} valid rows. Running Sales Engine...`);
      const engineResult = await runDailySalesEngine(parseResult.leads, leads, {
        baseUrl: settings.activepieces?.baseUrl,
      });

      setLeads(engineResult.processedLeads);
      setCallQueue(engineResult.callQueue);
      notify(`Sales Engine completed: ${engineResult.newLeadsCount} new leads, ${engineResult.callQueue.length} calls queued.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Failed to process sheet: ${msg}`);
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      notify("No leads to export.");
      return;
    }

    const headers = ["ID", "Company Name", "Contact Person", "Phone", "Email", "Website", "City", "State", "Industry", "Tier", "Score", "Status", "Bottleneck", "Primary Service", "Notes"];
    const rows = filtered.map(l => [
      `"${l.id}"`,
      `"${(l.companyName || "").replace(/"/g, '""')}"`,
      `"${(l.contactPerson || "").replace(/"/g, '""')}"`,
      `"${l.phone || ""}"`,
      `"${l.email || ""}"`,
      `"${l.websiteUrl || ""}"`,
      `"${l.city || ""}"`,
      `"${l.state || ""}"`,
      `"${(l.category || l.industry || "").replace(/"/g, '""')}"`,
      `"${l.tier}"`,
      l.score,
      `"${l.status}"`,
      `"${(l.bottleneck || "").replace(/"/g, '""')}"`,
      `"${(l.primaryService || "").replace(/"/g, '""')}"`,
      `"${(l.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `yuvi_crm_leads_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify(`Exported ${filtered.length} leads to CSV.`);
  };

  const handleSyncCloud = async () => {
    setSyncing(true);
    notify("Synchronizing leads with Supabase database...");
    const res = await syncLeadsWithSupabase(leads, settings.supabase?.url, settings.supabase?.anonKey);
    setSyncing(false);
    if (res.success) {
      setLeads(res.leads);
      notify(res.message);
    } else {
      notify(res.message);
    }
  };

  return (
    <div className="rise space-y-5 p-4 sm:p-7">
      <ViewHeading
        view="Leads"
        description="Daily Commercial Radar & CRM — Deduplicated, Tier-Classified, and Synced with Supabase."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <UploadCloud size={14} /> Import CSV
            </Button>
            <Button onClick={handleExportCSV}>
              <Download size={14} /> Export CSV
            </Button>
            <Button onClick={onOpenAddModal}>
              <Plus size={14} /> Add Lead
            </Button>
            <Button onClick={handleSyncCloud} disabled={syncing}>
              {syncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Sync Cloud
            </Button>
            <Button variant="primary" onClick={onTriggerEngine}>
              <Rocket size={14} /> Run Sales Engine
            </Button>
          </div>
        }
      />

      <Panel className="overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3">
            <Search size={15} className="text-slate-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search company, contact, city, phone, or notes..."
              className="w-full bg-transparent py-2 text-xs text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300 outline-none"
            >
              <option value="All">All Tiers</option>
              <option value="A">Tier A (Score 80+)</option>
              <option value="B">Tier B (Score 60-79)</option>
              <option value="C">Tier C (Score 45-59)</option>
              <option value="D">Tier D (Disqualified)</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300 outline-none"
            >
              <option value="All">All Stages</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="INTERESTED">Interested</option>
              <option value="CALLBACK">Callback</option>
              <option value="WON">Won (Client)</option>
              <option value="LOST">Lost</option>
            </select>

            <select
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300 outline-none"
            >
              <option value="All">All Cities</option>
              {uniqueCities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300 outline-none"
            >
              <option value="score">Sort by Score</option>
              <option value="name">Sort by Company</option>
              <option value="recent">Sort by Recent</option>
            </select>
          </div>
        </div>

        {/* Telemetry info row */}
        <div className="flex items-center justify-between border-b border-white/5 bg-black/10 px-4 py-2.5 text-[10px] text-slate-400">
          <span>Showing <b>{filtered.length}</b> of <b>{leads.length}</b> leads in radar</span>
          <span className="hidden sm:inline">Click any row to inspect & edit full CRM profile</span>
        </div>

        {/* Leads Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="border-b border-white/5 bg-black/20 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Company & Contact</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Tier & Score</th>
                <th className="px-4 py-3 font-semibold">Phone / Channel</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold">Key Bottleneck</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                    No leads matching your search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(l => (
                  <tr
                    key={l.id}
                    onClick={() => onSelectLead(l)}
                    className="cursor-pointer hover:bg-white/[.025] transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-bold text-violet-300 border border-violet-500/30">
                          {l.companyName.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-white group-hover:text-violet-200 transition-colors">
                            {l.companyName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {l.contactPerson || "Decision Maker"} · {l.category || l.industry}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-300">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-500" /> {l.city}, {l.state}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TierPill tier={l.tier} />
                        <span className="font-mono text-xs font-bold text-cyan-300">{l.score}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs" onClick={e => e.stopPropagation()}>
                      {l.phone ? (
                        <a
                          href={`tel:${l.phone}`}
                          className="inline-flex items-center gap-1 font-mono text-cyan-300 hover:underline"
                        >
                          <Phone size={11} /> {l.phone}
                        </a>
                      ) : (
                        <span className="text-slate-500 italic">No phone listed</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <StatusPill status={l.status} />
                    </td>

                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="truncate text-[10px] text-slate-400">
                        {l.bottleneck || "Expanding B2B pipeline"}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {l.phone && (
                          <button
                            type="button"
                            onClick={() => {
                              const callItem = callQueue.find(c => c.leadId === l.id) || {
                                id: `call_${l.id}`,
                                leadId: l.id,
                                companyName: l.companyName,
                                contactPerson: l.contactPerson || "Decision Maker",
                                phone: l.phone,
                                priority: l.tier === "A" ? "URGENT" : "HIGH",
                                reason: l.bottleneck || "Sales engine follow-up",
                                talkingPoints: [
                                  `Company: ${l.companyName} (${l.city})`,
                                  `Contact: ${l.contactPerson || "Principal"}`,
                                  `Angle: ${l.bottleneck || "Gujarat client acquisition"}`,
                                  `Offer: ${l.primaryService || "Yugantar Growth revenue architecture"}`,
                                  `Goal: Schedule 15-minute diagnostic call`,
                                ],
                                clickToCallUrl: `tel:${l.phone}`,
                                callStatus: "PENDING",
                              };
                              onOpenCall(callItem);
                            }}
                            className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-400/20"
                          >
                            <PhoneCall size={11} className="mr-1 inline" /> Call
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRunResearch(l)}
                          disabled={researchingId === l.id}
                          className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
                        >
                          <Sparkles size={11} className="mr-1 inline" />
                          {researchingId === l.id ? "Analyzing..." : "Intel"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectLead(l)}
                          className="rounded-lg border border-white/10 bg-white/5 p-1 text-slate-400 hover:text-white"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// components/LeadsView.tsx — Complete CRM Lead Factory & Radar with CSV Wizard, Dedupe Report & Triage
import React, { useState, useRef, type ChangeEvent } from "react";
import type { NormalizedLead, CallQueueItem, DedupeReport } from "../lib/types/sales";
import type { YuviSettings } from "../lib/store";
import { Button, Panel, TierPill, StatusPill, ViewHeading } from "./ui";
import {
  UploadCloud, Download, Plus, Rocket, Search, PhoneCall,
  Sparkles, Phone, Eye, MapPin, RefreshCw, Check, CheckCircle2,
  AlertTriangle, Filter, ListOrdered, X
} from "lucide-react";
import { parseLeadSheet, getCSVPreview, deduplicateLeads } from "../lib/sales/csvParser";
import { triageLeadsBatch } from "../lib/sales/leadTriageEngine";
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

const CANONICAL_FIELDS: { key: string; label: string }[] = [
  { key: "companyName", label: "Company Name *" },
  { key: "contactPerson", label: "Contact Person" },
  { key: "phone", label: "Phone / WhatsApp *" },
  { key: "category", label: "Category / Industry" },
  { key: "websiteUrl", label: "Website URL" },
  { key: "address", label: "Full Address" },
  { key: "city", label: "City" },
  { key: "rating", label: "Google Rating (0-5)" },
  { key: "reviewCount", label: "Review Count" },
  { key: "mapsUrl", label: "Google Maps / GMB URL" },
  { key: "instagram", label: "Instagram Handle/URL" },
  { key: "email", label: "Email Address" },
  { key: "ignore", label: "— Ignore Column —" },
];

export function LeadsView({
  leads,
  setLeads,
  callQueue,
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
  const [triageFilter, setTriageFilter] = useState<"All" | "qualified" | "maybe" | "skip">("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"score" | "name" | "recent">("score");
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Import Wizard State
  const [rawCsvText, setRawCsvText] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardFileName, setWizardFileName] = useState("");
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [totalEstimatedRows, setTotalEstimatedRows] = useState(0);

  // Dedupe Report Modal State
  const [dedupeReportOpen, setDedupeReportOpen] = useState(false);
  const [latestReport, setLatestReport] = useState<DedupeReport | null>(null);

  // Top N Research Selector
  const [topNCount, setTopNCount] = useState(100);

  // Extract unique cities
  const uniqueCities = Array.from(new Set(leads.map(l => l.city).filter(Boolean)));

  // Filter & Sort
  const filtered = leads.filter(l => {
    const q = query.toLowerCase();
    const matchQ = `${l.companyName} ${l.contactPerson} ${l.city} ${l.category || l.industry} ${l.notes}`.toLowerCase().includes(q);
    const matchTier = tierFilter === "All" || l.tier === tierFilter;
    const matchStatus = statusFilter === "All" || l.status === statusFilter;
    const matchTriage = triageFilter === "All" || l.triage?.decision === triageFilter;
    const matchCity = cityFilter === "All" || l.city === cityFilter;
    return matchQ && matchTier && matchStatus && matchTriage && matchCity;
  }).sort((a, b) => {
    if (sortBy === "score") {
      const aScore = a.triage?.fitScore ?? a.score ?? 0;
      const bScore = b.triage?.fitScore ?? b.score ?? 0;
      return bScore - aScore;
    }
    if (sortBy === "name") return a.companyName.localeCompare(b.companyName);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleFilePicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setRawCsvText(text);
      setWizardFileName(file.name);

      const preview = getCSVPreview(text, 10);
      setPreviewHeaders(preview.headers);
      setPreviewRows(preview.previewRows);
      setColumnMapping(preview.detectedMapping);
      setTotalEstimatedRows(preview.totalEstimatedRows);
      setWizardOpen(true);
    } catch (err) {
      notify(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleConfirmImport = () => {
    try {
      setWizardOpen(false);
      notify(`Importing and deduplicating ${totalEstimatedRows} rows...`);

      const parseResult = parseLeadSheet(rawCsvText, columnMapping);
      if (!parseResult.success) {
        notify(`Parse error: ${parseResult.errors.join(", ")}`);
        return;
      }

      // Run multi-factor deduplication
      const dedupeResult = deduplicateLeads(parseResult.leads);

      // Run knowledge-driven triage on clean leads
      const triagedLeads = triageLeadsBatch(dedupeResult.cleanLeads);

      // Merge with existing leads
      const existingMap = new Map<string, NormalizedLead>();
      leads.forEach(l => existingMap.set(l.id, l));
      triagedLeads.forEach(l => existingMap.set(l.id, l));

      const mergedList = Array.from(existingMap.values());
      const finalRanked = triageLeadsBatch(mergedList);

      setLeads(finalRanked);
      setLatestReport(dedupeResult.report);
      setDedupeReportOpen(true);
      notify(`Import complete: ${dedupeResult.report.totalKept} kept, ${dedupeResult.report.totalMerged} merged, ${dedupeResult.report.totalDropped} dropped.`);
    } catch (err) {
      notify(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSelectTopN = () => {
    const qualifiedOrMaybe = leads.filter(l => l.triage?.decision !== "skip");
    const topSelection = qualifiedOrMaybe.slice(0, topNCount);
    notify(`Selected top ${topSelection.length} qualified leads for Phase 2 research pipeline.`);
  };

  const handleRunTriageAll = () => {
    if (leads.length === 0) {
      notify("No leads in database to triage. Import a CSV first.");
      return;
    }
    notify("Triaging all leads against Yugantar Growth ICP rules...");
    const triaged = triageLeadsBatch(leads);
    setLeads(triaged);
    const qualifiedCount = triaged.filter(l => l.triage?.decision === "qualified").length;
    notify(`Triage complete: ${qualifiedCount} qualified, ${triaged.length - qualifiedCount} other.`);
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      notify("No leads to export.");
      return;
    }

    const headers = ["ID", "Company Name", "Contact Person", "Phone", "Category", "Triage Decision", "Fit Score", "Triage Reasons", "City", "Website", "Rating", "Review Count"];
    const rows = filtered.map(l => [
      `"${l.id}"`,
      `"${(l.companyName || "").replace(/"/g, '""')}"`,
      `"${(l.contactPerson || "").replace(/"/g, '""')}"`,
      `"${l.phone || ""}"`,
      `"${(l.category || l.industry || "").replace(/"/g, '""')}"`,
      `"${l.triage?.decision || "un-triaged"}"`,
      l.triage?.fitScore ?? l.score ?? 0,
      `"${(l.triage?.reasons || []).join(" | ").replace(/"/g, '""')}"`,
      `"${l.city || ""}"`,
      `"${l.websiteUrl || ""}"`,
      l.rating ?? "",
      l.reviewCount ?? "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `yuvi_leads_triaged_${new Date().toISOString().split("T")[0]}.csv`);
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
        description="Automated ICP Triage, Column Mapping, Indian Phone Normalization (+91), and Multi-Factor Deduplication."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={handleFilePicked}
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="primary">
              <UploadCloud size={14} /> Import CSV Wizard
            </Button>
            <Button onClick={handleRunTriageAll}>
              <Filter size={14} /> Re-Triage Pipeline
            </Button>
            <Button onClick={handleSelectTopN}>
              <ListOrdered size={14} /> Top {topNCount} for Research
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
          </div>
        }
      />

      {/* CSV Import Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-zinc-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UploadCloud size={18} className="text-orange-500" />
                  CSV Column Mapping Wizard
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  File: <span className="text-slate-200 font-mono">{wizardFileName}</span> (~{totalEstimatedRows} leads found)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWizardOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Column Mapper Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Map CSV Columns to YUVI Lead Fields
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                {previewHeaders.map((header) => (
                  <div key={header} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                    <span className="text-xs font-mono text-slate-300 truncate max-w-[180px]" title={header}>
                      {header}
                    </span>
                    <select
                      value={columnMapping[header] || "ignore"}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [header]: e.target.value })}
                      className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-slate-200 outline-none"
                    >
                      {CANONICAL_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* 10-Row Sample Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Data Preview (First {previewRows.length} rows)
              </h4>
              <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/40">
                <table className="w-full text-left text-[11px]">
                  <thead className="border-b border-white/10 bg-zinc-900 text-slate-400">
                    <tr>
                      {previewHeaders.map((h) => (
                        <th key={h} className="p-2 font-mono whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {previewRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/[0.02]">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2 text-slate-300 truncate max-w-[180px]">
                            {cell || <span className="text-slate-600 italic">null</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button onClick={() => setWizardOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleConfirmImport}>
                <Check size={14} /> Import & Deduplicate Leads
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dedupe Report Modal */}
      {dedupeReportOpen && latestReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-white/10 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  Deduplication Audit Report
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Multi-factor check by normalized phone (+91), website domain, and name/address similarity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDedupeReportOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Summary Stat Tiles */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-center">
                <div className="text-lg font-bold text-white">{latestReport.totalInput}</div>
                <div className="text-[10px] text-slate-400">Total Ingested</div>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
                <div className="text-lg font-bold text-emerald-400">{latestReport.totalKept}</div>
                <div className="text-[10px] text-emerald-300">Kept Unique</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 text-center">
                <div className="text-lg font-bold text-cyan-400">{latestReport.totalMerged}</div>
                <div className="text-[10px] text-cyan-300">Merged Fields</div>
              </div>
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-center">
                <div className="text-lg font-bold text-rose-400">{latestReport.totalDropped}</div>
                <div className="text-[10px] text-rose-300">Redundant Drops</div>
              </div>
            </div>

            {/* Items Log */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {latestReport.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded border border-white/5 bg-white/[0.01] p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      item.action === "kept"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : item.action === "merged"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}>
                      {item.action.toUpperCase()}
                    </span>
                    <span className="font-semibold text-slate-200">{item.companyName}</span>
                    <span className="font-mono text-slate-400 text-[10px]">{item.phone}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 italic max-w-xs truncate" title={item.reason}>
                    {item.reason}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <Button variant="primary" onClick={() => setDedupeReportOpen(false)}>
                Done & View Ranked Radar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Radar Panel */}
      <Panel className="overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3">
            <Search size={15} className="text-slate-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search company, contact, city, phone, or reasons..."
              className="w-full bg-transparent py-2 text-xs text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={triageFilter}
              onChange={e => setTriageFilter(e.target.value as any)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300 outline-none"
            >
              <option value="All">All Triage Decisions</option>
              <option value="qualified">Qualified Only (ICP Match)</option>
              <option value="maybe">Maybe (Requires Review)</option>
              <option value="skip">Disqualified / Skip</option>
            </select>

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
              <option value="score">Sort by Triage Fit Score</option>
              <option value="name">Sort by Company</option>
              <option value="recent">Sort by Recent</option>
            </select>
          </div>
        </div>

        {/* Telemetry info row */}
        <div className="flex items-center justify-between border-b border-white/5 bg-black/10 px-4 py-2.5 text-[10px] text-slate-400">
          <span>Showing <b>{filtered.length}</b> of <b>{leads.length}</b> leads in radar (Ranked by Triage Fit)</span>
          <span className="hidden sm:inline">Top N Default: <b>100</b> leads</span>
        </div>

        {/* Leads Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="border-b border-white/5 bg-black/20 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Rank & Company</th>
                <th className="px-4 py-3 font-semibold">Triage Decision & Score</th>
                <th className="px-4 py-3 font-semibold">Explainable Reasons</th>
                <th className="px-4 py-3 font-semibold">Phone / WhatsApp</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                    No leads matching your search criteria. Click &quot;Import CSV Wizard&quot; to ingest leads.
                  </td>
                </tr>
              ) : (
                filtered.map((l, index) => {
                  const decision = l.triage?.decision || (l.score >= 60 ? "qualified" : "maybe");
                  const fitScore = l.triage?.fitScore ?? l.score;
                  return (
                    <tr
                      key={l.id}
                      onClick={() => onSelectLead(l)}
                      className="cursor-pointer hover:bg-white/[.025] transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] font-bold text-slate-500 w-5">
                            #{index + 1}
                          </span>
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600/20 text-xs font-bold text-orange-300 border border-orange-500/30">
                            {l.companyName.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <div className="text-xs font-semibold text-white group-hover:text-orange-200 transition-colors">
                              {l.companyName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {l.contactPerson || "Leadership"} · {l.category || l.industry} · {l.city}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            decision === "qualified"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : decision === "maybe"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                          }`}>
                            {decision}
                          </span>
                          <span className="font-mono text-xs font-bold text-orange-400">
                            {fitScore}/100
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-[10px] text-slate-300 truncate" title={l.triage?.reasons?.join(" • ") || "Pending deep audit"}>
                          {l.triage?.reasons?.[0] || l.bottleneck || "Target category match"}
                        </div>
                        {l.triage?.reasons && l.triage.reasons.length > 1 && (
                          <div className="text-[9px] text-slate-500">
                            +{l.triage.reasons.length - 1} more reasons
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs" onClick={e => e.stopPropagation()}>
                        {l.phone ? (
                          <a
                            href={`https://wa.me/${l.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:underline"
                          >
                            <Phone size={11} /> {l.phone}
                          </a>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Missing Phone</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <StatusPill status={l.status} />
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
                                  contactPerson: l.contactPerson || "Leadership",
                                  phone: l.phone,
                                  priority: l.tier === "A" ? "URGENT" : "HIGH",
                                  reason: l.triage?.reasons?.[0] || "Triage follow-up",
                                  talkingPoints: [
                                    `Company: ${l.companyName} (${l.city})`,
                                    `Category: ${l.category || l.industry}`,
                                    `Fit Score: ${fitScore}/100`,
                                    `Findings: ${l.triage?.reasons?.join(", ") || "Conversion optimization"}`,
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
                            className="rounded-lg border border-orange-400/20 bg-orange-500/10 px-2 py-1 text-[10px] font-semibold text-orange-200 hover:bg-orange-500/20 disabled:opacity-50"
                          >
                            <Sparkles size={11} className="mr-1 inline" />
                            {researchingId === l.id ? "Analyzing..." : "Research"}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

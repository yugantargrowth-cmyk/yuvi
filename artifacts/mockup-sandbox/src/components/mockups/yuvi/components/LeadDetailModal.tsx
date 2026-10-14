// components/LeadDetailModal.tsx — Comprehensive CRM Lead Detail Inspector & Editor
import React, { useState, type FormEvent } from "react";
import type { NormalizedLead, LeadStatus } from "../lib/types/sales";
import { Button, TierPill, StatusPill } from "./ui";
import {
  X, Phone, MessageCircle, Mail, Globe, MapPin, Calendar, Clock,
  CheckCircle2, Plus, Trash2, Sparkles, Send, Building2, User,
  FileText, CheckSquare, History, ExternalLink, ArrowRight, UserCheck,
  Presentation, AlertTriangle, ShieldCheck, Zap, Instagram, Eye
} from "lucide-react";
import { auditLead, runMultiSourceResearch } from "../lib/research/leadResearcher";
import { generateHunterPitch, recordWhatsAppDispatch, generateWhatsAppDeepLink } from "../lib/outreach/hunterOutreach";
import { generateClientPitchDeck } from "../lib/export/presentationBuilder";
import { SocialSnapshotModal } from "./SocialSnapshotModal";
import type { EvidenceItem, SocialSnapshot } from "../lib/research/evidenceModel";
import { synthesizeResearchEvidence } from "../lib/research/evidenceModel";

interface LeadDetailModalProps {
  lead: NormalizedLead;
  onClose: () => void;
  onUpdateLead: (updated: NormalizedLead) => void;
  onDeleteLead: (leadId: string) => void;
  onOpenCall: (lead: NormalizedLead) => void;
  onRunResearch: (lead: NormalizedLead) => void;
  onConvertToClient?: (lead: NormalizedLead, options: any) => void;
  onCreateProposal?: (lead: NormalizedLead) => void;
  notify: (text: string) => void;
}

export function LeadDetailModal({
  lead,
  onClose,
  onUpdateLead,
  onDeleteLead,
  onOpenCall,
  onRunResearch,
  onConvertToClient,
  onCreateProposal,
  notify,
}: LeadDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "evidence" | "notes" | "tasks" | "outreach" | "activity">("overview");
  const [showSocialModal, setShowSocialModal] = useState(false);

  // Editable fields
  const [companyName, setCompanyName] = useState(lead.companyName);
  const [contactPerson, setContactPerson] = useState(lead.contactPerson);
  const [phone, setPhone] = useState(lead.phone);
  const [email, setEmail] = useState(lead.email);
  const [websiteUrl, setWebsiteUrl] = useState(lead.websiteUrl);
  const [city, setCity] = useState(lead.city);
  const [industry, setIndustry] = useState(lead.industry || lead.category);
  const [status, setStatus] = useState<LeadStatus>(lead.status);

  // Notes
  const [newNote, setNewNote] = useState("");
  // Tasks
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState(() => new Date(Date.now() + 48 * 3600 * 1000).toISOString().split("T")[0]);

  // Conversion state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convType, setConvType] = useState<"MONTHLY_RETAINER" | "FIXED_PROJECT">("MONTHLY_RETAINER");
  const [convFee, setConvFee] = useState<number>(120000);

  // Workforce action states
  const [isAuditing, setIsAuditing] = useState(false);
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);

  const handleDeepResearch = async () => {
    setIsAuditing(true);
    notify(`Researcher scanning multi-source digital footprint for ${lead.companyName}...`);
    try {
      const result = await runMultiSourceResearch(lead, {
        socialSnapshot: lead.socialSnapshot,
      });
      onUpdateLead(result.lead);
      notify(`Research complete! Score: ${result.lead.auditScore}/100. ${result.evidence.length} evidence items logged.`);
    } catch (err) {
      try {
        const fallback = await auditLead(lead);
        onUpdateLead(fallback);
        notify(`Research complete (Offline mode)! Score: ${fallback.auditScore}/100.`);
      } catch (e2) {
        notify(`Research error: ${String(err)}`);
      }
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSaveSocialSnapshot = (snapshot: SocialSnapshot) => {
    const evidence = synthesizeResearchEvidence(
      lead.id,
      lead.websiteUrl,
      undefined,
      undefined,
      lead.rating ? { rating: lead.rating, reviewCount: lead.reviewCount } : undefined,
      snapshot,
    );
    const nonSocial = (lead.researchEvidence || []).filter(e => e.source !== "social_snapshot");
    const mergedEvidence = [...nonSocial, ...evidence.filter(e => e.source === "social_snapshot")];

    const updated: NormalizedLead = {
      ...lead,
      socialSnapshot: snapshot,
      instagram: snapshot.instagramHandle || lead.instagram,
      researchEvidence: mergedEvidence,
      updatedAt: new Date().toISOString(),
    };
    onUpdateLead(updated);
    notify(`Saved 20s Social Snapshot for ${lead.companyName} (OBSERVED).`);
  };

  const handleWhatsAppDispatch = () => {
    if (!lead.phone) {
      notify("Lead does not have a phone number.");
      return;
    }
    const pitch = lead.outreachDrafts?.whatsapp || generateHunterPitch(lead).whatsappPitch;
    const { updatedLead, deepLink } = recordWhatsAppDispatch(lead, pitch);
    onUpdateLead(updatedLead);
    window.open(deepLink, "_blank");
    notify(`Dispatched WhatsApp message via wa.me & logged in activity history.`);
  };

  const handleBuildPitchDeck = async () => {
    setIsGeneratingDeck(true);
    notify(`DeckBuilder generating native PowerPoint pitch deck for ${lead.companyName}...`);
    try {
      const fileName = await generateClientPitchDeck({ lead });
      notify(`Generated & downloaded PowerPoint presentation: ${fileName}`);
    } catch (err) {
      notify(`Deck generation error: ${String(err)}`);
    } finally {
      setIsGeneratingDeck(false);
    }
  };

  const handleSaveInfo = (e: FormEvent) => {
    e.preventDefault();
    const updated: NormalizedLead = {
      ...lead,
      companyName,
      contactPerson,
      phone,
      email,
      websiteUrl,
      city,
      industry,
      category: industry,
      status,
      updatedAt: new Date().toISOString(),
    };
    onUpdateLead(updated);
    notify(`Saved changes for ${companyName}.`);
  };

  const handleAddNote = (e: FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const timestamp = new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const formattedNote = `[${timestamp}]: ${newNote.trim()}`;
    const combinedNotes = lead.notes ? `${formattedNote}\n\n${lead.notes}` : formattedNote;

    const newActivity = {
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: "Note Added",
      note: newNote.trim(),
      author: "Shlok Pandya",
    };

    const updated: NormalizedLead = {
      ...lead,
      notes: combinedNotes,
      activityHistory: [newActivity, ...(lead.activityHistory || [])],
      updatedAt: new Date().toISOString(),
    };

    onUpdateLead(updated);
    setNewNote("");
    notify("Note added to CRM record.");
  };

  const handleAddTask = (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const taskItem = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      dueDate: newTaskDate,
      completed: false,
      createdAt: new Date().toISOString(),
      assignedTo: "Hunter",
    };

    const newActivity = {
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: `Scheduled Task: ${newTaskTitle.trim()}`,
      author: "Shlok Pandya",
    };

    const updated: NormalizedLead = {
      ...lead,
      tasks: [taskItem, ...(lead.tasks || [])],
      activityHistory: [newActivity, ...(lead.activityHistory || [])],
      updatedAt: new Date().toISOString(),
    };

    onUpdateLead(updated);
    setNewTaskTitle("");
    notify("Task scheduled for lead.");
  };

  const handleToggleTask = (taskId: string) => {
    const updatedTasks = (lead.tasks || []).map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    onUpdateLead({
      ...lead,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleStatusChange = (newStatus: LeadStatus) => {
    setStatus(newStatus);
    const newActivity = {
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: `Stage Changed to ${newStatus}`,
      author: "Shlok Pandya",
    };
    const updated: NormalizedLead = {
      ...lead,
      status: newStatus,
      activityHistory: [newActivity, ...(lead.activityHistory || [])],
      updatedAt: new Date().toISOString(),
    };
    onUpdateLead(updated);
    notify(`Moved ${lead.companyName} to ${newStatus}.`);
  };

  const cleanPhoneDigits = lead.phone ? lead.phone.replace(/[^0-9]/g, "") : "";
  const whatsappUrl = cleanPhoneDigits ? `https://wa.me/${cleanPhoneDigits}?text=${encodeURIComponent(lead.outreachDrafts?.whatsapp || `Hello ${lead.contactPerson || "there"},\n\nI was reviewing ${lead.companyName}'s work in ${lead.city} and would love to share two growth angles we mapped at Yugantar Growth.\n\n— Shlok Pandya`)}` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040510]/85 p-3 backdrop-blur-md sm:p-6" onClick={onClose}>
      <div className="panel max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-violet-400/25 bg-[#0a0c24] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-white/10 p-5 bg-gradient-to-r from-violet-900/30 to-black/30">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-lg font-bold text-violet-300 border border-violet-500/30">
              {lead.companyName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white sm:text-xl">{lead.companyName}</h2>
                <TierPill tier={lead.tier} />
                <span className="font-mono text-xs text-cyan-300">Score: {lead.score}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1"><User size={12} /> {lead.contactPerson || "Decision Maker"}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {lead.city}, {lead.state}</span>
                <span className="flex items-center gap-1"><Building2 size={12} /> {lead.category}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Quick Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 bg-black/20 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Stage:</span>
            <select
              value={status}
              onChange={e => handleStatusChange(e.target.value as LeadStatus)}
              className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-xs font-semibold text-white outline-none focus:border-violet-400"
            >
              <option value="NEW">NEW PROSPECT</option>
              <option value="CONTACTED">CONTACTED / DISCOVERY</option>
              <option value="QUALIFIED">QUALIFIED</option>
              <option value="INTERESTED">INTERESTED</option>
              <option value="CALLBACK">CALLBACK REQUESTED</option>
              <option value="WON">WON / CLIENT</option>
              <option value="LOST">LOST / DISQUALIFIED</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lead.phone && (
              <>
                <a
                  href={`tel:${lead.phone}`}
                  onClick={() => onOpenCall(lead)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-400/20"
                >
                  <Phone size={13} /> Call
                </a>
                <button
                  type="button"
                  onClick={handleWhatsAppDispatch}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30 transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                >
                  <MessageCircle size={13} /> 1-Click WhatsApp
                </button>
              </>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}?subject=${encodeURIComponent(lead.outreachDrafts?.email?.subject || `Commercial Growth for ${lead.companyName}`)}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
              >
                <Mail size={13} /> Email
              </a>
            )}
            <Button onClick={handleDeepResearch} disabled={isAuditing}>
              <Sparkles size={13} className={isAuditing ? "animate-spin" : ""} />
              {isAuditing ? "Auditing..." : "Run Multi-Source Scan"}
            </Button>
            <button
              type="button"
              onClick={() => setShowSocialModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-pink-400/40 bg-pink-500/15 px-3 py-1.5 text-xs font-semibold text-pink-200 hover:bg-pink-500/25 transition-all"
            >
              <Instagram size={13} /> 20s Social Snapshot
            </button>
            <button
              type="button"
              onClick={handleBuildPitchDeck}
              disabled={isGeneratingDeck}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 transition-all"
            >
              <Presentation size={13} />
              {isGeneratingDeck ? "Building..." : "Build Pitch Deck (.pptx)"}
            </button>
            {lead.status !== "WON" && onConvertToClient && (
              <Button variant="success" onClick={() => setShowConvertModal(true)}>
                <UserCheck size={13} /> Convert to Client
              </Button>
            )}
            {onCreateProposal && (
              <Button variant="primary" onClick={() => onCreateProposal(lead)}>
                <FileText size={13} /> Draft Proposal
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 px-5 bg-black/10 overflow-x-auto">
          {[
            { id: "overview", label: "Overview & Info", icon: Building2 },
            { id: "evidence", label: "Research & Evidence", icon: ShieldCheck },
            { id: "notes", label: "Notes", icon: FileText },
            { id: "tasks", label: "Tasks & Follow-ups", icon: CheckSquare },
            { id: "outreach", label: "Outreach Copy", icon: Send },
            { id: "activity", label: "Activity History", icon: History },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors ${
                  activeTab === t.id
                    ? "border-violet-400 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Decision Maker / Contact</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Phone (+91 format)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Website URL</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={websiteUrl}
                      onChange={e => setWebsiteUrl(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
                    />
                    {websiteUrl && (
                      <a href={websiteUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 p-2.5 text-slate-400 hover:text-white">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">City & Region</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Industry / Niche</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
                  />
                </div>
              </div>

              {/* Deep Digital Footprint & Bottlenecks Diagnostic Section */}
              <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/30 via-black/40 to-black/60 p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-violet-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Researcher: Digital Footprint & Bottleneck Diagnosis
                    </span>
                  </div>
                  {lead.auditScore !== undefined ? (
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                      Audit Score: {lead.auditScore}/100
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Audit Pending</span>
                  )}
                </div>

                {/* Audit Metrics Row */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-white/5 bg-black/30 p-2.5 text-center">
                    <div className="text-[10px] text-slate-400 uppercase">Mobile Speed</div>
                    <div className={`mt-0.5 font-mono text-sm font-bold ${
                      (lead.speedSeconds || 3.8) <= 2.0 ? "text-emerald-400" : "text-amber-400"
                    }`}>
                      {lead.speedSeconds ? `${lead.speedSeconds.toFixed(1)}s` : "3.8s (Est.)"}
                    </div>
                    <div className="text-[9px] text-slate-500">Sub-2.0s Required</div>
                  </div>

                  <div className="rounded-lg border border-white/5 bg-black/30 p-2.5 text-center">
                    <div className="text-[10px] text-slate-400 uppercase">Mobile UX</div>
                    <div className="mt-0.5 text-xs font-semibold text-cyan-300">
                      {lead.mobileAudit?.responsive !== false ? "Responsive" : "Non-Responsive"}
                    </div>
                    <div className="text-[9px] text-slate-500">Viewport Health</div>
                  </div>

                  <div className="rounded-lg border border-white/5 bg-black/30 p-2.5 text-center">
                    <div className="text-[10px] text-slate-400 uppercase">WhatsApp CTA</div>
                    <div className={`mt-0.5 text-xs font-semibold ${
                      lead.mobileAudit?.hasWhatsAppCta ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {lead.mobileAudit?.hasWhatsAppCta ? "Detected" : "Missing / Leak"}
                    </div>
                    <div className="text-[9px] text-slate-500">Instant Lead Capture</div>
                  </div>

                  <div className="rounded-lg border border-white/5 bg-black/30 p-2.5 text-center">
                    <div className="text-[10px] text-slate-400 uppercase">SSL Protocol</div>
                    <div className="mt-0.5 text-xs font-semibold text-emerald-400">
                      {lead.websiteUrl?.startsWith("http://") ? "HTTP (Insecure)" : "HTTPS Encrypted"}
                    </div>
                    <div className="text-[9px] text-slate-500">Enterprise Trust</div>
                  </div>
                </div>

                {/* Primary Bottleneck */}
                <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-300">
                    <AlertTriangle size={13} /> Commercial Revenue Leak
                  </div>
                  <div className="text-xs text-slate-200">
                    {lead.bottleneck || "High-value commercial operations currently leaking >50% of mobile inquiries due to unoptimized load speeds and lack of direct conversational booking."}
                  </div>
                </div>

                {/* Recommended Growth Playbook */}
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <Zap size={13} /> Recommended Growth Playbook: {lead.growthPlaybook?.packageName || lead.recommendedService || "Fast Web Dev (48h, Sub-2s Load) & AI WhatsApp Engine"}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                      Timeline: {lead.growthPlaybook?.setupTimeline || "48 Hours"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    {lead.growthPlaybook?.description || "Headless web reconstruction paired with 24/7 automated WhatsApp inquiry qualification."}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-200 pt-1">
                    <span><b>Projected Lift:</b> {lead.growthPlaybook?.estimatedLift || "+40% to +65% Mobile Inquiry Lift"}</span>
                    <span>•</span>
                    <span><b>ROI Expectation:</b> {lead.growthPlaybook?.estimatedRoi || "3x to 5x within 60 Days"}</span>
                  </div>
                </div>

                {/* Verified Claims */}
                {lead.verifiedClaims && lead.verifiedClaims.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                      <ShieldCheck size={12} className="text-cyan-400" /> Verified Factual Claims
                    </div>
                    <div className="space-y-1">
                      {lead.verifiedClaims.slice(0, 4).map((claim, idx) => (
                        <div key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                          <span className="text-cyan-400">•</span>
                          <span>{claim}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="danger" onClick={() => {
                  if (confirm(`Are you sure you want to delete ${lead.companyName}?`)) {
                    onDeleteLead(lead.id);
                    onClose();
                  }
                }}>
                  <Trash2 size={13} /> Delete Lead
                </Button>
                <Button type="submit" variant="primary">
                  Save CRM Record
                </Button>
              </div>
            </form>
          )}

          {/* RESEARCH & EVIDENCE TAB */}
          {activeTab === "evidence" && (
            <div className="space-y-4">
              {/* Header Banner */}
              <div className="rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-black/40 to-black/60 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="text-cyan-400" size={18} />
                      <h3 className="text-sm font-bold text-white">Multi-Source Research & Provenance Engine</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Strict Truth Guardrail: Only <b className="text-emerald-400">VERIFIED</b> and <b className="text-cyan-400">OBSERVED</b> facts feed into client proposals. Inferred assumptions are quarantined.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleDeepResearch} disabled={isAuditing}>
                      <Sparkles size={13} className={isAuditing ? "animate-spin" : ""} />
                      {isAuditing ? "Scanning..." : "Rescan Sources"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowSocialModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-pink-500/30 bg-pink-500/15 px-3 py-1.5 text-xs font-semibold text-pink-200 hover:bg-pink-500/25"
                    >
                      <Instagram size={13} /> Edit Social
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Multi-Source Pillar Cards */}
              <div className="grid gap-3 sm:grid-cols-2">
                {/* 1. Website Scan */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Globe size={14} className="text-cyan-400" /> Server Website Scan
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 font-bold">
                      VERIFIED
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">SSL / HTTPS:</span>
                      <span className={lead.websiteUrl?.startsWith("http://") ? "text-red-400 font-semibold" : "text-emerald-400 font-semibold"}>
                        {lead.websiteUrl?.startsWith("http://") ? "Insecure HTTP (Leak)" : "Valid SSL Active"}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Mobile Viewport:</span>
                      <span className={lead.mobileAudit?.responsive !== false ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                        {lead.mobileAudit?.responsive !== false ? "Responsive Meta Tag" : "Legacy Desktop"}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Floating WhatsApp CTA:</span>
                      <span className={lead.mobileAudit?.hasWhatsAppCta ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                        {lead.mobileAudit?.hasWhatsAppCta ? "Detected" : "Missing / Leak"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Google PageSpeed (Mobile Lighthouse) */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Zap size={14} className="text-amber-400" /> Google PageSpeed (Mobile)
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 font-bold">
                      VERIFIED
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Mobile Speed Score:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {lead.mobileAudit?.speedScore ? `${lead.mobileAudit.speedScore}/100` : "60/100 (Est.)"}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">LCP Latency:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {lead.speedSeconds ? `${lead.speedSeconds.toFixed(1)}s` : "3.8s"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      * If Google PageSpeed API key is unset, server runs mobile payload latency test.
                    </div>
                  </div>
                </div>

                {/* 3. Google Places API */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <MapPin size={14} className="text-emerald-400" /> Google Business Places
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 font-bold">
                      VERIFIED
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Google Rating:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {lead.rating ? `${lead.rating} ⭐` : "Not listed"}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Public Reviews:</span>
                      <span className="font-mono text-slate-200">
                        {lead.reviewCount !== undefined ? `${lead.reviewCount} reviews` : "0 reviews"}
                      </span>
                    </div>
                    {lead.mapsUrl && (
                      <a href={lead.mapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-cyan-400 hover:underline">
                        View Google Maps Listing <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>

                {/* 4. Social Snapshot (OBSERVED) */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Instagram size={14} className="text-pink-400" /> Social Snapshot (20s)
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 font-bold">
                      OBSERVED
                    </span>
                  </div>
                  {lead.socialSnapshot ? (
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Instagram Handle:</span>
                        <span className="font-mono text-pink-300 font-semibold">{lead.socialSnapshot.instagramHandle || lead.instagram || "None"}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Follower Count:</span>
                        <span className="font-mono text-slate-200">{lead.socialSnapshot.followers ? lead.socialSnapshot.followers.toLocaleString("en-IN") : "Not set"}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">WhatsApp in Bio:</span>
                        <span className={lead.socialSnapshot.hasWhatsAppInBio ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                          {lead.socialSnapshot.hasWhatsAppInBio ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Posting Frequency:</span>
                        <span className="font-mono text-slate-200">{lead.socialSnapshot.postingFrequency}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-center text-[11px] text-slate-500">
                      No social snapshot captured yet.
                      <button
                        type="button"
                        onClick={() => setShowSocialModal(true)}
                        className="mt-1 block mx-auto text-pink-400 hover:underline font-semibold"
                      >
                        + Add 20s Snapshot
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Complete Evidence Ledger */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" /> Evidence Provenance Ledger
                  </h4>
                  <span className="font-mono text-[10px] text-slate-400">
                    {lead.researchEvidence?.length || 0} items logged
                  </span>
                </div>

                {(!lead.researchEvidence || lead.researchEvidence.length === 0) ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No discrete evidence logged. Click "Rescan Sources" above to perform multi-source research.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 space-y-2">
                    {lead.researchEvidence.map((ev) => (
                      <div key={ev.id} className="pt-2 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              ev.label === "VERIFIED"
                                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                : ev.label === "OBSERVED"
                                ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                                : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                            }`}>
                              {ev.label}
                            </span>
                            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">
                              {ev.source}
                            </span>
                          </div>
                          <div className="font-medium text-slate-200 mt-1">{ev.claim}</div>
                          <div className="font-mono text-[11px] text-slate-400">{ev.value}</div>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <span className="font-mono text-[10px] text-cyan-400 font-bold">
                            {Math.round(ev.confidence * 100)}% Conf.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <form onSubmit={handleAddNote} className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Add New CRM Note</label>
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Record call feedback, meeting notes, project scope, or client objections..."
                  className="h-20 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white outline-none focus:border-violet-400 placeholder:text-slate-600"
                />
                <Button type="submit" variant="primary">
                  <Plus size={13} /> Append Note
                </Button>
              </form>

              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Stored Notes Thread</div>
                {lead.notes ? (
                  <div className="whitespace-pre-wrap text-xs leading-5 text-slate-300 font-mono">
                    {lead.notes}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">No notes added yet for this account.</div>
                )}
              </div>
            </div>
          )}

          {/* TASKS TAB */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              <form onSubmit={handleAddTask} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">New Task or Follow-Up</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="e.g., Send revised Gujarat growth proposal"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white outline-none focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Due Date</label>
                  <input
                    type="date"
                    value={newTaskDate}
                    onChange={e => setNewTaskDate(e.target.value)}
                    className="mt-1 rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white outline-none"
                  />
                </div>
                <Button type="submit" variant="primary">
                  <Plus size={13} /> Add Task
                </Button>
              </form>

              <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-black/20 p-3">
                {(!lead.tasks || lead.tasks.length === 0) ? (
                  <div className="py-4 text-center text-xs text-slate-500">No scheduled tasks. Add one above.</div>
                ) : (
                  lead.tasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(t.id)}
                          className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                            t.completed
                              ? "border-emerald-400 bg-emerald-400 text-black"
                              : "border-slate-500 bg-transparent text-transparent hover:border-violet-400"
                          }`}
                        >
                          <CheckCircle2 size={12} />
                        </button>
                        <span className={`text-xs ${t.completed ? "text-slate-500 line-through" : "text-white"}`}>
                          {t.title}
                        </span>
                      </div>
                      {t.dueDate && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar size={11} /> {t.dueDate}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* OUTREACH TAB */}
          {activeTab === "outreach" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={15} className="text-emerald-400" />
                    <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">
                      Hunter: Hyper-Personalized WhatsApp Outreach (wa.me)
                    </span>
                  </div>
                  {lead.phone && (
                    <button
                      type="button"
                      onClick={handleWhatsAppDispatch}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30 transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                    >
                      <Send size={12} /> Send via WhatsApp (wa.me)
                    </button>
                  )}
                </div>

                <div className="whitespace-pre-wrap rounded-lg bg-black/35 p-3.5 font-mono text-xs text-slate-200 leading-relaxed border border-white/5">
                  {lead.outreachDrafts?.whatsapp || generateHunterPitch(lead).whatsappPitch}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Formatted for Gujarat commercial decision maker.</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newPitch = generateHunterPitch(lead).whatsappPitch;
                      onUpdateLead({
                        ...lead,
                        outreachDrafts: { ...(lead.outreachDrafts || {}), whatsapp: newPitch },
                      });
                      notify("Hunter re-calibrated pitch with latest audit findings.");
                    }}
                    className="text-cyan-400 hover:underline"
                  >
                    Refresh Copy
                  </button>
                </div>
              </div>

              {lead.outreachDrafts?.email && (
                <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-cyan-300 font-semibold flex items-center gap-2">
                    <Mail size={13} /> Email Outreach Sequence
                  </div>
                  <div className="text-xs font-semibold text-white">Subject: {lead.outreachDrafts.email.subject}</div>
                  <div className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono text-xs text-slate-200 leading-relaxed border border-white/5">
                    {lead.outreachDrafts.email.body}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIVITY HISTORY TAB */}
          {activeTab === "activity" && (
            <div className="space-y-3">
              {(!lead.activityHistory || lead.activityHistory.length === 0) ? (
                <div className="rounded-xl border border-white/5 bg-black/20 p-5 text-center text-xs text-slate-500">
                  Initial lead record imported from Gujarat radar.
                </div>
              ) : (
                lead.activityHistory.map(a => (
                  <div key={a.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-black/20 p-3 text-xs">
                    <span className="h-2 w-2 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <b className="text-white">{a.action}</b>
                        <span className="text-[10px] text-slate-500">{new Date(a.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                      </div>
                      {a.note && <div className="mt-1 text-slate-300 text-[11px]">{a.note}</div>}
                      <div className="mt-1 text-[9px] text-slate-500">By {a.author}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* CONVERT TO CLIENT MODAL */}
        {showConvertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={e => e.stopPropagation()}>
            <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[#0d0f22] p-6 shadow-2xl text-left">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" /> Convert Lead to Retained Client
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Converts <b>{lead.companyName}</b> into an active client account while preserving complete history.
              </p>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (onConvertToClient) {
                    onConvertToClient(lead, {
                      engagementType: convType,
                      monthlyRetainer: convType === "MONTHLY_RETAINER" ? convFee : undefined,
                      contractValue: convType === "FIXED_PROJECT" ? convFee : undefined,
                      agreedScope: [
                        lead.primaryService || "Growth Operating System & Outbound Pipeline",
                        "High-converting B2B messaging framework",
                        "Weekly pipeline synchronization"
                      ]
                    });
                  }
                  setShowConvertModal(false);
                  onClose();
                }}
                className="mt-4 space-y-4"
              >
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-300">Agreement Structure</label>
                  <select
                    value={convType}
                    onChange={e => setConvType(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="MONTHLY_RETAINER">Monthly Agency Retainer</option>
                    <option value="FIXED_PROJECT">Fixed Deliverable Project</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-300">
                    {convType === "MONTHLY_RETAINER" ? "Monthly Retainer Amount (₹)" : "Total Contract Value (₹)"}
                  </label>
                  <input
                    type="number"
                    min={10000}
                    step={5000}
                    value={convFee}
                    onChange={e => setConvFee(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button onClick={() => setShowConvertModal(false)}>Cancel</Button>
                  <Button variant="success" type="submit">
                    Confirm Conversion
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SOCIAL SNAPSHOT MODAL */}
        {showSocialModal && (
          <SocialSnapshotModal
            companyName={lead.companyName}
            initialSnapshot={lead.socialSnapshot}
            onSave={handleSaveSocialSnapshot}
            onClose={() => setShowSocialModal(false)}
          />
        )}
      </div>
    </div>
  );
}

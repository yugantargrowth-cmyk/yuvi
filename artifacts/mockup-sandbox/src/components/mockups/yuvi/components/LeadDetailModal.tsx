// components/LeadDetailModal.tsx — Comprehensive CRM Lead Detail Inspector & Editor
import React, { useState, type FormEvent } from "react";
import type { NormalizedLead, LeadStatus } from "../lib/types/sales";
import { Button, TierPill, StatusPill } from "./ui";
import {
  X, Phone, MessageCircle, Mail, Globe, MapPin, Calendar, Clock,
  CheckCircle2, Plus, Trash2, Sparkles, Send, Building2, User,
  FileText, CheckSquare, History, ExternalLink, ArrowRight
} from "lucide-react";

interface LeadDetailModalProps {
  lead: NormalizedLead;
  onClose: () => void;
  onUpdateLead: (updated: NormalizedLead) => void;
  onDeleteLead: (leadId: string) => void;
  onOpenCall: (lead: NormalizedLead) => void;
  onRunResearch: (lead: NormalizedLead) => void;
  notify: (text: string) => void;
}

export function LeadDetailModal({
  lead,
  onClose,
  onUpdateLead,
  onDeleteLead,
  onOpenCall,
  onRunResearch,
  notify,
}: LeadDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "tasks" | "outreach" | "activity">("overview");

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
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-400/20"
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                )}
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
            <Button onClick={() => onRunResearch(lead)}>
              <Sparkles size={13} /> AI Research
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 px-5 bg-black/10">
          {[
            { id: "overview", label: "Overview & Info", icon: Building2 },
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

              {/* Commercial Intelligence Card */}
              <div className="rounded-xl border border-violet-400/15 bg-violet-500/5 p-4 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">Strategic Commercial Angle</div>
                <div className="text-xs text-slate-300">
                  <b>Commercial Bottleneck:</b> {lead.bottleneck || "Static offline reputation without dedicated outbound client engine."}
                </div>
                <div className="text-xs text-cyan-300">
                  <b>Recommended Service:</b> {lead.primaryService || lead.recommendedService || "Direct Outbound & High-Value B2B Acquisition Engine"}
                </div>
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
              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">WhatsApp 3-Part Introduction</span>
                  {lead.phone && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-300 hover:underline flex items-center gap-1"
                    >
                      <Send size={11} /> Open in WhatsApp Web
                    </a>
                  )}
                </div>
                <div className="mt-2 whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono text-xs text-slate-200 leading-relaxed border border-white/5">
                  {lead.outreachDrafts?.whatsapp || "No draft generated yet. Click 'Generate Outreach' in Hunter actions."}
                </div>
              </div>

              {lead.outreachDrafts?.email && (
                <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-cyan-300 font-semibold">Email Outreach Draft</div>
                  <div className="mt-2 text-xs font-semibold text-white">Subject: {lead.outreachDrafts.email.subject}</div>
                  <div className="mt-2 whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono text-xs text-slate-200 leading-relaxed border border-white/5">
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
      </div>
    </div>
  );
}

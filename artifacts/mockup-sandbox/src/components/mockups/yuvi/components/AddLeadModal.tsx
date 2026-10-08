// components/AddLeadModal.tsx — Add Lead Modal with Duplicate Prevention & Auto-Scoring
import React, { useState, type FormEvent } from "react";
import type { NormalizedLead } from "../lib/types/sales";
import { Button } from "./ui";
import { X, Plus, AlertCircle } from "lucide-react";
import { normalizePhone, normalizeWebsite, normalizeName, calculateLeadScore } from "../lib/sales/salesEngine";

interface AddLeadModalProps {
  existingLeads: NormalizedLead[];
  onClose: () => void;
  onAddLead: (lead: NormalizedLead) => void;
  notify: (text: string) => void;
}

export function AddLeadModal({
  existingLeads,
  onClose,
  onAddLead,
  notify,
}: AddLeadModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [city, setCity] = useState("Ahmedabad");
  const [industry, setIndustry] = useState("Luxury Furniture & Architecture");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const normName = normalizeName(companyName);
    const normPhone = normalizePhone(phone);
    const normWeb = normalizeWebsite(websiteUrl);

    if (!normName) {
      setError("Company Name is required.");
      return;
    }

    // Duplicate prevention check
    const duplicate = existingLeads.find(l => {
      const matchName = l.companyName.toLowerCase() === normName.toLowerCase();
      const matchPhone = normPhone && l.phone && l.phone === normPhone;
      return matchName || matchPhone;
    });

    if (duplicate) {
      setError(`Duplicate detected: A lead for "${duplicate.companyName}" (${duplicate.phone || "No phone"}) already exists in your CRM.`);
      return;
    }

    const scoreData = calculateLeadScore({
      companyName: normName,
      phone: normPhone,
      email: email.trim().toLowerCase(),
      websiteUrl: normWeb,
      city: city.trim() || "Ahmedabad",
      state: "Gujarat",
      category: industry.trim() || "Commercial",
    });

    const newLeadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newLead: NormalizedLead = {
      id: newLeadId,
      companyName: normName,
      contactPerson: contactPerson || "Decision Maker",
      phone: normPhone,
      email: email.trim().toLowerCase(),
      websiteUrl: normWeb,
      city: city.trim() || "Ahmedabad",
      state: "Gujarat",
      country: "India",
      industry: industry.trim() || "Commercial",
      category: industry.trim() || "Commercial",
      status: "NEW",
      score: scoreData.score,
      tier: scoreData.tier,
      notes: notes.trim() ? `[Created]: ${notes.trim()}` : "Manual lead created via CRM.",
      rawRecord: {},
      createdAt: now,
      updatedAt: now,
      bottleneck: scoreData.bottleneck,
      primaryService: scoreData.primaryService,
      recommendedService: scoreData.primaryService,
      recommendedChannel: normPhone ? "WHATSAPP" : "EMAIL",
      verifiedClaims: [`Manual CRM entry for ${city}`],
      approvalStatus: "PENDING_APPROVAL",
      approvalToken: `appv_${newLeadId}`,
      outreachDrafts: {
        whatsapp: `Hello ${contactPerson || "there"},\n\nI was reviewing ${normName}'s presence in ${city} and noticed your commercial work.\n\nAt Yugantar Growth, we help prominent Gujarat design and commercial studios build high-value client acquisition pipelines.\n\nWould a short 10-minute briefing this week make sense to share two growth angles we mapped for ${normName}?\n\n— Shlok Pandya, Yugantar Growth`,
        email: {
          subject: `Commercial growth angles for ${normName}`,
          body: `Dear ${contactPerson || "Founder"},\n\nAt Yugantar Growth, we help Gujarat commercial enterprises build predictable client pipelines.\n\nWould you be open to a 10-minute briefing call this week?\n\nBest regards,\nShlok Pandya\nFounder, Yugantar Growth`,
        },
      },
      activityHistory: [
        {
          id: `act_${Date.now()}`,
          timestamp: now,
          action: "Lead Created Manually",
          note: `Initial Tier ${scoreData.tier} (Score: ${scoreData.score})`,
          author: "Shlok Pandya",
        },
      ],
    };

    onAddLead(newLead);
    notify(`Created lead for ${normName} (Tier ${scoreData.tier}, Score: ${scoreData.score}).`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040510]/85 p-3 backdrop-blur-md sm:p-6" onClick={onClose}>
      <div className="panel w-full max-w-lg rounded-2xl border border-violet-400/25 bg-[#0a0c24] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">CRM Prospect Ingestion</div>
            <h3 className="mt-1 text-lg font-bold text-white">Add New Commercial Lead</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-xs text-rose-200">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400">Company Name *</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Interior Studio"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400">Decision Maker Name</label>
              <input
                type="text"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Patel"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400">Phone (+91 format)</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +91 98250 12345"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contact@company.com"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400">Website URL</label>
              <input
                type="text"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://company.com"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400">City (Gujarat)</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Ahmedabad / Surat / Vadodara"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400">Industry / Sector</label>
              <input
                type="text"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder="Architecture / Furniture / Manufacturing"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400">Initial Observations & Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Commercial presence, project types, showroom location..."
              className="mt-1 h-16 w-full resize-none rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400 placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">
              <Plus size={13} /> Add & Auto-Score Lead
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

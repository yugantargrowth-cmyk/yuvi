// components/SocialSnapshotModal.tsx — 20-Second Assisted Social Snapshot Form (OBSERVED)
// Strictly non-scraping: captures public Instagram/LinkedIn signals entered by founder.

import React, { useState } from "react";
import type { SocialSnapshot } from "../lib/research/evidenceModel";
import { Button } from "./ui";
import { Instagram, X, Check, Eye } from "lucide-react";

interface SocialSnapshotModalProps {
  companyName: string;
  initialSnapshot?: SocialSnapshot;
  onSave: (snapshot: SocialSnapshot) => void;
  onClose: () => void;
}

export function SocialSnapshotModal({
  companyName,
  initialSnapshot,
  onSave,
  onClose,
}: SocialSnapshotModalProps) {
  const [handle, setHandle] = useState(initialSnapshot?.instagramHandle || "");
  const [followers, setFollowers] = useState<string>(
    initialSnapshot?.followers ? String(initialSnapshot.followers) : "",
  );
  const [hasWhatsApp, setHasWhatsApp] = useState<boolean>(
    initialSnapshot?.hasWhatsAppInBio ?? false,
  );
  const [frequency, setFrequency] = useState<SocialSnapshot["postingFrequency"]>(
    initialSnapshot?.postingFrequency || "WEEKLY",
  );
  const [notes, setNotes] = useState(initialSnapshot?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      instagramHandle: handle.trim(),
      followers: followers ? parseInt(followers.replace(/[^\d]/g, ""), 10) : undefined,
      hasWhatsAppInBio: hasWhatsApp,
      postingFrequency: frequency,
      notes: notes.trim(),
      observedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Instagram size={18} className="text-pink-500" />
              20-Second Social Snapshot
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Target: <span className="text-slate-200 font-semibold">{companyName}</span> · Labeled <b className="text-cyan-400 font-mono text-[10px]">OBSERVED</b>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Instagram Handle / URL
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@company_name or profile URL"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-pink-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Follower Count
              </label>
              <input
                type="text"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                placeholder="e.g. 3,450"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-pink-500/50 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Posting Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-slate-200 outline-none"
              >
                <option value="DAILY">Daily (Active)</option>
                <option value="WEEKLY">Weekly (Standard)</option>
                <option value="SPORADIC">Sporadic / Few</option>
                <option value="INACTIVE">Inactive &gt;3 months</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div>
              <div className="font-medium text-slate-200">WhatsApp Link in Bio?</div>
              <div className="text-[10px] text-slate-400">Is there a 1-click wa.me or chat link in profile?</div>
            </div>
            <input
              type="checkbox"
              checked={hasWhatsApp}
              onChange={(e) => setHasWhatsApp(e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Public Observations / Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Good photo quality, but no stories or highlights for price inquiry."
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-pink-500/50 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              <Check size={14} /> Save Snapshot
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

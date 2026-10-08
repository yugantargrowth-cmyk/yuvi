// components/CallModal.tsx — Phone Discovery Call Dialog with Direct Dial & Talking Points
import React, { useState, type FormEvent } from "react";
import type { CallQueueItem } from "../lib/types/sales";
import { Button } from "./ui";
import { X, Phone, CheckCircle2, Calendar } from "lucide-react";

interface CallModalProps {
  call: CallQueueItem;
  onClose: () => void;
  onRecordOutcome: (callId: string, outcome: string, notes: string, nextDate: string) => void;
}

export function CallModal({
  call,
  onClose,
  onRecordOutcome,
}: CallModalProps) {
  const [outcome, setOutcome] = useState("Connected - Interested");
  const [notes, setNotes] = useState(call.outcomeNotes || "");
  const [nextDate, setNextDate] = useState(() =>
    call.nextScheduledFollowUp || new Date(Date.now() + 48 * 3600 * 1000).toISOString().split("T")[0]
  );

  const save = (e: FormEvent) => {
    e.preventDefault();
    onRecordOutcome(call.id, outcome, notes, nextDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040510]/85 p-3 backdrop-blur-md sm:p-6" onClick={onClose}>
      <div className="panel w-full max-w-lg rounded-2xl border border-violet-400/25 bg-[#0a0c24] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">Hunter / Discovery Call</span>
              <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
                call.priority === "URGENT"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              }`}>
                {call.priority}
              </span>
            </div>
            <h3 className="mt-1 text-lg font-bold text-white">{call.companyName}</h3>
            <div className="text-xs text-slate-400">Speak with: <b className="text-slate-200">{call.contactPerson}</b></div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Click to call directly */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-3.5">
          <div>
            <div className="text-[10px] text-cyan-300 uppercase font-semibold">Click to Call on Device</div>
            <div className="text-base font-mono font-bold text-white">{call.phone}</div>
          </div>
          <a
            href={call.clickToCallUrl || `tel:${call.phone}`}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
          >
            <Phone size={14} /> Dial Now
          </a>
        </div>

        {/* Structured Talking Points */}
        <div className="mt-4 rounded-xl border border-white/5 bg-black/25 p-4">
          <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">Target Talking Points & Angle</div>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
            {call.talkingPoints.map((tp, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>{tp}</span>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={save} className="mt-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400">Call Outcome</label>
            <select
              value={outcome}
              onChange={e => setOutcome(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-violet-400"
            >
              <option value="Connected - Interested">Connected - Interested in Consultation</option>
              <option value="Meeting booked">Meeting Booked Directly</option>
              <option value="Callback requested">Callback Requested</option>
              <option value="No answer">No Answer / Voicemail</option>
              <option value="Not interested">Not Interested / Wrong Timing</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400">Call Notes & Key Feedback</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Spoke with decision maker, agreed on 15-min discovery walkthrough this Friday..."
              className="mt-1 h-20 w-full resize-none rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-violet-400 placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400">Next Follow-Up Date</label>
            <input
              type="date"
              value={nextDate}
              onChange={e => setNextDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 p-2 text-xs text-white outline-none focus:border-violet-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">
              <CheckCircle2 size={13} /> Record Outcome & Auto-Schedule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

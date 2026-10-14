// lib/outreach/cadenceEngine.ts — Multi-Touch Outreach Cadence & Policy Engine
// Enforces D0/D2/D5 schedule, stop-on-reply, 30/day cap, 09:30-19:30 IST window,
// and mandatory human send-confirmation dialogs.

import type { NormalizedLead, LeadStatus } from "../types/sales";
import { formatWhatsAppPhone, generateWhatsAppDeepLink } from "./hunterOutreach";

export type CadenceStep = "D0" | "D2" | "D5" | "COMPLETED";

export type ReplyClassification =
  | "INTERESTED"
  | "LATER"
  | "NO"
  | "WRONG_NUMBER"
  | "OPT_OUT";

export interface CadenceTouch {
  step: CadenceStep;
  channel: "WHATSAPP" | "EMAIL";
  message: string;
  scheduledAt: string;
  sentAt?: string;
  status: "PENDING" | "SENT" | "CANCELLED";
}

export interface CadenceSchedule {
  leadId: string;
  companyName: string;
  currentStep: CadenceStep;
  touches: CadenceTouch[];
  halted: boolean;
  haltReason?: string;
  lastTouchAt?: string;
}

export const CADENCE_POLICY = {
  DAILY_SEND_CAP: 30,
  WINDOW_START_HOUR_IST: 9.5, // 09:30 AM IST
  WINDOW_END_HOUR_IST: 19.5, // 07:30 PM IST
  D0_TO_D2_HOURS: 48,
  D2_TO_D5_HOURS: 72,
};

/**
 * Checks whether the current time falls within the 09:30 - 19:30 IST window.
 */
export function isWithinSendingWindow(date: Date = new Date()): {
  inWindow: boolean;
  currentHourIst: number;
  istTimeString: string;
} {
  // Convert UTC time to IST (UTC + 5.5 hours)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 5.5 * 3600000);
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const decimalTime = hours + minutes / 60;

  const inWindow =
    decimalTime >= CADENCE_POLICY.WINDOW_START_HOUR_IST &&
    decimalTime <= CADENCE_POLICY.WINDOW_END_HOUR_IST;

  const istTimeString = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} IST`;

  return {
    inWindow,
    currentHourIst: decimalTime,
    istTimeString,
  };
}

/**
 * Checks if the daily dispatch limit has been reached.
 */
export function canSendToday(sentTodayCount: number): { allowed: boolean; remaining: number } {
  const remaining = Math.max(0, CADENCE_POLICY.DAILY_SEND_CAP - sentTodayCount);
  return {
    allowed: remaining > 0,
    remaining,
  };
}

/**
 * Checks if a lead is opted out or in the exclusion list.
 */
export function isLeadOptedOut(
  lead: NormalizedLead,
  exclusionList: string[] = [],
): boolean {
  if (lead.status === "DO_NOT_CONTACT" || lead.status === "DISQUALIFIED") {
    return true;
  }
  const cleanPhone = formatWhatsAppPhone(lead.phone);
  const email = (lead.email || "").toLowerCase().trim();
  const company = (lead.companyName || "").toLowerCase().trim();

  return exclusionList.some((item) => {
    const cleanItem = item.toLowerCase().trim();
    return (
      (cleanPhone && cleanItem === cleanPhone) ||
      (email && cleanItem === email) ||
      (company && cleanItem === company)
    );
  });
}

/**
 * Checks if the cadence should be stopped immediately (stop-on-reply).
 */
export function shouldHaltCadence(status: LeadStatus): boolean {
  return (
    status === "INTERESTED" ||
    status === "MEETING_SCHEDULED" ||
    status === "QUALIFIED" ||
    status === "PROPOSAL" ||
    status === "WON" ||
    status === "CALLBACK" ||
    status === "LOST" ||
    status === "DO_NOT_CONTACT" ||
    status === "DISQUALIFIED"
  );
}

/**
 * Generates the standardized D0, D2, and D5 message drafts for a lead.
 */
export function generateCadenceMessages(lead: NormalizedLead): {
  d0: string;
  d2: string;
  d5: string;
} {
  const contact = lead.contactPerson ? lead.contactPerson.split(" ")[0] : "ji";
  const company = lead.companyName;
  const primaryLeak = lead.bottleneck || "mobile load latency aur floating WhatsApp CTA missing hai";

  // D0: Initial Touch (<= 6 lines Hinglish)
  const d0 = [
    `Namaste ${contact}, Shlok from Yugantar Growth (Ahmedabad) here.`,
    `Aapki website scan ki toh dekha: ${primaryLeak.slice(0, 110)}.`,
    `Is wajah se high-intent commercial clients inquiry kiye bina bounce ho rahe hain.`,
    `Humne 48-hour turn-around me isko sub-2s aur 1-click WhatsApp concierge se fix karne ka plan banaya hai.`,
    `1-page confidential roadmap PDF ready hai aapke liye.`,
    `Kya main yahan share kar sakta hoon?`,
  ].join("\n");

  // D2: Follow-up 1 (+48 hours nudge)
  const d2 = [
    `Namaste ${contact}, parso jo 1-page growth diagnostic breakdown bheja tha ${company} ke website speed aur WhatsApp capture ke baare me, kya aapko 2 minute mile glance karne ke liye?`,
    `Agar koi specific feedback ya sawaal ho toh batayiye!`,
  ].join("\n\n");

  // D5: Follow-up 2 / Breakup (+72 hours closure)
  const d5 = [
    `Namaste ${contact}, lagta hai abhi digital acquisition aur mobile speed aapke liye priority nahi hai. No problem at all!`,
    `Main yahan se loop close kar raha hoon taaki aapka WhatsApp clutter na ho. All the very best for ${company}!`,
  ].join("\n\n");

  return { d0, d2, d5 };
}

/**
 * Human confirmation protocol: Generates wa.me URL for the founder to click,
 * but explicitly DOES NOT alter lead state.
 */
export function buildDispatchLink(phone: string, text: string): string {
  return generateWhatsAppDeepLink(phone, text);
}

/**
 * Explicit Human Confirmation: User taps "Yes, Mark as Sent",
 * which advances the cadence and schedules the next touch.
 */
export function confirmMarkAsSent(
  lead: NormalizedLead,
  step: CadenceStep,
  notes?: string,
): { updatedLead: NormalizedLead; nextStep: CadenceStep; nextScheduledDate?: string } {
  const now = new Date();
  let nextStep: CadenceStep = "COMPLETED";
  let nextHours = 0;

  if (step === "D0") {
    nextStep = "D2";
    nextHours = CADENCE_POLICY.D0_TO_D2_HOURS;
  } else if (step === "D2") {
    nextStep = "D5";
    nextHours = CADENCE_POLICY.D2_TO_D5_HOURS;
  } else {
    nextStep = "COMPLETED";
  }

  const nextDate = nextHours > 0
    ? new Date(now.getTime() + nextHours * 3600000).toISOString()
    : undefined;

  const activity = {
    id: `act_cadence_${Date.now()}`,
    timestamp: now.toISOString(),
    action: `Sent Cadence Touch: ${step}`,
    note: notes ? `${notes} (Next: ${nextStep}${nextDate ? ` scheduled for ${nextDate.split("T")[0]}` : ""})` : `Confirmed dispatch of ${step}`,
    author: "Shlok Pandya",
  };

  const updatedLead: NormalizedLead = {
    ...lead,
    status: lead.status === "NEW" ? "CONTACTED" : lead.status,
    lastContact: now.toISOString(),
    activityHistory: [activity, ...(lead.activityHistory || [])],
    updatedAt: now.toISOString(),
  };

  return {
    updatedLead,
    nextStep,
    nextScheduledDate: nextDate,
  };
}

/**
 * Handles incoming prospect replies, halts cadence, and categorizes status.
 */
export function logProspectReply(
  lead: NormalizedLead,
  reply: {
    classification: ReplyClassification;
    messageText?: string;
    callbackDate?: string;
  },
): { updatedLead: NormalizedLead; optOutExclusion?: string } {
  const now = new Date().toISOString();
  let newStatus: LeadStatus = lead.status;
  let optOutExclusion: string | undefined = undefined;

  switch (reply.classification) {
    case "INTERESTED":
      newStatus = "INTERESTED";
      break;
    case "LATER":
      newStatus = "CALLBACK";
      break;
    case "NO":
      newStatus = "LOST";
      break;
    case "WRONG_NUMBER":
      newStatus = "DISQUALIFIED";
      break;
    case "OPT_OUT":
      newStatus = "DO_NOT_CONTACT";
      optOutExclusion = formatWhatsAppPhone(lead.phone) || lead.email || lead.companyName;
      break;
  }

  const activity = {
    id: `act_reply_${Date.now()}`,
    timestamp: now,
    action: `Reply Received: ${reply.classification}`,
    note: reply.messageText || `Prospect categorized as ${reply.classification}. Cadence stopped.`,
    author: "Founder / Prospect",
  };

  const updatedLead: NormalizedLead = {
    ...lead,
    status: newStatus,
    activityHistory: [activity, ...(lead.activityHistory || [])],
    updatedAt: now,
  };

  return {
    updatedLead,
    optOutExclusion,
  };
}

/**
 * Checks if a phone number or lead object is in the opt-out registry.
 */
export function isOptedOut(
  phoneOrLead: string | NormalizedLead,
  exclusionList: string[] = []
): boolean {
  if (typeof phoneOrLead === "object") {
    return isLeadOptedOut(phoneOrLead, exclusionList);
  }
  const cleanPhone = formatWhatsAppPhone(phoneOrLead);
  return (
    exclusionList.includes(cleanPhone) ||
    exclusionList.includes(phoneOrLead) ||
    exclusionList.some(item => cleanPhone && item.includes(cleanPhone))
  );
}

/**
 * High-level reply handler: classifies reply, halts cadence, updates lead, and sets next action.
 */
export function handleIncomingReply(
  lead: NormalizedLead,
  classification: ReplyClassification,
  messageText?: string,
  callbackDate?: string,
  exclusionList?: string[]
): {
  updatedLead: NormalizedLead;
  cadenceHalted: boolean;
  nextAction: string;
  optOutRecorded?: boolean;
} {
  const { updatedLead, optOutExclusion } = logProspectReply(lead, {
    classification,
    messageText,
    callbackDate,
  });

  if (optOutExclusion && exclusionList && !exclusionList.includes(optOutExclusion)) {
    exclusionList.push(optOutExclusion);
  }

  let nextAction = "Review lead activity";
  if (classification === "INTERESTED") {
    nextAction = "Schedule strategy walk-through and prepare proposal";
    updatedLead.status = "MEETING_SCHEDULED" as any;
  } else if (classification === "LATER") {
    nextAction = `Follow-up set for ${callbackDate || "later date"}`;
    if (callbackDate) {
      (updatedLead as any).followUpDate = callbackDate;
    }
  } else if (classification === "NO") {
    nextAction = "Archive lead as lost";
  } else if (classification === "OPT_OUT") {
    nextAction = "Added to permanent opt-out registry";
  }

  const cadenceHalted = shouldHaltCadence(updatedLead.status);

  return {
    updatedLead,
    cadenceHalted,
    nextAction,
    optOutRecorded: !!optOutExclusion,
  };
}


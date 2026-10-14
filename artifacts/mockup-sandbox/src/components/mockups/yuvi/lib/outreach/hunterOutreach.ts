// lib/outreach/hunterOutreach.ts — Outreach & 1-Click WhatsApp Specialist
// Part of YUVI Workforce: Hunter Subordinate Agent.
// Formulates hyper-personalized Gujarat B2B pitch copy, creates deep wa.me dispatch links,
// and manages outreach telemetry.

import type { NormalizedLead, AgentService } from "../types/sales";

export interface HunterPitchResult {
  whatsappPitch: string;
  whatsappDeepLink: string;
  emailSubject: string;
  emailBody: string;
  callOpeningHook: string;
}

/**
 * Normalizes Indian phone number into clean wa.me format (e.g. 919825012345).
 */
export function formatWhatsAppPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

/**
 * Generates direct 1-click wa.me URL for instant WhatsApp Web or Desktop dispatch.
 */
export function generateWhatsAppDeepLink(phone: string, message: string): string {
  const cleanPhone = formatWhatsAppPhone(phone);
  if (!cleanPhone) return "";
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message.trim())}`;
}

/**
 * Crafts hyper-personalized Gujarat B2B outreach copy infused with Researcher's audit data.
 */
export function generateHunterPitch(
  lead: NormalizedLead,
  customAngle?: string,
): HunterPitchResult {
  const contact = lead.contactPerson ? lead.contactPerson.split(" ")[0] : "Sir";
  const company = lead.companyName;
  const city = lead.city || "Ahmedabad";
  const speed = lead.speedSeconds ? `${lead.speedSeconds.toFixed(1)}s` : "4.2s";
  const bottleneck = lead.bottleneck || "mobile load latency and absence of direct WhatsApp lead capture";
  const service = lead.recommendedService || lead.primaryService || "Fast Web Dev (48h) & AI WhatsApp Automation";

  // Gujarat B2B WhatsApp Copy: Direct, respectful, evidence-based, low friction
  const whatsappPitch = `Hello ${contact}, Shlok here from Yugantar Growth in Ahmedabad.

We were analyzing ${company}'s digital presence across Gujarat. Your commercial portfolio is impressive, but we noticed a major conversion leak on mobile viewports: ${bottleneck}.

With mobile load times averaging ${speed}, over 50% of high-intent prospects drop off before reaching your phone line.

We solve this with our ${service} deployed in 48 hours with guaranteed sub-2.0s speeds and instant WhatsApp consultation capture.

Can I share a 2-minute diagnostic breakdown of the exact friction points we observed on ${company}'s website?`;

  const whatsappDeepLink = generateWhatsAppDeepLink(lead.phone, whatsappPitch);

  const emailSubject = `Quick observation regarding ${company}'s mobile pipeline in ${city}`;

  const emailBody = `Dear ${contact},

I hope this finds you well.

My name is Shlok Pandya, founder of Yugantar Growth here in Ahmedabad. We specialize in high-speed web architecture and automated revenue pipelines for high-ticket commercial firms across Gujarat.

While auditing ${company}'s digital touchpoints, our research team identified a critical bottleneck:
• Observation: ${bottleneck}
• Benchmark: Mobile latency currently sits at ${speed} (industry standard for conversion is sub-2.0s).
• Commercial Impact: Significant bounce rates among affluent mobile decision makers in ${city}.

Our solution: ${service}. We rebuild, optimize, and deploy within 48 hours without disrupting existing operations.

Would you be open to a brief 10-minute walkthrough this Thursday or Friday to inspect the diagnostic report we prepared for ${company}?

Warm regards,

Shlok Pandya
Founder, Yugantar Growth
Ahmedabad, Gujarat
https://yugantar-growth-drab.vercel.app`;

  const callOpeningHook = `Hello ${contact}, this is Shlok from Yugantar Growth in Ahmedabad. I'm calling specifically regarding ${company}'s website mobile latency — we ran an audit and noticed you're losing over 40% of mobile inquiries due to a ${speed} load time. Do you have 2 minutes to review what we found?`;

  return {
    whatsappPitch,
    whatsappDeepLink,
    emailSubject,
    emailBody,
    callOpeningHook,
  };
}

/**
 * Dispatches outreach via WhatsApp deep link and logs the event to lead activity history.
 */
export function recordWhatsAppDispatch(
  lead: NormalizedLead,
  pitchText: string,
): { updatedLead: NormalizedLead; deepLink: string } {
  const deepLink = generateWhatsAppDeepLink(lead.phone, pitchText);

  const dispatchActivity = {
    id: `act_wa_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: "WhatsApp Outreach Dispatched (1-Click wa.me)",
    note: `Dispatched Hunter pitch to +91 ${formatWhatsAppPhone(lead.phone).slice(2)}: "${pitchText.slice(0, 100)}..."`,
    author: "Hunter",
  };

  const updatedLead: NormalizedLead = {
    ...lead,
    status: lead.status === "NEW" ? "CONTACTED" : lead.status,
    lastContact: new Date().toISOString(),
    outreachDrafts: {
      ...(lead.outreachDrafts || {}),
      whatsapp: pitchText,
    },
    activityHistory: [dispatchActivity, ...(lead.activityHistory || [])],
    updatedAt: new Date().toISOString(),
  };

  return { updatedLead, deepLink };
}

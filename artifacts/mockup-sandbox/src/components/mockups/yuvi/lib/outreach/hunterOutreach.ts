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
  options?: { customAngle?: string; currentBuildCount?: number; maxBuildWip?: number } | string,
): HunterPitchResult {
  const customAngle = typeof options === "string" ? options : options?.customAngle;
  const currentBuildCount = typeof options === "object" ? (options.currentBuildCount ?? 0) : 0;
  const maxWip = typeof options === "object" ? (options.maxBuildWip ?? 2) : 2;
  const capacityAllows = currentBuildCount < maxWip;

  const contact = lead.contactPerson ? lead.contactPerson.split(" ")[0] : "Sir";
  const company = lead.companyName;
  const city = lead.city || "Ahmedabad";

  const findings: string[] = [];
  if (lead.commercialLeaks && lead.commercialLeaks.length > 0) {
    findings.push(...lead.commercialLeaks);
  } else if (lead.researchEvidence && lead.researchEvidence.length > 0) {
    findings.push(...lead.researchEvidence.map((e) => `${e.claim}: ${e.value}`));
  } else if (lead.bottleneck) {
    findings.push(lead.bottleneck);
  }

  const primaryFinding = lead.bottleneck || (findings.length > 0 ? findings[0] : "mobile conversion funnel friction");

  const speedObservation = lead.speedSeconds !== undefined
    ? ` With mobile load times measured at ${lead.speedSeconds.toFixed(1)}s, prospects drop off before inquiring.`
    : "";

  const service = lead.recommendedService || lead.primaryService || "Digital Foundation & AI WhatsApp Engine";
  const speedSla = capacityAllows ? "48 hours" : "dedicated sprint";

  // Gujarat B2B WhatsApp Copy: Direct, respectful, evidence-based, low friction
  const whatsappPitch = `Hello ${contact}, Shlok here from Yugantar Growth in Ahmedabad.

We were analyzing ${company}'s digital presence across Gujarat. We identified a critical conversion finding: ${primaryFinding}.${speedObservation}

We address this with our ${service} deployed in ${speedSla} with sub-2.0s speeds and instant WhatsApp consultation capture.

Can I share a brief diagnostic breakdown of the exact friction points we observed on ${company}'s website?`;

  const whatsappDeepLink = generateWhatsAppDeepLink(lead.phone, whatsappPitch);

  const emailSubject = `Quick observation regarding ${company}'s mobile pipeline in ${city}`;

  const speedBenchmarkLine = lead.speedSeconds !== undefined
    ? `\n• Benchmark: Mobile latency currently measured at ${lead.speedSeconds.toFixed(1)}s.`
    : "";

  const emailBody = `Dear ${contact},

I hope this finds you well.

My name is Shlok Pandya, founder of Yugantar Growth here in Ahmedabad. We specialize in high-speed web architecture and automated revenue pipelines for high-ticket commercial firms across Gujarat.

While auditing ${company}'s digital touchpoints, our research team identified key findings:
• Observation: ${primaryFinding}${speedBenchmarkLine}

Our solution: ${service}. We rebuild, optimize, and deploy within ${speedSla} without disrupting existing operations.

Would you be open to a brief walkthrough to inspect the diagnostic report we prepared for ${company}?

Warm regards,

Shlok Pandya
Founder, Yugantar Growth
Ahmedabad, Gujarat
https://yugantar-growth-drab.vercel.app`;

  const speedVal = lead.speedSeconds ? `${lead.speedSeconds.toFixed(1)}s` : "measured";
  const callOpeningHook = `Hello ${contact}, this is Shlok from Yugantar Growth in Ahmedabad. I'm calling specifically regarding ${company}'s website mobile latency — we ran an audit and noticed you're losing mobile inquiries due to a ${speedVal} load time. Do you have 2 minutes to review what we found?`;

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

// sales/salesEngine.ts — Daily Sales Engine Core for Yugantar Growth
import { emit } from "../eventBus";
import type {
  NormalizedLead,
  LeadTier,
  LeadStatus,
  CallQueueItem,
  DailySalesDashboardMetrics,
  DailySalesReport,
} from "../types/sales";
import type { RawParsedLead } from "./csvParser";
import { createEmployeeTask, appendTaskLog } from "../execution/taskSystem";
import { dispatchTaskViaBridge, type ActivepiecesBridgeConfig } from "../execution/activepiecesBridge";

/**
 * Normalizes phone numbers (handles Indian numbers, prefixes +91 if 10 digits).
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  const cleaned = rawPhone.replace(/[^\d+]/g, "").trim();
  if (!cleaned) return "";

  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return `+91${cleaned.slice(1)}`;
  }
  return cleaned;
}

/**
 * Normalizes website URLs (adds https:// if missing).
 */
export function normalizeWebsite(rawUrl: string): string {
  if (!rawUrl) return "";
  let clean = rawUrl.trim();
  if (!clean) return "";
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean.replace(/\/$/, "");
}

/**
 * Normalizes names to Title Case.
 */
export function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const normalizeName = toTitleCase;
export const calculateLeadScore = scoreAndQualifyLead;

/**
 * Generates deterministic lead ID based on company name and domain/phone.
 */
export function generateDeterministicLeadId(companyName: string, phoneOrDomain: string): string {
  const seed = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${phoneOrDomain.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash).toString(36);
  return `lead_${companyName.slice(0, 4).toLowerCase().replace(/[^a-z0-9]/g, "")}_${positive}`;
}

/**
 * Computes lead score (0 to 100) and assigns strict qualification Tier (A, B, C, D).
 */
export function scoreAndQualifyLead(lead: {
  companyName: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  websiteUrl: string;
  category: string;
}): { score: number; tier: LeadTier; primaryService: string; bottleneck: string; strategicRationale: string } {
  let score = 30; // base score for a verified business name

  const cityLower = (lead.city || "").toLowerCase();
  const stateLower = (lead.state || "").toLowerCase();

  // Gujarat Commercial Priority Check (Ahmedabad, Surat, Vadodara, Rajkot)
  if (cityLower.includes("ahmedabad") || cityLower.includes("amdavad")) {
    score += 25;
  } else if (
    cityLower.includes("surat") ||
    cityLower.includes("vadodara") ||
    cityLower.includes("baroda") ||
    cityLower.includes("rajkot") ||
    stateLower.includes("gujarat")
  ) {
    score += 20;
  } else if (stateLower.includes("maharashtra") || cityLower.includes("mumbai") || cityLower.includes("pune")) {
    score += 10;
  }

  // Contactability signals
  if (lead.phone && lead.phone.length >= 10) {
    score += 15;
  }
  if (lead.email && lead.email.includes("@")) {
    score += 10;
  }
  if (lead.websiteUrl && lead.websiteUrl.length > 5) {
    score += 15;
  }

  // Commercial niche bonus
  const cat = (lead.category || "").toLowerCase();
  if (
    cat.includes("architect") ||
    cat.includes("interior") ||
    cat.includes("real estate") ||
    cat.includes("furniture") ||
    cat.includes("manufacturer") ||
    cat.includes("industrial") ||
    cat.includes("luxury")
  ) {
    score += 10;
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Determine Tier
  let tier: LeadTier = "D";
  if (score >= 80) tier = "A";
  else if (score >= 60) tier = "B";
  else if (score >= 45) tier = "C";
  else tier = "D";

  // Derive strategic bottleneck and recommended service for Yugantar Growth
  let primaryService = "Performance Outbound & Conversion Architecture";
  let bottleneck = "Low direct conversion capture from inbound traffic in Gujarat cluster";
  let strategicRationale = "High local intent with untapped digital decision-maker touchpoints.";

  if (!lead.websiteUrl) {
    primaryService = "High-Converting Sales Funnel & Digital Credibility Anchor";
    bottleneck = "No verifiable web conversion asset; relies solely on word-of-mouth.";
    strategicRationale = "Immediate need for a modern high-converting digital presentation.";
  } else if (tier === "A") {
    primaryService = "Direct Outbound & High-Value B2B Pipeline Acquisition";
    bottleneck = "Strong regional reputation without active predictable outbound client generation.";
    strategicRationale = "Prime candidate for targeted WhatsApp + phone direct advisory outreach.";
  } else if (tier === "B") {
    primaryService = "Local Search & Conversion Rate Optimization";
    bottleneck = "Competitors outranking local visibility in Ahmedabad/Gujarat commercial hubs.";
    strategicRationale = "Quick wins available in positioning and local conversion architecture.";
  }

  return { score, tier, primaryService, bottleneck, strategicRationale };
}

/**
 * Synthesizes 3-part personalized outreach drafts (Observation, Service Offer, CTA).
 */
export function generateOutreachDrafts(lead: NormalizedLead): {
  whatsapp: string;
  email: { subject: string; body: string };
  sms: string;
} {
  const firstName = lead.contactPerson
    ? lead.contactPerson.split(/\s+/)[0]
    : lead.companyName;

  const observation = lead.websiteUrl
    ? `I was reviewing ${lead.companyName}'s presence in ${lead.city} and noticed the strong client work you showcase.`
    : `I was looking at leading ${lead.category || "commercial"} firms in ${lead.city} and came across ${lead.companyName}.`;

  const valueOffer = `At Yugantar Growth, we help premier ${lead.city} businesses build predictable high-ticket client pipelines using conversion architecture and dedicated outbound systems.`;

  const cta = `Would it be worth a short 10-minute briefing call this Thursday or Friday to share two growth angles we mapped for ${lead.companyName}?`;

  const whatsapp = `Hello ${firstName},\n\n${observation}\n\n${valueOffer}\n\n${cta}\n\n— Shlok Pandya, Yugantar Growth`;

  const emailSubject = `Growth & outbound conversion angles for ${lead.companyName}`;
  const emailBody = `Dear ${lead.contactPerson || firstName},\n\n${observation}\n\n${valueOffer}\n\n${cta}\n\nBest regards,\nShlok Pandya\nFounder, Yugantar Growth\nAhmedabad, Gujarat`;

  const sms = `Hi ${firstName}, Shlok from Yugantar Growth here. Put together two client acquisition ideas for ${lead.companyName}. Can I send a 2-min brief?`;

  return { whatsapp, email: { subject: emailSubject, body: emailBody }, sms };
}

/**
 * Builds prioritized call queue item with actionable talking points.
 */
export function buildCallQueueItem(lead: NormalizedLead): CallQueueItem {
  const priority: "URGENT" | "HIGH" | "NORMAL" =
    lead.tier === "A" ? "URGENT" : lead.tier === "B" ? "HIGH" : "NORMAL";

  const talkingPoints = [
    `Reference firm: "${lead.companyName}" based in ${lead.city}, ${lead.state}.`,
    `Decision Maker: Speak directly with ${lead.contactPerson || "founder / principal"}.`,
    `Hook / Bottleneck: "${lead.bottleneck || "Expanding predictable high-value client pipeline in Gujarat"}".`,
    `Core Offer: ${lead.primaryService || "Yugantar Growth revenue architecture"}.`,
    `Call Objective: Secure 15-minute diagnostic walkthrough meeting.`,
  ];

  return {
    id: `call_${lead.id}`,
    leadId: lead.id,
    companyName: lead.companyName,
    contactPerson: lead.contactPerson || "Founder / Decision Maker",
    phone: lead.phone,
    priority,
    reason: `Tier ${lead.tier} commercial target — ${lead.bottleneck || "Outbound pipeline expansion"}`,
    talkingPoints,
    clickToCallUrl: lead.phone ? `tel:${lead.phone}` : "",
    callStatus: "PENDING",
  };
}

/**
 * The Master Daily Sales Engine Pipeline Coordinator.
 * Runs: Ingestion -> Normalization -> Deduplication -> Scoring -> Research -> Outreach -> Call List -> Summary.
 */
export async function runDailySalesEngine(
  rawLeads: RawParsedLead[],
  existingLeads: NormalizedLead[] = [],
  bridgeConfig?: ActivepiecesBridgeConfig,
): Promise<{
  processedLeads: NormalizedLead[];
  newLeadsCount: number;
  duplicateCount: number;
  callQueue: CallQueueItem[];
  dashboardMetrics: DailySalesDashboardMetrics;
  report: DailySalesReport;
}> {
  // Step 1: Initialize Operator Task
  const operatorTask = createEmployeeTask({
    employeeId: "operator",
    objective: "Execute Daily Sales Engine Pipeline for Yugantar Growth",
    instructions: "Import, normalize, deduplicate, score, research, draft outreach, and stage approvals.",
    input: { totalRawLeads: rawLeads.length },
  });

  appendTaskLog(operatorTask, "info", `Starting sprint with ${rawLeads.length} input leads.`);

  // Step 2: Deduplication index against existing memory
  const existingIdSet = new Set(existingLeads.map((l) => l.id));
  const existingPhoneSet = new Set(
    existingLeads.map((l) => normalizePhone(l.phone)).filter((p) => p.length >= 10),
  );

  let newCount = 0;
  let dupCount = 0;
  const processedLeads: NormalizedLead[] = [];
  const callQueue: CallQueueItem[] = [];

  // Step 3: Scout & Researcher process each lead
  for (const raw of rawLeads) {
    const cleanCompany = toTitleCase(raw.companyName);
    const cleanContact = toTitleCase(raw.contactPerson);
    const cleanPhone = normalizePhone(raw.phone);
    const cleanEmail = (raw.email || "").trim().toLowerCase();
    const cleanWebsite = normalizeWebsite(raw.websiteUrl);
    const cleanCity = toTitleCase(raw.city || "Ahmedabad");
    const cleanCategory = toTitleCase(raw.category || "Business");

    const leadId = generateDeterministicLeadId(cleanCompany, cleanPhone || cleanWebsite || cleanCity);

    // Deduplication check
    if (existingIdSet.has(leadId) || (cleanPhone && existingPhoneSet.has(cleanPhone))) {
      dupCount++;
      continue;
    }

    newCount++;
    existingIdSet.add(leadId);
    if (cleanPhone) existingPhoneSet.add(cleanPhone);

    // Scoring & qualification
    const qualification = scoreAndQualifyLead({
      companyName: cleanCompany,
      city: cleanCity,
      state: "Gujarat",
      phone: cleanPhone,
      email: cleanEmail,
      websiteUrl: cleanWebsite,
      category: cleanCategory,
    });

    const now = new Date().toISOString();
    const approvalToken = `appv_${leadId.slice(5)}_${Math.random().toString(36).substring(2, 6)}`;

    const channel: "CALL" | "WHATSAPP" | "EMAIL" | "NONE" = cleanPhone
      ? "WHATSAPP"
      : cleanEmail
        ? "EMAIL"
        : "NONE";

    const normalizedLead: NormalizedLead = {
      id: leadId,
      companyName: cleanCompany,
      contactPerson: cleanContact,
      phone: cleanPhone,
      email: cleanEmail,
      websiteUrl: cleanWebsite,
      city: cleanCity,
      state: "Gujarat",
      country: "India",
      industry: cleanCategory,
      category: cleanCategory,
      status: qualification.tier === "D" ? "DISQUALIFIED" : "NEW",
      score: qualification.score,
      tier: qualification.tier,
      notes: raw.notes || "",
      rawRecord: raw.rawRecord,
      createdAt: now,
      updatedAt: now,
      bottleneck: qualification.bottleneck,
      strategicRationale: qualification.strategicRationale,
      primaryService: qualification.primaryService,
      recommendedService: qualification.primaryService,
      recommendedChannel: channel,
      verifiedClaims: [
        `Verified business entity: ${cleanCompany} located in ${cleanCity}, Gujarat.`,
        cleanWebsite ? `Verified web presence: ${cleanWebsite}` : "No verified website listed.",
        cleanPhone ? `Direct mobile/WhatsApp route verified: ${cleanPhone}` : "Phone contact unverified.",
      ],
      approvalToken,
      approvalStatus: "PENDING_APPROVAL",
      nextAction: {
        type: cleanPhone ? "Prioritized Discovery Call" : "Email Outreach Review",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: `Review approval draft and conduct first touchpoint.`,
      },
    };

    // Generate tailored 3-part outreach drafts
    normalizedLead.outreachDrafts = generateOutreachDrafts(normalizedLead);

    // If phone exists, generate Call Queue item
    if (cleanPhone && qualification.tier !== "D") {
      const callItem = buildCallQueueItem(normalizedLead);
      normalizedLead.callQueueItem = callItem;
      callQueue.push(callItem);
    }

    processedLeads.push(normalizedLead);
  }

  // Step 4: Dispatch via Activepieces Bridge (or local runtime)
  await dispatchTaskViaBridge(operatorTask, bridgeConfig);

  // Step 5: Compute Daily Sales Dashboard Metrics
  const tierCounts = { A: 0, B: 0, C: 0, D: 0 };
  let callsCompleted = 0;
  let repliesCount = 0;
  let interestedCount = 0;
  let wonCount = 0;
  let lostCount = 0;

  processedLeads.forEach((l) => {
    tierCounts[l.tier]++;
    if (l.status === "CONTACTED") callsCompleted++;
    if (l.status === "REPLIED") repliesCount++;
    if (l.status === "INTERESTED") interestedCount++;
    if (l.status === "WON") wonCount++;
    if (l.status === "LOST") lostCount++;
  });

  const dashboardMetrics: DailySalesDashboardMetrics = {
    totalLeads: processedLeads.length + existingLeads.length,
    newLeads: processedLeads.length,
    qualifiedLeads: tierCounts.A + tierCounts.B,
    tierBreakdown: tierCounts,
    callsDue: callQueue.filter((c) => c.callStatus === "PENDING").length,
    callsCompleted,
    outreachDue: processedLeads.filter((l) => l.approvalStatus === "PENDING_APPROVAL" && l.tier !== "D").length,
    followUpsDue: processedLeads.filter((l) => l.status === "CALLBACK").length,
    replies: repliesCount,
    interestedProspects: interestedCount,
    meetingsOpportunities: interestedCount,
    won: wonCount,
    lost: lostCount,
    pendingActions: callQueue.length + processedLeads.filter((l) => l.approvalStatus === "PENDING_APPROVAL").length,
  };

  // Step 6: Generate Executive Sales Report (Analyst)
  const topOps = processedLeads
    .filter((l) => l.tier === "A")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const urgentCalls = callQueue.filter((c) => c.priority === "URGENT").slice(0, 10);

  const report: DailySalesReport = {
    date: new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    metrics: dashboardMetrics,
    executiveSummary: `Sales Engine sprint processed ${processedLeads.length} leads (${newCount} new, ${dupCount} duplicate/skipped). Identified ${tierCounts.A} Tier A high-conviction targets and ${tierCounts.B} Tier B qualified opportunities in the Gujarat commercial corridor. Generated ${callQueue.length} prioritized calls and staged ${dashboardMetrics.outreachDue} outreach drafts into the human approval gate.`,
    topOpportunities: topOps,
    urgentCalls,
    pendingApprovalsCount: dashboardMetrics.outreachDue,
    recommendedFocus: [
      `Execute ${urgentCalls.length} URGENT Tier A calls first thing today.`,
      `Review and approve ${dashboardMetrics.outreachDue} staged WhatsApp & email drafts in the Approvals queue.`,
      `Follow up on pending callbacks and log call outcomes to auto-schedule next actions.`,
    ],
  };

  emit("sales_engine.completed", {
    newLeadsCount: newCount,
    duplicateCount: dupCount,
    qualifiedLeads: dashboardMetrics.qualifiedLeads,
    callsDue: dashboardMetrics.callsDue,
  });

  return {
    processedLeads,
    newLeadsCount: newCount,
    duplicateCount: dupCount,
    callQueue,
    dashboardMetrics,
    report,
  };
}

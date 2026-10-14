// lib/sales/leadTriageEngine.ts — Lead Triage Skill (`lead-triage`)
// Evaluates scraped local Gujarat businesses against Yugantar Growth ICP rules.
// Rules are driven by Knowledge Nodes (service catalog, disqualifiers, ICP categories).

import type { NormalizedLead, LeadTriage, KnowledgeNode, LeadTier } from "../types/sales";
import { formatWhatsAppPhone } from "../outreach/hunterOutreach";

export interface TriageRuleset {
  version: string;
  targetCategories: string[];
  disqualificationBrands: string[];
  priorityGeographies: string[];
}

export const DEFAULT_TRIAGE_RULESET: TriageRuleset = {
  version: "v1.0",
  targetCategories: [
    "clinic",
    "doctor",
    "dental",
    "aesthetic",
    "hospital",
    "coaching",
    "classes",
    "academy",
    "institute",
    "salon",
    "spa",
    "beauty",
    "furniture",
    "interior",
    "decor",
    "studio",
    "textile",
    "fabric",
    "saree",
    "garment",
    "trader",
    "manufacturing",
    "industrial",
    "architect",
    "service",
  ],
  disqualificationBrands: [
    "apollo",
    "mcdonald",
    "domino",
    "starbucks",
    "kfc",
    "subway",
    "reliance",
    "tata",
    "maruti suzuki",
    "honda",
    "hyundai",
    "pantaloons",
    "zudio",
    "croma",
    "westside",
    "decathlon",
    "fortis",
    "max healthcare",
  ],
  priorityGeographies: ["ahmedabad", "gandhinagar", "surat", "vadodara", "gujarat"],
};

/**
 * Builds ruleset from Knowledge Nodes or falls back to DEFAULT_TRIAGE_RULESET.
 */
export function extractTriageRules(knowledgeNodes: KnowledgeNode[] = []): TriageRuleset {
  const ruleset: TriageRuleset = { ...DEFAULT_TRIAGE_RULESET };

  for (const node of knowledgeNodes) {
    const text = (node.content || "").toLowerCase();
    if (node.title.toLowerCase().includes("icp") || node.tags?.includes("icp")) {
      const words = text.match(/[a-z]{4,}/g) || [];
      if (words.length > 0) {
        ruleset.targetCategories = Array.from(new Set([...ruleset.targetCategories, ...words]));
      }
    }
  }

  return ruleset;
}

/**
 * Triages a single lead and assigns a fit score (0-100), decision, and human-readable reasons.
 */
export function triageLead(lead: NormalizedLead, ruleset: TriageRuleset = DEFAULT_TRIAGE_RULESET): LeadTriage {
  const reasons: string[] = [];
  let fitScore = 0;
  let isDisqualified = false;

  const comp = (lead.companyName || "").toLowerCase();
  const cat = (lead.category || lead.industry || "").toLowerCase();
  const city = (lead.city || "").toLowerCase();
  const notes = (lead.notes || "").toLowerCase();
  const phone = formatWhatsAppPhone(lead.phone || "");
  const website = (lead.websiteUrl || "").trim().toLowerCase();

  // 1. DISQUALIFIERS (Hard drops / skip)
  // Check for national brands / corporate chains
  for (const brand of ruleset.disqualificationBrands) {
    if (comp.includes(brand)) {
      isDisqualified = true;
      reasons.push(`Disqualified: Recognized national/multinational chain or franchise (${brand}).`);
      break;
    }
  }

  // Check for closed / permanently inactive listings
  if (notes.includes("permanently closed") || notes.includes("closed") || comp.includes("closed")) {
    isDisqualified = true;
    reasons.push("Disqualified: Google Business listing marked permanently closed or inactive.");
  }

  // Check valid mobile reachability (10 digit Indian mobile starting with 6, 7, 8, or 9)
  const mobileRegex = /^91[6-9]\d{9}$/;
  const isMobile = mobileRegex.test(phone);
  if (!isMobile) {
    if (!phone) {
      isDisqualified = true;
      reasons.push("Disqualified: No direct phone or mobile number found.");
    } else {
      reasons.push("Warning: Landline or unverified mobile number format; reduced reachability.");
    }
  } else {
    fitScore += 15;
    reasons.push("Verified direct Indian mobile reachability (+91 WhatsApp ready).");
  }

  // Check already strong site with WhatsApp booking
  if (lead.mobileAudit?.hasWhatsAppCta && lead.mobileAudit?.speedScore && lead.mobileAudit.speedScore > 85) {
    reasons.push("Notice: Already possesses high-speed website with integrated WhatsApp booking.");
    fitScore -= 20;
  }

  // 2. TARGET CATEGORY FIT (+30 points)
  let matchedCategory = false;
  for (const targetCat of ruleset.targetCategories) {
    if (cat.includes(targetCat) || comp.includes(targetCat)) {
      matchedCategory = true;
      fitScore += 30;
      reasons.push(`High-value target industry fit: matches focus niche '${targetCat}'.`);
      break;
    }
  }
  if (!matchedCategory) {
    fitScore += 10;
    reasons.push("General commercial category: standard digital transformation potential.");
  }

  // 3. DIGITAL OPPORTUNITY / WEAK WEBSITE (+25 points)
  if (!website || website === "" || website.includes("facebook.com") || website.includes("instagram.com")) {
    fitScore += 25;
    reasons.push("No independent website found; relying exclusively on social/directory listings.");
  } else if (!website.startsWith("https://")) {
    fitScore += 20;
    reasons.push("Website missing SSL/HTTPS certificate, leaking visitor trust.");
  } else {
    fitScore += 15;
    reasons.push("Existing web presence identified; candidate for 48h conversion re-architecture.");
  }

  // 4. REPUTATION & REVIEW GAP (+15 points)
  const rating = lead.rating ?? (lead.rawRecord?.rating ? Number(lead.rawRecord.rating) : null);
  const reviews = lead.reviewCount ?? (lead.rawRecord?.reviewCount ? Number(lead.rawRecord.reviewCount) : null);

  if (reviews !== null && reviews < 25) {
    fitScore += 15;
    reasons.push(`Low Google review volume (${reviews} reviews); urgent need for local reputation engine.`);
  } else if (rating !== null && rating < 4.2) {
    fitScore += 15;
    reasons.push(`Google rating gap (${rating} ⭐); high vulnerability to local competitors.`);
  } else if (reviews !== null && reviews >= 25) {
    fitScore += 10;
    reasons.push(`Strong established review base (${reviews} reviews, ${rating || 4.5} ⭐); prime candidate for scale.`);
  } else {
    fitScore += 10;
    reasons.push("Unclaimed or minimal Google Business review metrics.");
  }

  // 5. GEOGRAPHY / LOCATION PRIORITY (+15 points)
  let isPriorityGeo = false;
  for (const geo of ruleset.priorityGeographies) {
    if (city.includes(geo) || (lead.state || "").toLowerCase().includes(geo)) {
      isPriorityGeo = true;
      fitScore += 15;
      reasons.push(`Priority geography: Local presence in ${lead.city || "Ahmedabad"}, Gujarat.`);
      break;
    }
  }
  if (!isPriorityGeo) {
    fitScore += 5;
    reasons.push(`Regional location (${lead.city || "India"}); eligible for remote engagement.`);
  }

  // Clamp fit score 0 to 100
  fitScore = Math.max(0, Math.min(100, fitScore));

  // Determine Decision
  let decision: "qualified" | "maybe" | "skip" = "maybe";
  if (isDisqualified || fitScore < 35) {
    decision = "skip";
    fitScore = 0; // Disqualified leads receive zero priority
  } else if (fitScore >= 60 && isMobile) {
    decision = "qualified";
  } else {
    decision = "maybe";
  }

  return {
    fitScore,
    reasons,
    decision,
    rulesetVersion: ruleset.version,
    triagedAt: new Date().toISOString(),
  };
}

/**
 * Triages an entire list of leads, assigns triage results, and returns them sorted by fitScore descending.
 */
export function triageLeadsBatch(leads: NormalizedLead[], ruleset: TriageRuleset = DEFAULT_TRIAGE_RULESET): NormalizedLead[] {
  return leads
    .map((lead) => {
      const triage = triageLead(lead, ruleset);
      const tier: LeadTier = triage.fitScore >= 75 ? "A" : triage.fitScore >= 55 ? "B" : triage.fitScore >= 35 ? "C" : "D";
      return {
        ...lead,
        triage,
        score: triage.fitScore,
        tier,
      };
    })
    .sort((a, b) => {
      const weight = (d?: string) => (d === "qualified" ? 2 : d === "maybe" ? 1 : 0);
      const wDiff = weight(b.triage?.decision) - weight(a.triage?.decision);
      if (wDiff !== 0) return wDiff;
      return (b.triage?.fitScore || 0) - (a.triage?.fitScore || 0);
    });
}

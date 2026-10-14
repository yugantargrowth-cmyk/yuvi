// lib/sales/needsAnalysisEngine.ts — Needs Analysis Skill
// Maps multi-source verified/observed evidence to top 3 commercial leaks,
// selects calibrated package from agency catalog, and sets advance terms.

import type { NormalizedLead, ProposalItem } from "../types/sales";
import { filterOutboundEvidence, type EvidenceItem } from "../research/evidenceModel";

export interface CommercialLeak {
  leak: string;
  evidenceId: string;
  source: string;
  label: "VERIFIED" | "OBSERVED";
  impact: string;
}

export interface PrescribedPackage {
  packageId: string;
  name: string;
  headline: string;
  timeline: string;
  pricing: {
    amount: number;
    advancePercentage: number;
    advanceAmount: number;
  };
  deliverables: string[];
  items: ProposalItem[];
}

export interface NeedsAnalysisResult {
  leadId: string;
  companyName: string;
  topLeaks: CommercialLeak[];
  prescribedPackage: PrescribedPackage;
  evidenceIds: string[];
  analyzedAt: string;
}

/**
 * Standard Yugantar Growth Service Catalog
 * Core Tiers:
 * 1. Digital Foundation: ₹7,999 one-time (48 Hours, 100% advance)
 * 2. Growth: ₹14,999/month (Monthly Retainer, 50% advance)
 * 3. Scale: ₹29,999/month (Monthly Retainer, 50% advance)
 */
export const YUGANTAR_CATALOG: Record<string, PrescribedPackage> = {
  digital_foundation: {
    packageId: "digital_foundation",
    name: "Digital Foundation",
    headline: "Sub-2.0s mobile-first conversion landing page with instant 1-click WhatsApp lead capture concierge.",
    timeline: "48 Hours",
    pricing: {
      amount: 7999,
      advancePercentage: 100, // 100% advance for Foundation
      advanceAmount: 7999,
    },
    deliverables: [
      "Sub-2.0s mobile-first conversion landing page",
      "Direct 1-click WhatsApp lead capture concierge",
      "Google Business Profile audit & local SEO verification",
      "SSL certificate active & Google Search Console indexing",
    ],
    items: [
      { id: "item-1", description: "Digital Foundation: Mobile-First Conversion Engine & WhatsApp Concierge", quantity: 1, unitPrice: 7999, amount: 7999 },
    ],
  },
  growth: {
    packageId: "growth",
    name: "Growth",
    headline: "Targeted outbound B2B client acquisition pipeline and ongoing conversion optimization for Gujarat commercial accounts.",
    timeline: "Monthly Retainer",
    pricing: {
      amount: 14999,
      advancePercentage: 50,
      advanceAmount: 7499.5,
    },
    deliverables: [
      "Everything in Digital Foundation",
      "Targeted B2B outbound campaign (30 touches/day)",
      "Lead triage scoring & WhatsApp follow-up cadence",
      "Monthly conversion analytics & performance tracking",
    ],
    items: [
      { id: "item-1", description: "Growth Operating Engine & Outbound Pipeline (Monthly)", quantity: 1, unitPrice: 14999, amount: 14999 },
    ],
  },
  scale: {
    packageId: "scale",
    name: "Scale",
    headline: "Turnkey client acquisition engine, automated CRM triage, and weekly executive growth reviews with agency founder.",
    timeline: "Monthly Retainer",
    pricing: {
      amount: 29999,
      advancePercentage: 50,
      advanceAmount: 14999.5,
    },
    deliverables: [
      "Everything in Growth",
      "Turnkey multi-channel client acquisition & CRM setup",
      "Weekly strategic executive review with founder",
      "Custom automation workflows & priority support",
    ],
    items: [
      { id: "item-1", description: "Turnkey Scale Acquisition & Revenue OS (Monthly)", quantity: 1, unitPrice: 29999, amount: 29999 },
    ],
  },
};

// Backward-compatibility aliases
YUGANTAR_CATALOG.web_sprint_48h = YUGANTAR_CATALOG.digital_foundation;
YUGANTAR_CATALOG.outbound_pipeline = YUGANTAR_CATALOG.growth;
YUGANTAR_CATALOG.growth_os_retainer = YUGANTAR_CATALOG.scale;


/**
 * Analyzes lead research evidence and derives the top 3 commercial leaks
 * and the exact matching catalog solution.
 *
 * Guardrail: Requires at least 2 VERIFIED or OBSERVED evidence items.
 */
export function analyzeLeadNeeds(lead: NormalizedLead): NeedsAnalysisResult {
  const outboundEvidence = filterOutboundEvidence(lead.researchEvidence || []);

  if (outboundEvidence.length < 2) {
    throw new Error(
      `Outbound Guardrail Violation: Needs analysis requires at least 2 VERIFIED or OBSERVED evidence items for ${lead.companyName}. Found ${outboundEvidence.length}. Run multi-source research or add a 20s Social Snapshot first.`,
    );
  }

  // Map evidence items into commercial revenue leaks
  const detectedLeaks: CommercialLeak[] = [];

  for (const ev of outboundEvidence) {
    const label: "VERIFIED" | "OBSERVED" = ev.label === "VERIFIED" ? "VERIFIED" : "OBSERVED";
    if (ev.source === "website" && ev.value.includes("Insecure HTTP")) {
      detectedLeaks.push({
        leak: "Insecure HTTP protocol degrades enterprise trust and lowers Google search ranking.",
        evidenceId: ev.id,
        source: ev.source,
        label,
        impact: "Severe: Google flags site as 'Not Secure' to mobile visitors.",
      });
    } else if (ev.source === "website" && ev.value.includes("No WhatsApp CTA")) {
      detectedLeaks.push({
        leak: "Absence of floating WhatsApp CTA causes mobile visitors to bounce rather than inquire.",
        evidenceId: ev.id,
        source: ev.source,
        label,
        impact: "High: >50% inquiry loss on mobile devices in Indian commercial markets.",
      });
    } else if (ev.source === "website" && ev.value.includes("Legacy Desktop")) {
      detectedLeaks.push({
        leak: "Non-responsive legacy desktop layout frustrates corporate smartphone decision-makers.",
        evidenceId: ev.id,
        source: ev.source,
        label,
        impact: "High: High bounce rate on mobile viewports.",
      });
    } else if (ev.source === "website" && ev.value.includes("No Analytics Installed")) {
      detectedLeaks.push({
        leak: "Zero conversion tracking installed (blind ad spend and acquisition leaks).",
        evidenceId: ev.id,
        source: ev.source,
        label,
        impact: "Medium: Cannot attribute inquiries or measure visitor drop-offs.",
      });
    } else if (ev.source === "pagespeed" && ev.claim.includes("LCP")) {
      detectedLeaks.push({
        leak: `Mobile load latency (${ev.value}) exceeds the 2.0s consumer tolerance threshold.`,
        evidenceId: ev.id,
        source: ev.source,
        label,
        impact: "High: Page abandonment increases 32% when load exceeds 3.0s.",
      });
    } else if (ev.source === "social_snapshot" && ev.value.includes("Bio WhatsApp: No")) {
      detectedLeaks.push({
        leak: "Instagram profile has active followers but lacks direct WhatsApp booking bridge.",
        evidenceId: ev.id,
        source: ev.source,
        label,
        impact: "Medium: Social attention fails to convert into direct client conversations.",
      });
    }
  }

  // If fewer than 3 leaks detected from specific signals, add generic verified observations from remaining evidence
  if (detectedLeaks.length < 3) {
    for (const ev of outboundEvidence) {
      if (!detectedLeaks.some((l) => l.evidenceId === ev.id)) {
        const label: "VERIFIED" | "OBSERVED" = ev.label === "VERIFIED" ? "VERIFIED" : "OBSERVED";
        detectedLeaks.push({
          leak: `Opportunity for optimization in ${ev.claim}: currently ${ev.value}.`,
          evidenceId: ev.id,
          source: ev.source,
          label,
          impact: "Medium: Potential conversion lift through structured funnel.",
        });
      }
      if (detectedLeaks.length >= 3) break;
    }
  }

  // Keep top 3 leaks
  const topLeaks = detectedLeaks.slice(0, 3);
  const evidenceIds = topLeaks.map((l) => l.evidenceId);

  // Prescribe catalog package based on identified bottlenecks
  // Rule: Package mapper must default to Digital Foundation (₹7,999) for a first sale.
  let prescribedPackage = YUGANTAR_CATALOG.digital_foundation;

  if (lead.status === "WON" || (lead.notes && lead.notes.toLowerCase().includes("scale"))) {
    prescribedPackage = YUGANTAR_CATALOG.scale;
  } else if (lead.notes && (lead.notes.toLowerCase().includes("growth") || lead.notes.toLowerCase().includes("retainer"))) {
    prescribedPackage = YUGANTAR_CATALOG.growth;
  } else {
    // Default strictly to Digital Foundation for a first sale
    prescribedPackage = YUGANTAR_CATALOG.digital_foundation;
  }


  return {
    leadId: lead.id,
    companyName: lead.companyName,
    topLeaks,
    prescribedPackage,
    evidenceIds,
    analyzedAt: new Date().toISOString(),
  };
}

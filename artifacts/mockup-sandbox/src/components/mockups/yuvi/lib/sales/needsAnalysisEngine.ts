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
 */
export const YUGANTAR_CATALOG: Record<string, PrescribedPackage> = {
  web_sprint_48h: {
    packageId: "web_sprint_48h",
    name: "Fast Web Dev & WhatsApp Concierge (48h)",
    headline: "High-speed headless landing page with sub-2.0s mobile load and instant 1-click WhatsApp lead capture.",
    timeline: "48 Hours",
    pricing: {
      amount: 25000,
      advancePercentage: 100, // 100% advance for 48h sprint
      advanceAmount: 25000,
    },
    deliverables: [
      "Sub-2.0s mobile-first headless conversion landing page",
      "Direct 1-click WhatsApp lead concierge with prefilled inquiry message",
      "SSL certificate configuration & Google Search Console indexing",
      "GA4 and Meta Pixel conversion event tracking instrumentation",
    ],
    items: [
      { id: "item-1", description: "Headless High-Speed Mobile Landing Page (Sub-2s)", quantity: 1, unitPrice: 18000, amount: 18000 },
      { id: "item-2", description: "Automated WhatsApp Lead Routing & Pixel Instrumentation", quantity: 1, unitPrice: 7000, amount: 7000 },
    ],
  },
  outbound_pipeline: {
    packageId: "outbound_pipeline",
    name: "Direct B2B Outbound & ICP Funnel",
    headline: "Targeted outbound acquisition framework for Gujarat commercial accounts, architects, and builders.",
    timeline: "14 Days",
    pricing: {
      amount: 45000,
      advancePercentage: 50,
      advanceAmount: 22500,
    },
    deliverables: [
      "Verifiable ICP lead list (Gujarat corridor accounts)",
      "Multi-touch WhatsApp & email outreach sequences",
      "Lead triage scoring & discovery call qualification scripts",
      "Bi-weekly pipeline velocity telemetry reporting",
    ],
    items: [
      { id: "item-1", description: "ICP Intelligence & Verified Sourcing Setup", quantity: 1, unitPrice: 20000, amount: 20000 },
      { id: "item-2", description: "Outbound Multi-Channel Infrastructure & Scripts", quantity: 1, unitPrice: 25000, amount: 25000 },
    ],
  },
  growth_os_retainer: {
    packageId: "growth_os_retainer",
    name: "Turnkey Growth Operating System Retainer",
    headline: "End-to-end partner retainer managing monthly outbound acquisition, web optimizations, and pipeline triage.",
    timeline: "Monthly Retainer",
    pricing: {
      amount: 120000,
      advancePercentage: 100, // Monthly retainers billed in advance
      advanceAmount: 120000,
    },
    deliverables: [
      "Continuous weekly outbound acquisition sprints",
      "Commercial brand positioning & lead conversion monitoring",
      "Inbound inquiry triage & automated follow-up workflows",
      "Weekly strategic executive review with agency founder",
    ],
    items: [
      { id: "item-1", description: "Growth OS Monthly Retainer (Sprints 1-4)", quantity: 1, unitPrice: 120000, amount: 120000 },
    ],
  },
};

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
  let prescribedPackage = YUGANTAR_CATALOG.web_sprint_48h;

  const hasSpeedOrUxLeak = topLeaks.some((l) =>
    l.leak.toLowerCase().includes("speed") ||
    l.leak.toLowerCase().includes("latency") ||
    l.leak.toLowerCase().includes("load") ||
    l.leak.toLowerCase().includes("lcp") ||
    l.leak.toLowerCase().includes("whatsapp") ||
    l.leak.toLowerCase().includes("http") ||
    l.leak.toLowerCase().includes("responsive"),
  );

  const isHighTier = lead.tier === "A" && (lead.score || 0) >= 80;

  if (hasSpeedOrUxLeak) {
    prescribedPackage = YUGANTAR_CATALOG.web_sprint_48h;
  } else if (isHighTier) {
    prescribedPackage = YUGANTAR_CATALOG.growth_os_retainer;
  } else {
    prescribedPackage = YUGANTAR_CATALOG.outbound_pipeline;
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

// lib/research/evidenceModel.ts — Multi-Source Research Evidence Model & Guardrails
// Enforces provenance labels: VERIFIED, OBSERVED, INFERRED.
// Strictly prevents INFERRED claims from reaching client-facing proposals or messages.

export type EvidenceLabel = "VERIFIED" | "OBSERVED" | "INFERRED";

export interface EvidenceItem {
  id: string;
  leadId: string;
  source: "website" | "pagespeed" | "places" | "social_snapshot" | "founder_note";
  claim: string;
  value: string;
  label: EvidenceLabel;
  confidence: number;
  url?: string;
  fetchedAt: string;
}

export interface SocialSnapshot {
  instagramHandle?: string;
  followers?: number;
  lastPostDate?: string;
  hasWhatsAppInBio: boolean;
  postingFrequency: "DAILY" | "WEEKLY" | "SPORADIC" | "INACTIVE";
  notes?: string;
  observedAt: string;
}

/**
 * Validates whether an evidence item is permitted in outbound pitches/proposals.
 * Only VERIFIED and OBSERVED facts may be sent to prospects.
 */
export function isOutboundPermitted(evidence: EvidenceItem): boolean {
  return evidence.label === "VERIFIED" || evidence.label === "OBSERVED";
}

/**
 * Filters an evidence list, strictly purging all INFERRED assumptions.
 */
export function filterOutboundEvidence(evidenceList: EvidenceItem[]): EvidenceItem[] {
  return evidenceList.filter(isOutboundPermitted);
}

/**
 * Formats evidence items into bulleted proof claims with source citations.
 */
export function formatEvidenceClaims(evidenceList: EvidenceItem[]): string[] {
  return filterOutboundEvidence(evidenceList).map((e) => {
    return `[${e.label}] ${e.claim}: ${e.value} (Source: ${e.source})`;
  });
}

/**
 * Synthesizes multi-source scan outputs into typed EvidenceItem records.
 */
export function synthesizeResearchEvidence(
  leadId: string,
  targetUrl: string,
  scanData?: {
    isHttps?: boolean;
    hasMobileViewport?: boolean;
    hasWhatsAppCta?: boolean;
    hasContactForm?: boolean;
    tracking?: { ga4: boolean; gtm: boolean; metaPixel: boolean; clarity: boolean };
    techStack?: string[];
    responseTimeMs?: number;
  },
  pageSpeedData?: {
    mobileScore?: number;
    lcp?: string;
    cls?: string;
    opportunities?: string[];
  },
  placesData?: {
    rating?: number;
    reviewCount?: number;
    address?: string;
    photoCount?: number;
  },
  socialSnapshot?: SocialSnapshot,
): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const now = new Date().toISOString();

  // 1. Website Scan Evidence (VERIFIED)
  if (scanData) {
    if (scanData.isHttps !== undefined) {
      items.push({
        id: `ev-ssl-${leadId}`,
        leadId,
        source: "website",
        claim: scanData.isHttps ? "Active SSL encryption verified" : "Missing SSL/HTTPS encryption (Security Warning)",
        value: scanData.isHttps ? "HTTPS Active" : "Insecure HTTP",
        label: "VERIFIED",
        confidence: 1.0,
        url: targetUrl,
        fetchedAt: now,
      });
    }

    if (scanData.hasWhatsAppCta !== undefined) {
      items.push({
        id: `ev-wa-${leadId}`,
        leadId,
        source: "website",
        claim: scanData.hasWhatsAppCta ? "Direct WhatsApp lead capture button present" : "Zero 1-click WhatsApp lead capture on mobile",
        value: scanData.hasWhatsAppCta ? "WhatsApp CTA Found" : "No WhatsApp CTA",
        label: "VERIFIED",
        confidence: 1.0,
        url: targetUrl,
        fetchedAt: now,
      });
    }

    if (scanData.hasMobileViewport !== undefined) {
      items.push({
        id: `ev-resp-${leadId}`,
        leadId,
        source: "website",
        claim: scanData.hasMobileViewport ? "Mobile viewport meta tag present" : "Non-responsive legacy desktop layout detected",
        value: scanData.hasMobileViewport ? "Responsive Viewport" : "Legacy Desktop Layout",
        label: "VERIFIED",
        confidence: 1.0,
        url: targetUrl,
        fetchedAt: now,
      });
    }

    if (scanData.tracking) {
      const activePixels: string[] = [];
      if (scanData.tracking.ga4) activePixels.push("Google Analytics 4");
      if (scanData.tracking.gtm) activePixels.push("Google Tag Manager");
      if (scanData.tracking.metaPixel) activePixels.push("Meta Pixel");
      if (scanData.tracking.clarity) activePixels.push("Microsoft Clarity");

      items.push({
        id: `ev-pixel-${leadId}`,
        leadId,
        source: "website",
        claim: activePixels.length > 0
          ? `Conversion tracking installed: ${activePixels.join(", ")}`
          : "Zero analytics tracking tags detected (Blind acquisition leak)",
        value: activePixels.length > 0 ? activePixels.join(", ") : "No Analytics Installed",
        label: "VERIFIED",
        confidence: 1.0,
        url: targetUrl,
        fetchedAt: now,
      });
    }
  }

  // 2. PageSpeed Insights Evidence (VERIFIED)
  if (pageSpeedData && pageSpeedData.mobileScore !== undefined) {
    items.push({
      id: `ev-ps-score-${leadId}`,
      leadId,
      source: "pagespeed",
      claim: "Lighthouse mobile performance diagnostic score",
      value: `${pageSpeedData.mobileScore}/100`,
      label: "VERIFIED",
      confidence: 1.0,
      url: targetUrl,
      fetchedAt: now,
    });

    if (pageSpeedData.lcp && pageSpeedData.lcp !== "N/A") {
      items.push({
        id: `ev-ps-lcp-${leadId}`,
        leadId,
        source: "pagespeed",
        claim: "Largest Contentful Paint (LCP) mobile load delay",
        value: pageSpeedData.lcp,
        label: "VERIFIED",
        confidence: 1.0,
        url: targetUrl,
        fetchedAt: now,
      });
    }
  }

  // 3. Google Places API Evidence (VERIFIED)
  if (placesData) {
    if (placesData.rating !== undefined && placesData.rating !== null) {
      items.push({
        id: `ev-places-rating-${leadId}`,
        leadId,
        source: "places",
        claim: "Google Business public rating",
        value: `${placesData.rating} ⭐ (${placesData.reviewCount || 0} reviews)`,
        label: "VERIFIED",
        confidence: 1.0,
        fetchedAt: now,
      });
    }
  }

  // 4. Social Snapshot Evidence (OBSERVED — Manual 20s Entry)
  if (socialSnapshot) {
    if (socialSnapshot.instagramHandle) {
      items.push({
        id: `ev-social-ig-${leadId}`,
        leadId,
        source: "social_snapshot",
        claim: `Public Instagram presence (@${socialSnapshot.instagramHandle.replace(/^@/, "")})`,
        value: `${socialSnapshot.followers || 0} followers · Posting: ${socialSnapshot.postingFrequency} · Bio WhatsApp: ${socialSnapshot.hasWhatsAppInBio ? "Yes" : "No"}`,
        label: "OBSERVED",
        confidence: 0.95,
        fetchedAt: socialSnapshot.observedAt || now,
      });
    }
  }

  return items;
}

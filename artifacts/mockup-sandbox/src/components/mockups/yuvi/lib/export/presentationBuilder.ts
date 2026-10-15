// lib/export/presentationBuilder.ts — Evidence-Only PowerPoint (.pptx) Pitch Deck Generator
// Part of YUVI Workforce: DeckBuilder Subordinate Agent.
// Strictly built from verified and observed evidence only.
// Refuses to generate if evidence < 2. No hardcoded benchmarks, numbers, or percentages.

import pptxgen from "pptxgenjs";
import type { NormalizedLead, CommercialProposal } from "../types/sales";
import { filterOutboundEvidence, type EvidenceItem } from "../research/evidenceModel";
import { YUGANTAR_CATALOG } from "../sales/needsAnalysisEngine";
import { getUpiVpa } from "../finance/upiEngine";

export interface DeckGenerationOptions {
  lead: NormalizedLead;
  proposal?: CommercialProposal;
  fileName?: string;
}

export async function generateClientPitchDeck({
  lead,
  proposal,
  fileName,
}: DeckGenerationOptions): Promise<string> {
  const outboundEvidence: EvidenceItem[] = filterOutboundEvidence(lead.researchEvidence || []);

  if (outboundEvidence.length < 2) {
    throw new Error(
      `Evidence Gate Violation: Pitch deck generation refused for ${lead.companyName}. Minimum 2 VERIFIED or OBSERVED evidence items required, found ${outboundEvidence.length}. Run research or add a 20s Social Snapshot first.`
    );
  }

  const PptxGen = (pptxgen as any).default || pptxgen;
  const pptx = new PptxGen();

  pptx.layout = "LAYOUT_WIDE"; // 16:9 widescreen
  pptx.author = "Shlok Pandya - Yugantar Growth";
  pptx.company = "Yugantar Growth";
  pptx.title = `Growth Architecture Diagnostic Brief - ${lead.companyName}`;

  // Theme Colors
  const COLOR_BG = "0B0F17";       // Deep Obsidian
  const COLOR_SURFACE = "161F30";  // Elevated card background
  const COLOR_GOLD = "D4AF37";     // Yugantar Growth Gold
  const COLOR_WHITE = "FFFFFF";    // Crisp White
  const COLOR_SLATE = "94A3B8";    // Slate secondary
  const COLOR_CYAN = "38BDF8";     // Highlight Cyan
  const COLOR_EMERALD = "34D399";  // Success Green
  const COLOR_RED = "F87171";      // Friction / Finding Highlight

  const company = lead.companyName;
  const contact = lead.contactPerson || "Business Leadership";
  const city = lead.city || "Ahmedabad";
  const dateStr = new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });

  const createBaseSlide = (title: string, subtitle?: string) => {
    const slide = pptx.addSlide();
    slide.background = { color: COLOR_BG };

    // Gold Top Header Bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: "100%",
      h: 0.1,
      fill: { color: COLOR_GOLD },
    });

    slide.addText("YUGANTAR GROWTH  |  AUTHENTIC EVIDENCE BRIEF", {
      x: 0.8,
      y: 0.4,
      fontSize: 10,
      fontFace: "Arial",
      color: COLOR_GOLD,
      bold: true,
      charSpacing: 2,
    });

    slide.addText(title, {
      x: 0.8,
      y: 0.7,
      fontSize: 22,
      fontFace: "Arial",
      color: COLOR_WHITE,
      bold: true,
    });

    if (subtitle) {
      slide.addText(subtitle, {
        x: 0.8,
        y: 1.25,
        fontSize: 11,
        fontFace: "Arial",
        color: COLOR_SLATE,
      });
    }

    slide.addText(`Target: ${company}  •  ${city}, Gujarat  •  ${dateStr}`, {
      x: 0.8,
      y: 7.0,
      fontSize: 9,
      fontFace: "Arial",
      color: COLOR_SLATE,
    });

    return slide;
  };

  // --------------------------------------------------------------------------
  // SLIDE 1: COVER SLIDE
  // --------------------------------------------------------------------------
  {
    const slide = pptx.addSlide();
    slide.background = { color: COLOR_BG };

    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.15, fill: { color: COLOR_GOLD } });
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.35, w: "100%", h: 0.15, fill: { color: COLOR_GOLD } });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.5,
      y: 1.4,
      w: 10.3,
      h: 4.8,
      fill: { color: COLOR_SURFACE },
      line: { color: COLOR_GOLD, width: 1.5 },
    });

    slide.addText("EVIDENCE-DRIVEN COMMERCIAL DIAGNOSTIC", {
      x: 2.0,
      y: 2.0,
      fontSize: 12,
      fontFace: "Arial",
      color: COLOR_GOLD,
      bold: true,
      charSpacing: 3,
    });

    slide.addText(`Growth Architecture Brief for\n${company}`, {
      x: 2.0,
      y: 2.6,
      fontSize: 32,
      fontFace: "Arial",
      color: COLOR_WHITE,
      bold: true,
      lineSpacing: 38,
    });

    slide.addText(`Prepared for: ${contact}  •  ${city}, Gujarat`, {
      x: 2.0,
      y: 4.3,
      fontSize: 13,
      fontFace: "Arial",
      color: COLOR_CYAN,
    });

    slide.addText(`Shlok Pandya, Founder, Yugantar Growth  •  ${dateStr}`, {
      x: 2.0,
      y: 5.1,
      fontSize: 10,
      fontFace: "Arial",
      color: COLOR_SLATE,
    });
  }

  // --------------------------------------------------------------------------
  // SLIDE 2+: PER-FINDING SLIDES (SOURCE + VALUE + TIMESTAMP)
  // --------------------------------------------------------------------------
  const findingEvidences = outboundEvidence.filter((e) => e.source !== "places");
  const findingsToRender = (findingEvidences.length > 0 ? findingEvidences : outboundEvidence).slice(0, 4);

  {
    const slide = createBaseSlide(
      "1. Verified & Observed Technical Findings",
      "Exact telemetry and factual observations measured directly from public digital endpoints."
    );

    findingsToRender.forEach((ev, idx) => {
      const y = 1.8 + idx * 1.25;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8,
        y,
        w: 11.5,
        h: 1.1,
        fill: { color: COLOR_SURFACE },
        line: { color: ev.label === "VERIFIED" ? COLOR_CYAN : COLOR_EMERALD, width: 1 },
      });

      slide.addText(`[${ev.label}] Source: ${ev.source.toUpperCase()}`, {
        x: 1.1,
        y: y + 0.15,
        fontSize: 10,
        fontFace: "Arial",
        color: ev.label === "VERIFIED" ? COLOR_CYAN : COLOR_EMERALD,
        bold: true,
      });

      slide.addText(`Measured at: ${ev.fetchedAt ? ev.fetchedAt.split("T")[0] : dateStr}`, {
        x: 8.5,
        y: y + 0.15,
        fontSize: 9,
        fontFace: "Arial",
        color: COLOR_SLATE,
        align: "right",
      });

      slide.addText(ev.claim, {
        x: 1.1,
        y: y + 0.45,
        w: 7.5,
        fontSize: 12,
        fontFace: "Arial",
        color: COLOR_WHITE,
        bold: true,
      });

      slide.addText(ev.value, {
        x: 8.8,
        y: y + 0.45,
        w: 3.2,
        fontSize: 12,
        fontFace: "Arial",
        color: COLOR_GOLD,
        bold: true,
        align: "right",
      });
    });
  }

  // --------------------------------------------------------------------------
  // SLIDE: GOOGLE PROFILE SLIDE (RATING, REVIEWS, ADDRESS)
  // --------------------------------------------------------------------------
  const placesEv = outboundEvidence.find((e) => e.source === "places");
  if (placesEv || lead.rating !== undefined || lead.reviewCount !== undefined || lead.address) {
    const slide = createBaseSlide(
      "2. Google Business Profile & Local Footprint",
      "Public search presence and reputation telemetry recorded for Gujarat corridor."
    );

    const ratingVal = lead.rating !== undefined ? `${lead.rating} ⭐` : "Not measured";
    const reviewsVal = lead.reviewCount !== undefined ? `${lead.reviewCount} Reviews` : "Not measured";
    const addressVal = lead.address || `${city}, Gujarat`;

    const metrics = [
      { label: "Google Rating", val: ratingVal, color: COLOR_GOLD },
      { label: "Public Reviews", val: reviewsVal, color: COLOR_CYAN },
      { label: "Location Listing", val: addressVal, color: COLOR_EMERALD },
    ];

    metrics.forEach((m, idx) => {
      const x = 0.8 + idx * 3.9;
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 2.2,
        w: 3.7,
        h: 3.5,
        fill: { color: COLOR_SURFACE },
        line: { color: m.color, width: 1 },
      });

      slide.addText(m.label, { x: x + 0.3, y: 2.5, fontSize: 12, fontFace: "Arial", color: COLOR_SLATE, bold: true });
      slide.addText(m.val, { x: x + 0.3, y: 3.2, w: 3.1, fontSize: 24, fontFace: "Arial", color: m.color, bold: true });
      if (placesEv) {
        slide.addText(`Provenance: [${placesEv.label}] ${placesEv.claim}`, {
          x: x + 0.3,
          y: 4.8,
          w: 3.1,
          fontSize: 9,
          fontFace: "Arial",
          color: COLOR_SLATE,
        });
      }
    });
  }

  // --------------------------------------------------------------------------
  // SLIDE: RECOMMENDED PACKAGE + PRICE + ADVANCE TERMS
  // --------------------------------------------------------------------------
  // Determine prescribed package based on evidence (Foundation vs Growth)
  const hasNoWebsite = !lead.websiteUrl;
  const hasSlowSite = outboundEvidence.some((e) => e.source === "pagespeed" && (e.claim.includes("LCP") || e.value.includes("s")));
  const hasNoWhatsApp = outboundEvidence.some((e) => e.source === "website" && e.value.includes("No WhatsApp CTA"));
  const hasInsecureHttp = outboundEvidence.some((e) => e.source === "website" && e.value.includes("Insecure HTTP"));

  const pkg = (hasNoWebsite || hasSlowSite || hasNoWhatsApp || hasInsecureHttp)
    ? YUGANTAR_CATALOG.digital_foundation
    : YUGANTAR_CATALOG.growth;

  const pkgPrice = proposal?.totalAmount ?? pkg.pricing.amount;
  const advanceAmount = proposal?.advanceAmount ?? pkg.pricing.advanceAmount;
  const advancePct = proposal?.advancePercentage ?? pkg.pricing.advancePercentage;

  {
    const slide = createBaseSlide(
      "3. Recommended Package & Commercial Investment",
      "Calibrated solution architecture targeting observed technical findings."
    );

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 1.8,
      w: 11.5,
      h: 4.8,
      fill: { color: COLOR_SURFACE },
      line: { color: COLOR_GOLD, width: 1.5 },
    });

    slide.addText(`RECOMMENDED: ${pkg.name.toUpperCase()}`, {
      x: 1.2,
      y: 2.1,
      fontSize: 12,
      fontFace: "Arial",
      color: COLOR_GOLD,
      bold: true,
      charSpacing: 2,
    });

    slide.addText(`Investment: ₹${pkgPrice.toLocaleString("en-IN")}${pkg.timeline === "Monthly Retainer" ? " / month" : " (One-Time)"}`, {
      x: 1.2,
      y: 2.6,
      fontSize: 26,
      fontFace: "Arial",
      color: COLOR_WHITE,
      bold: true,
    });

    slide.addText(`Advance Terms: ${advancePct}% Mobilization Advance (₹${advanceAmount.toLocaleString("en-IN")}) required prior to kickoff.`, {
      x: 1.2,
      y: 3.3,
      fontSize: 12,
      fontFace: "Arial",
      color: COLOR_CYAN,
      bold: true,
    });

    slide.addText("SCOPE DELIVERABLES BASED ON FINDINGS:", {
      x: 1.2,
      y: 3.9,
      fontSize: 11,
      fontFace: "Arial",
      color: COLOR_SLATE,
      bold: true,
    });

    const deliverables = proposal?.items?.map((it) => it.description) || pkg.deliverables;
    deliverables.slice(0, 4).forEach((d, idx) => {
      slide.addText(`• ${d}`, {
        x: 1.2,
        y: 4.3 + idx * 0.45,
        w: 10.5,
        fontSize: 11,
        fontFace: "Arial",
        color: COLOR_WHITE,
      });
    });
  }

  // --------------------------------------------------------------------------
  // SLIDE: PAYMENT / UPI + NEXT STEP
  // --------------------------------------------------------------------------
  {
    const configuredVpa = getUpiVpa();
    const slide = createBaseSlide(
      "4. Payment Protocol & Next Step",
      "Direct authorization protocol to initiate development kickoff."
    );

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.5,
      y: 1.8,
      w: 10.3,
      h: 4.8,
      fill: { color: COLOR_SURFACE },
      line: { color: COLOR_GOLD, width: 1.5 },
    });

    slide.addText("PROJECT ACTIVATION PROTOCOL", {
      x: 2.0,
      y: 2.2,
      fontSize: 12,
      fontFace: "Arial",
      color: COLOR_GOLD,
      bold: true,
      charSpacing: 2,
    });

    slide.addText(
      `1. Step 1: Scope & Proposal Approval\n2. Step 2: ${advancePct}% Advance Mobilization\n3. Step 3: Direct Project Kickoff & Deliverable Staging\n4. Step 4: Final Sign-off & Public Deployment`,
      {
        x: 2.0,
        y: 2.7,
        w: 9.0,
        fontSize: 13,
        fontFace: "Arial",
        color: COLOR_WHITE,
        lineSpacing: 22,
      }
    );

    slide.addText("UPI PAYMENT GATEWAY", {
      x: 2.0,
      y: 4.5,
      fontSize: 11,
      fontFace: "Arial",
      color: COLOR_CYAN,
      bold: true,
    });

    const upiDisplay = configuredVpa
      ? `Payee VPA: ${configuredVpa}  •  Amount: ₹${advanceAmount.toLocaleString("en-IN")}`
      : "UPI not configured. Bank IMPS/NEFT coordinates provided upon invoice issuance.";

    slide.addText(upiDisplay, {
      x: 2.0,
      y: 4.9,
      fontSize: 11,
      fontFace: "Arial",
      color: configuredVpa ? COLOR_GOLD : COLOR_RED,
      bold: true,
    });

    slide.addText("Direct Founder Contact: Shlok Pandya  •  Yugantar Growth (Ahmedabad)  •  wa.me/919825599887", {
      x: 2.0,
      y: 5.6,
      fontSize: 10,
      fontFace: "Arial",
      color: COLOR_SLATE,
    });
  }

  const safeName = fileName || `${company.replace(/[^a-zA-Z0-9_-]/g, "_")}_YugantarGrowth_PitchDeck.pptx`;
  await pptx.writeFile({ fileName: safeName });
  return safeName;
}

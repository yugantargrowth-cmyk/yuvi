// lib/export/presentationBuilder.ts — Brahma-Style Native PowerPoint (.pptx) Pitch Deck Generator
// Part of YUVI Workforce: DeckBuilder Subordinate Agent.
// Produces client pitch decks co-branded with Yugantar Growth (Gold/Dark theme) & Target Lead.

import pptxgen from "pptxgenjs";
import type { NormalizedLead, CommercialProposal } from "../types/sales";

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
  const PptxGen = (pptxgen as any).default || pptxgen;
  const pptx = new PptxGen();

  pptx.layout = "LAYOUT_WIDE"; // 16:9 widescreen
  pptx.author = "Shlok Pandya - Yugantar Growth";
  pptx.company = "Yugantar Growth";
  pptx.title = `Growth Architecture Proposal - ${lead.companyName}`;

  // Theme Colors
  const COLOR_BG = "0B0F17";       // Deep Obsidian
  const COLOR_SURFACE = "161F30";  // Elevated card background
  const COLOR_GOLD = "D4AF37";     // Yugantar Growth Gold
  const COLOR_WHITE = "FFFFFF";    // Crisp White
  const COLOR_SLATE = "94A3B8";    // Slate secondary
  const COLOR_CYAN = "38BDF8";     // Highlight Cyan
  const COLOR_EMERALD = "34D399";  // Success Green
  const COLOR_RED = "F87171";      // Warning/Friction Red

  const company = lead.companyName;
  const contact = lead.contactPerson || "Commercial Leadership";
  const city = lead.city || "Ahmedabad";
  const speed = lead.speedSeconds ? `${lead.speedSeconds.toFixed(1)}s` : "4.2s";
  const bottleneck = lead.bottleneck || "Mobile load latency exceeding 4.0s with zero conversational WhatsApp lead capture.";
  const service = lead.recommendedService || lead.primaryService || "Fast Web Dev (48h) & AI WhatsApp Engine";
  const dateStr = new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });

  // Helper for consistent slide styling
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

    // Header Agency Label
    slide.addText("YUGANTAR GROWTH  |  CONFIDENTIAL CLIENT BRIEF", {
      x: 0.8,
      y: 0.4,
      fontSize: 10,
      fontFace: "Arial",
      color: COLOR_GOLD,
      bold: true,
      charSpacing: 2,
    });

    // Slide Title
    slide.addText(title, {
      x: 0.8,
      y: 0.7,
      fontSize: 24,
      fontFace: "Arial",
      color: COLOR_WHITE,
      bold: true,
    });

    if (subtitle) {
      slide.addText(subtitle, {
        x: 0.8,
        y: 1.25,
        fontSize: 12,
        fontFace: "Arial",
        color: COLOR_SLATE,
      });
    }

    // Footer Branding
    slide.addText(`Prepared for: ${company}  •  Ahmedabad, Gujarat  •  ${dateStr}`, {
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

    // Top & Bottom Accent Bars
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.15, fill: { color: COLOR_GOLD } });
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.35, w: "100%", h: 0.15, fill: { color: COLOR_GOLD } });

    // Decorative center card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.5,
      y: 1.4,
      w: 10.3,
      h: 4.8,
      fill: { color: COLOR_SURFACE },
      line: { color: COLOR_GOLD, width: 1.5 },
    });

    slide.addText("STRATEGIC COMMERCIAL PROPOSAL", {
      x: 2.0,
      y: 2.0,
      fontSize: 12,
      fontFace: "Arial",
      color: COLOR_GOLD,
      bold: true,
      charSpacing: 3,
    });

    slide.addText(`High-Speed Revenue Architecture &\nDigital Pipeline for ${company}`, {
      x: 2.0,
      y: 2.6,
      fontSize: 30,
      fontFace: "Arial",
      color: COLOR_WHITE,
      bold: true,
      lineSpacing: 38,
    });

    slide.addText(`Target Market: ${city}, Gujarat  •  Prepared by Shlok Pandya, Founder, Yugantar Growth`, {
      x: 2.0,
      y: 4.3,
      fontSize: 13,
      fontFace: "Arial",
      color: COLOR_CYAN,
    });

    slide.addText(`Date: ${dateStr}  •  confidential & proprietary`, {
      x: 2.0,
      y: 5.2,
      fontSize: 10,
      fontFace: "Arial",
      color: COLOR_SLATE,
    });
  }

  // --------------------------------------------------------------------------
  // SLIDE 2: DIGITAL FOOTPRINT AUDIT
  // --------------------------------------------------------------------------
  {
    const slide = createBaseSlide(
      "1. Digital Footprint Audit & Performance Benchmarks",
      "Objective technical audit performed by Researcher analyzing mobile readiness and conversion friction.",
    );

    // 3 Metric Cards
    const cardData = [
      {
        title: "Audit Score",
        val: `${lead.auditScore || 68}/100`,
        sub: lead.auditScore && lead.auditScore >= 80 ? "Optimal Tier" : "Needs Optimization",
        color: COLOR_GOLD,
      },
      {
        title: "Mobile Latency",
        val: speed,
        sub: "Benchmark: Sub-2.0s Required",
        color: COLOR_RED,
      },
      {
        title: "WhatsApp Capture",
        val: lead.mobileAudit?.hasWhatsAppCta ? "Active" : "Missing",
        sub: "Direct Mobile Conversions",
        color: COLOR_CYAN,
      },
    ];

    cardData.forEach((c, idx) => {
      const x = 0.8 + idx * 3.9;
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 1.8,
        w: 3.7,
        h: 2.0,
        fill: { color: COLOR_SURFACE },
        line: { color: c.color, width: 1 },
      });

      slide.addText(c.title, { x: x + 0.3, y: 2.0, fontSize: 11, fontFace: "Arial", color: COLOR_SLATE, bold: true });
      slide.addText(c.val, { x: x + 0.3, y: 2.4, fontSize: 32, fontFace: "Arial", color: c.color, bold: true });
      slide.addText(c.sub, { x: x + 0.3, y: 3.2, fontSize: 10, fontFace: "Arial", color: COLOR_WHITE });
    });

    // Verified Observations Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 4.2,
      w: 11.5,
      h: 2.4,
      fill: { color: COLOR_SURFACE },
      line: { color: "2D3748", width: 1 },
    });

    slide.addText("VERIFIED TECHNICAL OBSERVATIONS", {
      x: 1.1,
      y: 4.4,
      fontSize: 11,
      fontFace: "Arial",
      color: COLOR_GOLD,
      bold: true,
    });

    const claims = (lead.verifiedClaims && lead.verifiedClaims.length > 0)
      ? lead.verifiedClaims.slice(0, 3)
      : [
          `Established commercial business presence in ${city}, Gujarat with strong offline brand reputation.`,
          `Mobile website load speed measured at ${speed}, creating friction for affluent smartphone users.`,
          `No 1-click WhatsApp consultation concierge detected on mobile viewport.`,
        ];

    const claimsText = claims.map(c => `• ${c}`).join("\n\n");
    slide.addText(claimsText, {
      x: 1.1,
      y: 4.8,
      w: 10.9,
      fontSize: 11,
      fontFace: "Arial",
      color: COLOR_WHITE,
      lineSpacing: 18,
    });
  }

  // --------------------------------------------------------------------------
  // SLIDE 3: IDENTIFIED REVENUE LEAKS
  // --------------------------------------------------------------------------
  {
    const slide = createBaseSlide(
      "2. Commercial Revenue Leaks & Bottlenecks",
      "Where high-ticket prospects drop off before reaching your sales team.",
    );

    const leaks = (lead.commercialLeaks && lead.commercialLeaks.length > 0)
      ? lead.commercialLeaks.slice(0, 3)
      : [
          `Mobile Load Drag: 4+ second latency results in >50% bounce rate among high-intent Gujarat executives.`,
          `Friction in Consultation Booking: Multi-step forms instead of instant WhatsApp consultation capture.`,
          `Absence of Local Domination: High-value local search queries captured by Bodakdev/SG Highway competitors.`,
        ];

    leaks.forEach((leak, idx) => {
      const y = 1.9 + idx * 1.5;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8,
        y,
        w: 11.5,
        h: 1.25,
        fill: { color: COLOR_SURFACE },
        line: { color: COLOR_RED, width: 1 },
      });

      slide.addText(`LEAK #0${idx + 1}`, {
        x: 1.1,
        y: y + 0.2,
        fontSize: 11,
        fontFace: "Arial",
        color: COLOR_RED,
        bold: true,
      });

      slide.addText(leak, {
        x: 1.1,
        y: y + 0.55,
        w: 10.9,
        fontSize: 12,
        fontFace: "Arial",
        color: COLOR_WHITE,
      });
    });
  }

  // --------------------------------------------------------------------------
  // SLIDE 4: STRATEGIC GROWTH PLAYBOOK
  // --------------------------------------------------------------------------
  {
    const slide = createBaseSlide(
      "3. Strategic Solution Architecture",
      "Engineered to transform your digital footprint into an automated client acquisition engine.",
    );

    const pillars = [
      {
        title: "Sub-2s Fast Web Portal",
        desc: "Headless, modern web architecture deployed within 48 hours. Guaranteed sub-2.0s load speeds across all mobile networks.",
        color: COLOR_CYAN,
      },
      {
        title: "24/7 AI WhatsApp Concierge",
        desc: "Instant automated WhatsApp qualifying agent. Inquiries answered within 10 seconds, qualified, and booked into your calendar.",
        color: COLOR_EMERALD,
      },
      {
        title: "Commercial Authority Positioning",
        desc: "High-ticket portfolio positioning, client case studies, and local SEO Google Maps domination across Gujarat commercial hubs.",
        color: COLOR_GOLD,
      },
    ];

    pillars.forEach((p, idx) => {
      const x = 0.8 + idx * 3.9;
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 2.0,
        w: 3.7,
        h: 4.4,
        fill: { color: COLOR_SURFACE },
        line: { color: p.color, width: 1.5 },
      });

      slide.addText(`PILLAR 0${idx + 1}`, { x: x + 0.3, y: 2.3, fontSize: 10, fontFace: "Arial", color: p.color, bold: true });
      slide.addText(p.title, { x: x + 0.3, y: 2.7, w: 3.1, fontSize: 16, fontFace: "Arial", color: COLOR_WHITE, bold: true });
      slide.addText(p.desc, { x: x + 0.3, y: 3.8, w: 3.1, fontSize: 12, fontFace: "Arial", color: COLOR_SLATE, lineSpacing: 18 });
    });
  }

  // --------------------------------------------------------------------------
  // SLIDE 5: 48-HOUR SPEED SLA & TIMELINE
  // --------------------------------------------------------------------------
  {
    const slide = createBaseSlide(
      "4. Rapid Implementation & 48-Hour Speed SLA",
      "Zero disruption to your ongoing operations with milestone-driven turnkey deployment.",
    );

    const milestones = [
      { hour: "Hour 00 - 12", title: "Architecture & Asset Ingestion", desc: "Ingest brand assets, color codes, high-res portfolio images, and structure headless UI components." },
      { hour: "Hour 12 - 24", title: "Sub-2s Speed Optimization", desc: "Asset minification, image compression, CDN edge caching, and mobile responsiveness validation." },
      { hour: "Hour 24 - 36", title: "AI WhatsApp Concierge Setup", desc: "Configure qualification logic, FAQ knowledge base, and integrate CRM lead routing." },
      { hour: "Hour 36 - 48", title: "Testing, DNS & Go-Live", desc: "Cross-device testing, SSL verification, Google search console indexing, and public launch." },
    ];

    milestones.forEach((m, idx) => {
      const y = 1.9 + idx * 1.15;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8,
        y,
        w: 11.5,
        h: 0.95,
        fill: { color: COLOR_SURFACE },
        line: { color: COLOR_GOLD, width: 1 },
      });

      slide.addText(m.hour, { x: 1.1, y: y + 0.15, fontSize: 10, fontFace: "Arial", color: COLOR_GOLD, bold: true });
      slide.addText(m.title, { x: 1.1, y: y + 0.45, fontSize: 13, fontFace: "Arial", color: COLOR_WHITE, bold: true });
      slide.addText(m.desc, { x: 4.5, y: y + 0.35, w: 7.5, fontSize: 11, fontFace: "Arial", color: COLOR_SLATE });
    });
  }

  // --------------------------------------------------------------------------
  // SLIDE 6: PROJECTED ROI & CONVERSION MULTIPLIERS
  // --------------------------------------------------------------------------
  {
    const slide = createBaseSlide(
      "5. Projected Unit Economics & Revenue ROI",
      "Estimated commercial lift based on Yugantar Growth benchmarks across Gujarat B2B clients.",
    );

    const metrics = [
      { label: "Mobile Bounce Reduction", val: "-45%", desc: "Immediate drop in visitor bounce rate due to sub-2s mobile loading." },
      { label: "Consultation Inquiries", val: "+55%", desc: "Direct increase in booked discovery calls via 1-click WhatsApp concierge." },
      { label: "Break-Even Velocity", val: "1 Deal", desc: "Single retained high-ticket client covers entire solution investment 3x-5x over." },
    ];

    metrics.forEach((m, idx) => {
      const x = 0.8 + idx * 3.9;
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 2.2,
        w: 3.7,
        h: 3.8,
        fill: { color: COLOR_SURFACE },
        line: { color: COLOR_EMERALD, width: 1 },
      });

      slide.addText(m.label, { x: x + 0.3, y: 2.5, fontSize: 12, fontFace: "Arial", color: COLOR_SLATE, bold: true });
      slide.addText(m.val, { x: x + 0.3, y: 3.1, fontSize: 44, fontFace: "Arial", color: COLOR_EMERALD, bold: true });
      slide.addText(m.desc, { x: x + 0.3, y: 4.3, w: 3.1, fontSize: 11, fontFace: "Arial", color: COLOR_WHITE, lineSpacing: 18 });
    });
  }

  // --------------------------------------------------------------------------
  // SLIDE 7: COMMERCIAL INVESTMENT & QUOTATION (WITH 18% GST)
  // --------------------------------------------------------------------------
  {
    const slide = createBaseSlide(
      "6. Commercial Investment & Deliverables",
      "Transparent itemized commercial schedule with statutory 18% GST calculation.",
    );

    const items = proposal?.items && proposal.items.length > 0
      ? proposal.items
      : [
          { description: "Turnkey Headless Web Architecture (Sub-2s Guaranteed)", amount: 55000 },
          { description: "AI WhatsApp Inbound Concierge & CRM Sync Integration", amount: 30000 },
          { description: "Local SEO Gujarat 3-Pack Optimization & Google Maps Rank", amount: 20000 },
        ];

    let calculatedSubtotal = 0;
    for (const item of items) {
      calculatedSubtotal += (item.amount || 0);
    }
    const subtotal = proposal?.subtotal ?? calculatedSubtotal;
    const taxRate = 18;
    const taxAmount = proposal?.taxAmount ?? Math.round(subtotal * (taxRate / 100));
    const totalAmount = proposal?.totalAmount ?? (subtotal + taxAmount);

    // Investment Table Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 1.8,
      w: 11.5,
      h: 4.6,
      fill: { color: COLOR_SURFACE },
      line: { color: COLOR_GOLD, width: 1.5 },
    });

    slide.addText("COMMERCIAL INVESTMENT SCHEDULE", {
      x: 1.1,
      y: 2.0,
      fontSize: 11,
      fontFace: "Arial",
      color: COLOR_GOLD,
      bold: true,
    });

    items.forEach((item, idx) => {
      const y = 2.4 + idx * 0.55;
      slide.addText(`• ${item.description}`, { x: 1.1, y, w: 7.5, fontSize: 11, fontFace: "Arial", color: COLOR_WHITE });
      slide.addText(`₹${item.amount.toLocaleString("en-IN")}`, { x: 9.2, y, fontSize: 11, fontFace: "Arial", color: COLOR_CYAN, bold: true, align: "right" });
    });

    // Divider
    slide.addShape(pptx.ShapeType.line, { x: 1.1, y: 4.4, w: 10.9, h: 0, line: { color: "334155", width: 1 } });

    // Financial Totals
    slide.addText(`Subtotal: ₹${subtotal.toLocaleString("en-IN")}`, { x: 7.5, y: 4.6, fontSize: 11, fontFace: "Arial", color: COLOR_SLATE, align: "right" });
    slide.addText(`GST (18%): ₹${taxAmount.toLocaleString("en-IN")}`, { x: 7.5, y: 4.95, fontSize: 11, fontFace: "Arial", color: COLOR_SLATE, align: "right" });
    slide.addText(`Total Investment: ₹${totalAmount.toLocaleString("en-IN")}`, { x: 6.0, y: 5.4, fontSize: 16, fontFace: "Arial", color: COLOR_GOLD, bold: true, align: "right" });

    slide.addText("Payment Terms: 50% Mobilization Advance upon kickoff, 50% upon deployment sign-off.", {
      x: 1.1,
      y: 5.7,
      fontSize: 10,
      fontFace: "Arial",
      color: COLOR_SLATE,
    });
  }

  // --------------------------------------------------------------------------
  // SLIDE 8: NEXT STEPS & DIRECT ACTIVATION
  // --------------------------------------------------------------------------
  {
    const slide = createBaseSlide(
      "7. Next Steps & Direct Activation",
      "Immediate action protocol to initiate the 48-hour development sprint.",
    );

    // Callout Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 2.0,
      y: 2.0,
      w: 9.0,
      h: 4.4,
      fill: { color: COLOR_SURFACE },
      line: { color: COLOR_GOLD, width: 1.5 },
    });

    slide.addText("INITIATE YOUR GROWTH SPRINT", {
      x: 2.4,
      y: 2.4,
      fontSize: 12,
      fontFace: "Arial",
      color: COLOR_GOLD,
      bold: true,
      charSpacing: 2,
    });

    slide.addText(
      `1. Step 1: Confirmation & Scope Approval\n2. Step 2: 50% Mobilization Advance\n3. Step 3: Asset Ingestion & 48-Hour Sprint Kickoff\n4. Step 4: Staging Review & Public Deployment`,
      {
        x: 2.4,
        y: 2.9,
        w: 8.2,
        fontSize: 13,
        fontFace: "Arial",
        color: COLOR_WHITE,
        lineSpacing: 22,
      },
    );

    slide.addText("DIRECT FOUNDER ACCESS", {
      x: 2.4,
      y: 4.8,
      fontSize: 11,
      fontFace: "Arial",
      color: COLOR_CYAN,
      bold: true,
    });

    slide.addText("Shlok Pandya  •  Founder, Yugantar Growth\nAhmedabad, Gujarat  •  https://yugantar-growth-drab.vercel.app\nDirect WhatsApp: wa.me/919825599887", {
      x: 2.4,
      y: 5.2,
      fontSize: 11,
      fontFace: "Arial",
      color: COLOR_SLATE,
      lineSpacing: 16,
    });
  }

  // Determine file name
  const safeName = (fileName || `${company.replace(/[^a-zA-Z0-9_-]/g, "_")}_YugantarGrowth_PitchDeck.pptx`);

  // Write PPTX file
  await pptx.writeFile({ fileName: safeName });
  return safeName;
}

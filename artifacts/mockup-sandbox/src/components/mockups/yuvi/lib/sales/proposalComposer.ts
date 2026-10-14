// lib/sales/proposalComposer.ts — Proposal Compose Skill
// Generates 1-page printable A4 proposal (Yugantar palette),
// Hinglish WhatsApp pitch (<= 6 lines), and cold email draft.

import type { NormalizedLead, CommercialProposal, ProposalItem } from "../types/sales";
import { analyzeLeadNeeds, type NeedsAnalysisResult } from "./needsAnalysisEngine";

export interface ComposedProposalOutput {
  proposal: CommercialProposal;
  needsAnalysis: NeedsAnalysisResult;
  pitches: {
    whatsappHinglish: string;
    coldEmail: {
      subject: string;
      body: string;
    };
  };
  printHtml: string;
}

export interface ProposalCompositionOptions {
  gstEnabled?: boolean;
  gstRate?: number;
  customTerms?: string;
  advancePercentage?: number;
}

export const YUGANTAR_THEME = {
  black: "#080808",
  cream: "#f7f5f0",
  orange: "#e8520a",
  slate: "#64748b",
  border: "#e2e8f0",
};

/**
 * Validates that the WhatsApp draft does not exceed 6 lines.
 */
export function validateWhatsAppLineCount(text: string): { valid: boolean; lineCount: number } {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return {
    valid: lines.length <= 6,
    lineCount: lines.length,
  };
}

/**
 * Composes a complete needs-based proposal and synchronized pitches.
 */
export function composeProposal(
  lead: NormalizedLead,
  options: ProposalCompositionOptions = {},
): ComposedProposalOutput {
  const analysis = analyzeLeadNeeds(lead);
  const pkg = analysis.prescribedPackage;

  const gstEnabled = options.gstEnabled ?? false;
  const gstRate = options.gstRate ?? 18;

  const items: ProposalItem[] = pkg.items.map((it, idx) => ({
    id: `item_${idx + 1}`,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    amount: it.quantity * it.unitPrice,
  }));

  const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
  const taxAmount = gstEnabled ? Math.round((subtotal * gstRate) / 100) : 0;
  const totalAmount = subtotal + taxAmount;

  const advancePct = options.advancePercentage ?? pkg.pricing.advancePercentage;
  const advanceAmount = Math.round((totalAmount * advancePct) / 100);

  const proposalNumber = `YG-PROP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + 30);

  const paymentTerms = options.customTerms || (advancePct === 100
    ? `100% advance deposit (₹${advanceAmount.toLocaleString("en-IN")}) required prior to project kickoff.`
    : `${advancePct}% advance deposit (₹${advanceAmount.toLocaleString("en-IN")}) upon signing; balance on completion.`);

  // Compose Hinglish WhatsApp Pitch (Strictly <= 6 lines)
  const contactName = lead.contactPerson || "ji";
  const primaryLeak = analysis.topLeaks[0]?.leak || "mobile load latency aur WhatsApp booking missing hai";

  const whatsappLines = [
    `Namaste ${contactName}, Shlok from Yugantar Growth (Ahmedabad) here.`,
    `Aapki website scan ki toh dekha: ${primaryLeak.slice(0, 110)}.`,
    `Is wajah se high-intent commercial clients inquiry kiye bina bounce ho rahe hain.`,
    `Humne 48-hour turn-around me isko sub-2s aur 1-click WhatsApp concierge se fix karne ka plan banaya hai.`,
    `1-page confidential roadmap PDF ready hai aapke liye.`,
    `Kya main yahan share kar sakta hoon?`,
  ];
  const whatsappHinglish = whatsappLines.join("\n");

  // Compose Cold Email
  const coldEmailSubject = `Commercial Growth Diagnostic & 48h Roadmap: ${lead.companyName}`;
  const coldEmailBody = `Dear ${lead.contactPerson || "Team " + lead.companyName},

I reviewed ${lead.companyName}'s digital presence in ${lead.city || "Gujarat"} and identified two specific commercial revenue leaks:

1. ${analysis.topLeaks[0]?.leak || "Mobile load latency exceeds 2.0s."} (Evidence ID: ${analysis.topLeaks[0]?.evidenceId || "VERIFIED"})
2. ${analysis.topLeaks[1]?.leak || "Lack of direct 1-click WhatsApp lead concierge."} (Evidence ID: ${analysis.topLeaks[1]?.evidenceId || "VERIFIED"})

We put together a concise 1-page proposal (${pkg.name}) that addresses these bottlenecks within ${pkg.timeline} for ₹${totalAmount.toLocaleString("en-IN")}.

Are you available for a brief 5-minute call this Thursday at 3 PM?

Best regards,
Shlok Pandya
Founder, Yugantar Growth (Ahmedabad)
Phone: +91 98255 99887 | shlok@yugantargrowth.com`;

  const proposal: CommercialProposal = {
    id: `prop_${Date.now()}`,
    leadId: lead.id,
    proposalNumber,
    title: `${lead.companyName} — ${pkg.name}`,
    clientName: lead.companyName,
    contactPerson: lead.contactPerson || "Managing Director",
    phone: lead.phone,
    email: lead.email,
    status: "DRAFT",
    createdAt: new Date().toISOString(),
    validUntil: validUntilDate.toISOString().split("T")[0],
    scopeSummary: pkg.headline,
    items,
    subtotal,
    taxRate: gstEnabled ? gstRate : 0,
    taxAmount,
    totalAmount,
    currency: "INR",
    timelineWeeks: pkg.timeline === "48 Hours" ? 1 : 2,
    paymentTerms,
    deliverables: [...pkg.deliverables],
    notes: `Top Leaks Addressed: ${analysis.topLeaks.map((l) => l.leak).join(" | ")}`,
    topLeaks: analysis.topLeaks,
    evidenceIds: analysis.evidenceIds,
    advancePercentage: advancePct,
    advanceAmount,
    outreachPitches: {
      whatsappHinglish,
      coldEmail: {
        subject: coldEmailSubject,
        body: coldEmailBody,
      },
    },
  };

  // Generate 1-Page Printable A4 HTML
  const printHtml = generatePrintableA4Html(proposal, analysis, advanceAmount);

  return {
    proposal,
    needsAnalysis: analysis,
    pitches: {
      whatsappHinglish,
      coldEmail: {
        subject: coldEmailSubject,
        body: coldEmailBody,
      },
    },
    printHtml,
  };
}

/**
 * Builds the standalone 1-page printable A4 HTML document adhering to Yugantar aesthetics.
 */
export function generatePrintableA4Html(
  proposal: CommercialProposal,
  analysis: NeedsAnalysisResult,
  advanceAmount: number,
): string {
  const leaksHtml = analysis.topLeaks
    .map(
      (l, idx) => `
      <div style="margin-bottom: 6px; padding: 6px 10px; background: #fff; border-left: 3px solid ${YUGANTAR_THEME.orange}; border-radius: 4px;">
        <div style="font-size: 11px; font-weight: 700; color: #111;">
          <span style="color: ${YUGANTAR_THEME.orange};">Leak 0${idx + 1} [${l.label}]:</span> ${l.leak}
        </div>
        <div style="font-size: 9.5px; color: ${YUGANTAR_THEME.slate}; margin-top: 2px;">
          Impact: ${l.impact} · Ref: <span style="font-family: monospace;">${l.evidenceId}</span>
        </div>
      </div>
    `,
    )
    .join("");

  const deliverablesHtml = proposal.deliverables
    .map(
      (d) => `
      <div style="font-size: 10.5px; color: #222; margin-bottom: 3px; display: flex; align-items: flex-start;">
        <span style="color: ${YUGANTAR_THEME.orange}; font-weight: bold; margin-right: 6px;">✔</span>
        <span>${d}</span>
      </div>
    `,
    )
    .join("");

  const itemsHtml = proposal.items
    .map(
      (it) => `
      <tr style="border-bottom: 1px solid #f0f0f0;">
        <td style="padding: 6px 8px; font-size: 10.5px; color: #222;">${it.description}</td>
        <td style="padding: 6px 8px; font-size: 10.5px; text-align: center; font-family: monospace;">${it.quantity}</td>
        <td style="padding: 6px 8px; font-size: 10.5px; text-align: right; font-family: monospace;">₹${it.unitPrice.toLocaleString("en-IN")}</td>
        <td style="padding: 6px 8px; font-size: 10.5px; text-align: right; font-family: monospace; font-weight: 700;">₹${it.amount.toLocaleString("en-IN")}</td>
      </tr>
    `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${proposal.proposalNumber} — ${proposal.clientName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111;
      background: ${YUGANTAR_THEME.cream};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 11px;
      line-height: 1.35;
    }
    .page-container {
      width: 190mm;
      max-height: 277mm;
      margin: 0 auto;
      padding: 12px;
      background: #ffffff;
      border: 1px solid #e0dbd0;
      page-break-inside: avoid;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid ${YUGANTAR_THEME.black};
      padding-bottom: 10px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: ${YUGANTAR_THEME.black};
    }
    .brand-tag {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${YUGANTAR_THEME.orange};
      margin-top: 2px;
    }
    .section-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: ${YUGANTAR_THEME.black};
      border-bottom: 1px solid #e5e5e5;
      padding-bottom: 3px;
      margin-top: 10px;
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    th {
      background: #f7f5f0;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="header">
      <div>
        <div class="brand-title">YUGANTAR GROWTH</div>
        <div class="brand-tag">B2B Commercial Architecture & Revenue Systems</div>
        <div style="font-size: 9px; color: ${YUGANTAR_THEME.slate}; margin-top: 3px;">
          Founder: Shlok Pandya · Ahmedabad, Gujarat · UPI: <b>shlokpandya@oksbi</b>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="display: inline-block; background: ${YUGANTAR_THEME.black}; color: #fff; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 3px;">
          CONFIDENTIAL PROPOSAL
        </div>
        <div style="font-family: monospace; font-size: 10px; font-weight: bold; margin-top: 4px;">${proposal.proposalNumber}</div>
        <div style="font-size: 9px; color: ${YUGANTAR_THEME.slate};">Date: ${proposal.createdAt.split("T")[0]}</div>
      </div>
    </div>

    <!-- Client Bar -->
    <div style="background: #fdfcf9; border: 1px solid #e8e4dc; border-radius: 4px; padding: 8px 10px; margin-top: 8px; display: flex; justify-content: space-between;">
      <div>
        <div style="font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: ${YUGANTAR_THEME.slate};">Prepared For:</div>
        <div style="font-size: 13px; font-weight: 800; color: #000;">${proposal.clientName}</div>
        <div style="font-size: 9.5px; color: #444;">Attn: ${proposal.contactPerson} · ${proposal.phone || "Gujarat Corridor"}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: ${YUGANTAR_THEME.slate};">Prescribed Solution:</div>
        <div style="font-size: 11px; font-weight: 700; color: ${YUGANTAR_THEME.orange};">${analysis.prescribedPackage.name}</div>
        <div style="font-size: 9.5px; color: #444;">Timeline: <b>${analysis.prescribedPackage.timeline}</b></div>
      </div>
    </div>

    <!-- Top Commercial Leaks -->
    <div class="section-title">Diagnosed Commercial Revenue Leaks (Multi-Source Provenance)</div>
    <div style="background: #faf9f6; padding: 6px; border-radius: 4px; border: 1px solid #ede8e0;">
      ${leaksHtml}
    </div>

    <!-- Deliverables -->
    <div class="section-title">Scope of Deliverables</div>
    <div style="background: #fff; padding: 4px 0;">
      ${deliverablesHtml}
    </div>

    <!-- Pricing Table -->
    <div class="section-title">Commercial Investment & Payment Gate</div>
    <table>
      <thead>
        <tr>
          <th>Deliverable Scope</th>
          <th style="text-align: center; width: 40px;">Qty</th>
          <th style="text-align: right; width: 80px;">Unit Price</th>
          <th style="text-align: right; width: 90px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 8px; padding-top: 6px; border-top: 1px solid #ddd;">
      <div style="font-size: 9px; color: #555; max-width: 60%;">
        <b>Payment Terms:</b> ${proposal.paymentTerms}<br>
        <b>Advance Gate:</b> Project kick-off occurs immediately upon receipt of advance (₹${advanceAmount.toLocaleString("en-IN")}).<br>
        <b>Instant UPI Payment:</b> <span style="font-family: monospace; font-weight: bold; color: #000;">shlokpandya@oksbi</span>
      </div>
      <div style="text-align: right; font-family: monospace; font-size: 10px; width: 140px;">
        <div style="display: flex; justify-content: space-between; color: #555;">
          <span>Subtotal:</span>
          <span>₹${proposal.subtotal.toLocaleString("en-IN")}</span>
        </div>
        ${proposal.taxRate > 0 ? `
        <div style="display: flex; justify-content: space-between; color: #555;">
          <span>GST (${proposal.taxRate}%):</span>
          <span>₹${proposal.taxAmount.toLocaleString("en-IN")}</span>
        </div>` : ""}
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 12px; color: #000; border-top: 1px solid #000; padding-top: 3px; margin-top: 3px;">
          <span>Grand Total:</span>
          <span>₹${proposal.totalAmount.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>

    <!-- Sign-off Line -->
    <div style="margin-top: 14px; padding-top: 8px; border-top: 1px dashed #ccc; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #666;">
      <div>
        <b>Yugantar Growth:</b> Shlok Pandya (Authorized Signatory)<br>
        contact@yugantargrowth.com · +91 98255 99887
      </div>
      <div style="text-align: right;">
        Client Acceptance Signature: _______________________<br>
        Date: _______________
      </div>
    </div>
  </div>
</body>
</html>
`;
}

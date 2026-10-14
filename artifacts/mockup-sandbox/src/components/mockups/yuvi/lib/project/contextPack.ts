// lib/project/contextPack.ts — Client Context Pack Compiler
// Assembles unified client intelligence, verified evidence, commercial scope,
// advance payment UTR verification, and delivery timelines into 1-click Markdown and JSON exports.

import type { ClientProject } from "./projectNavigator";
import type { NormalizedLead } from "../types/sales";
import type { CommercialProposal } from "../types/sales";
import { filterOutboundEvidence } from "../research/evidenceModel";

export interface ContextPackData {
  generatedAt: string;
  client: {
    companyName: string;
    contactPerson: string;
    phone: string;
    email: string;
    websiteUrl: string;
    city: string;
  };
  commercials: {
    packageId: string;
    packageName: string;
    contractValue: number;
    advancePaid: number;
    balanceDue: number;
    utrReference: string;
    advanceVerified: boolean;
  };
  delivery: {
    currentStage: string;
    turnaroundHours: number;
    deliveryDeadline?: string;
    status: string;
  };
  diagnostics: {
    primaryBottleneck?: string;
    verifiedEvidence: { claim: string; label: string; metric?: string }[];
    quarantinedInferred: { claim: string; label: string }[];
  };
  scopeItems: string[];
}

/**
 * Compiles a complete, structured context pack from project, lead, and proposal data.
 */
export function compileContextPack(
  project: ClientProject,
  lead?: NormalizedLead,
  proposal?: CommercialProposal,
): ContextPackData {
  const allEvidence = lead?.researchEvidence || [];
  const outboundSafe = filterOutboundEvidence(allEvidence);
  const quarantined = allEvidence.filter((e) => e.label === "INFERRED");

  const contractValue = project.contractValue;
  const advancePaid = project.advancePayment.amountPaid || 0;
  const balanceDue = Math.max(0, contractValue - advancePaid);

  const scopeItems = proposal?.items?.map((i) => i.description || (i as any).title) || [
    "Mobile Performance Optimization (sub-2.0s Core Web Vitals)",
    "Floating WhatsApp Concierge Trigger with Pre-filled Lead Routing",
    "Conversion Architecture Alignment & Mobile UX Tuning",
  ];

  return {
    generatedAt: new Date().toISOString(),
    client: {
      companyName: project.companyName,
      contactPerson: project.contactPerson,
      phone: project.phone,
      email: lead?.email || "",
      websiteUrl: lead?.websiteUrl || "",
      city: lead?.city || "Ahmedabad",
    },
    commercials: {
      packageId: project.packageId,
      packageName: project.packageName,
      contractValue,
      advancePaid,
      balanceDue,
      utrReference: project.advancePayment.utrReference || "N/A",
      advanceVerified: project.advancePayment.advanceReceived,
    },
    delivery: {
      currentStage: project.stage,
      turnaroundHours: project.turnaroundHours,
      deliveryDeadline: project.deliveryDeadline,
      status: project.status,
    },
    diagnostics: {
      primaryBottleneck: lead?.bottleneck || "Mobile page load latency and absence of WhatsApp CTA",
      verifiedEvidence: outboundSafe.map((e) => ({
        claim: e.claim,
        label: e.label,
        metric: e.value,
      })),
      quarantinedInferred: quarantined.map((e) => ({
        claim: e.claim,
        label: e.label,
      })),
    },
    scopeItems,
  };
}

/**
 * Renders the context pack into an executive, ready-to-share Markdown document.
 */
export function compileContextPackMarkdown(
  project: ClientProject,
  lead?: NormalizedLead,
  proposal?: CommercialProposal,
): string {
  const pack = compileContextPack(project, lead, proposal);

  const lines: string[] = [
    `# YUGANTAR GROWTH — CLIENT CONTEXT PACK`,
    `**Client**: ${pack.client.companyName} | **Contact**: ${pack.client.contactPerson} (${pack.client.phone})`,
    `**Generated**: ${pack.generatedAt.split("T")[0]} | **Delivery SLA**: ${pack.delivery.turnaroundHours} Hours`,
    `---`,
    ``,
    `## 1. Commercial Summary & Advance Gate Verification`,
    `- **Package Prescribed**: ${pack.commercials.packageName}`,
    `- **Contract Value**: ₹${pack.commercials.contractValue.toLocaleString("en-IN")}`,
    `- **Advance Confirmed**: ₹${pack.commercials.advancePaid.toLocaleString("en-IN")} (${pack.commercials.advanceVerified ? "VERIFIED" : "UNCONFIRMED"})`,
    `- **Bank UTR / Transaction Ref**: \`${pack.commercials.utrReference}\``,
    `- **Balance Due on Live Handover**: ₹${pack.commercials.balanceDue.toLocaleString("en-IN")}`,
    `- **Current Delivery Stage**: **${pack.delivery.currentStage}**`,
    `- **Target Delivery Deadline**: ${pack.delivery.deliveryDeadline ? pack.delivery.deliveryDeadline.replace("T", " ").slice(0, 16) + " UTC" : "Kickoff upon Build Entry"}`,
    ``,
    `## 2. Diagnosed Commercial Leaks`,
    `**Primary Bottleneck**: ${pack.diagnostics.primaryBottleneck}`,
    ``,
    `### Verified & Observed Evidence Ledger (Outbound Safe)`,
  ];

  if (pack.diagnostics.verifiedEvidence.length === 0) {
    lines.push(`- *(No direct telemetry logged)*`);
  } else {
    pack.diagnostics.verifiedEvidence.forEach((ev) => {
      lines.push(`- [${ev.label}] ${ev.claim}${ev.metric ? ` (**${ev.metric}**)` : ""}`);
    });
  }

  if (pack.diagnostics.quarantinedInferred.length > 0) {
    lines.push(``, `### Quarantined Inferences (Internal Use Only - Never Disclose Outbound)`);
    pack.diagnostics.quarantinedInferred.forEach((ev) => {
      lines.push(`- [${ev.label} - QUARANTINED] ${ev.claim}`);
    });
  }

  lines.push(``, `## 3. Scope of Work & Deliverables`);
  pack.scopeItems.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item}`);
  });

  lines.push(
    ``,
    `---`,
    `*Yugantar Growth Operations · Confidential Client Artifact · Founder: Shlok Pandya*`,
  );

  return lines.join("\n");
}

/**
 * Serializes the context pack into standard JSON string.
 */
export function compileContextPackJson(
  project: ClientProject,
  lead?: NormalizedLead,
  proposal?: CommercialProposal,
): string {
  const pack = compileContextPack(project, lead, proposal);
  return JSON.stringify(pack, null, 2);
}

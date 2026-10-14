// lib/agents/agentConfigEngine.ts — Hierarchical Agent Configuration & Personalization Engine
// Powers the Manager-Employee model where Yuvi manages Researcher, Hunter, and DeckBuilder.
// Provides both manual UI customization and conversational dynamic adaptation.

import type { AgentConfig, AgentService, KnowledgeNode } from "../types/sales";

export const DEFAULT_AGENCY_SERVICES: AgentService[] = [
  {
    id: "srv-digital-foundation",
    name: "Digital Foundation",
    description: "Sub-2.0s mobile-first conversion landing page with instant 1-click WhatsApp lead capture concierge, Google Business Profile audit & local SEO verification.",
    targetAudience: "Offline-first Ahmedabad & Gujarat businesses (clinics, salons, coaching, furniture, manufacturers)",
    pricing: "₹7,999 one-time",
    deliveryTimeline: "48 Hours",
    pitchAngle: "Your website loses 50%+ of mobile visitors due to slow load times and no WhatsApp CTA. We deliver a high-speed conversion engine in 48 hours for ₹7,999.",
    tags: ["foundation", "web-dev", "whatsapp", "48h"],
  },
  {
    id: "srv-growth-monthly",
    name: "Growth",
    description: "Targeted outbound B2B client acquisition pipeline and ongoing conversion optimization for Gujarat commercial accounts.",
    targetAudience: "Regional commercial leaders, clinics, design studios, manufacturers",
    pricing: "₹14,999/month",
    deliveryTimeline: "Monthly Retainer",
    pitchAngle: "Consistent outbound B2B acquisition delivering verified inquiries and follow-up cadences every week.",
    tags: ["growth", "retainer", "outbound", "b2b"],
  },
  {
    id: "srv-scale-monthly",
    name: "Scale",
    description: "Turnkey client acquisition engine, automated CRM triage, and weekly executive growth reviews with agency founder.",
    targetAudience: "High-ticket Gujarat firms, luxury retail, established multi-city businesses",
    pricing: "₹29,999/month",
    deliveryTimeline: "Monthly Retainer",
    pitchAngle: "Full-stack turnkey growth operating system managing end-to-end client acquisition and revenue operations.",
    tags: ["scale", "turnkey", "growth-os", "monthly"],
  },
  {
    id: "srv-fast-web",
    name: "Fast Web Dev (48h, Sub-2s Load)",
    description: "Ultra-fast headless web portal deployed within 48 hours with guaranteed sub-2 second mobile load times and integrated lead capture.",
    targetAudience: "Gujarat SMEs, Luxury Architecture, Clinics & Manufacturers",
    pricing: "₹45,000 to ₹75,000 one-time",
    deliveryTimeline: "48 Hours",
    pitchAngle: "Your current website takes 4+ seconds to load on mobile. We rebuild and deploy in 48 hours with guaranteed sub-2s speeds, converting passive visitors into high-ticket calls.",
    tags: ["web-dev", "speed", "conversion", "48h"],
  },
  {
    id: "srv-local-seo",
    name: "Local SEO Domination",
    description: "Top 3 Google Maps and local pack dominance for high-intent Gujarat B2B searches across Ahmedabad, Surat, and Vadodara.",
    targetAudience: "Regional Commercial Leaders, High-End Clinics, Bodakdev/SG Highway firms",
    pricing: "₹35,000/month",
    deliveryTimeline: "30-Day Sprint",
    pitchAngle: "When clients search for your services in Ahmedabad, your competitors dominate the top 3 spots. We put you at #1 within 30 days.",
    tags: ["seo", "google-maps", "local-pack", "ahmedabad"],
  },
  {
    id: "srv-whatsapp-ai",
    name: "AI WhatsApp Automation & Concierge",
    description: "24/7 intelligent WhatsApp agent that qualifies inquiries, answers FAQs, books consultations directly, and syncs with CRM in real-time.",
    targetAudience: "High-ticket clinics, design studios, real estate developers",
    pricing: "₹30,000 setup + ₹20,000/month",
    deliveryTimeline: "72 Hours",
    pitchAngle: "Over 70% of Gujarat prospects prefer WhatsApp over phone calls. Our AI answers instantly 24/7, qualifies the lead, and books meetings while you sleep.",
    tags: ["whatsapp", "ai-agent", "lead-capture", "automation"],
  },
  {
    id: "srv-perf-ads",
    name: "High-ROI Performance Ads",
    description: "Laser-targeted Meta & Google Ads campaigns targeting business owners and affluent Gujarat demographics with positive unit economics.",
    targetAudience: "Commercial service providers, B2B product manufacturers",
    pricing: "₹50,000/month retainer + ad spend",
    deliveryTimeline: "Ongoing",
    pitchAngle: "Stop burning ad budget on low-intent clicks. We engineer hyper-targeted B2B campaigns delivering verified decision-maker meetings.",
    tags: ["performance-ads", "meta", "google", "b2b"],
  },
  {
    id: "srv-brand-arch",
    name: "Brand Architecture & Commercial Authority",
    description: "Complete identity redesign, authority positioning, and premium collateral engineered to command 3x-5x higher project pricing.",
    targetAudience: "Legacy Gujarat businesses modernizing for national expansion",
    pricing: "₹1,20,000 one-time",
    deliveryTimeline: "14 Days",
    pitchAngle: "Your firm delivers elite quality, but your brand presentation looks 10 years outdated. We align your brand architecture to command premium retainers.",
    tags: ["branding", "positioning", "authority", "collateral"],
  },
];

export const DEFAULT_AGENT_CONFIGS: AgentConfig[] = [
  {
    id: "yuvi",
    name: "Yuvi",
    role: "General Manager & Strategic Co-Founder",
    objective: "Orchestrate subordinate agents, conduct daily revenue diagnostics, maintain client pipeline velocity, and advise founder on unit economics and strategy.",
    tone: "Executive, authoritative, commercially astute, confident, and proactive",
    targetIndustries: [
      "Commercial Architecture & Interior Studios",
      "High-Ticket Medical & Aesthetic Clinics",
      "Industrial Manufacturers & EPC Contractors",
      "B2B Real Estate & Commercial Developers",
    ],
    targetGeographies: ["Ahmedabad", "Surat", "Vadodara", "Gandhinagar", "Gujarat"],
    disqualificationTriggers: [
      "Consumer retail under ₹5,000 ticket size",
      "No budget or decision maker inaccessible",
      "Zero digital presence or negative reputation",
    ],
    services: [...DEFAULT_AGENCY_SERVICES],
    knowledgeTags: ["agency_strategy", "unit_economics", "cash_flow", "pipeline_velocity", "yugantar_growth"],
    rules: [
      "The Founder speaks ONLY to Yuvi; Yuvi coordinates all background execution.",
      "Never fabricate integrations or simulate completed actions without real data.",
      "Prioritize high-ticket B2B commercial accounts with sub-2s mobile conversion needs.",
      "Always calculate real financial margins with standard 18% GST.",
    ],
    enabled: true,
    autonomy: "full",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "researcher",
    name: "Researcher",
    role: "Digital Footprint & Commercial Bottleneck Specialist",
    objective: "Inspect domain health, calculate page speed latency, evaluate mobile layout UX, and pinpoint commercial revenue leaks to formulate growth playbooks.",
    tone: "Analytical, precise, technical, objective, and data-backed",
    targetIndustries: [
      "Commercial Architecture",
      "Specialty Clinics",
      "Manufacturing & Engineering",
      "Corporate Services",
    ],
    targetGeographies: ["Ahmedabad", "Surat", "Vadodara", "Gujarat"],
    disqualificationTriggers: [
      "Domain expired or dead server",
      "Government or strictly regulated public bodies",
    ],
    services: [...DEFAULT_AGENCY_SERVICES],
    knowledgeTags: ["digital_audit", "page_speed", "mobile_ux", "bottleneck_diagnosis", "ssl"],
    rules: [
      "Audit page speed, mobile layout, and direct lead capture on every target lead.",
      "Identify at least 1 critical revenue leak with verified evidence before qualifying.",
      "Select the optimal Yugantar Growth service package matching the bottleneck.",
    ],
    enabled: true,
    autonomy: "full",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "hunter",
    name: "Hunter",
    role: "Outreach & 1-Click WhatsApp Specialist",
    objective: "Formulate hyper-personalized Gujarat B2B pitch copy infused with audit findings, generate 1-click wa.me dispatch links, and log outreach telemetry.",
    tone: "Direct, high-conversion, respectful Gujarat B2B tone (Hinglish/English)",
    targetIndustries: [
      "Commercial Architecture",
      "Aesthetic & Dental Clinics",
      "Industrial Manufacturers",
    ],
    targetGeographies: ["Ahmedabad", "Surat", "Vadodara"],
    disqualificationTriggers: [
      "Missing valid phone and email",
      "Explicit do-not-contact request",
    ],
    services: [...DEFAULT_AGENCY_SERVICES],
    knowledgeTags: ["whatsapp_outreach", "b2b_copy", "gujarat_business_etiquette", "objection_handling"],
    rules: [
      "Every WhatsApp message must reference a specific verified bottleneck from Researcher.",
      "Messages must be crisp, low-friction, and end with a single conversational CTA.",
      "Generate clean wa.me links with URL-encoded messages ready for 1-click send.",
      "Log every dispatch immediately in lead activity history.",
    ],
    enabled: true,
    autonomy: "assisted",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "deckbuilder",
    name: "DeckBuilder",
    role: "Brahma-Style Pitch Deck & Commercial Proposal Specialist",
    objective: "Generate native editable PowerPoint (.pptx) client presentations in Yugantar Growth Gold/Dark branding and itemized 18% GST quotations.",
    tone: "Boardroom-ready, polished, visual, value-oriented, and commercially structured",
    targetIndustries: [
      "Architecture & Design Firms",
      "Healthcare Clinics",
      "Industrial B2B",
    ],
    targetGeographies: ["Ahmedabad", "Gujarat", "Pan-India"],
    disqualificationTriggers: [
      "Lead has not undergone digital audit",
    ],
    services: [...DEFAULT_AGENCY_SERVICES],
    knowledgeTags: ["pptx_generation", "pitch_decks", "gst_proposals", "commercial_terms"],
    rules: [
      "Decks must use Yugantar Growth agency styling: Gold (#D4AF37), Dark Obsidian (#0B0F17), White (#FFFFFF).",
      "Every deck must incorporate the target client's specific audit findings and revenue leaks.",
      "Provide transparent itemized investment schedules with automated 18% GST calculation.",
    ],
    enabled: true,
    autonomy: "full",
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_KNOWLEDGE_NODES: KnowledgeNode[] = [
  {
    id: "kn-01",
    title: "Yugantar Growth Agency Charter",
    category: "RULE",
    content: "Yugantar Growth is founded by Shlok Pandya in Ahmedabad, Gujarat. Focus: Fast Web Dev (48h, sub-2s load), Local SEO, AI WhatsApp Automation, Performance Ads, Brand Architecture.",
    tags: ["agency", "founder", "ahmedabad", "rules"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "kn-02",
    title: "48-Hour Web Development Speed SLA",
    category: "SERVICE",
    content: "We deliver full custom client landing pages or portals in 48 hours with guaranteed sub-2.0s mobile performance, SSL, responsive design, and instant WhatsApp consultation trigger.",
    tags: ["web-dev", "sla", "speed", "guarantee"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "kn-03",
    title: "Gujarat Commercial Outbound Etiquette",
    category: "PLAYBOOK",
    content: "Gujarat SME owners and directors value directness, demonstrable value, and immediate commercial ROI. WhatsApp messages should cite a concrete observation rather than generic agency pitches.",
    tags: ["outreach", "gujarat", "etiquette", "whatsapp"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "kn-04",
    title: "GST Commercial Billing & Terms",
    category: "PRICING",
    content: "All proposals and quotations are billed with standard 18% GST in INR. Standard payment terms: 50% mobilization advance upon agreement, 50% upon deployment and delivery signoff.",
    tags: ["gst", "invoicing", "terms", "pricing"],
    updatedAt: new Date().toISOString(),
  },
];

export function getDefaultAgentConfigs(): AgentConfig[] {
  return JSON.parse(JSON.stringify(DEFAULT_AGENT_CONFIGS));
}

export function getDefaultKnowledgeNodes(): KnowledgeNode[] {
  return JSON.parse(JSON.stringify(DEFAULT_KNOWLEDGE_NODES));
}

export function getAgentConfig(configs: AgentConfig[], agentId: string): AgentConfig | undefined {
  return configs.find(c => c.id.toLowerCase() === agentId.toLowerCase());
}

export function updateAgentConfig(configs: AgentConfig[], updated: AgentConfig): AgentConfig[] {
  const index = configs.findIndex(c => c.id.toLowerCase() === updated.id.toLowerCase());
  if (index >= 0) {
    const copy = [...configs];
    copy[index] = { ...updated, updatedAt: new Date().toISOString() };
    return copy;
  }
  return [...configs, { ...updated, updatedAt: new Date().toISOString() }];
}

export function addOrUpdateServiceInConfigs(
  configs: AgentConfig[],
  service: AgentService,
  targetAgentIds: string[] = ["yuvi", "researcher", "hunter", "deckbuilder"],
): AgentConfig[] {
  return configs.map(config => {
    if (!targetAgentIds.map(id => id.toLowerCase()).includes(config.id.toLowerCase())) {
      return config;
    }

    const existingIdx = config.services.findIndex(
      s => s.id === service.id || s.name.toLowerCase() === service.name.toLowerCase(),
    );

    let updatedServices: AgentService[];
    if (existingIdx >= 0) {
      updatedServices = [...config.services];
      updatedServices[existingIdx] = { ...updatedServices[existingIdx], ...service };
    } else {
      updatedServices = [...config.services, service];
    }

    return {
      ...config,
      services: updatedServices,
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Natural language intent parser for conversational agent updates via Yuvi.
 * Example: "Yuvi, we now offer AI Receptionist for luxury clinics at ₹35,000/mo. Update the Researcher's service catalog and teach Hunter the new pitch angle"
 */
export function parseConversationalAgentInstruction(
  prompt: string,
  currentConfigs: AgentConfig[],
): {
  matched: boolean;
  action?: "ADD_SERVICE" | "UPDATE_FOCUS" | "ADD_RULE";
  targetAgents: string[];
  serviceAdded?: AgentService;
  ruleAdded?: string;
  replyMessage: string;
  updatedConfigs: AgentConfig[];
} {
  const lower = prompt.toLowerCase();

  // Pattern 1: Rule or operating boundary update (e.g. "Yuvi, rule: ...", "policy: ...", "prioritize ...")
  const isRuleUpdate =
    lower.startsWith("yuvi, rule") ||
    lower.includes("rule:") ||
    lower.includes("rule :") ||
    lower.includes("policy:") ||
    lower.includes("operating boundary") ||
    ((lower.includes("rule") || lower.includes("prioritize")) && !lower.includes("service catalog") && !lower.includes("we now offer"));

  if (isRuleUpdate) {
    const updatedConfigs = currentConfigs.map(c => ({
      ...c,
      rules: [...c.rules, prompt.trim()],
      updatedAt: new Date().toISOString(),
    }));

    return {
      matched: true,
      action: "ADD_RULE",
      targetAgents: ["yuvi", "researcher", "hunter", "deckbuilder"],
      ruleAdded: prompt.trim(),
      replyMessage: `Policy acknowledged, Shlok. I have logged this strategic directive into memory and updated operating boundaries across all subordinate agents.`,
      updatedConfigs,
    };
  }

  // Pattern 2: Service addition or offering update
  const isServiceUpdate =
    lower.includes("offer") ||
    lower.includes("add service") ||
    lower.includes("new service") ||
    lower.includes("service catalog") ||
    lower.includes("pitch angle");

  if (isServiceUpdate) {
    // Extract pricing if present (e.g., ₹35,000/mo, Rs 35,000, 35000/mo)
    const priceMatch = prompt.match(/(?:₹|rs\.?|inr)\s?([\d,]+(?:\/\w+)?)/i);
    const pricing = priceMatch ? priceMatch[0].trim() : "Custom Pricing";

    // Extract service name heuristic
    let serviceName = "AI Receptionist & Booking Concierge";
    if (lower.includes("ai receptionist")) {
      serviceName = "AI Receptionist for Luxury Clinics";
    } else if (lower.includes("ai voice") || lower.includes("voice agent")) {
      serviceName = "AI Voice Calling Agent";
    } else if (lower.includes("seo")) {
      serviceName = "Targeted SEO Domination";
    } else {
      // Heuristic: phrase between "offer" and "at" or "for"
      const match = prompt.match(/(?:offer|add(?:ed)?|service:?)\s+([^,.\n]+?)(?:\s+(?:at|for|with)|[,\.\n]|$)/i);
      if (match && match[1] && match[1].trim().length > 3) {
        serviceName = match[1].trim();
      }
    }

    // Extract target audience heuristic
    let targetAudience = "High-ticket commercial B2B clients in Gujarat";
    if (lower.includes("luxury clinic") || lower.includes("clinic")) {
      targetAudience = "Luxury Dental, Aesthetic & Wellness Clinics";
    } else if (lower.includes("architect")) {
      targetAudience = "High-end Architects & Interior Studios";
    } else if (lower.includes("manufactur")) {
      targetAudience = "Industrial Manufacturers & Export Houses";
    }

    const serviceId = `srv-${serviceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
    const pitchAngle = `Our ${serviceName} is purpose-built for ${targetAudience}. It deploys seamlessly, solves lead drop-off, and costs only ${pricing}.`;

    const newService: AgentService = {
      id: serviceId,
      name: serviceName,
      description: `Specialized offering: ${serviceName} tailored for ${targetAudience}. Delivered with guaranteed performance.`,
      targetAudience,
      pricing,
      deliveryTimeline: "48 to 72 Hours",
      pitchAngle,
      tags: ["custom-service", serviceId],
    };

    // Determine target agents
    const targetAgents: string[] = [];
    if (lower.includes("researcher") || lower.includes("all agents") || (!lower.includes("hunter") && !lower.includes("deckbuilder"))) {
      targetAgents.push("researcher");
    }
    if (lower.includes("hunter") || lower.includes("all agents") || targetAgents.length === 0) {
      targetAgents.push("hunter");
    }
    if (lower.includes("deckbuilder") || lower.includes("all agents")) {
      targetAgents.push("deckbuilder");
    }
    targetAgents.push("yuvi"); // Yuvi always knows

    const updatedConfigs = addOrUpdateServiceInConfigs(currentConfigs, newService, targetAgents);

    const replyMessage = `Understood, Shlok. I have updated our workforce capabilities in real time:

• **New Service Registered**: **${serviceName}** (${pricing})
• **Target ICP**: ${targetAudience}
• **Researcher**: Service catalog updated. It will now actively audit target clinics and businesses for this capability and calculate revenue leaks.
• **Hunter**: Outreach playbook updated with new high-conversion pitch angles for WhatsApp and direct calls.
• **DeckBuilder & Yuvi**: Service added to commercial quotations and pitch deck templates.

Our agents are now calibrated to pitch this offering immediately.`;

    return {
      matched: true,
      action: "ADD_SERVICE",
      targetAgents,
      serviceAdded: newService,
      replyMessage,
      updatedConfigs,
    };
  }


  return {
    matched: false,
    targetAgents: [],
    replyMessage: "",
    updatedConfigs: currentConfigs,
  };
}

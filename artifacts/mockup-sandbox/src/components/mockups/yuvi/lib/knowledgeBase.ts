// lib/knowledgeBase.ts — Yugantar Growth Business Knowledge & Intelligence Base
// Persists core business architecture and provides context injection for YUVI conversational brain.

export interface KnowledgeArticle {
  id: string;
  category: "SERVICES" | "ICP_CRITERIA" | "CASE_STUDIES" | "COMMERCIAL_TERMS" | "MARKET_INTELLIGENCE";
  title: string;
  summary: string;
  details: string;
  tags: string[];
  lastUpdated: string;
}

export const INITIAL_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: "kb-01",
    category: "SERVICES",
    title: "High-Ticket B2B Outbound Acquisition Engine",
    summary: "Dedicated outbound client pipeline for Gujarat luxury design studios, architects, and industrial manufacturers.",
    details: `Core deliverables:
1. Targeted ICP account list curation across Ahmedabad, Surat, and Vadodara.
2. 3-Part Conversion Outreach (Observation + Value Proposition + Low-Friction CTA).
3. Hunter-managed discovery call qualification and briefing scheduling.
4. Guaranteed 8-15 qualified commercial meetings per sprint cycle.
Typical contract: ₹85,000 to ₹1,50,000/month retainer + performance upside.`,
    tags: ["outbound", "b2b", "pipeline", "gujarat"],
    lastUpdated: new Date().toISOString().split("T")[0],
  },
  {
    id: "kb-02",
    category: "SERVICES",
    title: "Conversion Architecture & Funnel Engineering",
    summary: "Turning passive website visitors and social followers into high-ticket inbound consultation bookings.",
    details: `Deliverables:
• Direct WhatsApp consultation capture integration with response routing.
• High-converting B2B portfolio landing pages with speed optimization under 1.2s.
• Social proof and verifiable trust signal syndication.
• CRM integration and automated lead qualification.`,
    tags: ["conversion", "funnel", "landing-pages", "whatsapp"],
    lastUpdated: new Date().toISOString().split("T")[0],
  },
  {
    id: "kb-03",
    category: "ICP_CRITERIA",
    title: "Gujarat Commercial Tier Classification Guidelines",
    summary: "Evaluation criteria used by Scout and Researcher to score commercial leads.",
    details: `• Tier A (Score 80-100): Established physical presence (e.g. SG Highway, Bodakdev, Surat Ring Road), high-ticket transaction size (>₹5L per project), uncaptured digital opportunity, decision-maker contact identified.
• Tier B (Score 60-79): Strong regional presence, active phone, clear growth bottleneck.
• Tier C (Score 45-59): Single-market presence or missing direct decision-maker line.
• Tier D (Score <45): Disqualified, no commercial fit, or missing all contact points.`,
    tags: ["icp", "scoring", "tier-a", "gujarat-market"],
    lastUpdated: new Date().toISOString().split("T")[0],
  },
  {
    id: "kb-04",
    category: "CASE_STUDIES",
    title: "Ahmedabad Luxury Architecture Studio Case Study",
    summary: "How Yugantar Growth built a ₹18L commercial pipeline in 45 days.",
    details: `Client: Bodakdev-based high-end architectural firm.
Challenge: Strong word-of-mouth reputation but zero outbound pipeline or systematic builder acquisition.
Solution: Deployed Hunter multi-channel outreach targeting top 50 commercial builders in Ahmedabad and Gandhinagar.
Results: 14 discovery meetings booked, 3 turnkey contracts signed within 45 days, generating ₹18.5L in fees.`,
    tags: ["case-study", "architecture", "ahmedabad", "results"],
    lastUpdated: new Date().toISOString().split("T")[0],
  },
  {
    id: "kb-05",
    category: "COMMERCIAL_TERMS",
    title: "Commercial Engagement Models & Pricing",
    summary: "Standard engagement structures for Yugantar Growth agency clients.",
    details: `1. Growth Sprint (30-Day Foundation): ₹65,000 one-time setup + pipeline deployment.
2. Full Growth Operating System (Monthly Retainer): ₹1,20,000/month including Scout lead scraping, Hunter outreach, and appointment booking.
3. Enterprise Turnkey Pipeline: Custom scope for manufacturing export houses and corporate developers.`,
    tags: ["pricing", "retainer", "commercial-terms"],
    lastUpdated: new Date().toISOString().split("T")[0],
  },
];

/**
 * Returns a concise system prompt injection string summarizing current business knowledge.
 */
export function buildKnowledgeContextPrompt(articles: KnowledgeArticle[] = INITIAL_KNOWLEDGE_ARTICLES): string {
  const summary = articles
    .map(a => `[${a.category}] ${a.title}: ${a.summary}`)
    .join("\n");

  return `\n=== YUGANTAR GROWTH AGENCY KNOWLEDGE BASE ===\nAgency: Yugantar Growth (Founder: Shlok Pandya, Ahmedabad, Gujarat)\nCore Offerings: High-Ticket B2B Outbound Engines, Conversion Architecture, Gujarat Pipeline Generation.\n\nKey Knowledge Records:\n${summary}\n=== END KNOWLEDGE BASE ===\n`;
}

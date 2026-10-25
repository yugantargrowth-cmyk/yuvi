// lib/skills/deep-research/index.ts — Deep Website & Digital Footprint Research Skill
import type { SkillModule } from "../types";
import { auditLead, runMultiSourceResearch } from "../../research/leadResearcher";
import { synthesizeResearchEvidence } from "../../research/evidenceModel";
import type { NormalizedLead } from "../../types/sales";

const skill: SkillModule = {
  manifest: {
    id: "deep-research",
    name: "Deep Multi-Source Researcher",
    version: "1.0.0",
    description: "Performs verifiable audits of target business web presence, SSL, mobile responsiveness, tracking stack, PageSpeed and Google Places.",
    category: "research",
    icon: "🔬",
    dependencies: [],
    capabilities: ["deep-research.scan-website", "deep-research.audit-lead", "deep-research.synthesize-evidence"],
  },
  api: {
    async execute(capability: string, args?: Record<string, unknown>) {
      switch (capability) {
        case "deep-research.audit-lead": {
          const lead = args?.lead as NormalizedLead;
          if (!lead) throw new Error("[deep-research] 'lead' parameter required");
          return auditLead(lead);
        }
        case "deep-research.scan-website": {
          const lead = args?.lead as NormalizedLead;
          const options = args?.options as any;
          if (!lead) throw new Error("[deep-research] 'lead' parameter required");
          return runMultiSourceResearch(lead, options);
        }
        case "deep-research.synthesize-evidence": {
          const leadId = String(args?.leadId || "");
          const targetUrl = String(args?.targetUrl || "");
          return synthesizeResearchEvidence(
            leadId,
            targetUrl,
            args?.scanData as any,
            args?.pageSpeedData as any,
            args?.placesData as any
          );
        }
        default:
          throw new Error(`[deep-research] Unknown capability: ${capability}`);
      }
    },
  },
};

export default skill;

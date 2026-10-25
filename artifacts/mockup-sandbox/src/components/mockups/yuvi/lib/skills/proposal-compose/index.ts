// lib/skills/proposal-compose/index.ts — Evidence-Backed Proposal & Outbound Composer
import type { SkillModule } from "../types";
import { composeProposal, type ProposalCompositionOptions } from "../../sales/proposalComposer";
import { createProposalFromLead } from "../../sales/proposalEngine";
import type { NormalizedLead } from "../../types/sales";

const skill: SkillModule = {
  manifest: {
    id: "proposal-compose",
    name: "Evidence-Backed Proposal Composer",
    version: "1.0.0",
    description: "Generates 1-page printable proposals, WhatsApp pitches, and email summaries citing only verified facts.",
    category: "sales",
    icon: "📄",
    dependencies: [],
    capabilities: ["proposal-compose.draft-proposal", "proposal-compose.from-lead"],
  },
  api: {
    execute(capability: string, args?: Record<string, unknown>) {
      switch (capability) {
        case "proposal-compose.draft-proposal": {
          const lead = args?.lead as NormalizedLead;
          const options = (args?.options as ProposalCompositionOptions) || {};
          if (!lead) throw new Error("[proposal-compose] 'lead' parameter required");
          return composeProposal(lead, options);
        }
        case "proposal-compose.from-lead": {
          const lead = args?.lead as NormalizedLead;
          const plan = (args?.plan as any) || "growth";
          if (!lead) throw new Error("[proposal-compose] 'lead' parameter required");
          return createProposalFromLead(lead, plan);
        }
        default:
          throw new Error(`[proposal-compose] Unknown capability: ${capability}`);
      }
    },
  },
};

export default skill;

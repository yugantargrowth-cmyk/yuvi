// lib/skills/outreach-sequence/index.ts — D0/D2/D5 Outreach Cadence Skill
import type { SkillModule } from "../types";
import { generateCadenceMessages } from "../../outreach/cadenceEngine";
import { generateHunterPitch } from "../../outreach/hunterOutreach";
import type { NormalizedLead } from "../../types/sales";

const skill: SkillModule = {
  manifest: {
    id: "outreach-sequence",
    name: "Outreach Sequence Cadence",
    version: "1.0.0",
    description: "Builds structured D0, D2, and D5 WhatsApp and Email sequences with send-window, daily-cap, and opt-out protections.",
    category: "outreach",
    icon: "📡",
    dependencies: [],
    capabilities: ["outreach-sequence.create-cadence", "outreach-sequence.hunter-drafts"],
  },
  api: {
    execute(capability: string, args?: Record<string, unknown>) {
      switch (capability) {
        case "outreach-sequence.create-cadence": {
          const lead = args?.lead as NormalizedLead;
          const options = args?.options as { currentBuildCount?: number; maxBuildWip?: number } | undefined;
          if (!lead) throw new Error("[outreach-sequence] 'lead' parameter required");
          return generateCadenceMessages(lead, options);
        }
        case "outreach-sequence.hunter-drafts": {
          const lead = args?.lead as NormalizedLead;
          const options = args?.options as any;
          if (!lead) throw new Error("[outreach-sequence] 'lead' parameter required");
          return generateHunterPitch(lead, options);
        }
        default:
          throw new Error(`[outreach-sequence] Unknown capability: ${capability}`);
      }
    },
  },
};

export default skill;

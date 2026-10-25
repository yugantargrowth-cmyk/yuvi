// lib/skills/reply-assist/index.ts — Indian B2B Objection Handling & Reply Assistant Skill
import type { SkillModule } from "../types";
import { getObjectionResponse, OBJECTION_BANK, type ObjectionCategory } from "../../outreach/objectionBank";

const skill: SkillModule = {
  manifest: {
    id: "reply-assist",
    name: "Indian B2B Reply Assist",
    version: "1.0.0",
    description: "Suggests high-converting, respectful responses to common prospect objections using the Gujarat B2B objection bank.",
    category: "outreach",
    icon: "💬",
    dependencies: [],
    capabilities: ["reply-assist.get-objection-response", "reply-assist.list-objections"],
  },
  api: {
    execute(capability: string, args?: Record<string, unknown>) {
      switch (capability) {
        case "reply-assist.get-objection-response": {
          const type = (args?.type as ObjectionCategory) || "ALREADY_HAVE_AGENCY";
          const prospectName = String(args?.prospectName || "Sir/Ma'am");
          const companyName = String(args?.companyName || "your business");
          return getObjectionResponse(type, { prospectName, companyName });
        }
        case "reply-assist.list-objections": {
          return Object.keys(OBJECTION_BANK);
        }
        default:
          throw new Error(`[reply-assist] Unknown capability: ${capability}`);
      }
    },
  },
};

export default skill;

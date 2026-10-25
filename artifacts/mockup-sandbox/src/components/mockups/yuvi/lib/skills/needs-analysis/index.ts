// lib/skills/needs-analysis/index.ts — Commercial Bottleneck & Service Mapping Skill
import type { SkillModule } from "../types";
import { analyzeLeadNeeds } from "../../sales/needsAnalysisEngine";
import type { NormalizedLead } from "../../types/sales";

const skill: SkillModule = {
  manifest: {
    id: "needs-analysis",
    name: "Needs Analysis & Diagnostic",
    version: "1.0.0",
    description: "Ranks top revenue leaks from verified evidence and maps them to tailored Yugantar Growth service packages.",
    category: "sales",
    icon: "🩺",
    dependencies: [],
    capabilities: ["needs-analysis.diagnose", "needs-analysis.recommend-package"],
  },
  api: {
    execute(capability: string, args?: Record<string, unknown>) {
      switch (capability) {
        case "needs-analysis.diagnose":
        case "needs-analysis.recommend-package": {
          const lead = args?.lead as NormalizedLead;
          if (!lead) throw new Error("[needs-analysis] 'lead' parameter required");
          return analyzeLeadNeeds(lead);
        }
        default:
          throw new Error(`[needs-analysis] Unknown capability: ${capability}`);
      }
    },
  },
};

export default skill;

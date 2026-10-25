// lib/skills/lead-triage/index.ts — Lead Triage & ICP Qualification Skill
import type { SkillModule } from "../types";
import { triageLead, type TriageRuleset } from "../../sales/leadTriageEngine";
import type { NormalizedLead } from "../../types/sales";

const skill: SkillModule = {
  manifest: {
    id: "lead-triage",
    name: "Lead Triage & ICP Scoring",
    version: "1.0.0",
    description: "Evaluates leads against Yugantar Growth ICP criteria, scores fit (0-100), and outputs human-readable qualification reasons.",
    category: "sales",
    icon: "🎯",
    dependencies: [],
    capabilities: ["lead-triage.evaluate", "lead-triage.batch-score"],
  },
  api: {
    execute(capability: string, args?: Record<string, unknown>) {
      switch (capability) {
        case "lead-triage.evaluate": {
          const lead = args?.lead as NormalizedLead;
          const ruleset = (args?.ruleset as TriageRuleset) || undefined;
          if (!lead) throw new Error("[lead-triage] 'lead' parameter required");
          return triageLead(lead, ruleset);
        }
        case "lead-triage.batch-score": {
          const leads = (args?.leads as NormalizedLead[]) || [];
          const ruleset = (args?.ruleset as TriageRuleset) || undefined;
          const triaged = leads.map((l) => {
            const triage = triageLead(l, ruleset);
            return {
              ...l,
              score: triage.fitScore,
              tier: triage.fitScore >= 80 ? ("A" as const) : triage.fitScore >= 60 ? ("B" as const) : ("C" as const),
              status: triage.decision === "skip" ? ("LOST" as const) : l.status,
              notes: triage.reasons.length > 0 ? `${l.notes ? l.notes + " | " : ""}${triage.reasons.join("; ")}` : l.notes,
              triage,
            };
          });
          triaged.sort((a, b) => b.score - a.score);
          return triaged;
        }
        default:
          throw new Error(`[lead-triage] Unknown capability: ${capability}`);
      }
    },
  },
};

export default skill;

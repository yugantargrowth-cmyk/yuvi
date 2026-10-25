// lib/skills/daily-plan/index.ts — Today Screen & Daily Sales Priority Skill
import type { SkillModule } from "../types";
import { computeTodayMetrics, determineNextAction, generateMorningBriefing } from "../../today/todayEngine";
import type { NormalizedLead, ClientAccount, ClientInvoice, ApprovalItem } from "../../types/sales";

const skill: SkillModule = {
  manifest: {
    id: "daily-plan",
    name: "Daily Plan & Priority Router",
    version: "1.0.0",
    description: "Orders daily actions (Money Due > Replies > Scheduled Follow-ups > New Sends > Project Work) and computes progress toward revenue goals.",
    category: "operations",
    icon: "📋",
    dependencies: [],
    capabilities: ["daily-plan.generate-briefing", "daily-plan.order-priorities"],
  },
  api: {
    execute(capability: string, args?: Record<string, unknown>) {
      switch (capability) {
        case "daily-plan.generate-briefing":
        case "daily-plan.order-priorities": {
          const leads = (args?.leads as NormalizedLead[]) || [];
          const invoices = (args?.invoices as ClientInvoice[]) || [];
          const clients = (args?.clients as ClientAccount[]) || [];
          const approvals = (args?.approvals as ApprovalItem[]) || [];
          const target = Number(args?.goalAmount || 25000);
          const founderName = String(args?.founderName || "Shlok");

          const metrics = computeTodayMetrics(invoices, clients, leads, approvals, target);
          const nextAction = determineNextAction(clients, leads, approvals);
          const briefing = generateMorningBriefing(metrics, founderName);

          return { metrics, nextAction, briefing };
        }
        default:
          throw new Error(`[daily-plan] Unknown capability: ${capability}`);
      }
    },
  },
};

export default skill;

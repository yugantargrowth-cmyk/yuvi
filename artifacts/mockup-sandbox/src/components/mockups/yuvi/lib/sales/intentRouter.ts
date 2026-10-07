// sales/intentRouter.ts — Daily Conversational Intent Router for YUVI Chat Command Center
import type { NormalizedLead, CallQueueItem, DailySalesReport } from "../types/sales";

export type DailyCommandIntent =
  | "RUN_SALES_ENGINE"
  | "GET_TODAYS_CALLS"
  | "PREPARE_OUTREACH"
  | "PREPARE_WHATSAPP"
  | "PREPARE_EMAILS"
  | "FOLLOW_UP_LEADS"
  | "SHOW_HOT_LEADS"
  | "SHOW_CALLBACKS"
  | "WHAT_SHOULD_I_DO_TODAY"
  | "GET_SALES_REPORT"
  | "UNKNOWN";

/**
 * Detects command intent from user message.
 */
export function detectDailyIntent(message: string): DailyCommandIntent {
  const m = message.toLowerCase().trim();

  if (
    m.includes("work on my leads") ||
    m.includes("run the sales engine") ||
    m.includes("run sales engine") ||
    m.includes("process my leads") ||
    m.includes("start sprint")
  ) {
    return "RUN_SALES_ENGINE";
  }

  if (
    m.includes("todays call") ||
    m.includes("today's call") ||
    m.includes("call list") ||
    m.includes("who to call") ||
    m.includes("give me calls") ||
    m.includes("calls today")
  ) {
    return "GET_TODAYS_CALLS";
  }

  if (m.includes("whatsapp")) {
    return "PREPARE_WHATSAPP";
  }

  if (m.includes("prepare email") || m.includes("draft email")) {
    return "PREPARE_EMAILS";
  }

  if (
    m.includes("prepare outreach") ||
    m.includes("todays outreach") ||
    m.includes("today's outreach") ||
    m.includes("draft outreach")
  ) {
    return "PREPARE_OUTREACH";
  }

  if (m.includes("follow up") || m.includes("yesterdays leads") || m.includes("yesterday's leads")) {
    return "FOLLOW_UP_LEADS";
  }

  if (m.includes("hot lead") || m.includes("tier a") || m.includes("high priority lead") || m.includes("top lead")) {
    return "SHOW_HOT_LEADS";
  }

  if (m.includes("callback") || m.includes("who needs a call")) {
    return "SHOW_CALLBACKS";
  }

  if (
    m.includes("what should i do today") ||
    m.includes("todays priority") ||
    m.includes("today's priority") ||
    m.includes("daily brief") ||
    m.includes("what to do")
  ) {
    return "WHAT_SHOULD_I_DO_TODAY";
  }

  if (m.includes("sales report") || m.includes("todays report") || m.includes("today's report") || m.includes("performance report")) {
    return "GET_SALES_REPORT";
  }

  return "UNKNOWN";
}

/**
 * Generates immediate executive response for matched daily commands.
 */
export function handleDailyCommand(
  intent: DailyCommandIntent,
  data: {
    leads: NormalizedLead[];
    callQueue: CallQueueItem[];
    report?: DailySalesReport;
    onTriggerEngine?: () => void;
  },
): { handled: boolean; replyText: string; viewToOpen?: string } {
  const { leads, callQueue, report } = data;

  switch (intent) {
    case "RUN_SALES_ENGINE": {
      if (data.onTriggerEngine) data.onTriggerEngine();
      return {
        handled: true,
        replyText: `🚀 **Sales Engine Triggered**\n\nOperator, Scout, and Researcher are initiating the daily pipeline run. Raw leads are being normalized, deduplicated against memory, scored across Gujarat commercial tiers, and enriched. Outreach drafts and call lists are staging now. Check the **Dashboard** and **Approvals** tab.`,
        viewToOpen: "Dashboard",
      };
    }

    case "GET_TODAYS_CALLS": {
      const pendingCalls = callQueue.filter((c) => c.callStatus === "PENDING");
      if (pendingCalls.length === 0) {
        return {
          handled: true,
          replyText: `📞 **Today's Call Queue is Clear**\n\nNo pending phone calls in the queue right now. You can upload a new lead sheet in **Leads** or tell me to "Run the sales engine" to discover new opportunities.`,
          viewToOpen: "Leads",
        };
      }

      const list = pendingCalls
        .slice(0, 5)
        .map(
          (c, i) =>
            `${i + 1}. **${c.companyName}** (${c.contactPerson}) — Priority: \`${c.priority}\`\n   • Phone: \`${c.phone}\`\n   • Angle: ${c.reason}\n   • Talking Point: ${c.talkingPoints[2] || c.talkingPoints[0]}`,
        )
        .join("\n\n");

      return {
        handled: true,
        replyText: `📞 **Today's Prioritized Call Queue (${pendingCalls.length} calls due)**\n\n${list}\n\n💡 *Tip: Click-to-call links and outcome recording are available in your Dashboard and Leads views.*`,
        viewToOpen: "Leads",
      };
    }

    case "PREPARE_OUTREACH":
    case "PREPARE_WHATSAPP":
    case "PREPARE_EMAILS": {
      const staged = leads.filter((l) => l.approvalStatus === "PENDING_APPROVAL" && l.tier !== "D");
      if (staged.length === 0) {
        return {
          handled: true,
          replyText: `✉️ **Outreach Staging**\n\nNo unapproved drafts currently waiting. All generated drafts have either been reviewed or no new leads have been imported today. Tell me to "Run the sales engine" or import a CSV to generate a new batch.`,
          viewToOpen: "Approvals",
        };
      }

      const sample = staged[0];
      const preview =
        intent === "PREPARE_EMAILS"
          ? `**Email to ${sample.companyName}:**\nSubject: ${sample.outreachDrafts?.email?.subject}\n\n${sample.outreachDrafts?.email?.body.slice(0, 200)}...`
          : `**WhatsApp Draft for ${sample.companyName}:**\n${sample.outreachDrafts?.whatsapp?.slice(0, 220)}...`;

      return {
        handled: true,
        replyText: `✉️ **${staged.length} Personalized Outreach Drafts Ready for Review**\n\nDrafts adhere to the 3-part conversion architecture (Observation + Value Offer + Low-Friction CTA).\n\n**Preview Sample:**\n${preview}\n\n🔒 *Hunter will NOT send external messages until you explicitly approve them in the Approvals queue.*`,
        viewToOpen: "Approvals",
      };
    }

    case "SHOW_HOT_LEADS": {
      const hot = leads.filter((l) => l.tier === "A" || l.score >= 80);
      if (hot.length === 0) {
        return {
          handled: true,
          replyText: `🔥 **Hot Leads Radar**\n\nNo Tier A leads recorded yet. Import your lead sheet or tell me to run the sales engine to score and qualify prospects.`,
          viewToOpen: "Leads",
        };
      }

      const list = hot
        .slice(0, 6)
        .map(
          (l, i) =>
            `${i + 1}. **${l.companyName}** (${l.city}) — Score: \`${l.score}\` | Tier: \`A\`\n   • Contact: ${l.contactPerson || "Founder"} | Phone: \`${l.phone || "N/A"}\`\n   • Key Bottleneck: ${l.bottleneck || "Conversion architecture"}`,
        )
        .join("\n\n");

      return {
        handled: true,
        replyText: `🔥 **Top Hot Leads (Tier A Priority Commercial Opportunities)**\n\n${list}\n\nThese represent your highest-probability outbound engagements in the Gujarat cluster.`,
        viewToOpen: "Leads",
      };
    }

    case "SHOW_CALLBACKS":
    case "FOLLOW_UP_LEADS": {
      const callbacks = leads.filter((l) => l.status === "CALLBACK" || l.status === "REPLIED");
      if (callbacks.length === 0) {
        return {
          handled: true,
          replyText: `🔄 **Follow-up & Callback Queue**\n\nNo pending callbacks scheduled for today. All contacted leads are up to date.`,
          viewToOpen: "Pipeline",
        };
      }

      const list = callbacks
        .map(
          (l, i) =>
            `${i + 1}. **${l.companyName}** — Status: \`${l.status}\`\n   • Contact: ${l.contactPerson} (${l.phone})\n   • Next Action: ${l.nextAction?.type || "Follow-up touchpoint"} (Due: ${l.nextAction?.dueDate || "Today"})`,
        )
        .join("\n\n");

      return {
        handled: true,
        replyText: `🔄 **Active Follow-Ups & Callbacks (${callbacks.length} due)**\n\n${list}`,
        viewToOpen: "Pipeline",
      };
    }

    case "WHAT_SHOULD_I_DO_TODAY": {
      const pendingCalls = callQueue.filter((c) => c.callStatus === "PENDING").length;
      const pendingAppvs = leads.filter((l) => l.approvalStatus === "PENDING_APPROVAL" && l.tier !== "D").length;
      const hotCount = leads.filter((l) => l.tier === "A").length;

      return {
        handled: true,
        replyText: `🎯 **Founder Daily Operating Brief — ${new Date().toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}**\n\nHere are your three core revenue-producing priorities today:\n\n1. **Calls Queue:** You have **${pendingCalls} prioritized calls due** today. Focus on the Tier A targets first.\n2. **Approval Gate:** **${pendingAppvs} personalized outreach drafts** are staged in Approvals for your review.\n3. **Pipeline Velocity:** **${hotCount} Tier A hot leads** are active in your Gujarat market corridor.\n\nType "Give me todays calls" or "Prepare todays outreach" to execute.`,
        viewToOpen: "Dashboard",
      };
    }

    case "GET_SALES_REPORT": {
      if (report) {
        return {
          handled: true,
          replyText: `📊 **Daily Sales Engine Report — ${report.date}**\n\n${report.executiveSummary}\n\n**Key Telemetry:**\n• Total Leads in Radar: **${report.metrics.totalLeads}**\n• Qualified Leads (Tier A & B): **${report.metrics.qualifiedLeads}**\n• Calls Due Today: **${report.metrics.callsDue}**\n• Outreach Pending Approval: **${report.pendingApprovalsCount}**\n• Opportunities / Interested: **${report.metrics.meetingsOpportunities}**\n\n**Analyst Focus Recommendations:**\n${report.recommendedFocus.map((r) => `• ${r}`).join("\n")}`,
          viewToOpen: "Reports",
        };
      }

      return {
        handled: true,
        replyText: `📊 **Sales Report**\n\nRun the Sales Engine first by uploading your lead sheet or saying "Work on my leads today" to compile the latest analytics.`,
        viewToOpen: "Dashboard",
      };
    }

    default:
      return { handled: false, replyText: "" };
  }
}

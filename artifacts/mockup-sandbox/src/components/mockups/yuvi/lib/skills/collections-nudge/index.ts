// lib/skills/collections-nudge/index.ts — Collections & Advance Reminder Skill
import type { SkillModule } from "../types";
import type { ClientInvoice } from "../../types/sales";
import { buildUpiUri } from "../../finance/upiEngine";

const skill: SkillModule = {
  manifest: {
    id: "collections-nudge",
    name: "Collections & Advance Nudge",
    version: "1.0.0",
    description: "Monitors overdue invoices and pending project advances, drafting respectful WhatsApp payment reminders.",
    category: "finance",
    icon: "💰",
    dependencies: [],
    capabilities: ["collections-nudge.check-overdue", "collections-nudge.draft-nudge"],
  },
  api: {
    execute(capability: string, args?: Record<string, unknown>) {
      switch (capability) {
        case "collections-nudge.check-overdue": {
          const invoices = (args?.invoices as ClientInvoice[]) || [];
          return invoices.filter((i) => i.status === "OVERDUE");
        }
        case "collections-nudge.draft-nudge": {
          const invoice = args?.invoice as ClientInvoice;
          const founderName = String(args?.founderName || "Shlok");
          if (!invoice) throw new Error("[collections-nudge] 'invoice' parameter required");

          const balance = invoice.balanceDue || invoice.totalAmount;
          const upiLink = buildUpiUri({
            amount: balance,
            note: `Invoice ${invoice.invoiceNumber}`,
            transactionRef: invoice.id,
          });

          const message = `Namaste ${invoice.clientName}, ${founderName} here from Yugantar Growth. Hope your week is going great!\n\nJust a quick, polite note regarding Invoice #${invoice.invoiceNumber} (₹${balance.toLocaleString("en-IN")}) which was due on ${invoice.dueDate}.\n\nYou can easily complete this via 1-click UPI here: ${upiLink || "Payment Link"}\n\nPlease let me know once completed. Thank you for your partnership!`;

          return { invoiceId: invoice.id, clientName: invoice.clientName, balance, message, upiLink };
        }
        default:
          throw new Error(`[collections-nudge] Unknown capability: ${capability}`);
      }
    },
  },
};

export default skill;

// lib/outreach/objectionBank.ts — Indian B2B Objection Handling Framework
// Formulates culturally grounded, low-friction responses for Gujarat/Indian commercial founders.

import type { NormalizedLead } from "../types/sales";

export type ObjectionCategory =
  | "ALREADY_HAVE_AGENCY"
  | "SEND_PROFILE"
  | "BUDGET_HIGH"
  | "CALL_LATER"
  | "NOT_INTERESTED";

export interface ObjectionTemplate {
  key: ObjectionCategory;
  title: string;
  clientObjection: string;
  responseScript: string;
  talkingPoints: string[];
}

export const OBJECTION_BANK: Record<ObjectionCategory, ObjectionTemplate> = {
  ALREADY_HAVE_AGENCY: {
    key: "ALREADY_HAVE_AGENCY",
    title: "Existing Agency / In-House Developer",
    clientObjection: "Humare paas already agency ya website developer hai.",
    responseScript:
      "Bilkul samajh sakta hoon. Hum {companyName} ki existing agency ko replace karne nahi keh rahe. Hum sirf mobile conversion architecture (sub-2.0s load aur 1-click WhatsApp lead concierge) optimize karte hain taaki unke dwara laye gaye visitors me se 50% bounce na ho. Ek baar 1-page diagnostic roadmap dekh lijiye, pasand aaye toh existing team ke sath bhi share kar sakte hain.",
    talkingPoints: [
      "Complementary speed optimization layer, not replacing branding agency",
      "Specialized in sub-2s mobile latency and WhatsApp direct conversion",
      "No disruption to existing branding or hosting operations",
    ],
  },
  SEND_PROFILE: {
    key: "SEND_PROFILE",
    title: "Send Company Profile / Credentials First",
    clientObjection: "Apna company profile / work portfolio bhej dijiye pehle.",
    responseScript:
      "Zaroor! Generic PDF brochure bhejne ke bajaye humne specifically {companyName} ke liye 1-page digital bottleneck audit banaya hai jisme live load latency aur WhatsApp booking friction points mapped hain. Yahan WhatsApp pe share kar raha hoon — ek baar check karke batayiye kaunsa angle sabse relevant laga.",
    talkingPoints: [
      "Avoids generic agency brochure spam",
      "Sends client-specific 1-page audit instead",
      "Immediate conversational bridge back to WhatsApp",
    ],
  },
  BUDGET_HIGH: {
    key: "BUDGET_HIGH",
    title: "Budget Resistance / Advance Payment Hesitation",
    clientObjection: "Budget thoda zyada hai / Hum advance nahi dete.",
    responseScript:
      "Valid concern hai. Par sochiye: abhi mobile latency aur missing WhatsApp CTA ki wajah se har hafte kitne high-intent commercial clients drop ho rahe hain? ₹25,000 ka fixed 48-hour sprint 48 ghante me deploy hota hai aur sirf 1-2 extra corporate leads me hi poora investment recover ho jata hai. Advance gate humare dedicated 48-hour turn-around guarantee ke liye standard protocol hai.",
    talkingPoints: [
      "Anchor price against lost client inquiry value",
      "₹25,000 48h sprint pays for itself on first closed deal",
      "Advance gate strictly guarantees 48-hour delivery timeline",
    ],
  },
  CALL_LATER: {
    key: "CALL_LATER",
    title: "Timing Delay / After Festival Follow-up",
    clientObjection: "Abhi busy hoon / Agle mahine ya Diwali ke baad baat karte hain.",
    responseScript:
      "Samajh gaya! Calendar me mark kar diya hai next month ke liye. Tab tak ke liye humne aapke competitor benchmark aur mobile leaks ka 1-page sheet WhatsApp pe preserve kiya hai taaki festive rush me koi inquiry leak na ho. Agle mahine connect karte hain!",
    talkingPoints: [
      "Respect founder time without being pushy",
      "Drop value-add benchmark note to keep lead warm",
      "Set explicit callback date in CRM",
    ],
  },
  NOT_INTERESTED: {
    key: "NOT_INTERESTED",
    title: "General Disinterest / Passive Word-of-Mouth",
    clientObjection: "Humara kaam word of mouth se chalta hai, digital ki zaroorat nahi.",
    responseScript:
      "Word of mouth sabse strong foundation hai. Humare 90% clients bhi word-of-mouth pe hi depend karte hain. Par jab unka word-of-mouth reference smartphone pe unka website ya portfolio open karta hai, toh sub-2s speed aur direct WhatsApp contact unhe instantly impress karta hai. Closing the loop for now, all the best!",
    talkingPoints: [
      "Validate word-of-mouth as top acquisition channel",
      "Show how fast digital touchpoint validates word-of-mouth references",
      "Graceful, zero-pressure closure",
    ],
  },
};

export const INDIAN_B2B_OBJECTIONS = OBJECTION_BANK;

/**
 * Retrieves personalized objection response with company name interpolated.
 */
export function getObjectionScript(category: ObjectionCategory, lead: NormalizedLead): string {
  const template = OBJECTION_BANK[category] || OBJECTION_BANK.NOT_INTERESTED;
  return template.responseScript.replace(/{companyName}/g, lead.companyName);
}

/**
 * Flexible interpolator taking either a lead or param object
 */
export function getObjectionResponse(
  category: ObjectionCategory,
  params: { prospectName?: string; companyName?: string; bottleneck?: string } | NormalizedLead
): string {
  const template = OBJECTION_BANK[category] || OBJECTION_BANK.NOT_INTERESTED;
  let text = template.responseScript;
  const company = "companyName" in params ? params.companyName : (params as any).companyName;
  const contact = "prospectName" in params ? params.prospectName : (params as any).contactPerson;

  if (company) text = text.replace(/{companyName}/g, company);
  if (contact && !text.includes(contact)) {
    text = `Namaste ${contact}, ` + text.charAt(0).toLowerCase() + text.slice(1);
  }
  return text;
}

// sales/csvParser.ts — Robust CSV/TSV Parser, Column Mapper & Multi-Factor Deduplication Engine

import type { NormalizedLead, DedupeReport, DedupeReportItem } from "../types/sales";
import { formatWhatsAppPhone } from "../outreach/hunterOutreach";
import { normalizeWebsite, normalizeName, generateDeterministicLeadId } from "./salesEngine";

export interface RawParsedLead {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  websiteUrl: string;
  address?: string;
  city: string;
  state: string;
  country: string;
  industry: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  mapsUrl?: string;
  instagram?: string;
  notes: string;
  estimatedValue?: string;
  rawRecord: Record<string, unknown>;
}

export interface ParseResult {
  success: boolean;
  leads: RawParsedLead[];
  totalRows: number;
  validRows: number;
  skippedRows: number;
  detectedColumns: Record<string, string>;
  warnings: string[];
  errors: string[];
}

/**
 * Splits delimited text respecting quotes and escaping.
 */
export function parseDelimitedText(text: string, delimiter: string = ","): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === delimiter && !insideQuote) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuote) {
      if (char === "\r" && nextChar === "\n") {
        i++; // skip \r\n
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Detects delimiter (comma, tab, semicolon).
 */
export function detectDelimiter(headerLine: string): string {
  const tabs = (headerLine.match(/\t/g) || []).length;
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;

  if (tabs > commas && tabs > semicolons) return "\t";
  if (semicolons > commas && semicolons > tabs) return ";";
  return ",";
}

/**
 * Maps fuzzy column headers to canonical lead fields.
 */
export function identifyColumnField(header: string): string | null {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Specific contact & channel identifiers first
  if (h.includes("email") || h.includes("mail")) {
    return "email";
  }
  if (
    h.includes("phone") ||
    h.includes("mobile") ||
    h.includes("cell") ||
    h.includes("whatsapp") ||
    h.includes("telephone") ||
    h.includes("tel") ||
    h === "contactnumber"
  ) {
    return "phone";
  }
  if (h.includes("rating") || h.includes("star") || h.includes("score")) {
    return "rating";
  }
  if (h.includes("review")) {
    return "reviewCount";
  }
  if (h.includes("map") || h.includes("place") || h.includes("gmb")) {
    return "mapsUrl";
  }
  if (h.includes("insta") || h.includes("ig")) {
    return "instagram";
  }
  if (h.includes("website") || h.includes("site") || h.includes("domain") || h.includes("url") || h.includes("web") || h === "link") {
    return "websiteUrl";
  }
  if (h.includes("address") || h.includes("street") || h.includes("road") || h.includes("locality")) {
    return "address";
  }
  if (h.includes("city") || h.includes("town")) {
    return "city";
  }
  if (h.includes("state") || h.includes("province") || h.includes("region")) {
    return "state";
  }
  if (h.includes("country") || h.includes("nation")) {
    return "country";
  }
  if (h.includes("category") || h.includes("industry") || h.includes("sector") || h.includes("niche") || h.includes("businesstype")) {
    return "category";
  }
  if (
    h.includes("contact") ||
    h.includes("person") ||
    h.includes("founder") ||
    h.includes("owner") ||
    h.includes("director") ||
    h.includes("decisionmaker") ||
    h === "leadname" ||
    h === "fullname"
  ) {
    return "contactPerson";
  }
  if (h.includes("notes") || h.includes("comment") || h.includes("description") || h.includes("remark")) {
    return "notes";
  }
  if (h.includes("value") || h.includes("deal") || h.includes("budget") || h.includes("revenue")) {
    return "estimatedValue";
  }
  if (
    h.includes("company") ||
    h.includes("organization") ||
    h.includes("org") ||
    h.includes("business") ||
    h.includes("firm") ||
    h.includes("agency") ||
    h.includes("client") ||
    h.includes("studio") ||
    h.includes("title") ||
    (h === "name" && !h.includes("contact") && !h.includes("person"))
  ) {
    return "companyName";
  }
  return null;
}

/**
 * Returns header preview and detected columns for the CSV Import Wizard.
 */
export function getCSVPreview(rawContent: string, maxRows: number = 10): {
  headers: string[];
  previewRows: string[][];
  detectedMapping: Record<string, string>;
  totalEstimatedRows: number;
} {
  if (!rawContent || !rawContent.trim()) {
    return { headers: [], previewRows: [], detectedMapping: {}, totalEstimatedRows: 0 };
  }

  const delimiter = detectDelimiter(rawContent.split(/\r?\n/)[0] || "");
  const allRows = parseDelimitedText(rawContent.trim(), delimiter);
  if (allRows.length === 0) {
    return { headers: [], previewRows: [], detectedMapping: {}, totalEstimatedRows: 0 };
  }

  const headers = allRows[0];
  const detectedMapping: Record<string, string> = {};

  headers.forEach((h) => {
    const identified = identifyColumnField(h);
    if (identified) {
      detectedMapping[h] = identified;
    }
  });

  const previewRows = allRows.slice(1, maxRows + 1);

  return {
    headers,
    previewRows,
    detectedMapping,
    totalEstimatedRows: allRows.length - 1,
  };
}

/**
 * Parses raw CSV/TSV content using automatic or user-defined column mapping.
 */
export function parseLeadSheet(
  rawContent: string,
  customMapping?: Record<string, string>,
): ParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!rawContent || !rawContent.trim()) {
    return {
      success: false,
      leads: [],
      totalRows: 0,
      validRows: 0,
      skippedRows: 0,
      detectedColumns: {},
      warnings,
      errors: ["Uploaded file is empty or contains no readable text."],
    };
  }

  const delimiter = detectDelimiter(rawContent.split(/\r?\n/)[0] || "");
  const rows = parseDelimitedText(rawContent.trim(), delimiter);

  if (rows.length < 2) {
    return {
      success: false,
      leads: [],
      totalRows: rows.length,
      validRows: 0,
      skippedRows: rows.length,
      detectedColumns: {},
      warnings,
      errors: ["File must have at least one header row and one data row."],
    };
  }

  const headers = rows[0];
  const activeMapping: Record<number, string> = {};
  const detectedColumns: Record<string, string> = {};

  headers.forEach((header, index) => {
    let targetField: string | null = null;
    if (customMapping && customMapping[header]) {
      targetField = customMapping[header];
    } else {
      targetField = identifyColumnField(header);
    }

    if (targetField && targetField !== "ignore") {
      activeMapping[index] = targetField;
      detectedColumns[header] = targetField;
    }
  });

  if (!Object.values(activeMapping).includes("companyName")) {
    const fallbackIdx = Object.keys(activeMapping).length > 0 ? Number(Object.keys(activeMapping)[0]) : 0;
    activeMapping[fallbackIdx] = "companyName";
    detectedColumns[headers[fallbackIdx]] = "companyName";
    warnings.push(`No explicit 'Company' header found; using '${headers[fallbackIdx]}' as company name.`);
  }

  const dataRows = rows.slice(1);
  const parsedLeads: RawParsedLead[] = [];
  let skippedCount = 0;

  dataRows.forEach((row) => {
    const rawRecord: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      rawRecord[h] = row[i] || "";
    });

    const lead: Partial<RawParsedLead> = {
      companyName: "",
      contactPerson: "",
      phone: "",
      email: "",
      websiteUrl: "",
      address: "",
      city: "Ahmedabad",
      state: "Gujarat",
      country: "India",
      industry: "General Business",
      category: "Business",
      notes: "",
      rawRecord,
    };

    row.forEach((cellValue, cellIndex) => {
      const field = activeMapping[cellIndex];
      if (field && cellValue) {
        if (field === "rating") {
          const num = parseFloat(cellValue);
          lead.rating = isNaN(num) ? undefined : num;
        } else if (field === "reviewCount") {
          const num = parseInt(cellValue.replace(/[^\d]/g, ""), 10);
          lead.reviewCount = isNaN(num) ? undefined : num;
        } else {
          (lead as Record<string, unknown>)[field] = cellValue.trim();
        }
      }
    });

    const comp = (lead.companyName || "").trim();
    const cont = (lead.contactPerson || "").trim();

    if (!comp && !cont) {
      skippedCount++;
      return;
    }

    if (!comp && cont) {
      lead.companyName = cont;
    }

    parsedLeads.push(lead as RawParsedLead);
  });

  return {
    success: parsedLeads.length > 0,
    leads: parsedLeads,
    totalRows: dataRows.length,
    validRows: parsedLeads.length,
    skippedRows: skippedCount,
    detectedColumns,
    warnings,
    errors,
  };
}

/**
 * Strips domain down to root hostname for duplicate detection.
 */
export function normalizeDomainForDedupe(url?: string): string {
  if (!url) return "";
  let clean = url.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, "").replace(/^www\./, "");
  return clean.split("/")[0].trim();
}

/**
 * Normalizes company name for fuzzy matching.
 */
export function normalizeNameForDedupe(name?: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\b(pvt|ltd|limited|private|llp|inc|co|company|studio|services)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Multi-factor deduplication engine:
 * 1. Normalizes phone to 91XXXXXXXXXX
 * 2. Matches by Phone OR Website Domain OR Fuzzy Name + Address
 * 3. Merges missing fields into canonical lead
 * 4. Produces transparent DedupeReport (kept / merged / dropped with reasons)
 */
export function deduplicateLeads(rawLeads: RawParsedLead[]): {
  cleanLeads: NormalizedLead[];
  report: DedupeReport;
} {
  const items: DedupeReportItem[] = [];
  const cleanLeads: NormalizedLead[] = [];

  const phoneMap = new Map<string, NormalizedLead>();
  const domainMap = new Map<string, NormalizedLead>();
  const nameMap = new Map<string, NormalizedLead>();

  let totalKept = 0;
  let totalMerged = 0;
  let totalDropped = 0;

  for (const raw of rawLeads) {
    const rawPhone = (raw.phone || "").trim();
    const normalizedPhone = formatWhatsAppPhone(rawPhone);
    const domain = normalizeDomainForDedupe(raw.websiteUrl);
    const fuzzyName = normalizeNameForDedupe(raw.companyName);

    // Check for existing duplicate match
    let match: NormalizedLead | undefined;
    let matchReason = "";

    if (normalizedPhone && phoneMap.has(normalizedPhone)) {
      match = phoneMap.get(normalizedPhone);
      matchReason = `Identical normalized phone number (${normalizedPhone})`;
    } else if (domain && domainMap.has(domain)) {
      match = domainMap.get(domain);
      matchReason = `Identical website domain (${domain})`;
    } else if (fuzzyName && fuzzyName.length > 4 && nameMap.has(fuzzyName)) {
      match = nameMap.get(fuzzyName);
      matchReason = `High name similarity match ('${raw.companyName}' matches '${match?.companyName}')`;
    }

    if (match) {
      // Duplicate found: Merge valuable fields if missing in canonical
      let fieldMerged = false;
      if (!match.email && raw.email) {
        match.email = raw.email.trim();
        fieldMerged = true;
      }
      if (!match.websiteUrl && raw.websiteUrl) {
        match.websiteUrl = normalizeWebsite(raw.websiteUrl);
        fieldMerged = true;
      }
      if (!match.contactPerson && raw.contactPerson) {
        match.contactPerson = normalizeName(raw.contactPerson);
        fieldMerged = true;
      }
      if (!match.address && raw.address) {
        match.address = raw.address.trim();
        fieldMerged = true;
      }
      if (!match.rating && raw.rating) {
        match.rating = raw.rating;
        fieldMerged = true;
      }
      if (!match.reviewCount && raw.reviewCount) {
        match.reviewCount = raw.reviewCount;
        fieldMerged = true;
      }
      if (!match.mapsUrl && raw.mapsUrl) {
        match.mapsUrl = raw.mapsUrl.trim();
        fieldMerged = true;
      }
      if (!match.instagram && raw.instagram) {
        match.instagram = raw.instagram.trim();
        fieldMerged = true;
      }

      if (fieldMerged) {
        totalMerged++;
        items.push({
          id: `drop-${items.length + 1}`,
          companyName: raw.companyName,
          phone: normalizedPhone || rawPhone,
          action: "merged",
          reason: `Merged into '${match.companyName}' (${match.id}): ${matchReason}`,
          mergedWithId: match.id,
        });
      } else {
        totalDropped++;
        items.push({
          id: `drop-${items.length + 1}`,
          companyName: raw.companyName,
          phone: normalizedPhone || rawPhone,
          action: "dropped",
          reason: `Exact redundant duplicate of '${match.companyName}' (${match.id}): ${matchReason}`,
          mergedWithId: match.id,
        });
      }
    } else {
      // Canonical unique lead
      totalKept++;
      const leadId = generateDeterministicLeadId(raw.companyName, normalizedPhone || raw.websiteUrl || `lead-${cleanLeads.length + 1}`);

      const lead: NormalizedLead = {
        id: leadId,
        companyName: normalizeName(raw.companyName),
        contactPerson: normalizeName(raw.contactPerson || ""),
        phone: normalizedPhone || rawPhone,
        email: (raw.email || "").trim(),
        websiteUrl: raw.websiteUrl ? normalizeWebsite(raw.websiteUrl) : "",
        address: raw.address || "",
        city: raw.city || "Ahmedabad",
        state: raw.state || "Gujarat",
        country: raw.country || "India",
        industry: raw.industry || raw.category || "Commercial",
        category: raw.category || raw.industry || "General",
        status: "NEW",
        score: 70,
        tier: "B",
        notes: raw.notes || "",
        rating: raw.rating,
        reviewCount: raw.reviewCount,
        mapsUrl: raw.mapsUrl,
        instagram: raw.instagram,
        rawRecord: raw.rawRecord || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        recommendedChannel: normalizedPhone ? "WHATSAPP" : "EMAIL",
        verifiedClaims: [],
      };

      cleanLeads.push(lead);

      if (normalizedPhone) phoneMap.set(normalizedPhone, lead);
      if (domain) domainMap.set(domain, lead);
      if (fuzzyName && fuzzyName.length > 4) nameMap.set(fuzzyName, lead);

      items.push({
        id: leadId,
        companyName: lead.companyName,
        phone: lead.phone,
        action: "kept",
        reason: "Unique canonical prospect record",
      });
    }
  }

  const report: DedupeReport = {
    totalInput: rawLeads.length,
    totalKept,
    totalMerged,
    totalDropped,
    items,
  };

  return { cleanLeads, report };
}

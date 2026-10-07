// sales/csvParser.ts — Robust CSV/TSV/Spreadsheet Parser with Column Normalization & Validation

export interface RawParsedLead {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  websiteUrl: string;
  city: string;
  state: string;
  country: string;
  industry: string;
  category: string;
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
function parseDelimitedText(text: string, delimiter: string = ","): string[][] {
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
function detectDelimiter(headerLine: string): string {
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
function identifyColumnField(header: string): string | null {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (["company", "companyname", "organization", "business", "businessname", "firm", "agency", "client", "studio"].includes(h)) {
    return "companyName";
  }
  if (["contact", "contactperson", "person", "founder", "owner", "leadname", "fullname", "name", "director", "decisionmaker"].includes(h)) {
    return "contactPerson";
  }
  if (["phone", "phonenumber", "mobile", "mobilenumber", "contactnumber", "whatsapp", "telephone", "cell"].includes(h)) {
    return "phone";
  }
  if (["email", "emailaddress", "mail", "contactemail"].includes(h)) {
    return "email";
  }
  if (["website", "websiteurl", "url", "domain", "site", "web", "link"].includes(h)) {
    return "websiteUrl";
  }
  if (["city", "location", "place", "area", "town"].includes(h)) {
    return "city";
  }
  if (["state", "province", "region"].includes(h)) {
    return "state";
  }
  if (["country", "nation"].includes(h)) {
    return "country";
  }
  if (["category", "industry", "type", "businesstype", "niche", "sector"].includes(h)) {
    return "category";
  }
  if (["notes", "note", "comment", "comments", "description", "details", "remark", "remarks"].includes(h)) {
    return "notes";
  }
  if (["value", "estimatedvalue", "dealsize", "dealvalue", "budget", "revenue"].includes(h)) {
    return "estimatedValue";
  }
  return null;
}

/**
 * Parses raw CSV/TSV string into validated and normalized RawParsedLead records.
 */
export function parseLeadSheet(rawContent: string): ParseResult {
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
  const detectedColumns: Record<string, string> = {};
  const columnIndexMap: Record<number, string> = {};

  headers.forEach((header, index) => {
    const mappedField = identifyColumnField(header);
    if (mappedField) {
      detectedColumns[header] = mappedField;
      columnIndexMap[index] = mappedField;
    }
  });

  if (!Object.values(columnIndexMap).includes("companyName")) {
    // If no explicit company name column found, fallback to first non-empty column or 'contactPerson'
    const fallbackIdx = Object.keys(columnIndexMap).length > 0 ? Number(Object.keys(columnIndexMap)[0]) : 0;
    columnIndexMap[fallbackIdx] = "companyName";
    detectedColumns[headers[fallbackIdx]] = "companyName";
    warnings.push(`No explicit 'Company' header found; using '${headers[fallbackIdx]}' as company name.`);
  }

  const dataRows = rows.slice(1);
  const parsedLeads: RawParsedLead[] = [];
  let skippedCount = 0;

  dataRows.forEach((row, rowIndex) => {
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
      city: "Ahmedabad",
      state: "Gujarat",
      country: "India",
      industry: "General Business",
      category: "Business",
      notes: "",
      rawRecord,
    };

    row.forEach((cellValue, cellIndex) => {
      const field = columnIndexMap[cellIndex];
      if (field && cellValue) {
        (lead as Record<string, unknown>)[field] = cellValue;
      }
    });

    // Validation: Require either companyName or contactPerson, and at least some info
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

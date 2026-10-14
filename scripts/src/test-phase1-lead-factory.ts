// scripts/src/test-phase1-lead-factory.ts — Phase 1 Lead Factory Verification Suite
// Verifies:
// 1. Phone normalization to 91XXXXXXXXXX
// 2. CSV parsing with custom column mapping and 10-row preview
// 3. Multi-factor deduplication and DedupeReport generation
// 4. Knowledge-driven lead triage rules (categories, disqualifiers, score, reasons)
// 5. Ingestion and triage of 500 realistic Gujarat business leads

import { formatWhatsAppPhone } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/outreach/hunterOutreach";
import {
  parseLeadSheet,
  getCSVPreview,
  deduplicateLeads,
  normalizeDomainForDedupe,
  normalizeNameForDedupe,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/csvParser";
import {
  triageLead,
  triageLeadsBatch,
  DEFAULT_TRIAGE_RULESET,
} from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/sales/leadTriageEngine";
import type { NormalizedLead } from "../../artifacts/mockup-sandbox/src/components/mockups/yuvi/lib/types/sales";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
    if (detail) console.error(`    Detail: ${detail}`);
  }
}

async function runLeadFactoryTests() {
  console.log("==================================================================");
  console.log("🧪 STARTING PHASE 1: LEAD FACTORY & TRIAGE VERIFICATION SUITE");
  console.log("==================================================================");

  // 1. Phone Normalization (91XXXXXXXXXX)
  console.log("\n👉 Test Suite 1: Phone Normalization to 91XXXXXXXXXX");
  assert(formatWhatsAppPhone("9825599887") === "919825599887", "10-digit mobile normalizes to 919825599887");
  assert(formatWhatsAppPhone("+91 98255 99887") === "919825599887", "Formatted +91 normalizes to 919825599887");
  assert(formatWhatsAppPhone("098255 99887") === "919825599887", "Leading 0 number normalizes to 919825599887");
  assert(formatWhatsAppPhone("919825599887") === "919825599887", "Existing 12-digit number preserved as 919825599887");
  assert(formatWhatsAppPhone("") === "", "Empty string returns empty string");

  // 2. CSV Parser, Column Auto-Detection & Preview
  console.log("\n👉 Test Suite 2: CSV Import Wizard, Preview & Header Mapping");
  const messyCsv = `Business Title,Contact,Mobile Phone,GMB Stars,Total Reviews,Place URL,Domain Link,Area Address
Dr Patel Aesthetic Clinic,Dr. Aarav Patel,+91 98250 11111,4.8,12,https://maps.google.com/?cid=101,https://drpatelclinic.com,Bodakdev Ahmedabad
Classic Wood Furniture,,9825022222,4.1,45,https://maps.google.com/?cid=102,,SG Highway Ahmedabad
Shree Textile Traders,Kamlesh Shah,09825033333,3.9,8,https://maps.google.com/?cid=103,shreetextiles.in,New Cloth Market Ahmedabad`;

  const preview = getCSVPreview(messyCsv, 2);
  assert(preview.headers.length === 8, `Detected 8 CSV headers (Got: ${preview.headers.length})`);
  assert(preview.previewRows.length === 2, `Extracted 2 preview rows (Got: ${preview.previewRows.length})`);
  assert(preview.detectedMapping["Business Title"] === "companyName", "Auto-detected 'Business Title' as companyName");
  assert(preview.detectedMapping["Mobile Phone"] === "phone", "Auto-detected 'Mobile Phone' as phone");
  assert(preview.detectedMapping["GMB Stars"] === "rating", "Auto-detected 'GMB Stars' as rating");
  assert(preview.detectedMapping["Total Reviews"] === "reviewCount", "Auto-detected 'Total Reviews' as reviewCount");

  const parsed = parseLeadSheet(messyCsv);
  assert(parsed.success === true, "Successfully parsed CSV sheet");
  assert(parsed.leads.length === 3, `Parsed exactly 3 leads (Got: ${parsed.leads.length})`);
  assert(parsed.leads[0].companyName === "Dr Patel Aesthetic Clinic", "Extracted lead 1 company name");
  assert(parsed.leads[0].rating === 4.8, `Extracted rating 4.8 (Got: ${parsed.leads[0].rating})`);
  assert(parsed.leads[0].reviewCount === 12, `Extracted reviewCount 12 (Got: ${parsed.leads[0].reviewCount})`);

  // 3. Multi-Factor Deduplication & Dedupe Report
  console.log("\n👉 Test Suite 3: Multi-Factor Deduplication & Dedupe Report");
  const duplicateCsv = `Company,Phone,Website,Email
Jangid Furniture Studio,+91 98251 44444,https://jangidstudio.com,info@jangid.com
Jangid Furniture Studio,098251 44444,jangidstudio.com,sales@jangid.com
Apex Dental Clinic,9825155555,https://apexdental.com,
Apex Dental,9825199999,apexdental.com/contact,dr@apexdental.com
Unique Textiles,9825166666,https://uniquetextiles.com,`;

  const dupParsed = parseLeadSheet(duplicateCsv);
  const dedupeResult = deduplicateLeads(dupParsed.leads);

  assert(dedupeResult.report.totalInput === 5, "Report records 5 total input rows");
  assert(dedupeResult.report.totalKept === 3, `Report records 3 kept leads (Got: ${dedupeResult.report.totalKept})`);
  assert(
    dedupeResult.report.totalMerged + dedupeResult.report.totalDropped === 2,
    "Report accurately tracks merged/dropped duplicate count",
  );
  assert(dedupeResult.cleanLeads.length === 3, "Output contains exactly 3 clean deduplicated leads");

  // Check that fields were merged (sales@jangid.com merged into first)
  const jangid = dedupeResult.cleanLeads.find((l) => l.companyName.includes("Jangid"));
  assert(jangid !== undefined, "Canonical Jangid lead retained");
  assert(jangid?.phone === "919825144444", `Phone normalized to 91XXXXXXXXXX (Got: ${jangid?.phone})`);

  // 4. Knowledge-Driven Lead Triage Rules & Scoring
  console.log("\n👉 Test Suite 4: Knowledge-Driven Triage Rules & Decision Engine");

  const clinicLead: NormalizedLead = {
    id: "lead-test-clinic",
    companyName: "Bodakdev Smile Dental Clinic",
    contactPerson: "Dr. Mihir Shah",
    phone: "919825077777",
    email: "drmihir@gmail.com",
    websiteUrl: "", // No website
    city: "Ahmedabad",
    state: "Gujarat",
    country: "India",
    industry: "Dental Clinic",
    category: "Specialty Clinic",
    status: "NEW",
    score: 0,
    tier: "C",
    notes: "",
    rating: 4.1,
    reviewCount: 14,
    rawRecord: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    recommendedChannel: "WHATSAPP",
    verifiedClaims: [],
  };

  const clinicTriage = triageLead(clinicLead, DEFAULT_TRIAGE_RULESET);
  assert(clinicTriage.decision === "qualified", `High-value clinic qualifies (Got: ${clinicTriage.decision})`);
  assert(clinicTriage.fitScore >= 70, `Fit score >= 70 (Got: ${clinicTriage.fitScore})`);
  assert(clinicTriage.reasons.length >= 3, `Generated ${clinicTriage.reasons.length} human-readable reasons`);
  assert(
    clinicTriage.reasons.some((r) => r.includes("niche") || r.includes("clinic")),
    "Cites specific target industry niche reason",
  );
  assert(
    clinicTriage.reasons.some((r) => r.includes("No independent website") || r.includes("website")),
    "Cites website opportunity reason",
  );

  // Disqualification test: National corporate chain
  const chainLead: NormalizedLead = {
    ...clinicLead,
    id: "lead-test-apollo",
    companyName: "Apollo Hospitals International",
    category: "Hospital",
  };
  const chainTriage = triageLead(chainLead, DEFAULT_TRIAGE_RULESET);
  assert(chainTriage.decision === "skip", `National chain is skipped (Got: ${chainTriage.decision})`);
  assert(
    chainTriage.reasons.some((r) => r.includes("Disqualified: Recognized national/multinational chain")),
    "Outputs explicit chain disqualification reason",
  );

  // Disqualification test: Closed listing
  const closedLead: NormalizedLead = {
    ...clinicLead,
    id: "lead-test-closed",
    companyName: "Old Heritage Furniture (Permanently Closed)",
    notes: "Google listing marked permanently closed",
  };
  const closedTriage = triageLead(closedLead, DEFAULT_TRIAGE_RULESET);
  assert(closedTriage.decision === "skip", `Closed business is skipped (Got: ${closedTriage.decision})`);

  // Disqualification test: No phone
  const noPhoneLead: NormalizedLead = {
    ...clinicLead,
    id: "lead-test-no-phone",
    phone: "",
  };
  const noPhoneTriage = triageLead(noPhoneLead, DEFAULT_TRIAGE_RULESET);
  assert(noPhoneTriage.decision === "skip", `Lead without phone is skipped (Got: ${noPhoneTriage.decision})`);

  // 5. Ingestion & Triage of 500-Row Dataset
  console.log("\n👉 Test Suite 5: Realistic 500-Lead Batch Ingestion & Top 100 Ranking");

  // Generate 500 realistic scraped leads across Ahmedabad
  const categories = [
    { cat: "Dental Clinic", prefix: "Smile Dental", ind: "Specialty Clinic" },
    { cat: "Aesthetic Center", prefix: "Glow Skin & Laser", ind: "Aesthetic Clinic" },
    { cat: "Furniture Studio", prefix: "Royal Wood Interiors", ind: "Furniture & Decor" },
    { cat: "Coaching Academy", prefix: "Lakshya IIT Academy", ind: "Coaching Institute" },
    { cat: "Textile Trader", prefix: "Sudarshan Silk & Sarees", ind: "Textile Wholesale" },
    { cat: "Corporate Chain", prefix: "Apollo Clinic Franchise", ind: "Corporate Medical" },
    { cat: "Industrial Engineering", prefix: "Gujarat Heavy Fabricators", ind: "Manufacturing" },
    { cat: "General Retail", prefix: "Local Grocery Mart", ind: "Retail Shop" },
  ];

  const syntheticCsvRows = ["Company,Contact,Phone,Website,City,Category,Rating,Reviews"];
  for (let i = 1; i <= 500; i++) {
    const template = categories[i % categories.length];
    const company = `${template.prefix} #${i}`;
    const phone = i % 25 === 0 ? "" : `+91 9825${String(100000 + i).slice(-6)}`;
    const website = i % 3 === 0 ? "" : `https://biz${i}.example.in`;
    const rating = (3.5 + (i % 15) * 0.1).toFixed(1);
    const reviews = (i * 7) % 80;
    syntheticCsvRows.push(`"${company}","Manager ${i}","${phone}","${website}","Ahmedabad","${template.cat}",${rating},${reviews}`);
  }

  const largeCsv = syntheticCsvRows.join("\n");
  const batchParsed = parseLeadSheet(largeCsv);
  assert(batchParsed.leads.length === 500, `Successfully parsed 500 rows (Got: ${batchParsed.leads.length})`);

  const batchDeduped = deduplicateLeads(batchParsed.leads);
  assert(batchDeduped.cleanLeads.length > 400, `Clean leads preserved: ${batchDeduped.cleanLeads.length}`);

  const triagedBatch = triageLeadsBatch(batchDeduped.cleanLeads);
  assert(triagedBatch.length === batchDeduped.cleanLeads.length, "All leads triaged");

  // Verify sorted by fitScore descending
  for (let i = 0; i < 20; i++) {
    const currentScore = triagedBatch[i].triage?.fitScore || 0;
    const nextScore = triagedBatch[i + 1].triage?.fitScore || 0;
    assert(currentScore >= nextScore, `Ranked order preserved: Rank ${i + 1} (${currentScore}) >= Rank ${i + 2} (${nextScore})`);
  }

  // Top 100 selection
  const top100 = triagedBatch.slice(0, 100);
  assert(top100.length === 100, "Successfully selected Top 100 leads for research");
  assert(
    top100.every((l) => l.triage && l.triage.reasons.length > 0),
    "Every top 100 lead has explainable human-readable triage reasons",
  );
  assert(
    top100.every((l) => l.triage?.decision !== "skip"),
    "Zero disqualified 'skip' leads present in Top 100 selection",
  );

  console.log("\n==================================================================");
  console.log(`🎉 PHASE 1 VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) process.exit(1);
}

runLeadFactoryTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

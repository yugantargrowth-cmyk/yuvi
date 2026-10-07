import {
  pgTable,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const leadsTable = pgTable("leads", {
  id: text("id").primaryKey(), // Deterministic lead_id e.g. lead_company_hash
  companyName: text("company_name").notNull(),
  websiteUrl: text("website_url"),
  phone: text("phone"),
  email: text("email"),
  contactPerson: text("contact_person"),
  city: text("city").default("Ahmedabad"),
  state: text("state").default("Gujarat"),
  country: text("country").default("India"),
  industry: text("industry"),
  status: text("status").notNull().default("NEW"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sprintRunsTable = pgTable("sprint_runs", {
  id: text("id").primaryKey(),
  sprintId: text("sprint_id").notNull().unique(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: text("status").notNull().default("RUNNING"),
  totalLeads: integer("total_leads").notNull().default(0),
  processedCount: integer("processed_count").notNull().default(0),
  successfulCount: integer("successful_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
  tierACount: integer("tier_a_count").notNull().default(0),
  tierBCount: integer("tier_b_count").notNull().default(0),
  tierCCount: integer("tier_c_count").notNull().default(0),
  tierDCount: integer("tier_d_count").notNull().default(0),
  pendingApprovalCount: integer("pending_approval_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchMemoryTable = pgTable("research_memory", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull(),
  claim: text("claim").notNull(),
  source: text("source").notNull(),
  sourceType: text("source_type").notNull(),
  confidence: numeric("confidence").notNull(),
  status: text("status").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  isHistorical: boolean("is_historical").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leadAuditsTable = pgTable("lead_audits", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull(),
  websiteUrl: text("website_url"),
  isHttps: boolean("is_https").default(false),
  httpStatus: integer("http_status"),
  hasMobileViewport: boolean("has_mobile_viewport").default(false),
  pageTitle: text("page_title"),
  metaDescription: text("meta_description"),
  detectedPhones: jsonb("detected_phones").default([]),
  detectedWhatsapp: jsonb("detected_whatsapp").default([]),
  detectedEmails: jsonb("detected_emails").default([]),
  hasContactForm: boolean("has_contact_form").default(false),
  trustSignals: jsonb("trust_signals").default([]),
  socialLinks: jsonb("social_links").default({}),
  obviousIssues: jsonb("obvious_issues").default([]),
  auditedAt: timestamp("audited_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leadQualificationsTable = pgTable("lead_qualifications", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull(),
  tier: text("tier").notNull(), // 'A' | 'B' | 'C' | 'D'
  bottleneckIdentified: text("bottleneck_identified").notNull(),
  evidenceClaimRef: text("evidence_claim_ref").notNull(),
  primaryService: text("primary_service").notNull(),
  secondaryService: text("secondary_service"),
  strategicRationale: text("strategic_rationale").notNull(),
  recommendedChannel: text("recommended_channel").notNull(), // 'CALL' | 'WHATSAPP' | 'EMAIL' | 'NONE'
  confidence: numeric("confidence").notNull(),
  qualifiedAt: timestamp("qualified_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const outreachDraftsTable = pgTable("outreach_drafts", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull(),
  channel: text("channel").notNull(),
  messageContent: text("message_content").notNull(),
  callNotes: text("call_notes"),
  keyObservation: text("key_observation").notNull(),
  serviceAngle: text("service_angle").notNull(),
  ctaQuestion: text("cta_question").notNull(),
  deliveryStatus: text("delivery_status").notNull().default("STAGED_DRAFT"),
  draftedAt: timestamp("drafted_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const approvalsTable = pgTable("approvals", {
  id: text("id").primaryKey(),
  approvalToken: text("approval_token").notNull().unique(),
  leadId: text("lead_id").notNull(),
  companyName: text("company_name").notNull(),
  tier: text("tier").notNull(),
  classificationReason: text("classification_reason"),
  evidenceSummary: text("evidence_summary"),
  recommendedService: text("recommended_service"),
  exactMessageVersion: text("exact_message_version"),
  callNotes: text("call_notes"),
  researchTimestamp: timestamp("research_timestamp", { withTimezone: true }).notNull(),
  approvalStatus: text("approval_status").notNull().default("PENDING_APPROVAL"),
  approvedBy: text("approved_by"),
  decisionNotes: text("decision_notes"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const crmTasksTable = pgTable("crm_tasks", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull(),
  taskType: text("task_type").notNull(),
  assignedAgent: text("assigned_agent").notNull().default("Hunter"),
  priority: text("priority").notNull().default("NORMAL"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: text("status").notNull().default("PENDING"),
  briefingNotes: text("briefing_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeeTasksTable = pgTable("employee_tasks", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull(),
  role: text("role").notNull(),
  objective: text("objective").notNull(),
  instructions: text("instructions"),
  context: jsonb("context").default({}),
  input: jsonb("input").default({}),
  output: jsonb("output").default({}),
  tools: jsonb("tools").default([]),
  status: text("status").notNull().default("PENDING"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  lastError: text("last_error"),
  logs: jsonb("logs").default([]),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeeMemoryTable = pgTable("employee_memory", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull(),
  memoryKey: text("memory_key").notNull(),
  memoryValue: jsonb("memory_value").notNull(),
  contextScope: text("context_scope").default("global"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Lead = typeof leadsTable.$inferSelect;
export type InsertLead = typeof leadsTable.$inferInsert;
export type SprintRun = typeof sprintRunsTable.$inferSelect;
export type InsertSprintRun = typeof sprintRunsTable.$inferInsert;
export type ResearchMemory = typeof researchMemoryTable.$inferSelect;
export type LeadAudit = typeof leadAuditsTable.$inferSelect;
export type LeadQualification = typeof leadQualificationsTable.$inferSelect;
export type OutreachDraft = typeof outreachDraftsTable.$inferSelect;
export type Approval = typeof approvalsTable.$inferSelect;
export type CrmTask = typeof crmTasksTable.$inferSelect;
export type EmployeeTaskRecord = typeof employeeTasksTable.$inferSelect;
export type InsertEmployeeTaskRecord = typeof employeeTasksTable.$inferInsert;
export type EmployeeMemoryRecord = typeof employeeMemoryTable.$inferSelect;
export type InsertEmployeeMemoryRecord = typeof employeeMemoryTable.$inferInsert;
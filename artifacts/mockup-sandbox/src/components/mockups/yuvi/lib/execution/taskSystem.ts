// execution/taskSystem.ts — Reusable Employee & Task Execution System
import { emit } from "../eventBus";
import type { EmployeeId, EmployeeTask, TaskLogEntry } from "../types/sales";

export interface EmployeeProfile {
  id: EmployeeId;
  name: string;
  role: string;
  description: string;
  color: string;
  capabilities: string[];
  allowedTools: string[];
  consequentialTools: string[]; // Tools requiring explicit human approval before execution
}

export const EMPLOYEES: Record<EmployeeId, EmployeeProfile> = {
  scout: {
    id: "scout",
    name: "Scout",
    role: "Lead Intelligence",
    description: "Finds, normalizes, researches, enriches, qualifies and scores potential leads.",
    color: "#43e6d0",
    capabilities: [
      "Lead discovery",
      "Company research",
      "Contact research",
      "Enrichment",
      "ICP matching",
      "Lead scoring",
      "Deduplication",
    ],
    allowedTools: ["clean_data", "deduplicate", "score_leads", "normalize_contacts"],
    consequentialTools: [],
  },
  hunter: {
    id: "hunter",
    name: "Hunter",
    role: "Outreach & Follow-up",
    description: "Handles personalized outreach, conversations, follow-ups and lead movement. Never sends unapproved messages.",
    color: "#ff8a65",
    capabilities: [
      "Outreach drafting",
      "Personalization",
      "Follow-up sequences",
      "Reply classification",
      "Lead qualification",
      "Call list generation",
      "Escalation",
    ],
    allowedTools: ["generate_outreach_draft", "create_call_queue", "record_call_outcome", "schedule_followup"],
    consequentialTools: ["send_whatsapp_message", "send_email", "send_sms", "dispatch_direct_message"],
  },
  spark: {
    id: "spark",
    name: "Spark",
    role: "Content Intelligence",
    description: "Creates content strategy and content assets (carousels, posts, scripts).",
    color: "#b16cff",
    capabilities: ["Content strategy", "Ideas", "Posts", "Carousels", "Reels", "Stories", "Captions", "Brand voice"],
    allowedTools: ["generate_copy", "draft_carousel", "outline_proposal"],
    consequentialTools: ["publish_content"],
  },
  publisher: {
    id: "publisher",
    name: "Publisher",
    role: "Distribution",
    description: "Handles content scheduling, publishing and distribution across platforms.",
    color: "#ffc66d",
    capabilities: ["Content calendar", "Scheduling", "Platform formatting", "Publishing status", "Failure handling"],
    allowedTools: ["format_calendar", "check_publishing_queue"],
    consequentialTools: ["publish_to_platform"],
  },
  analyst: {
    id: "analyst",
    name: "Analyst",
    role: "Performance Intelligence",
    description: "Analyzes business, content and campaign performance; surfaces actionable growth insights.",
    color: "#61a6ff",
    capabilities: ["Metrics", "Performance analysis", "Lead conversion analysis", "Reporting", "Recommendations"],
    allowedTools: ["calculate_metrics", "generate_daily_report", "compute_pipeline_velocity"],
    consequentialTools: [],
  },
  operator: {
    id: "operator",
    name: "Operator",
    role: "Business Operations",
    description: "Handles CRM operations, state persistence, approval tokens, duplicate protection, and workflow execution.",
    color: "#8b69ff",
    capabilities: ["CRM operations", "Data entry", "State management", "Audit logging", "Sprint tracking", "Task scheduling"],
    allowedTools: ["persist_lead_state", "create_approval_token", "create_crm_task", "record_sprint_metrics"],
    consequentialTools: ["bulk_delete_records", "overwrite_master_data"],
  },
  researcher: {
    id: "researcher",
    name: "Researcher",
    role: "Deep Research",
    description: "Performs deep company, competitor, market and digital footprint research with verifiable claims.",
    color: "#d59aff",
    capabilities: ["Company research", "Competitor research", "Website inspection", "Digital footprint", "Factual claims synthesis"],
    allowedTools: ["inspect_website_heuristics", "synthesize_evidence_claims", "extract_pain_points"],
    consequentialTools: [],
  },
};

export class TaskExecutionError extends Error {
  constructor(
    message: string,
    public readonly taskId: string,
    public readonly employeeId: EmployeeId,
    public readonly isRetryable: boolean = true,
  ) {
    super(message);
    this.name = "TaskExecutionError";
  }
}

/**
 * Creates a structured EmployeeTask with immutable timestamps, retry state, and logs.
 */
export function createEmployeeTask(params: {
  employeeId: EmployeeId;
  objective: string;
  instructions: string;
  context?: Record<string, unknown>;
  input?: Record<string, unknown>;
  tools?: string[];
  maxRetries?: number;
}): EmployeeTask {
  const profile = EMPLOYEES[params.employeeId];
  if (!profile) {
    throw new Error(`Unknown employee ID: ${params.employeeId}`);
  }

  const taskId = `task_${params.employeeId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const task: EmployeeTask = {
    taskId,
    employeeId: params.employeeId,
    role: profile.role,
    objective: params.objective,
    instructions: params.instructions,
    context: params.context || {},
    input: params.input || {},
    tools: params.tools || profile.allowedTools,
    status: "PENDING",
    timestamps: {
      createdAt: now,
    },
    retryState: {
      retryCount: 0,
      maxRetries: params.maxRetries ?? 3,
    },
    verificationState: {
      verified: false,
    },
    logs: [
      {
        timestamp: now,
        level: "info",
        message: `Task initialized for ${profile.name} (${profile.role}): ${params.objective}`,
      },
    ],
  };

  emit("task.created", { taskId, employeeId: params.employeeId, objective: params.objective });
  return task;
}

/**
 * Appends a log entry to a task and emits an event for UI observers.
 */
export function appendTaskLog(
  task: EmployeeTask,
  level: "info" | "warn" | "error",
  message: string,
): void {
  const entry: TaskLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  task.logs.push(entry);
  emit("task.log", { taskId: task.taskId, employeeId: task.employeeId, level, message });
}

/**
 * Checks whether an action or tool is consequential and requires human approval.
 */
export function isConsequentialAction(employeeId: EmployeeId, toolOrActionName: string): boolean {
  const profile = EMPLOYEES[employeeId];
  if (!profile) return true;
  return profile.consequentialTools.includes(toolOrActionName);
}

// types/sales.ts — Unified types for YUVI OS Sales Engine, AI Employees, and Activepieces Bridge

export type EmployeeId =
  | "scout"
  | "hunter"
  | "spark"
  | "publisher"
  | "analyst"
  | "operator"
  | "researcher";

export type TaskStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "WAITING_APPROVAL"
  | "CANCELLED";

export interface TaskLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}

export interface EmployeeTask {
  taskId: string;
  employeeId: EmployeeId;
  role: string;
  objective: string;
  instructions: string;
  context: Record<string, unknown>;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  tools: string[];
  status: TaskStatus;
  timestamps: {
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
  };
  retryState: {
    retryCount: number;
    maxRetries: number;
    lastError?: string;
  };
  verificationState: {
    verified: boolean;
    verifiedBy?: string;
    verificationNotes?: string;
  };
  logs: TaskLogEntry[];
}

export type LeadTier = "A" | "B" | "C" | "D";

export type LeadStatus =
  | "NEW"
  | "IN_RESEARCH"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "REPLIED"
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "CALLBACK"
  | "WON"
  | "LOST"
  | "NO_RESPONSE"
  | "DISQUALIFIED"
  | "DO_NOT_CONTACT";

export interface NormalizedLead {
  id: string; // Deterministic hash
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
  status: LeadStatus;
  score: number;
  tier: LeadTier;
  notes: string;
  rawRecord: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Research & Qualification
  bottleneck?: string;
  strategicRationale?: string;
  recommendedService?: string;
  primaryService?: string;
  recommendedChannel: "CALL" | "WHATSAPP" | "EMAIL" | "NONE";
  verifiedClaims: string[];
  // Outreach & Call State
  outreachDrafts?: {
    whatsapp?: string;
    email?: { subject: string; body: string };
    sms?: string;
  };
  callQueueItem?: CallQueueItem;
  approvalToken?: string;
  approvalStatus?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "EDITED";
  nextAction?: {
    type: string;
    dueDate: string;
    notes: string;
  };
  // Extended CRM Metadata
  owner?: string;
  source?: string;
  dealValue?: number;
  lastContact?: string;
  tasks?: LeadTask[];
  activityHistory?: LeadActivity[];
}

export interface LeadTask {
  id: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
  assignedTo?: string;
}

export interface LeadActivity {
  id: string;
  timestamp: string;
  action: string;
  note?: string;
  author: string;
}

export interface CallQueueItem {
  id: string;
  leadId: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  priority: "URGENT" | "HIGH" | "NORMAL";
  reason: string;
  talkingPoints: string[];
  clickToCallUrl: string;
  callStatus: "PENDING" | "COMPLETED" | "CALLBACK_REQUESTED" | "NO_ANSWER" | "NOT_INTERESTED";
  outcomeNotes?: string;
  calledAt?: string;
  nextScheduledFollowUp?: string;
}

export interface DailySalesDashboardMetrics {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number; // Tier A + B
  tierBreakdown: { A: number; B: number; C: number; D: number };
  callsDue: number;
  callsCompleted: number;
  outreachDue: number;
  followUpsDue: number;
  replies: number;
  interestedProspects: number;
  meetingsOpportunities: number;
  won: number;
  lost: number;
  pendingActions: number;
}

export interface DailySalesReport {
  date: string;
  metrics: DailySalesDashboardMetrics;
  executiveSummary: string;
  topOpportunities: NormalizedLead[];
  urgentCalls: CallQueueItem[];
  pendingApprovalsCount: number;
  recommendedFocus: string[];
}

export interface ClientDeliverable {
  id: string;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "REVIEW" | "COMPLETED";
  dueDate?: string;
  completedAt?: string;
}

export interface ClientMilestone {
  id: string;
  title: string;
  amount?: number;
  dueDate?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  completedAt?: string;
}

export interface ClientAccount {
  id: string;
  leadId?: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  websiteUrl?: string;
  city: string;
  state: string;
  country: string;
  industry: string;
  status: "ONBOARDING" | "ACTIVE" | "PAUSED" | "COMPLETED";
  engagementType: "MONTHLY_RETAINER" | "FIXED_PROJECT";
  monthlyRetainer?: number; // In INR
  contractValue?: number; // Total contract/project value
  startDate: string;
  endDate?: string;
  agreedScope: string[];
  deliverables: ClientDeliverable[];
  milestones: ClientMilestone[];
  nextAction?: { title: string; dueDate: string };
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface CommercialProposal {
  id: string;
  leadId?: string;
  clientId?: string;
  proposalNumber: string; // e.g. YG-PROP-2026-001
  title: string;
  clientName: string;
  contactPerson: string;
  phone: string;
  email: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  validUntil: string;
  scopeSummary: string;
  items: ProposalItem[];
  subtotal: number;
  taxRate: number; // e.g. 18 for GST
  taxAmount: number;
  totalAmount: number;
  currency: "INR" | "USD";
  timelineWeeks: number;
  paymentTerms: string;
  deliverables: string[];
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoicePaymentRecord {
  id: string;
  amount: number;
  paidAt: string;
  paymentMethod: "UPI" | "NEFT_RTGS" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";
  transactionRef: string;
  notes?: string;
}

export interface ClientInvoice {
  id: string;
  invoiceNumber: string; // e.g. YG-INV-2026-001
  clientId?: string;
  leadId?: string;
  clientName: string;
  contactPerson: string;
  email: string;
  phone: string;
  issueDate: string;
  dueDate: string;
  status: "DRAFT" | "SENT" | "PAID" | "PARTIALLY_PAID" | "OVERDUE";
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number; // e.g. 18 for 18% GST
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currency: "INR" | "USD";
  paymentRecords: InvoicePaymentRecord[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSummary {
  totalInvoiced: number;
  totalCollected: number;
  outstandingBalance: number;
  overdueAmount: number;
  activeRetainersMonthly: number;
  invoicesCount: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
  };
}

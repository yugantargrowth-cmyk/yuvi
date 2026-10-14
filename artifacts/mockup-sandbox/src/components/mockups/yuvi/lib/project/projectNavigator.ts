// lib/project/projectNavigator.ts — 7-Stage Project Delivery Navigator & WIP Engine
// Enforces the 7 linear delivery stages, advance-payment gating,
// and the strict WIP=2 limit on concurrent projects in the BUILD stage.

import { advancePaymentGate, type AdvancePaymentState } from "../finance/upiEngine";

export type ProjectStage =
  | "INTAKE"
  | "BRIEF"
  | "DESIGN"
  | "BUILD"
  | "REVIEW"
  | "LIVE"
  | "HANDOVER";

export interface StageMetadata {
  key: ProjectStage;
  label: string;
  order: number;
  expectedDurationHours: number;
  description: string;
  checklist: string[];
}

export const PROJECT_STAGES: Record<ProjectStage, StageMetadata> = {
  INTAKE: {
    key: "INTAKE",
    label: "Client Intake",
    order: 1,
    expectedDurationHours: 4,
    description: "Account creation, gathering brand assets, domain/hosting credentials, and WhatsApp numbers.",
    checklist: [
      "Brand logo and high-res imagery received",
      "Domain and DNS registrar access confirmed",
      "Official business WhatsApp number verified",
    ],
  },
  BRIEF: {
    key: "BRIEF",
    label: "Scope & Bottlenecks Frozen",
    order: 2,
    expectedDurationHours: 6,
    description: "Aligning diagnostic evidence, primary revenue leak, target speed benchmarks, and scope boundaries.",
    checklist: [
      "Top 3 commercial leaks reviewed and signed off",
      "Sub-2.0s mobile speed target benchmarked",
      "48-hour turnaround kickoff window agreed",
    ],
  },
  DESIGN: {
    key: "DESIGN",
    label: "Conversion Wireframe",
    order: 3,
    expectedDurationHours: 12,
    description: "High-contrast mobile architecture, sticky WhatsApp concierge trigger, and trust proof layout.",
    checklist: [
      "Mobile-first responsive wireframe approved",
      "1-tap WhatsApp consultation CTA anchored",
      "Gujarat B2B trust signals positioned above the fold",
    ],
  },
  BUILD: {
    key: "BUILD",
    label: "Rapid Build & Speed Optimization",
    order: 4,
    expectedDurationHours: 24,
    description: "Core engineering, Tailwind/Vite performance tuning, Core Web Vitals optimization, and asset compression.",
    checklist: [
      "LCP under 2.0s on 4G emulation",
      "Zero render-blocking scripts in critical path",
      "wa.me direct routing wired with pre-filled lead context",
    ],
  },
  REVIEW: {
    key: "REVIEW",
    label: "Founder & Client QA",
    order: 5,
    expectedDurationHours: 8,
    description: "Interactive staging walkthrough with client decision-maker on mobile device.",
    checklist: [
      "End-to-end mobile checkout / WhatsApp lead test performed",
      "Client decision-maker walkthrough conducted",
      "Final copy and contact revisions cleared",
    ],
  },
  LIVE: {
    key: "LIVE",
    label: "Production Deployment",
    order: 6,
    expectedDurationHours: 4,
    description: "DNS pointer switch, SSL certificate provisioning, CDN edge caching, and real-user monitoring.",
    checklist: [
      "Production DNS propagated (Cloudflare/Vercel edge)",
      "SSL valid and enforcing HTTPS",
      "Post-launch live speed verification logged",
    ],
  },
  HANDOVER: {
    key: "HANDOVER",
    label: "Handover & Final Settlement",
    order: 7,
    expectedDurationHours: 4,
    description: "Staff walkthrough, admin handover, final payment settlement, and transition to retainer/support.",
    checklist: [
      "Admin credential context pack handed over",
      "Final balance payment settlement confirmed",
      "Growth retainer review scheduled for Day 30",
    ],
  },
};

export const STAGE_ORDER: ProjectStage[] = [
  "INTAKE",
  "BRIEF",
  "DESIGN",
  "BUILD",
  "REVIEW",
  "LIVE",
  "HANDOVER",
];

export const MAX_BUILD_WIP = 2; // Strict limit: Maximum 2 concurrent projects in BUILD stage

export interface StageHistoryEntry {
  stage: ProjectStage;
  enteredAt: string;
  notes?: string;
  author?: string;
}

export interface ClientProject {
  id: string;
  clientId: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  packageId: string;
  packageName: string;
  contractValue: number;
  advancePayment: AdvancePaymentState;
  stage: ProjectStage;
  stageHistory: StageHistoryEntry[];
  deliveryDeadline?: string;
  turnaroundHours: number;
  status: "ACTIVE" | "COMPLETED" | "BLOCKED";
  createdAt: string;
  updatedAt: string;
}

/**
 * Counts how many active projects currently occupy the BUILD stage.
 */
export function getActiveBuildCount(projects: ClientProject[]): number {
  return projects.filter(
    (p) => p.status === "ACTIVE" && p.stage === "BUILD",
  ).length;
}

/**
 * Evaluates whether a project is permitted to advance to the requested stage.
 */
export function canAdvanceStage(
  project: ClientProject,
  targetStage: ProjectStage,
  allProjects: ClientProject[],
): { allowed: boolean; reason?: string } {
  const currentIndex = STAGE_ORDER.indexOf(project.stage);
  const targetIndex = STAGE_ORDER.indexOf(targetStage);

  if (targetIndex < 0) {
    return { allowed: false, reason: `Unknown target stage: ${targetStage}` };
  }

  // Linear progression: Cannot skip forward more than 1 stage
  if (targetIndex > currentIndex + 1) {
    return {
      allowed: false,
      reason: `Cannot jump from ${project.stage} directly to ${targetStage}. Complete intermediate stage ${STAGE_ORDER[currentIndex + 1]} first.`,
    };
  }

  // 1. Advance Payment Hard Gate:
  // Projects entering BUILD or any subsequent stage MUST have verified advance payment.
  if (targetIndex >= STAGE_ORDER.indexOf("BUILD")) {
    const advanceCheck = advancePaymentGate(project.contractValue, project.advancePayment);
    if (!advanceCheck.allowed) {
      return {
        allowed: false,
        reason: `Advance Payment Hard Gate Failed: ${advanceCheck.reason}`,
      };
    }
  }

  // 2. WIP Limit Gate:
  // If moving into BUILD stage from a previous stage, check concurrent BUILD capacity.
  if (targetStage === "BUILD" && project.stage !== "BUILD") {
    const currentBuildCount = getActiveBuildCount(allProjects.filter((p) => p.id !== project.id));
    if (currentBuildCount >= MAX_BUILD_WIP) {
      return {
        allowed: false,
        reason: `WIP Limit Reached: Maximum ${MAX_BUILD_WIP} concurrent projects permitted in BUILD stage. Move a project to REVIEW or HANDOVER before starting a new build.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Advances a project to the next stage, recording history and updating delivery SLA deadlines.
 */
export function advanceProjectStage(
  project: ClientProject,
  targetStage: ProjectStage,
  allProjects: ClientProject[],
  notes?: string,
  author: string = "Shlok Pandya",
): { success: boolean; updatedProject?: ClientProject; error?: string } {
  const check = canAdvanceStage(project, targetStage, allProjects);
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  const now = new Date();
  const historyEntry: StageHistoryEntry = {
    stage: targetStage,
    enteredAt: now.toISOString(),
    notes: notes || `Moved to ${PROJECT_STAGES[targetStage].label}`,
    author,
  };

  let deliveryDeadline = project.deliveryDeadline;
  // If moving into BUILD, calculate strict delivery SLA deadline
  if (targetStage === "BUILD") {
    const deadlineDate = new Date(now.getTime() + project.turnaroundHours * 3600000);
    deliveryDeadline = deadlineDate.toISOString();
  }

  const isCompleted = targetStage === "HANDOVER";

  const updatedProject: ClientProject = {
    ...project,
    stage: targetStage,
    stageHistory: [historyEntry, ...project.stageHistory],
    deliveryDeadline,
    status: isCompleted ? "COMPLETED" : "ACTIVE",
    updatedAt: now.toISOString(),
  };

  return { success: true, updatedProject };
}

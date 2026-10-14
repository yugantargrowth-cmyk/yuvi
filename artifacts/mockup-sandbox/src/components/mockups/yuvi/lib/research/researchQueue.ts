// lib/research/researchQueue.ts — Research Jobs Queue & Batch Worker Engine
// Manages QUEUED -> RUNNING -> DONE / FAILED lifecycle for leads undergoing multi-source research.
// Supports both in-browser client execution with live progress and serverless / cron processing.

import type { NormalizedLead } from "../types/sales";
import { runMultiSourceResearch } from "./leadResearcher";

export type ResearchJobStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";

export interface ResearchJob {
  id: string;
  owner_id?: string;
  lead_id: string;
  companyName?: string;
  websiteUrl?: string;
  status: ResearchJobStatus;
  started_at?: string;
  finished_at?: string;
  error?: string;
  evidenceCount?: number;
  created_at: string;
  updated_at: string;
}

export const RESEARCH_QUEUE_STORAGE_KEY = "yuvi:research_jobs";

let memoryQueue: ResearchJob[] = [];

/**
 * Loads currently stored research jobs from localStorage cache, with in-memory fallback for Node.js / tests.
 */
export function getStoredResearchQueue(): ResearchJob[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return memoryQueue;
  }
  try {
    const raw = window.localStorage.getItem(RESEARCH_QUEUE_STORAGE_KEY);
    if (!raw) return memoryQueue;
    return JSON.parse(raw);
  } catch {
    return memoryQueue;
  }
}

/**
 * Saves research jobs into localStorage cache and in-memory store.
 */
export function saveResearchQueue(jobs: ResearchJob[]): void {
  memoryQueue = jobs;
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(RESEARCH_QUEUE_STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    // Ignore storage quota limits
  }
}


/**
 * Enqueues a batch of leads into the research_jobs queue.
 * Avoids duplicate active (QUEUED or RUNNING) jobs for the same lead.
 */
export function enqueueResearchJobs(leads: NormalizedLead[]): ResearchJob[] {
  const currentJobs = getStoredResearchQueue();
  const activeLeadIds = new Set(
    currentJobs
      .filter((j) => j.status === "QUEUED" || j.status === "RUNNING")
      .map((j) => j.lead_id)
  );

  const now = new Date().toISOString();
  const newJobs: ResearchJob[] = [];

  for (const lead of leads) {
    if (activeLeadIds.has(lead.id)) {
      continue;
    }
    const job: ResearchJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      owner_id: "owner",
      lead_id: lead.id,
      companyName: lead.companyName,
      websiteUrl: lead.websiteUrl,
      status: "QUEUED",
      created_at: now,
      updated_at: now,
    };
    newJobs.push(job);
    activeLeadIds.add(lead.id);
  }

  const updatedQueue = [...currentJobs, ...newJobs];
  saveResearchQueue(updatedQueue);
  return updatedQueue;
}

/**
 * Retrieves the next batch of queued jobs (default 3 to 5).
 */
export function getNextQueuedJobs(limit = 5): ResearchJob[] {
  const currentJobs = getStoredResearchQueue();
  return currentJobs.filter((j) => j.status === "QUEUED").slice(0, limit);
}

/**
 * Updates status of a specific research job.
 */
export function updateJobStatus(
  jobId: string,
  status: ResearchJobStatus,
  updates?: Partial<ResearchJob>
): ResearchJob | null {
  const currentJobs = getStoredResearchQueue();
  const idx = currentJobs.findIndex((j) => j.id === jobId);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  const updated: ResearchJob = {
    ...currentJobs[idx],
    ...updates,
    status,
    updated_at: now,
    ...(status === "RUNNING" && !currentJobs[idx].started_at ? { started_at: now } : {}),
    ...(status === "DONE" || status === "FAILED" ? { finished_at: now } : {}),
  };

  currentJobs[idx] = updated;
  saveResearchQueue(currentJobs);
  return updated;
}

export interface ResearchBatchProgress {
  current: number;
  total: number;
  percent: number;
  leadName: string;
  leadId: string;
}

/**
 * Executes multi-source research sequentially across selected leads with fine-grained progress feedback.
 * Updates leads with fresh evidence and logs job completions.
 */
export async function executeResearchOnSelected(
  leads: NormalizedLead[],
  onProgress?: (progress: ResearchBatchProgress) => void,
  apiBaseUrl = ""
): Promise<{
  updatedLeads: NormalizedLead[];
  completedJobs: ResearchJob[];
}> {
  if (leads.length === 0) {
    return { updatedLeads: [], completedJobs: [] };
  }

  // 1. Enqueue jobs
  enqueueResearchJobs(leads);
  const total = leads.length;
  const updatedLeads: NormalizedLead[] = [];
  const completedJobs: ResearchJob[] = [];

  for (let i = 0; i < total; i++) {
    const lead = leads[i];
    const percent = Math.round(((i + 1) / total) * 100);

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        percent,
        leadName: lead.companyName,
        leadId: lead.id,
      });
    }

    const currentJobs = getStoredResearchQueue();
    const activeJob = currentJobs.find((j) => j.lead_id === lead.id && j.status === "QUEUED");
    if (activeJob) {
      updateJobStatus(activeJob.id, "RUNNING");
    }

    try {
      const result = await runMultiSourceResearch(lead, { apiBaseUrl });
      const updatedLead: NormalizedLead = {
        ...lead,
        status: lead.status === "NEW" ? "QUALIFIED" : lead.status,
        researchEvidence: result.evidence,
        verifiedClaims: result.evidence.map((e) => e.claim),
        updatedAt: new Date().toISOString(),
      };

      updatedLeads.push(updatedLead);

      if (activeJob) {
        const finishedJob = updateJobStatus(activeJob.id, "DONE", {
          evidenceCount: result.evidence.length,
        });
        if (finishedJob) completedJobs.push(finishedJob);
      }
    } catch (err: any) {
      if (activeJob) {
        const failedJob = updateJobStatus(activeJob.id, "FAILED", {
          error: err?.message || String(err),
        });
        if (failedJob) completedJobs.push(failedJob);
      }
      updatedLeads.push(lead);
    }
  }

  return { updatedLeads, completedJobs };
}

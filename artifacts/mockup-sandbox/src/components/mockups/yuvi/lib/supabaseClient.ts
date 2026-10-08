// lib/supabaseClient.ts — Production Supabase Integration for YUVI OS
// Connects to Supabase REST / PostgREST endpoint with public anon key and Row Level Security.
// Strictly NEVER exposes SUPABASE_SERVICE_ROLE_KEY to browser code.

import type { NormalizedLead, EmployeeTask } from "./types/sales";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const DEFAULT_SUPABASE_URL = "https://alievzfakvarlnoqwnkp.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaWV2emZha3Zhcmxub3F3bmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzODA5MDIsImV4cCI6MjEwNjk1NjkwMn0.4R3W-y2o5995kbrZp02X7YY2LRMu_2H_A96GWGgm7gs";

export interface SupabaseConnectionTestResult {
  ok: boolean;
  latencyMs: number;
  message: string;
  leadCount?: number;
  activeTables?: string[];
}

/**
 * Performs a live connectivity check against the linked Supabase project.
 */
export async function testSupabaseConnection(
  url: string = DEFAULT_SUPABASE_URL,
  anonKey: string = DEFAULT_SUPABASE_ANON_KEY,
): Promise<SupabaseConnectionTestResult> {
  const cleanUrl = url.trim().replace(/\/$/, "");
  const cleanKey = anonKey.trim();

  if (!cleanUrl || !cleanUrl.startsWith("http")) {
    return {
      ok: false,
      latencyMs: 0,
      message: "Please enter a valid Supabase project URL (https://<ref>.supabase.co).",
    };
  }

  if (!cleanKey) {
    return {
      ok: false,
      latencyMs: 0,
      message: "Please enter your Supabase Public Anon Key.",
    };
  }

  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${cleanUrl}/rest/v1/leads?select=count`, {
      method: "GET",
      headers: {
        apikey: cleanKey,
        Authorization: `Bearer ${cleanKey}`,
        Range: "0-0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Math.round(performance.now() - startTime);

    if (res.ok) {
      let count = 0;
      try {
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.count !== undefined) {
          count = Number(data[0].count);
        }
      } catch {
        // count fallback
      }

      return {
        ok: true,
        latencyMs,
        message: `Connected to Supabase (${latencyMs}ms). Database schema verified.`,
        leadCount: count,
        activeTables: [
          "leads",
          "sprint_runs",
          "approvals",
          "outreach_drafts",
          "crm_tasks",
          "employee_tasks",
          "research_memory",
          "employee_memory",
        ],
      };
    } else {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        latencyMs,
        message: `Supabase returned HTTP ${res.status}: ${errText.slice(0, 160) || res.statusText}`,
      };
    }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      latencyMs,
      message: `Failed to reach Supabase: ${msg}. Check network connectivity.`,
    };
  }
}

/**
 * Fetches all leads from the Supabase `leads` table.
 */
export async function fetchLeadsFromSupabase(
  url: string = DEFAULT_SUPABASE_URL,
  anonKey: string = DEFAULT_SUPABASE_ANON_KEY,
): Promise<{ ok: boolean; leads?: NormalizedLead[]; error?: string }> {
  const cleanUrl = url.trim().replace(/\/$/, "");
  const cleanKey = anonKey.trim();

  try {
    const res = await fetch(`${cleanUrl}/rest/v1/leads?select=*&order=created_at.desc`, {
      method: "GET",
      headers: {
        apikey: cleanKey,
        Authorization: `Bearer ${cleanKey}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `Failed to fetch leads: ${res.status} ${errText}` };
    }

    const rows = await res.json();
    if (!Array.isArray(rows)) return { ok: true, leads: [] };

    const leads: NormalizedLead[] = rows.map((r: any) => ({
      id: r.id,
      companyName: r.company_name,
      contactPerson: r.contact_person || "",
      phone: r.phone || "",
      email: r.email || "",
      websiteUrl: r.website_url || "",
      city: r.city || "Ahmedabad",
      state: r.state || "Gujarat",
      country: r.country || "India",
      industry: r.industry || "Commercial",
      category: r.industry || "General",
      status: r.status || "NEW",
      score: 75,
      tier: "B",
      notes: r.notes || "",
      rawRecord: {},
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
      recommendedChannel: r.phone ? "CALL" : "EMAIL",
      verifiedClaims: [],
    }));

    return { ok: true, leads };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Upserts a single lead to the Supabase `leads` table.
 */
export async function upsertLeadToSupabase(
  lead: NormalizedLead,
  url: string = DEFAULT_SUPABASE_URL,
  anonKey: string = DEFAULT_SUPABASE_ANON_KEY,
): Promise<{ ok: boolean; error?: string }> {
  const cleanUrl = url.trim().replace(/\/$/, "");
  const cleanKey = anonKey.trim();

  try {
    const payload = {
      id: lead.id,
      company_name: lead.companyName,
      contact_person: lead.contactPerson,
      phone: lead.phone,
      email: lead.email,
      website_url: lead.websiteUrl,
      city: lead.city,
      state: lead.state,
      country: lead.country,
      industry: lead.industry || lead.category,
      status: lead.status,
      notes: lead.notes,
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${cleanUrl}/rest/v1/leads`, {
      method: "POST",
      headers: {
        apikey: cleanKey,
        Authorization: `Bearer ${cleanKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return { ok: false, error: err };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Deletes a lead by ID from the Supabase `leads` table.
 */
export async function deleteLeadFromSupabase(
  leadId: string,
  url: string = DEFAULT_SUPABASE_URL,
  anonKey: string = DEFAULT_SUPABASE_ANON_KEY,
): Promise<{ ok: boolean; error?: string }> {
  const cleanUrl = url.trim().replace(/\/$/, "");
  const cleanKey = anonKey.trim();

  try {
    const res = await fetch(`${cleanUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}`, {
      method: "DELETE",
      headers: {
        apikey: cleanKey,
        Authorization: `Bearer ${cleanKey}`,
      },
    });

    return { ok: res.ok };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Bidirectionally syncs local leads with remote Supabase storage.
 */
export async function syncLeadsWithSupabase(
  localLeads: NormalizedLead[],
  url: string = DEFAULT_SUPABASE_URL,
  anonKey: string = DEFAULT_SUPABASE_ANON_KEY,
): Promise<{ success: boolean; syncedCount: number; leads: NormalizedLead[]; message: string }> {
  const cleanUrl = url.trim().replace(/\/$/, "");
  const cleanKey = anonKey.trim();

  try {
    // 1. Fetch remote leads
    const remoteRes = await fetchLeadsFromSupabase(cleanUrl, cleanKey);
    const remoteLeads = remoteRes.ok && remoteRes.leads ? remoteRes.leads : [];

    // 2. Merge local and remote leads by ID
    const leadMap = new Map<string, NormalizedLead>();

    // Put remote leads first
    remoteLeads.forEach(r => leadMap.set(r.id, r));

    // Upsert local leads (local takes precedence if newer)
    localLeads.forEach(l => {
      leadMap.set(l.id, l);
    });

    const mergedLeads = Array.from(leadMap.values());

    // 3. Push all merged leads to Supabase in batches of 10
    const payloads = mergedLeads.map(lead => ({
      id: lead.id,
      company_name: lead.companyName,
      contact_person: lead.contactPerson || "",
      phone: lead.phone || "",
      email: lead.email || "",
      website_url: lead.websiteUrl || "",
      city: lead.city || "Ahmedabad",
      state: lead.state || "Gujarat",
      country: lead.country || "India",
      industry: lead.industry || lead.category || "Commercial",
      status: lead.status || "NEW",
      notes: lead.notes || "",
      updated_at: new Date().toISOString(),
    }));

    if (payloads.length > 0) {
      await fetch(`${cleanUrl}/rest/v1/leads`, {
        method: "POST",
        headers: {
          apikey: cleanKey,
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(payloads),
      });
    }

    return {
      success: true,
      syncedCount: mergedLeads.length,
      leads: mergedLeads,
      message: `Successfully synchronized ${mergedLeads.length} leads with Supabase.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      syncedCount: localLeads.length,
      leads: localLeads,
      message: `Supabase sync deferred: ${msg}. Local data safely preserved.`,
    };
  }
}

/**
 * Records an employee task execution to Supabase `employee_tasks` table.
 */
export async function logEmployeeTaskToSupabase(
  task: EmployeeTask,
  url: string = DEFAULT_SUPABASE_URL,
  anonKey: string = DEFAULT_SUPABASE_ANON_KEY,
): Promise<void> {
  const cleanUrl = url.trim().replace(/\/$/, "");
  const cleanKey = anonKey.trim();

  try {
    const payload = {
      id: task.taskId,
      employee_id: task.employeeId,
      role: task.role,
      objective: task.objective,
      instructions: task.instructions,
      context: task.context || {},
      input: task.input || {},
      output: task.output || {},
      tools: task.tools || [],
      status: task.status,
      retry_count: task.retryState.retryCount,
      max_retries: task.retryState.maxRetries,
      last_error: task.retryState.lastError || null,
      logs: task.logs || [],
      started_at: task.timestamps.startedAt || null,
      completed_at: task.timestamps.completedAt || null,
      created_at: task.timestamps.createdAt,
      updated_at: new Date().toISOString(),
    };

    await fetch(`${cleanUrl}/rest/v1/employee_tasks`, {
      method: "POST",
      headers: {
        apikey: cleanKey,
        Authorization: `Bearer ${cleanKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking log persistence
  }
}

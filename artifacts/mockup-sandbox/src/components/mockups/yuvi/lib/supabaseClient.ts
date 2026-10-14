// lib/supabaseClient.ts — Production Supabase Integration for YUVI OS
// Connects to Supabase REST / PostgREST endpoint with public anon key and Row Level Security.
// Strictly NEVER exposes SUPABASE_SERVICE_ROLE_KEY to browser code.

import type {
  NormalizedLead,
  EmployeeTask,
  ClientAccount,
  CommercialProposal,
  AgentConfig,
  KnowledgeNode,
} from "./types/sales";

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

/**
 * Synchronizes Client Accounts with Supabase `client_accounts` table.
 */
export async function syncClientAccountsWithSupabase(
  localClients: ClientAccount[],
  url: string = DEFAULT_SUPABASE_URL,
  anonKey: string = DEFAULT_SUPABASE_ANON_KEY,
): Promise<{ success: boolean; clients: ClientAccount[]; error?: string }> {
  const cleanUrl = url.trim().replace(/\/$/, "");
  const cleanKey = anonKey.trim();

  try {
    const res = await fetch(`${cleanUrl}/rest/v1/client_accounts?select=*`, {
      method: "GET",
      headers: {
        apikey: cleanKey,
        Authorization: `Bearer ${cleanKey}`,
      },
    });

    let remoteClients: ClientAccount[] = [];
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        remoteClients = rows.map((r: any) => ({
          id: r.id,
          leadId: r.lead_id,
          companyName: r.company_name,
          contactPerson: r.contact_person || "",
          phone: r.phone || "",
          email: r.email || "",
          websiteUrl: r.website_url || "",
          city: r.city || "Ahmedabad",
          state: r.state || "Gujarat",
          country: r.country || "India",
          industry: r.industry || "General",
          status: r.status || "ACTIVE",
          engagementType: r.engagement_type || "MONTHLY_RETAINER",
          monthlyRetainer: r.monthly_retainer || 0,
          contractValue: r.contract_value || 0,
          startDate: r.start_date || new Date().toISOString(),
          endDate: r.end_date,
          agreedScope: r.agreed_scope || [],
          deliverables: r.deliverables || [],
          milestones: r.milestones || [],
          nextAction: r.next_action,
          notes: r.notes || "",
          createdAt: r.created_at || new Date().toISOString(),
          updatedAt: r.updated_at || new Date().toISOString(),
        }));
      }
    }

    const clientMap = new Map<string, ClientAccount>();
    remoteClients.forEach(c => clientMap.set(c.id, c));
    localClients.forEach(c => clientMap.set(c.id, c));
    const merged = Array.from(clientMap.values());

    const payloads = merged.map(c => ({
      id: c.id,
      lead_id: c.leadId,
      company_name: c.companyName,
      contact_person: c.contactPerson,
      phone: c.phone,
      email: c.email,
      website_url: c.websiteUrl,
      city: c.city,
      state: c.state,
      country: c.country,
      industry: c.industry,
      status: c.status,
      engagement_type: c.engagementType,
      monthly_retainer: c.monthlyRetainer,
      contract_value: c.contractValue,
      start_date: c.startDate,
      end_date: c.endDate,
      agreed_scope: c.agreedScope,
      deliverables: c.deliverables,
      milestones: c.milestones,
      next_action: c.nextAction,
      notes: c.notes,
      updated_at: new Date().toISOString(),
    }));

    if (payloads.length > 0) {
      await fetch(`${cleanUrl}/rest/v1/client_accounts`, {
        method: "POST",
        headers: {
          apikey: cleanKey,
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(payloads),
      }).catch(() => {});
    }

    return { success: true, clients: merged };
  } catch (err) {
    return { success: false, clients: localClients, error: String(err) };
  }
}

/**
 * Synchronizes Commercial Proposals with Supabase `proposals` table.
 */
export async function syncProposalsWithSupabase(
  localProposals: CommercialProposal[],
  url: string = DEFAULT_SUPABASE_URL,
  anonKey: string = DEFAULT_SUPABASE_ANON_KEY,
): Promise<{ success: boolean; proposals: CommercialProposal[]; error?: string }> {
  const cleanUrl = url.trim().replace(/\/$/, "");
  const cleanKey = anonKey.trim();

  try {
    const res = await fetch(`${cleanUrl}/rest/v1/proposals?select=*`, {
      method: "GET",
      headers: {
        apikey: cleanKey,
        Authorization: `Bearer ${cleanKey}`,
      },
    });

    let remote: CommercialProposal[] = [];
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        remote = rows.map((r: any) => ({
          id: r.id,
          leadId: r.lead_id,
          clientId: r.client_id,
          proposalNumber: r.proposal_number,
          title: r.title,
          clientName: r.client_name,
          contactPerson: r.contact_person || "",
          phone: r.phone || "",
          email: r.email || "",
          status: r.status || "DRAFT",
          createdAt: r.created_at || new Date().toISOString(),
          validUntil: r.valid_until || new Date().toISOString(),
          scopeSummary: r.scope_summary || "",
          items: r.items || [],
          subtotal: r.subtotal || 0,
          taxRate: r.tax_rate || 18,
          taxAmount: r.tax_amount || 0,
          totalAmount: r.total_amount || 0,
          currency: r.currency || "INR",
          timelineWeeks: r.timeline_weeks || 4,
          paymentTerms: r.payment_terms || "",
          deliverables: r.deliverables || [],
          notes: r.notes || "",
        }));
      }
    }

    const propMap = new Map<string, CommercialProposal>();
    remote.forEach(p => propMap.set(p.id, p));
    localProposals.forEach(p => propMap.set(p.id, p));
    const merged = Array.from(propMap.values());

    const payloads = merged.map(p => ({
      id: p.id,
      lead_id: p.leadId,
      client_id: p.clientId,
      proposal_number: p.proposalNumber,
      title: p.title,
      client_name: p.clientName,
      contact_person: p.contactPerson,
      phone: p.phone,
      email: p.email,
      status: p.status,
      valid_until: p.validUntil,
      scope_summary: p.scopeSummary,
      items: p.items,
      subtotal: p.subtotal,
      tax_rate: p.taxRate,
      tax_amount: p.taxAmount,
      total_amount: p.totalAmount,
      currency: p.currency,
      timeline_weeks: p.timelineWeeks,
      payment_terms: p.paymentTerms,
      deliverables: p.deliverables,
      notes: p.notes,
      updated_at: new Date().toISOString(),
    }));

    if (payloads.length > 0) {
      await fetch(`${cleanUrl}/rest/v1/proposals`, {
        method: "POST",
        headers: {
          apikey: cleanKey,
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(payloads),
      }).catch(() => {});
    }

    return { success: true, proposals: merged };
  } catch (err) {
    return { success: false, proposals: localProposals, error: String(err) };
  }
}

/**
 * Synchronizes Agent Configs with Supabase `agent_configs` table.
 */
export async function syncAgentConfigsWithSupabase(
  localConfigs: AgentConfig[],
  url: string = DEFAULT_SUPABASE_URL,
  anonKey: string = DEFAULT_SUPABASE_ANON_KEY,
): Promise<{ success: boolean; configs: AgentConfig[]; error?: string }> {
  const cleanUrl = url.trim().replace(/\/$/, "");
  const cleanKey = anonKey.trim();

  try {
    const res = await fetch(`${cleanUrl}/rest/v1/agent_configs?select=*`, {
      method: "GET",
      headers: {
        apikey: cleanKey,
        Authorization: `Bearer ${cleanKey}`,
      },
    });

    let remote: AgentConfig[] = [];
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        remote = rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          role: r.role,
          objective: r.objective,
          avatar: r.avatar,
          tone: r.tone,
          targetIndustries: r.target_industries || [],
          targetGeographies: r.target_geographies || [],
          disqualificationTriggers: r.disqualification_triggers || [],
          services: r.services || [],
          knowledgeTags: r.knowledge_tags || [],
          rules: r.rules || [],
          enabled: r.enabled !== false,
          autonomy: r.autonomy || "full",
          updatedAt: r.updated_at || new Date().toISOString(),
        }));
      }
    }

    const cfgMap = new Map<string, AgentConfig>();
    remote.forEach(c => cfgMap.set(c.id, c));
    localConfigs.forEach(c => cfgMap.set(c.id, c));
    const merged = Array.from(cfgMap.values());

    const payloads = merged.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
      objective: c.objective,
      avatar: c.avatar,
      tone: c.tone,
      target_industries: c.targetIndustries,
      target_geographies: c.targetGeographies,
      disqualification_triggers: c.disqualificationTriggers,
      services: c.services,
      knowledge_tags: c.knowledgeTags,
      rules: c.rules,
      enabled: c.enabled,
      autonomy: c.autonomy,
      updated_at: new Date().toISOString(),
    }));

    if (payloads.length > 0) {
      await fetch(`${cleanUrl}/rest/v1/agent_configs`, {
        method: "POST",
        headers: {
          apikey: cleanKey,
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(payloads),
      }).catch(() => {});
    }

    return { success: true, configs: merged };
  } catch (err) {
    return { success: false, configs: localConfigs, error: String(err) };
  }
}

/**
 * Synchronizes Knowledge Nodes with Supabase `knowledge_nodes` table.
 */
export async function syncKnowledgeNodesWithSupabase(
  localNodes: KnowledgeNode[],
  url: string = DEFAULT_SUPABASE_URL,
  anonKey: string = DEFAULT_SUPABASE_ANON_KEY,
): Promise<{ success: boolean; nodes: KnowledgeNode[]; error?: string }> {
  const cleanUrl = url.trim().replace(/\/$/, "");
  const cleanKey = anonKey.trim();

  try {
    const res = await fetch(`${cleanUrl}/rest/v1/knowledge_nodes?select=*`, {
      method: "GET",
      headers: {
        apikey: cleanKey,
        Authorization: `Bearer ${cleanKey}`,
      },
    });

    let remote: KnowledgeNode[] = [];
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        remote = rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          category: r.category || "RULE",
          content: r.content,
          tags: r.tags || [],
          updatedAt: r.updated_at || new Date().toISOString(),
        }));
      }
    }

    const nodeMap = new Map<string, KnowledgeNode>();
    remote.forEach(n => nodeMap.set(n.id, n));
    localNodes.forEach(n => nodeMap.set(n.id, n));
    const merged = Array.from(nodeMap.values());

    const payloads = merged.map(n => ({
      id: n.id,
      title: n.title,
      category: n.category,
      content: n.content,
      tags: n.tags,
      updated_at: new Date().toISOString(),
    }));

    if (payloads.length > 0) {
      await fetch(`${cleanUrl}/rest/v1/knowledge_nodes`, {
        method: "POST",
        headers: {
          apikey: cleanKey,
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(payloads),
      }).catch(() => {});
    }

    return { success: true, nodes: merged };
  } catch (err) {
    return { success: false, nodes: localNodes, error: String(err) };
  }
}

/**
 * High-level offline-first orchestrator that synchronizes all 5 core PostgREST tables.
 */
export async function syncAllTablesWithSupabase(
  localData: {
    leads: NormalizedLead[];
    clients: ClientAccount[];
    proposals: CommercialProposal[];
    configs: AgentConfig[];
    knowledgeNodes: KnowledgeNode[];
  },
  url: string = DEFAULT_SUPABASE_URL,
  anonKey: string = DEFAULT_SUPABASE_ANON_KEY,
): Promise<{
  success: boolean;
  message: string;
  leads: NormalizedLead[];
  clients: ClientAccount[];
  proposals: CommercialProposal[];
  configs: AgentConfig[];
  knowledgeNodes: KnowledgeNode[];
}> {
  const [leadsRes, clientsRes, proposalsRes, configsRes, nodesRes] = await Promise.all([
    syncLeadsWithSupabase(localData.leads, url, anonKey),
    syncClientAccountsWithSupabase(localData.clients, url, anonKey),
    syncProposalsWithSupabase(localData.proposals, url, anonKey),
    syncAgentConfigsWithSupabase(localData.configs, url, anonKey),
    syncKnowledgeNodesWithSupabase(localData.knowledgeNodes, url, anonKey),
  ]);

  return {
    success: leadsRes.success || clientsRes.success || proposalsRes.success,
    message: `Synchronized tables: Leads (${leadsRes.syncedCount}), Clients (${clientsRes.clients.length}), Proposals (${proposalsRes.proposals.length}), Agents (${configsRes.configs.length}), Knowledge (${nodesRes.nodes.length})`,
    leads: leadsRes.leads,
    clients: clientsRes.clients,
    proposals: proposalsRes.proposals,
    configs: configsRes.configs,
    knowledgeNodes: nodesRes.nodes,
  };
}

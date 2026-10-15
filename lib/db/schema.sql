-- YUVI OS Production Supabase Schema with Owner Isolation & Row Level Security (RLS)
-- All tables are strictly isolated to the authenticated owner: auth.uid()::text = owner_id OR service_role.

-- ====================================================================
-- 1. CORE PIPELINE & CRM TABLES
-- ====================================================================

CREATE TABLE IF NOT EXISTS leads (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  company_name text NOT NULL,
  website_url text,
  phone text,
  email text,
  contact_person text,
  city text DEFAULT 'Ahmedabad',
  state text DEFAULT 'Gujarat',
  country text DEFAULT 'India',
  industry text,
  status text NOT NULL DEFAULT 'NEW',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_triage (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  lead_id text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  fit_score integer NOT NULL DEFAULT 0,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision text NOT NULL DEFAULT 'maybe', -- 'qualified' | 'maybe' | 'skip'
  ruleset_version text NOT NULL DEFAULT 'v1.0',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sprint_runs (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  sprint_id text NOT NULL UNIQUE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'RUNNING',
  total_leads integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  successful_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  tier_a_count integer NOT NULL DEFAULT 0,
  tier_b_count integer NOT NULL DEFAULT 0,
  tier_c_count integer NOT NULL DEFAULT 0,
  tier_d_count integer NOT NULL DEFAULT 0,
  pending_approval_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ====================================================================
-- 2. RESEARCH QUEUE & EVIDENCE MODEL
-- ====================================================================

CREATE TABLE IF NOT EXISTS research_jobs (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  lead_id text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'QUEUED', -- 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED'
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  lead_id text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  source text NOT NULL,        -- 'website' | 'pagespeed' | 'places' | 'social_snapshot'
  claim text NOT NULL,
  value text NOT NULL,
  label text NOT NULL,         -- 'VERIFIED' | 'OBSERVED' | 'INFERRED'
  confidence numeric NOT NULL DEFAULT 1.0,
  url text,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_memory (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  lead_id text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  claim text NOT NULL,
  source text NOT NULL,
  source_type text NOT NULL,
  confidence numeric NOT NULL,
  status text NOT NULL,
  observed_at timestamp with time zone NOT NULL,
  is_historical boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_audits (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  lead_id text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  website_url text,
  is_https boolean DEFAULT false,
  http_status integer,
  has_mobile_viewport boolean DEFAULT false,
  page_title text,
  meta_description text,
  detected_phones jsonb DEFAULT '[]'::jsonb,
  detected_whatsapp jsonb DEFAULT '[]'::jsonb,
  detected_emails jsonb DEFAULT '[]'::jsonb,
  has_contact_form boolean DEFAULT false,
  trust_signals jsonb DEFAULT '[]'::jsonb,
  social_links jsonb DEFAULT '{}'::jsonb,
  obvious_issues jsonb DEFAULT '[]'::jsonb,
  audited_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_qualifications (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  lead_id text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tier text NOT NULL,
  bottleneck_identified text NOT NULL,
  evidence_claim_ref text NOT NULL,
  primary_service text NOT NULL,
  secondary_service text,
  strategic_rationale text NOT NULL,
  recommended_channel text NOT NULL,
  confidence numeric NOT NULL,
  qualified_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ====================================================================
-- 3. OUTREACH CADENCE, REPLIES & OPT-OUTS
-- ====================================================================

CREATE TABLE IF NOT EXISTS outreach_drafts (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  lead_id text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel text NOT NULL,
  message_content text NOT NULL,
  call_notes text,
  key_observation text NOT NULL,
  service_angle text NOT NULL,
  cta_question text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'STAGED_DRAFT',
  drafted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outreach_steps (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  lead_id text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  step text NOT NULL,          -- 'D0' | 'D2' | 'D5'
  draft text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFTED', -- 'DRAFTED' | 'APPROVED' | 'SENT' | 'SKIPPED'
  scheduled_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  confirmed_by_user boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replies (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  lead_id text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  outcome text NOT NULL,       -- 'INTERESTED' | 'LATER' | 'NO' | 'WRONG_NUMBER' | 'OPT_OUT'
  note text,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opt_outs (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  phone text NOT NULL UNIQUE,
  reason text,
  opted_out_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approvals (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  approval_token text NOT NULL UNIQUE,
  lead_id text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  tier text NOT NULL,
  classification_reason text,
  evidence_summary text,
  recommended_service text,
  exact_message_version text,
  call_notes text,
  research_timestamp timestamp with time zone NOT NULL,
  approval_status text NOT NULL DEFAULT 'PENDING_APPROVAL',
  approved_by text,
  decision_notes text,
  decided_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ====================================================================
-- 4. PROPOSALS, INVOICING & ADVANCE PAYMENT GATE
-- ====================================================================

CREATE TABLE IF NOT EXISTS proposals (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  lead_id text REFERENCES leads(id) ON DELETE SET NULL,
  client_id text,
  proposal_number text NOT NULL,
  title text NOT NULL,
  client_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'DRAFT', -- 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'
  valid_until timestamp with time zone NOT NULL,
  scope_summary text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,  -- GST defaulted to 0 (off)
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  timeline_weeks integer NOT NULL DEFAULT 1,
  advance_percent integer NOT NULL DEFAULT 100, -- 100% on Foundation, 50% on retainers
  payment_link text,
  evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_package text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  proposal_id text REFERENCES proposals(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  utr text NOT NULL,
  method text NOT NULL DEFAULT 'UPI',
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ====================================================================
-- 5. CLIENT DELIVERY & PROJECT NAVIGATOR
-- ====================================================================

CREATE TABLE IF NOT EXISTS client_accounts (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  lead_id text REFERENCES leads(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  website_url text,
  city text DEFAULT 'Ahmedabad',
  state text DEFAULT 'Gujarat',
  country text DEFAULT 'India',
  industry text DEFAULT 'Commercial',
  status text NOT NULL DEFAULT 'ACTIVE',
  engagement_type text NOT NULL DEFAULT 'PROJECT',
  monthly_retainer numeric DEFAULT 0,
  contract_value numeric DEFAULT 0,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  agreed_scope jsonb DEFAULT '[]'::jsonb,
  deliverables jsonb DEFAULT '[]'::jsonb,
  milestones jsonb DEFAULT '[]'::jsonb,
  next_action text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  client_id text REFERENCES client_accounts(id) ON DELETE CASCADE,
  proposal_id text REFERENCES proposals(id) ON DELETE SET NULL,
  package text NOT NULL,
  stage text NOT NULL DEFAULT 'INTAKE', -- 'INTAKE'|'BRIEF'|'DESIGN'|'BUILD'|'REVIEW'|'LIVE'|'HANDOVER'
  priority text NOT NULL DEFAULT 'NORMAL',
  due_date timestamp with time zone,
  next_action text NOT NULL,
  waiting_on text NOT NULL DEFAULT 'NONE', -- 'CLIENT' | 'ME' | 'NONE'
  context_pack jsonb NOT NULL DEFAULT '{}'::jsonb,
  wip_state text NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'QUEUED'
  queue_position integer,
  honest_start_date timestamp with time zone,
  paid_gate_ok boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_notes (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  text text NOT NULL,
  kind text NOT NULL DEFAULT 'DECISION', -- 'DECISION' | 'BLOCKER' | 'ASSET' | 'CLIENT_MSG'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ====================================================================
-- 6. SETTINGS & SYSTEM CONFIGURATION
-- ====================================================================

CREATE TABLE IF NOT EXISTS settings (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  gst_enabled boolean NOT NULL DEFAULT false,
  gst_rate numeric NOT NULL DEFAULT 18,
  upi_vpa text NOT NULL DEFAULT '',
  daily_send_cap integer NOT NULL DEFAULT 30,
  send_window_start text NOT NULL DEFAULT '09:30',
  send_window_end text NOT NULL DEFAULT '19:30',
  goal_amount numeric NOT NULL DEFAULT 25000,
  goal_period text NOT NULL DEFAULT 'one-time',
  max_active_builds integer NOT NULL DEFAULT 2,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_configs (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  name text NOT NULL,
  role text NOT NULL,
  objective text NOT NULL,
  avatar text,
  tone text NOT NULL,
  target_industries jsonb DEFAULT '[]'::jsonb,
  target_geographies jsonb DEFAULT '[]'::jsonb,
  disqualification_triggers jsonb DEFAULT '[]'::jsonb,
  services jsonb DEFAULT '[]'::jsonb,
  knowledge_tags jsonb DEFAULT '[]'::jsonb,
  rules jsonb DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  autonomy text NOT NULL DEFAULT 'full',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  title text NOT NULL,
  category text NOT NULL,
  content text NOT NULL,
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_tasks (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  lead_id text NOT NULL,
  task_type text NOT NULL,
  assigned_agent text NOT NULL DEFAULT 'Hunter',
  priority text NOT NULL DEFAULT 'NORMAL',
  due_date timestamp with time zone,
  status text NOT NULL DEFAULT 'PENDING',
  briefing_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_tasks (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  employee_id text NOT NULL,
  role text NOT NULL,
  objective text NOT NULL,
  instructions text,
  context jsonb DEFAULT '{}'::jsonb,
  input jsonb DEFAULT '{}'::jsonb,
  output jsonb DEFAULT '{}'::jsonb,
  tools jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'PENDING',
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  last_error text,
  logs jsonb DEFAULT '[]'::jsonb,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_memory (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  employee_id text NOT NULL,
  memory_key text NOT NULL,
  memory_value jsonb NOT NULL,
  context_scope text DEFAULT 'global',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ====================================================================
-- 7. ROW LEVEL SECURITY (RLS) ACTIVATION & POLICIES
-- ====================================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_triage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_memory ENABLE ROW LEVEL SECURITY;

-- Helper macro: owner isolation policy
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'leads', 'lead_triage', 'sprint_runs', 'research_jobs', 'evidence',
    'research_memory', 'lead_audits', 'lead_qualifications', 'outreach_drafts',
    'outreach_steps', 'replies', 'opt_outs', 'approvals', 'proposals',
    'payments', 'client_accounts', 'projects', 'project_notes', 'settings',
    'agent_configs', 'knowledge_nodes', 'crm_tasks', 'employee_tasks', 'employee_memory'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Owner isolation" ON %I;', t);
    EXECUTE format(
      'CREATE POLICY "Owner isolation" ON %I FOR ALL
       USING (auth.uid()::text = owner_id OR auth.role() = ''service_role'')
       WITH CHECK (auth.uid()::text = owner_id OR auth.role() = ''service_role'');',
      t
    );
  END LOOP;
END $$;

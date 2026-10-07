CREATE TABLE IF NOT EXISTS leads (
  id text PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS sprint_runs (
  id text PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS research_memory (
  id text PRIMARY KEY,
  lead_id text NOT NULL,
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
  lead_id text NOT NULL,
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
  lead_id text NOT NULL,
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

CREATE TABLE IF NOT EXISTS outreach_drafts (
  id text PRIMARY KEY,
  lead_id text NOT NULL,
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

CREATE TABLE IF NOT EXISTS approvals (
  id text PRIMARY KEY,
  approval_token text NOT NULL UNIQUE,
  lead_id text NOT NULL,
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

CREATE TABLE IF NOT EXISTS crm_tasks (
  id text PRIMARY KEY,
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
  employee_id text NOT NULL,
  memory_key text NOT NULL,
  memory_value jsonb NOT NULL,
  context_scope text DEFAULT 'global',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

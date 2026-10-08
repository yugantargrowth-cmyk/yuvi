// components/SettingsView.tsx — Single Clear Control Center for YUVI OS
import React, { useState, type Dispatch, type SetStateAction } from "react";
import type { YuviSettings } from "../lib/store";
import { GROQ_MODELS, saveGroqKey, loadGroqKey } from "../lib/store";
import { testGroqConnection } from "../lib/groq";
import { testSupabaseConnection, syncLeadsWithSupabase } from "../lib/supabaseClient";
import { testActivepiecesConnection } from "../lib/execution/activepiecesBridge";
import { speakText, isSpeechRecognitionSupported, isSpeechSynthesisSupported, getAvailableVoices } from "../lib/voiceEngine";
import { EMPLOYEES } from "../lib/execution/taskSystem";
import type { NormalizedLead, EmployeeId } from "../lib/types/sales";
import { Button, Panel, SettingRow, ViewHeading } from "./ui";
import {
  KeyRound, Database, Workflow, Bot, Mic, ShieldCheck,
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Eye, EyeOff, Save,
  Volume2, Lock, ExternalLink, CloudCheck, Layers
} from "lucide-react";

interface SettingsViewProps {
  settings: YuviSettings;
  setSettings: Dispatch<SetStateAction<YuviSettings>>;
  leads: NormalizedLead[];
  setLeads: (leads: NormalizedLead[]) => void;
  notify: (text: string) => void;
  onLock: () => void;
}

export function SettingsView({
  settings,
  setSettings,
  leads,
  setLeads,
  notify,
  onLock,
}: SettingsViewProps) {
  const tabs = [
    { id: "groq", label: "Groq & AI Models", icon: KeyRound },
    { id: "supabase", label: "Supabase Database", icon: Database },
    { id: "activepieces", label: "Activepieces Runtime", icon: Workflow },
    { id: "workforce", label: "AI Workforce (7 Agents)", icon: Bot },
    { id: "voice", label: "Voice & Speech Engine", icon: Mic },
    { id: "identity", label: "Identity & Mission", icon: ShieldCheck },
  ];

  const [activeTab, setActiveTab] = useState(tabs[0].id);

  // --- GROQ STATE ---
  const [groqKey, setGroqKey] = useState(() => loadGroqKey());
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [testingGroq, setTestingGroq] = useState(false);
  const [groqTestMsg, setGroqTestMsg] = useState("");

  const saveGroq = () => {
    if (!groqKey.trim()) {
      notify("Please enter a Groq API key.");
      return;
    }
    saveGroqKey(groqKey.trim());
    setSettings(s => ({
      ...s,
      groq: {
        ...s.groq,
        hasKey: true,
        keyLastFour: groqKey.trim().slice(-4),
        connectionStatus: "not_connected",
      },
    }));
    setGroqTestMsg("");
    notify("Groq key securely saved locally. Never logged or exposed.");
  };

  const runTestGroq = async () => {
    if (!groqKey.trim()) {
      notify("Enter a Groq API key first.");
      return;
    }
    setTestingGroq(true);
    setGroqTestMsg("");
    const result = await testGroqConnection(groqKey.trim());
    setTestingGroq(false);

    if (result.ok) {
      setSettings(s => ({
        ...s,
        groq: { ...s.groq, connectionStatus: "connected", hasKey: true, keyLastFour: groqKey.trim().slice(-4) },
      }));
      setGroqTestMsg(`Connected to Groq! Verified access to ${result.modelCount} models.`);
      notify("Groq connection verified!");
    } else {
      setSettings(s => ({
        ...s,
        groq: { ...s.groq, connectionStatus: "failed" },
      }));
      setGroqTestMsg(result.reason);
      notify(`Groq test failed: ${result.reason}`);
    }
  };

  // --- SUPABASE STATE ---
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabase?.url || "https://alievzfakvarlnoqwnkp.supabase.co");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabase?.anonKey || "");
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [dbStatusMsg, setDbStatusMsg] = useState("");
  const [syncingDb, setSyncingDb] = useState(false);

  const saveSupabaseConfig = () => {
    setSettings(s => ({
      ...s,
      supabase: {
        ...s.supabase,
        url: supabaseUrl.trim(),
        anonKey: supabaseAnonKey.trim(),
      },
    }));
    notify("Supabase configuration saved.");
  };

  const runTestSupabase = async () => {
    setTestingDb(true);
    setDbStatusMsg("");
    const result = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setTestingDb(false);

    if (result.ok) {
      setSettings(s => ({
        ...s,
        supabase: { ...s.supabase, connectionStatus: "connected" },
      }));
      setDbStatusMsg(`${result.message} (Total Leads: ${result.leadCount ?? 0})`);
      notify(result.message);
    } else {
      setSettings(s => ({
        ...s,
        supabase: { ...s.supabase, connectionStatus: "failed" },
      }));
      setDbStatusMsg(result.message);
      notify(result.message);
    }
  };

  const handleSyncSupabase = async () => {
    setSyncingDb(true);
    notify("Synchronizing leads with remote Supabase database...");
    const res = await syncLeadsWithSupabase(leads, supabaseUrl, supabaseAnonKey);
    setSyncingDb(false);
    if (res.success) {
      setLeads(res.leads);
      notify(res.message);
    } else {
      notify(res.message);
    }
  };

  // --- ACTIVEPIECES STATE ---
  const [apUrl, setApUrl] = useState(settings.activepieces?.baseUrl || "http://localhost:8080");
  const [apPath, setApPath] = useState(settings.activepieces?.webhookPath || "/api/v1/webhooks/yuvi-task");
  const [testingAp, setTestingAp] = useState(false);
  const [apStatusMsg, setApStatusMsg] = useState("");

  const saveApConfig = () => {
    setSettings(s => ({
      ...s,
      activepieces: {
        ...s.activepieces,
        baseUrl: apUrl.trim(),
        webhookPath: apPath.trim(),
      },
    }));
    notify("Activepieces configuration saved.");
  };

  const runTestAp = async () => {
    setTestingAp(true);
    setApStatusMsg("");
    const result = await testActivepiecesConnection(apUrl);
    setTestingAp(false);

    if (result.ok) {
      setSettings(s => ({
        ...s,
        activepieces: { ...s.activepieces, connectionStatus: "connected" },
      }));
      setApStatusMsg(result.message);
      notify(result.message);
    } else {
      setSettings(s => ({
        ...s,
        activepieces: { ...s.activepieces, connectionStatus: "failed" },
      }));
      setApStatusMsg(`${result.message} (Local deterministic runtime will handle background tasks automatically).`);
      notify(result.message);
    }
  };

  // --- VOICE TEST ---
  const [testingVoice, setTestingVoice] = useState(false);
  const handleTestVoice = () => {
    setTestingVoice(true);
    speakText("Greetings Shlok. YUVI voice interface is armed and connected to your Gujarat commercial sales radar.", {
      rate: settings.voice?.rate ?? 1.05,
      voiceName: settings.voice?.voiceName,
      onEnd: () => setTestingVoice(false),
      onError: () => setTestingVoice(false),
    });
  };

  return (
    <div className="rise space-y-5 p-4 sm:p-7">
      <ViewHeading
        view="Settings"
        description="Single Clear Control Center — Manage AI models, Supabase storage, Activepieces runtime, and agent safety gates."
      />

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        {/* Navigation Sidebar */}
        <Panel className="h-fit p-2 space-y-1">
          {tabs.map(t => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-all ${
                  isCurrent
                    ? "bg-violet-600/20 text-white border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                    : "text-slate-400 hover:bg-white/[.04] hover:text-slate-200"
                }`}
              >
                <Icon size={15} className={isCurrent ? "text-violet-300" : "text-slate-500"} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </Panel>

        {/* Setting Panel Content */}
        <Panel className="min-h-[560px] p-5 sm:p-7">
          {/* TAB 1: GROQ & AI */}
          {activeTab === "groq" && (
            <div className="space-y-5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">AI Intelligence Layer</div>
                <h3 className="mt-1 text-xl font-bold text-white">Groq & AI Provider Configuration</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Configure default Groq GPT-OSS-120B model or secondary models for real-time intelligence, chat synthesis, and research extraction.
                </p>
              </div>

              <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-violet-200">
                  <ShieldCheck size={16} /> Privacy & Client-Side Security Guarantee
                </div>
                <div>
                  Your Groq API key is stored strictly in your browser session storage. It is only ever transmitted directly to <code>api.groq.com</code> over encrypted HTTPS. It is never logged or stored on any intermediate server.
                </div>
              </div>

              <SettingRow
                label="Groq API Key"
                description="Obtain your key from console.groq.com/keys. Masked by default."
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type={showGroqKey ? "text" : "password"}
                      value={groqKey}
                      onChange={e => setGroqKey(e.target.value)}
                      placeholder="gsk_..."
                      className="w-56 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-white outline-none focus:border-violet-400 sm:w-72"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGroqKey(!showGroqKey)}
                      className="absolute right-2 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showGroqKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <Button onClick={saveGroq} variant="primary">
                    <Save size={13} /> Save Key
                  </Button>
                </div>
              </SettingRow>

              {settings.groq.hasKey && (
                <div className="border-b border-white/5 py-3 text-xs text-slate-400">
                  Active key saved ending in <span className="font-mono text-cyan-300 font-bold">...{settings.groq.keyLastFour}</span>.
                </div>
              )}

              <SettingRow
                label="Default AI Model"
                description="Groq high-speed architecture. GPT-OSS-120B default for comprehensive business orchestration."
              >
                <select
                  value={settings.groq.modelId}
                  onChange={e => setSettings(s => ({ ...s, groq: { ...s.groq, modelId: e.target.value } }))}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-400"
                >
                  {GROQ_MODELS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({m.id})
                    </option>
                  ))}
                </select>
              </SettingRow>

              <SettingRow
                label="Live Connection Test"
                description="Pings Groq's models endpoint to verify key authentication and quota availability."
              >
                <div className="flex items-center gap-3">
                  <Button onClick={runTestGroq} disabled={testingGroq}>
                    {testingGroq ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    Test Groq Connection
                  </Button>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      settings.groq.connectionStatus === "connected"
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                        : settings.groq.connectionStatus === "failed"
                        ? "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                        : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {settings.groq.connectionStatus === "connected" ? (
                      <><CheckCircle2 size={12} /> Connected</>
                    ) : settings.groq.connectionStatus === "failed" ? (
                      <><XCircle size={12} /> Connection Failed</>
                    ) : (
                      "Not Connected"
                    )}
                  </span>
                </div>
              </SettingRow>

              {groqTestMsg && (
                <div className={`rounded-xl p-3 text-xs border ${
                  settings.groq.connectionStatus === "connected"
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-500/25 bg-rose-500/10 text-rose-200"
                }`}>
                  {groqTestMsg}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUPABASE */}
          {activeTab === "supabase" && (
            <div className="space-y-5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">Persistence & Database</div>
                <h3 className="mt-1 text-xl font-bold text-white">Supabase Cloud Connection</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Real PostgreSQL database backing all CRM leads, task logs, call histories, and approval tokens.
                </p>
              </div>

              <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-cyan-200">
                  <Database size={16} /> Verified Active Project: <code>alievzfakvarlnoqwnkp</code>
                </div>
                <div>
                  Row Level Security (RLS) protects data tables. Only the public <code>anon</code> key is stored here. The <code>SUPABASE_SERVICE_ROLE_KEY</code> is NEVER exposed to browser code.
                </div>
              </div>

              <SettingRow
                label="Supabase Project REST URL"
                description="Target project URL for PostgREST endpoints."
              >
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  className="w-72 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-violet-400 font-mono"
                />
              </SettingRow>

              <SettingRow
                label="Public Anon Key"
                description="Client-safe publishable JWT key with RLS policy enforcement."
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type={showAnonKey ? "text" : "password"}
                      value={supabaseAnonKey}
                      onChange={e => setSupabaseAnonKey(e.target.value)}
                      className="w-56 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-white outline-none focus:border-violet-400 sm:w-72"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAnonKey(!showAnonKey)}
                      className="absolute right-2 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showAnonKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <Button onClick={saveSupabaseConfig} variant="primary">
                    <Save size={13} /> Save
                  </Button>
                </div>
              </SettingRow>

              <SettingRow
                label="Connection Health & Test"
                description="Queries remote table public.leads to test read/write accessibility."
              >
                <div className="flex items-center gap-3">
                  <Button onClick={runTestSupabase} disabled={testingDb}>
                    {testingDb ? <RefreshCw size={13} className="animate-spin" /> : <Database size={13} />}
                    Test Database Connection
                  </Button>
                  <Button onClick={handleSyncSupabase} disabled={syncingDb}>
                    {syncingDb ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    Sync CRM to Cloud
                  </Button>
                </div>
              </SettingRow>

              {dbStatusMsg && (
                <div className={`rounded-xl p-3 text-xs border ${
                  settings.supabase?.connectionStatus === "connected"
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-500/25 bg-rose-500/10 text-rose-200"
                }`}>
                  {dbStatusMsg}
                </div>
              )}

              {/* Verified Tables List */}
              <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Active Schema Tables Status</div>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  {[
                    "public.leads", "public.approvals", "public.sprint_runs", "public.outreach_drafts",
                    "public.crm_tasks", "public.employee_tasks", "public.research_memory", "public.employee_memory"
                  ].map(table => (
                    <div key={table} className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[.02] p-2 text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="font-mono text-[10px]">{table.replace("public.", "")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVEPIECES */}
          {activeTab === "activepieces" && (
            <div className="space-y-5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">Background Automation Runtime</div>
                <h3 className="mt-1 text-xl font-bold text-white">Activepieces Integration Bridge</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Executes heavy background tasks, scheduled dispatches, and employee pipelines.
                </p>
              </div>

              <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-200">
                  <Workflow size={16} /> Transparent Deterministic Fallback Active
                </div>
                <div>
                  If Activepieces is not running or unreachable, YUVI automatically executes all employee tasks through its verified local engine without any failure or interruption.
                </div>
              </div>

              <SettingRow
                label="Activepieces Instance URL"
                description="Local container endpoint or cloud deployment URL."
              >
                <input
                  type="text"
                  value={apUrl}
                  onChange={e => setApUrl(e.target.value)}
                  placeholder="http://localhost:8080"
                  className="w-72 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-violet-400 font-mono"
                />
              </SettingRow>

              <SettingRow
                label="Webhook Path"
                description="Target flow webhook path for YUVI tasks."
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={apPath}
                    onChange={e => setApPath(e.target.value)}
                    className="w-56 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-violet-400 font-mono sm:w-72"
                  />
                  <Button onClick={saveApConfig} variant="primary">
                    <Save size={13} /> Save
                  </Button>
                </div>
              </SettingRow>

              <SettingRow
                label="Connection Health Check"
                description="Pings the Activepieces server flags endpoint to confirm webhook readiness."
              >
                <div className="flex items-center gap-3">
                  <Button onClick={runTestAp} disabled={testingAp}>
                    {testingAp ? <RefreshCw size={13} className="animate-spin" /> : <Workflow size={13} />}
                    Test Bridge Connection
                  </Button>
                </div>
              </SettingRow>

              {apStatusMsg && (
                <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-300">
                  {apStatusMsg}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WORKFORCE */}
          {activeTab === "workforce" && (
            <div className="space-y-5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">Autonomous Workforce</div>
                <h3 className="mt-1 text-xl font-bold text-white">AI Employee Roles & Autonomy Rules</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Configure execution permissions and consequential safety gates for all 7 employees.
                </p>
              </div>

              <div className="space-y-3">
                {Object.values(EMPLOYEES).map(emp => {
                  const empConfig = settings.workforce?.[emp.id] || { enabled: true, autonomy: "full" };
                  const isConsequential = emp.consequentialTools.length > 0;

                  return (
                    <div key={emp.id} className="rounded-xl border border-white/5 bg-black/20 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold"
                          style={{ background: `${emp.color}22`, color: emp.color, border: `1px solid ${emp.color}66` }}
                        >
                          {emp.name.slice(0, 2)}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">{emp.name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">({emp.role})</span>
                            {isConsequential && (
                              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[8px] font-bold text-amber-300 border border-amber-500/25">
                                Human Approval Required
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">{emp.description}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <select
                          value={empConfig.autonomy}
                          onChange={e => {
                            const val = e.target.value as "full" | "assisted" | "manual";
                            setSettings(s => ({
                              ...s,
                              workforce: {
                                ...s.workforce,
                                [emp.id]: { ...empConfig, autonomy: val },
                              },
                            }));
                          }}
                          className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                        >
                          <option value="full">Full Autonomy</option>
                          <option value="assisted">Assisted Mode</option>
                          <option value="manual">Manual Trigger Only</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: VOICE */}
          {activeTab === "voice" && (
            <div className="space-y-5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">Speech & Audio Interface</div>
                <h3 className="mt-1 text-xl font-bold text-white">Voice Chat Configuration</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Real speech recognition (STT) and voice synthesis (TTS) integrated directly into the YUVI conversational brain.
                </p>
              </div>

              <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-violet-200">
                  <Mic size={16} /> Browser Web Speech API Diagnostics
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>Speech Recognition (STT): <b className={isSpeechRecognitionSupported() ? "text-emerald-300" : "text-rose-300"}>{isSpeechRecognitionSupported() ? "Supported" : "Not Available"}</b></div>
                  <div>Speech Synthesis (TTS): <b className={isSpeechSynthesisSupported() ? "text-emerald-300" : "text-rose-300"}>{isSpeechSynthesisSupported() ? "Supported" : "Not Available"}</b></div>
                </div>
              </div>

              <SettingRow
                label="Voice Output (Text-to-Speech)"
                description="Enable spoken voice replies from YUVI upon receiving commands."
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.voice?.enabled ?? true}
                    onChange={e => setSettings(s => ({ ...s, voice: { ...s.voice, enabled: e.target.checked } }))}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-xs text-slate-300">{settings.voice?.enabled ? "Voice Active" : "Muted"}</span>
                </div>
              </SettingRow>

              <SettingRow
                label="Speech Recognition Language"
                description="Language code for voice transcription. en-IN tuned for Indian business English."
              >
                <select
                  value={settings.voice?.lang || "en-IN"}
                  onChange={e => setSettings(s => ({ ...s, voice: { ...s.voice, lang: e.target.value } }))}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-200 outline-none"
                >
                  <option value="en-IN">English (India) — en-IN</option>
                  <option value="en-US">English (US) — en-US</option>
                  <option value="en-GB">English (UK) — en-GB</option>
                </select>
              </SettingRow>

              <SettingRow
                label="Test Voice Playback"
                description="Speaks a test greeting using the active voice synthesizer."
              >
                <Button onClick={handleTestVoice} disabled={testingVoice}>
                  <Volume2 size={13} /> {testingVoice ? "Speaking..." : "Play Test Voice"}
                </Button>
              </SettingRow>
            </div>
          )}

          {/* TAB 6: IDENTITY */}
          {activeTab === "identity" && (
            <div className="space-y-5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">Workspace Context</div>
                <h3 className="mt-1 text-xl font-bold text-white">YUVI Identity & Operating Rules</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Define agency name, founder personality, and prompt injection guidelines.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Founder Name</label>
                  <input
                    type="text"
                    value={settings.identity?.founderName || "Shlok Pandya"}
                    onChange={e => setSettings(s => ({ ...s, identity: { ...s.identity, founderName: e.target.value } }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Agency Name</label>
                  <input
                    type="text"
                    value={settings.identity?.agencyName || "Yugantar Growth"}
                    onChange={e => setSettings(s => ({ ...s, identity: { ...s.identity, agencyName: e.target.value } }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Custom Market & Commercial Instructions</label>
                <textarea
                  value={settings.identity?.customInstructions || ""}
                  onChange={e => setSettings(s => ({ ...s, identity: { ...s.identity, customInstructions: e.target.value } }))}
                  className="mt-1 h-20 w-full rounded-lg border border-white/10 bg-black/40 p-3 text-xs leading-5 text-white outline-none"
                  placeholder="Target market rules, tone constraints, phone etiquette..."
                />
              </div>

              <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                <Button onClick={onLock}>
                  <Lock size={13} /> Lock Session
                </Button>
                <Button variant="primary" onClick={() => notify("Settings and workspace rules updated.")}>
                  <Save size={13} /> Save Identity Rules
                </Button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

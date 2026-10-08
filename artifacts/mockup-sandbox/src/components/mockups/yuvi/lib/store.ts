// Local persistence for YUVI Command Deck (Mission 1 scope).
// One centralized store — nothing else in the app should call localStorage directly.
// Mission 2/3 will replace this module's internals with real Supabase-backed calls
// without touching call sites, since every consumer goes through get/set here.

const PREFIX = "yuvi:";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage can fail (quota, private mode) — fail silently, in-memory state still works.
  }
}

function remove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

export const store = { read, write, remove };

// Central Groq model registry — the Settings dropdown, the default settings value,
// and the localStorage migration below all read from this single list/constant
// so there is exactly one place that defines which models exist and which is default.
export const GROQ_MODELS: { id: string; label: string }[] = [
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
];

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

// Model ids that used to be the default and are no longer reliably available on Groq.
// Anyone with one of these saved locally gets migrated to DEFAULT_GROQ_MODEL once.
const RETIRED_DEFAULT_MODELS = new Set(["llama-3.3-70b-versatile"]);

// Resolves a saved (possibly stale/unknown) modelId to the value that should actually
// be used and persisted: unknown/retired defaults migrate forward, anything else the
// user deliberately picked (including other still-supported models) is preserved.
function resolveGroqModel(savedModelId: string | undefined): string {
  if (!savedModelId) return DEFAULT_GROQ_MODEL;
  if (RETIRED_DEFAULT_MODELS.has(savedModelId)) return DEFAULT_GROQ_MODEL;
  return savedModelId;
}

export type YuviSettings = {
  groq: { modelId: string; keyLastFour: string; hasKey: boolean; connectionStatus: "not_connected" | "connected" | "failed" };
  supabase: {
    url: string;
    anonKey: string;
    autoSync: boolean;
    connectionStatus: "not_connected" | "connected" | "failed";
  };
  activepieces: {
    baseUrl: string;
    webhookPath: string;
    connectionStatus: "not_connected" | "connected" | "failed";
  };
  voice: {
    enabled: boolean;
    autoListen: boolean;
    lang: string;
    rate: number;
    voiceName?: string;
  };
  workforce: {
    scout: { enabled: boolean; autonomy: "full" | "assisted" | "manual" };
    hunter: { enabled: boolean; autonomy: "full" | "assisted" | "manual" };
    researcher: { enabled: boolean; autonomy: "full" | "assisted" | "manual" };
    analyst: { enabled: boolean; autonomy: "full" | "assisted" | "manual" };
    operator: { enabled: boolean; autonomy: "full" | "assisted" | "manual" };
    spark: { enabled: boolean; autonomy: "full" | "assisted" | "manual" };
    publisher: { enabled: boolean; autonomy: "full" | "assisted" | "manual" };
  };
  identity: {
    name: string;
    founderName: string;
    agencyName: string;
    personalityPrompt: string;
    customInstructions: string;
    capabilities: Record<string, boolean>;
    proactivity: Record<string, boolean>;
  };
  lock: { passcodeDigest: string };
};

export const DEFAULT_PERSONALITY = `You are YUVI, a proactive AI business operating system assistant.
You are smart, sharp, aware, genuine, confident and accurate.
You understand the user's workspace, dashboard, agents, tasks, leads, content, approvals, settings and activity.
You proactively surface important information.
You recommend actions when useful.
You can navigate the application through structured application actions.
You never fabricate actions, results, integrations or completed work.
When something is unavailable, you say so clearly.
When an action requires human approval, ask for it.
Prefer concise, useful communication over unnecessary explanation.`;

export const DEFAULT_SETTINGS: YuviSettings = {
  groq: { modelId: DEFAULT_GROQ_MODEL, keyLastFour: "", hasKey: false, connectionStatus: "not_connected" },
  supabase: {
    url: "https://alievzfakvarlnoqwnkp.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaWV2emZha3Zhcmxub3F3bmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzODA5MDIsImV4cCI6MjEwNjk1NjkwMn0.4R3W-y2o5995kbrZp02X7YY2LRMu_2H_A96GWGgm7gs",
    autoSync: true,
    connectionStatus: "not_connected",
  },
  activepieces: {
    baseUrl: "http://localhost:8080",
    webhookPath: "/api/v1/webhooks/yuvi-task",
    connectionStatus: "not_connected",
  },
  voice: {
    enabled: true,
    autoListen: false,
    lang: "en-IN",
    rate: 1.05,
  },
  workforce: {
    scout: { enabled: true, autonomy: "full" },
    hunter: { enabled: true, autonomy: "assisted" },
    researcher: { enabled: true, autonomy: "full" },
    analyst: { enabled: true, autonomy: "full" },
    operator: { enabled: true, autonomy: "assisted" },
    spark: { enabled: true, autonomy: "full" },
    publisher: { enabled: true, autonomy: "assisted" },
  },
  identity: {
    name: "YUVI",
    founderName: "Shlok Pandya",
    agencyName: "Yugantar Growth",
    personalityPrompt: DEFAULT_PERSONALITY,
    customInstructions: "Target market: High-ticket commercial B2B clients in Gujarat (Ahmedabad, Surat, Vadodara). Always prioritize direct phone and WhatsApp introductions with verifiable observations.",
    capabilities: { Chat: true, "Proactive briefings": true, "Dashboard awareness": true, "Agent awareness": true, Navigation: true, Notifications: true, "Task management": true, Memory: true, Knowledge: true, Approvals: true },
    proactivity: { "Proactive mode": true, "Daily briefing": true, "Important-event notifications": true, "Agent completion notifications": true, "Approval notifications": true, "Error notifications": true }
  },
  lock: { passcodeDigest: "" }
};

export function purgeBrowserGroqKeys(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + "groq_key");
    window.localStorage.removeItem("groq_key");
    window.localStorage.removeItem("yuvi_groq_key");
    window.localStorage.removeItem("yuvi_vault_item__yuvi_groq_key");
    window.sessionStorage?.removeItem("groq_key");
    window.sessionStorage?.removeItem(PREFIX + "groq_key");
    window.sessionStorage?.removeItem("yuvi_groq_key");
  } catch {
    // Storage access can fail in restrictive contexts; ignore
  }
}

const SETTINGS_KEY = "settings";

export function loadSettings(): YuviSettings {
  purgeBrowserGroqKeys();
  const stored = read<Partial<YuviSettings>>(SETTINGS_KEY, {});
  const mergedGroq = { ...DEFAULT_SETTINGS.groq, ...(stored.groq || {}) };
  const resolvedModelId = resolveGroqModel(mergedGroq.modelId);
  const settings: YuviSettings = {
    groq: {
      ...mergedGroq,
      modelId: resolvedModelId,
      // Never persist client-side keys or key fragments
      keyLastFour: "",
    },
    supabase: { ...DEFAULT_SETTINGS.supabase, ...(stored.supabase || {}) },
    activepieces: { ...DEFAULT_SETTINGS.activepieces, ...(stored.activepieces || {}) },
    voice: { ...DEFAULT_SETTINGS.voice, ...(stored.voice || {}) },
    workforce: { ...DEFAULT_SETTINGS.workforce, ...(stored.workforce || {}) },
    identity: {
      ...DEFAULT_SETTINGS.identity,
      ...(stored.identity || {}),
      capabilities: { ...DEFAULT_SETTINGS.identity.capabilities, ...(stored.identity?.capabilities || {}) },
      proactivity: { ...DEFAULT_SETTINGS.identity.proactivity, ...(stored.identity?.proactivity || {}) }
    },
    lock: { ...DEFAULT_SETTINGS.lock, ...(stored.lock || {}) }
  };
  // One-time migration: if the saved model id was a retired default, persist the
  // corrected value now so this doesn't need to re-migrate on every load.
  if (stored.groq?.modelId !== resolvedModelId) {
    saveSettings(settings);
  }
  return settings;
}

export function saveSettings(settings: YuviSettings): void {
  // Ensure no sensitive key information is accidentally stored in settings
  const sanitized: YuviSettings = {
    ...settings,
    groq: {
      ...settings.groq,
      keyLastFour: "",
    },
  };
  write(SETTINGS_KEY, sanitized);
}

// Deprecated stubs retained for compatibility. All Groq keys are stored strictly
// on the server in GROQ_API_KEY and never stored in browser state.
export function loadGroqKey(): string {
  purgeBrowserGroqKeys();
  return "";
}
export function saveGroqKey(_key: string): void {
  purgeBrowserGroqKeys();
}
export function clearGroqKey(): void {
  purgeBrowserGroqKeys();
}

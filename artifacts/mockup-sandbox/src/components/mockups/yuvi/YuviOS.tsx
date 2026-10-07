import { useMemo, useRef, useState, useEffect, type Dispatch, type FormEvent, type ReactNode, type SetStateAction, type ChangeEvent } from "react";
import yuviLogo from "../../../assets/yuvi-logo.png";
import { store, loadSettings, saveSettings, loadGroqKey, saveGroqKey, GROQ_MODELS, type YuviSettings } from "./lib/store";
import { testGroqConnection, askGroq, type ChatMessage } from "./lib/groq";
import { loadAllSkills } from "./lib/skillLoader";
import { getApi } from "./lib/skillRegistry";
import type { GenerateBriefResult } from "./lib/skills/lead-research";
import { parseLeadSheet } from "./lib/sales/csvParser";
import { runDailySalesEngine, normalizePhone } from "./lib/sales/salesEngine";
import { detectDailyIntent, handleDailyCommand } from "./lib/sales/intentRouter";
import { testActivepiecesConnection } from "./lib/execution/activepiecesBridge";
import { EMPLOYEES } from "./lib/execution/taskSystem";
import type {
  NormalizedLead,
  CallQueueItem,
  DailySalesDashboardMetrics,
  DailySalesReport,
  LeadTier,
} from "./lib/types/sales";
import {
  Archive, ArrowUpRight, AtSign, BadgeCheck, BarChart3, Bell, Bot, BrainCircuit, BriefcaseBusiness,
  CalendarDays, Check, CheckCircle2, ChevronDown, CircleDollarSign, Command, Database, Edit3,
  ExternalLink, Eye, FileBarChart, FileCheck2, FileImage, FileText, Filter, Gauge, GitBranch,
  Home, Image, Inbox, KanbanSquare, KeyRound, Layers3, Link2, Lock, LogOut, Menu,
  MessageCircle, MessageSquare, Mic, MoreHorizontal, Network, Paperclip, PenLine, Phone, PhoneCall, Plus, Radio,
  RefreshCw, Rocket, Save, Search, Send, Settings2, ShieldCheck, SlidersHorizontal, Sparkles,
  Target, Trash2, Unlock, UploadCloud, UserRound, UsersRound, WifiOff, Workflow, X, XCircle, Zap
} from "lucide-react";

type View = "Dashboard" | "Approvals" | "Chat" | "AI Team" | "Leads" | "Pipeline" | "Clients" | "Knowledge Base" | "Outreach" | "Reports" | "Notifications" | "Settings";
type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EDITING" | "PUBLISHED / COMPLETED";
type Approval = {
  id: string;
  type: string;
  title: string;
  workspace: string;
  createdBy: string;
  timestamp: string;
  status: ApprovalStatus;
  description: string;
  externalUrl?: string;
  canvaProjectId?: string;
  exactMessage?: string;
  leadId?: string;
  tier?: LeadTier;
};
type Message = { id: string; role: "yuvi" | "user"; text: string; timestamp: string; attachment?: string };
type Conversation = { id: string; title: string; preview: string; createdAt: string; updatedAt: string; messages: Message[]; archived?: boolean };

const nav: { name: View; icon: typeof Home; group?: string }[] = [
  { name: "Dashboard", icon: Home, group: "Workspace" },
  { name: "Approvals", icon: BadgeCheck },
  { name: "Chat", icon: MessageSquare },
  { name: "AI Team", icon: Bot, group: "Operate" },
  { name: "Leads", icon: Target },
  { name: "Pipeline", icon: KanbanSquare },
  { name: "Clients", icon: UsersRound },
  { name: "Knowledge Base", icon: Database, group: "Intelligence" },
  { name: "Outreach", icon: Radio },
  { name: "Reports", icon: FileBarChart },
  { name: "Settings", icon: Settings2, group: "System" }
];

const initialGujaratLeads: NormalizedLead[] = [
  {
    id: "lead_jfs_gujarat_01",
    companyName: "Jangid Furniture Studio",
    contactPerson: "Rajesh Jangid",
    phone: "+919825012345",
    email: "rajesh@jangidfurniture.com",
    websiteUrl: "https://jangidfurniture.in",
    city: "Ahmedabad",
    state: "Gujarat",
    country: "India",
    industry: "Luxury Furniture & Interior Architecture",
    category: "Architecture & Design",
    status: "NEW",
    score: 94,
    tier: "A",
    notes: "Premier bespoke woodcraft studio on SG Highway. High ticket commercial client potential.",
    rawRecord: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleneck: "Low direct digital conversion capture; strong offline reputation without outbound sales engine.",
    primaryService: "Direct Outbound & High-Value B2B Pipeline Acquisition",
    recommendedService: "Direct Outbound & High-Value B2B Pipeline Acquisition",
    recommendedChannel: "WHATSAPP",
    verifiedClaims: [
      "Verified showroom presence on SG Highway, Ahmedabad.",
      "Commercial catalog spans luxury residential and corporate interiors.",
      "Active WhatsApp business line."
    ],
    approvalToken: "appv_jfs_94",
    approvalStatus: "PENDING_APPROVAL",
    outreachDrafts: {
      whatsapp: "Hello Rajesh,\n\nI was reviewing Jangid Furniture Studio's presence in Ahmedabad and noticed the exceptional bespoke craftsmanship you showcase on SG Highway.\n\nAt Yugantar Growth, we help premier Ahmedabad interior studios build predictable high-ticket architect and builder client pipelines using conversion architecture and dedicated outbound systems.\n\nWould it be worth a short 10-minute briefing call this Thursday or Friday to share two growth angles we mapped for Jangid Furniture Studio?\n\n— Shlok Pandya, Yugantar Growth",
      email: {
        subject: "B2B architect pipeline & growth angles for Jangid Furniture Studio",
        body: "Dear Rajesh Jangid,\n\nI was reviewing Jangid Furniture Studio's presence in Ahmedabad and noticed the exceptional bespoke craftsmanship you showcase.\n\nAt Yugantar Growth, we help premier Gujarat design studios build predictable high-ticket client pipelines.\n\nWould it be worth a short 10-minute briefing call this week to share two growth angles we mapped for Jangid Furniture Studio?\n\nBest regards,\nShlok Pandya\nFounder, Yugantar Growth\nAhmedabad, Gujarat"
      },
      sms: "Hi Rajesh, Shlok from Yugantar Growth here. Put together two commercial client acquisition ideas for Jangid Furniture Studio. Can I send a 2-min brief?"
    },
    nextAction: {
      type: "Discovery Call & WhatsApp Introduction",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      notes: "Pitch direct outbound partnership to capture Gujarat builder and architect specifications."
    }
  },
  {
    id: "lead_tradesphere_gujarat_02",
    companyName: "Tradesphere Exports",
    contactPerson: "Nikhil Shah",
    phone: "+919879054321",
    email: "nikhil@tradesphere.co.in",
    websiteUrl: "https://tradesphere.co.in",
    city: "Surat",
    state: "Gujarat",
    country: "India",
    industry: "Industrial Manufacturing & Exports",
    category: "Manufacturing",
    status: "NEW",
    score: 88,
    tier: "A",
    notes: "Textile and chemical export house in Surat industrial zone.",
    rawRecord: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleneck: "Static international catalog without systematic lead qualification or CRM funnel.",
    primaryService: "Global B2B Buyer Acquisition Engine",
    recommendedService: "Global B2B Buyer Acquisition Engine",
    recommendedChannel: "WHATSAPP",
    verifiedClaims: [
      "Verified Surat industrial export firm.",
      "High volume international inquiries with uncaptured web traffic."
    ],
    approvalToken: "appv_tradesphere_88",
    approvalStatus: "PENDING_APPROVAL",
    outreachDrafts: {
      whatsapp: "Hello Nikhil,\n\nI was looking into leading industrial export operations in Surat and came across Tradesphere Exports.\n\nAt Yugantar Growth, we help prominent Gujarat export houses systematize high-margin overseas buyer acquisition using targeted conversion funnels and automated qualification.\n\nWould a 10-minute conversation this week be useful to explore two actionable buyer acquisition angles for Tradesphere?\n\n— Shlok Pandya, Yugantar Growth",
      email: {
        subject: "Outbound buyer acquisition for Tradesphere Exports",
        body: "Dear Nikhil Shah,\n\nAt Yugantar Growth, we help Gujarat manufacturers build systematic high-margin export acquisition funnels.\n\nWould you be open to a 10-minute briefing call this week?\n\nBest regards,\nShlok Pandya"
      },
      sms: "Hi Nikhil, Shlok from Yugantar Growth. Put together two export buyer acquisition angles for Tradesphere. Can I share a brief?"
    }
  },
  {
    id: "lead_urbanhabitat_gujarat_03",
    companyName: "Urban Habitat Architects",
    contactPerson: "Mara Klein",
    phone: "+919824098765",
    email: "mara@urbanhabitat.in",
    websiteUrl: "https://urbanhabitat.in",
    city: "Ahmedabad",
    state: "Gujarat",
    country: "India",
    industry: "Sustainable Architectural Design",
    category: "Architecture",
    status: "NEW",
    score: 82,
    tier: "A",
    notes: "High-end sustainable commercial and residential architect in Bodakdev, Ahmedabad.",
    rawRecord: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleneck: "Portfolio showcased on Instagram but lacks high-converting website consultation portal.",
    primaryService: "Conversion Architecture & High-Ticket Private Client Pipeline",
    recommendedService: "Conversion Architecture & High-Ticket Private Client Pipeline",
    recommendedChannel: "CALL",
    verifiedClaims: [
      "Verified studio in Bodakdev, Ahmedabad.",
      "Award-winning sustainable villa and institutional projects."
    ],
    approvalToken: "appv_urbanhabitat_82",
    approvalStatus: "PENDING_APPROVAL",
    outreachDrafts: {
      whatsapp: "Hello Mara,\n\nI was admiring Urban Habitat's sustainable architectural projects in Bodakdev, Ahmedabad.\n\nAt Yugantar Growth, we partner with premier architects to establish direct high-ticket private client pipelines and high-converting consultation architectures.\n\nWould it be worth a brief 10-minute call this Thursday to share two growth lanes we analyzed for Urban Habitat?\n\n— Shlok Pandya, Yugantar Growth",
      email: {
        subject: "Private client pipeline angles for Urban Habitat Architects",
        body: "Dear Mara Klein,\n\nI was admiring Urban Habitat's sustainable architectural work in Ahmedabad.\n\nAt Yugantar Growth, we help premier architectural studios build direct private client pipelines.\n\nBest regards,\nShlok Pandya"
      },
      sms: "Hi Mara, Shlok from Yugantar Growth. Mapped two private client acquisition angles for Urban Habitat. Can I send a brief?"
    }
  },
  {
    id: "lead_apex_gujarat_04",
    companyName: "Apex Interior Craft",
    contactPerson: "Dylan Park",
    phone: "+919898011223",
    email: "dylan@apexinteriors.com",
    websiteUrl: "https://apexinteriors.com",
    city: "Vadodara",
    state: "Gujarat",
    country: "India",
    industry: "Turnkey Corporate Interiors",
    category: "Design",
    status: "NEW",
    score: 74,
    tier: "B",
    notes: "Commercial office fitouts and turnkey spaces across Gujarat.",
    rawRecord: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleneck: "Low local search authority compared to regional competitors in Vadodara.",
    primaryService: "Local Search Authority & B2B Fitout Acquisition",
    recommendedService: "Local Search Authority & B2B Fitout Acquisition",
    recommendedChannel: "CALL",
    verifiedClaims: [
      "Verified turnkey office interior contractor in Vadodara.",
      "Active telephone line."
    ],
    approvalToken: "appv_apex_74",
    approvalStatus: "PENDING_APPROVAL",
    outreachDrafts: {
      whatsapp: "Hello Dylan,\n\nI came across Apex Interior Craft's turnkey office fitouts across Gujarat.\n\nAt Yugantar Growth, we help Vadodara and Ahmedabad commercial interior specialists capture enterprise corporate leases before competitors.\n\nWould you be open to a 10-minute review call this week?\n\n— Shlok Pandya, Yugantar Growth",
      email: {
        subject: "Commercial fitout acquisition angles for Apex Interior Craft",
        body: "Dear Dylan,\n\nAt Yugantar Growth, we help commercial interior contractors capture enterprise fitouts.\n\nBest regards,\nShlok Pandya"
      },
      sms: "Hi Dylan, Shlok from Yugantar Growth. Put together two commercial fitout angles for Apex. Can I share a brief?"
    }
  }
];

const initialApprovals: Approval[] = [
  {
    id: "approval-jfs-01",
    type: "Outreach (WhatsApp)",
    title: "Jangid Furniture Studio — Tier A WhatsApp Outreach",
    workspace: "Yugantar Growth / Sales Engine",
    createdBy: "Scout + Messenger",
    timestamp: "Today · 8:15 AM",
    status: "PENDING",
    tier: "A",
    leadId: "lead_jfs_gujarat_01",
    description: "3-part personalized outreach: SG Highway observation + predictable architect pipeline offer + 10-min briefing CTA.",
    exactMessage: "Hello Rajesh,\n\nI was reviewing Jangid Furniture Studio's presence in Ahmedabad and noticed the exceptional bespoke craftsmanship you showcase on SG Highway.\n\nAt Yugantar Growth, we help premier Ahmedabad interior studios build predictable high-ticket architect and builder client pipelines using conversion architecture and dedicated outbound systems.\n\nWould it be worth a short 10-minute briefing call this Thursday or Friday to share two growth angles we mapped for Jangid Furniture Studio?\n\n— Shlok Pandya, Yugantar Growth"
  },
  {
    id: "approval-tradesphere-02",
    type: "Outreach (WhatsApp)",
    title: "Tradesphere Exports — Tier A WhatsApp Outreach",
    workspace: "Yugantar Growth / Sales Engine",
    createdBy: "Scout + Messenger",
    timestamp: "Today · 8:20 AM",
    status: "PENDING",
    tier: "A",
    leadId: "lead_tradesphere_gujarat_02",
    description: "3-part personalized outreach: Surat industrial export observation + global buyer acquisition offer + briefing CTA.",
    exactMessage: "Hello Nikhil,\n\nI was looking into leading industrial export operations in Surat and came across Tradesphere Exports.\n\nAt Yugantar Growth, we help prominent Gujarat export houses systematize high-margin overseas buyer acquisition using targeted conversion funnels and automated qualification.\n\nWould a 10-minute conversation this week be useful to explore two actionable buyer acquisition angles for Tradesphere?\n\n— Shlok Pandya, Yugantar Growth"
  },
  {
    id: "approval-03",
    type: "Report",
    title: "Daily Sales Engine Pulse & Commercial Priorities",
    workspace: "Yugantar Growth",
    createdBy: "Analyst",
    timestamp: "Today · 8:30 AM",
    status: "APPROVED",
    description: "Operational summary covering 4 qualified Gujarat targets, 4 calls queued, and pending outreach reviews."
  }
];

type NotifType = "Agent completed"|"Agent failed"|"Approval required"|"Important lead"|"New conversation"|"System warning"|"YUVI briefing"|"Integration disconnected";
type Notif = { id: string; type: NotifType; text: string; timestamp: string; read: boolean; target?: { kind: "approval"|"conversation"|"lead"|"agent"|"settings"; id?: string } };

const initialNotifs: Notif[] = [
  { id: "n-01", type: "Approval required", text: "2 Tier A WhatsApp drafts for Jangid Furniture and Tradesphere are waiting in Approvals.", timestamp: "Today · 8:30 AM", read: false, target: { kind: "approval", id: "approval-jfs-01" } },
  { id: "n-02", type: "Important lead", text: "Jangid Furniture Studio (Ahmedabad) scored 94 — Tier A commercial priority.", timestamp: "Today · 8:15 AM", read: false, target: { kind: "lead" } },
  { id: "n-03", type: "YUVI briefing", text: "Daily Sales Engine ready. Type 'Work on my leads today' or 'Give me todays calls' to command.", timestamp: "Today · 8:00 AM", read: true, target: { kind: "conversation", id: "conv-01" } }
];

const initialConversations: Conversation[] = [
  {
    id: "conv-01",
    title: "Daily Sales Command Briefing",
    preview: "Sales Engine ready. Work on leads, check calls, and review outreach.",
    createdAt: "2026-10-05",
    updatedAt: "Today · 8:00 AM",
    messages: [
      { id: "m-01", role: "user", text: "What should I do today?", timestamp: "8:00 AM" },
      { id: "m-02", role: "yuvi", text: "Good morning Shlok. Today's commercial priorities:\n\n1. **Calls Queue:** You have 3 URGENT Tier A calls due today (Jangid Furniture, Tradesphere, Urban Habitat).\n2. **Approvals Gate:** 2 personalized WhatsApp outreach drafts are staged for your review.\n3. **Active Pipeline:** 4 high-conviction Gujarat commercial leads active in the corridor.\n\nType 'Give me todays calls' or 'Prepare todays outreach' to execute.", timestamp: "8:01 AM" }
    ]
  }
];

const css = `
@keyframes yuvi-rise { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
@keyframes yuvi-pulse { 0%,100%{opacity:.4;transform:scale(.94)} 50%{opacity:1;transform:scale(1)} }
.yuvi * { box-sizing:border-box } .yuvi { font-family:'DM Sans',ui-sans-serif,system-ui,sans-serif; color:#e9eaff; background:#070918; min-height:100dvh; }
.yuvi ::-webkit-scrollbar { width:5px; height:5px } .yuvi ::-webkit-scrollbar-thumb { background:#292450; border-radius:8px }
.yuvi .rise { animation:yuvi-rise .45s both } .yuvi .panel { background:linear-gradient(145deg,rgba(20,21,51,.9),rgba(12,14,34,.86)); border:1px solid rgba(142,126,255,.19); box-shadow:inset 0 1px rgba(255,255,255,.045),0 14px 40px rgba(0,0,0,.2); }
.yuvi .panel:hover { border-color:rgba(166,137,255,.38); transition:.2s ease } .yuvi button { transition:.18s ease } .yuvi button:active { transform:scale(.97) }
.yuvi .signal-grid { background-image:linear-gradient(rgba(125,94,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(125,94,255,.045) 1px,transparent 1px); background-size:32px 32px; mask-image:linear-gradient(to bottom,black,transparent 88%); }
.yuvi .eyebrow { font-size:9px; letter-spacing:.2em; text-transform:uppercase; color:#a897ff; } .yuvi .status-dot { display:inline-block;width:6px;height:6px;border-radius:50%;background:#43e6d0;box-shadow:0 0 10px #43e6d0; }
.yuvi input,.yuvi textarea,.yuvi select { font-family:inherit } .yuvi input[type="checkbox"] { accent-color:#8b69ff }
`;

function Panel({ children, className = "", ...props }: { children: ReactNode; className?: string; [key: string]: unknown }) {
  return <section className={`panel rounded-xl ${className}`} {...props}>{children}</section>;
}
function Avatar({ text, color = "#7c5cff", size = "h-8 w-8" }: { text: string; color?: string; size?: string }) {
  return <span className={`flex ${size} shrink-0 items-center justify-center rounded-full text-[10px] font-bold`} style={{ background: `${color}22`, color, border: `1px solid ${color}66` }}>{text}</span>;
}
function StatusPill({ status }: { status: string }) {
  const color = status.includes("APPROVED") || status.includes("COMPLETED") || status === "Hot" || status === "WON" || status === "INTERESTED" ? "emerald" : status === "REJECTED" || status === "Cold" || status === "LOST" || status === "DISQUALIFIED" ? "rose" : status === "EDITING" || status === "Warm" || status === "CALLBACK" ? "amber" : "violet";
  return <span className={`inline-flex rounded-full border border-${color}-300/20 bg-${color}-300/10 px-2 py-1 text-[9px] text-${color}-200`}>{status}</span>;
}
function TierPill({ tier }: { tier: LeadTier }) {
  const color = tier === "A" ? "emerald" : tier === "B" ? "cyan" : tier === "C" ? "amber" : "slate";
  return <span className={`inline-flex items-center gap-1 rounded-full border border-${color}-300/25 bg-${color}-300/10 px-2.5 py-0.5 text-[9px] font-semibold text-${color}-200`}>Tier {tier}</span>;
}

function Header({ view, onAdd, onMenu, onUser, notifs, onOpenNotif, onClearNotif, onClearAllNotifs, notifPanel, setNotifPanel }: { view: View; onAdd: () => void; onMenu: () => void; onUser: () => void; notifs: Notif[]; onOpenNotif: (n: Notif) => void; onClearNotif: (id: string) => void; onClearAllNotifs: () => void; notifPanel: boolean; setNotifPanel: (v: boolean) => void }) {
  const unread = notifs.filter(n=>!n.read).length;
  return <header className="relative flex items-center justify-between gap-3 border-b border-violet-400/10 px-4 py-4 sm:px-7">
    <div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={onMenu} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden"><Menu size={19}/></button><div><div className="text-[11px] uppercase tracking-[.22em] text-violet-300/70">Mission control / {view}</div><h1 className="mt-1 text-lg font-semibold text-white sm:text-xl">{view === "Dashboard" ? "Good evening, Shlok." : view}</h1></div></div>
    <div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/5 px-3 py-1.5 text-[10px] text-cyan-200 sm:flex"><i className="status-dot"/> Brain ready · Activepieces runtime</div><button aria-label="Notifications" onClick={()=>setNotifPanel(!notifPanel)} className="relative rounded-lg p-2 text-slate-400 hover:bg-white/5"><Bell size={18}/>{unread>0&&<span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-400 px-1 text-[8px] font-semibold text-white">{unread}</span>}</button><button aria-label="Quick add" onClick={onAdd} className="rounded-lg border border-violet-300/25 bg-violet-500/15 p-2 text-violet-200 hover:bg-violet-500/25"><Plus size={18}/></button><button aria-label="Open user menu" onClick={onUser}><Avatar text="SP" color="#d59aff"/></button></div>
    {notifPanel&&<div className="absolute right-4 top-[62px] z-40 max-h-[70vh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl border border-violet-300/20 bg-[#10112b] p-2 shadow-2xl sm:right-7 sm:w-96">
      <div className="flex items-center justify-between px-2 py-2"><span className="text-[10px] uppercase tracking-[.18em] text-violet-300">Notifications</span>{notifs.length>0&&<button onClick={onClearAllNotifs} className="text-[9px] text-slate-500 hover:text-white">Clear all</button>}</div>
      {notifs.length===0?<div className="px-3 py-8 text-center text-[10px] text-slate-600">You're caught up.</div>:notifs.map(n=><div key={n.id} className={`group flex items-start gap-2 rounded-lg p-3 text-left ${n.read?"":"bg-violet-500/10"}`}>
        <button onClick={()=>onOpenNotif(n)} className="min-w-0 flex-1 text-left"><div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${n.read?"bg-slate-700":"bg-cyan-300"}`}/><span className="text-[9px] uppercase tracking-[.12em] text-violet-300">{n.type}</span></div><div className="mt-1 text-[11px] leading-4 text-slate-200">{n.text}</div><div className="mt-1 text-[9px] text-slate-600">{n.timestamp}</div></button>
        <button onClick={()=>onClearNotif(n.id)} aria-label="Dismiss notification" className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-white"><X size={13}/></button></div>)}
    </div>}
  </header>;
}

function Sidebar({ current, setCurrent, open, onUser }: { current: View; setCurrent: (v: View) => void; open: boolean; onUser: () => void }) {
  return <aside className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-30 w-64 border-r border-violet-400/10 bg-[#090a1e] px-4 py-5 transition-transform lg:static lg:translate-x-0`}>
    <div className="mb-9 flex items-center gap-3 px-2"><div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-violet-500/20"><img src={yuviLogo} alt="YUVI" className="h-full w-full object-contain p-1"/></div><div><div className="text-[25px] font-black tracking-[.16em] text-white">YUVI</div><div className="-mt-1 text-[8px] tracking-[.27em] text-violet-300/70">AI BUSINESS OS</div></div></div>
    <div className="mb-2 px-3 text-[9px] uppercase tracking-[.2em] text-slate-600">Navigate</div>
    <nav>{nav.map(({ name, icon: Icon, group }) => <div key={name}>{group && group !== "Workspace" && <div className="mb-2 mt-5 px-3 text-[9px] uppercase tracking-[.2em] text-slate-600">{group}</div>}<button onClick={() => setCurrent(name)} className={`mb-1 flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] ${current === name ? "border border-violet-400/35 bg-violet-500/15 text-white shadow-[0_0_20px_rgba(121,77,255,.1)]" : "text-slate-400 hover:bg-white/[.04] hover:text-slate-200"}`}><Icon size={15} strokeWidth={1.7}/>{name}{current === name && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300"/>}</button></div>)}</nav>
    <div className="mt-8 rounded-xl border border-cyan-300/10 bg-cyan-300/[.035] p-3"><div className="flex items-center gap-2 text-[10px] text-cyan-200"><Radio size={13}/> YUVI STATUS</div><div className="mt-4 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-violet-400/50 shadow-[0_0_25px_rgba(133,70,255,.5)]"><div className="h-5 w-5 rounded-full bg-violet-300 shadow-[0_0_18px_#ad7bff]"/></div><div className="mt-3 text-[10px] font-semibold tracking-widest text-cyan-300">ONLINE</div><div className="mt-1 text-[9px] text-slate-500">Sales Engine Armed</div></div></div>
    <button onClick={onUser} className="absolute bottom-5 left-4 right-4 flex items-center gap-2 border-t border-white/5 pt-4 text-left"><Avatar text="SP" color="#d59aff"/><div className="text-[11px]"><div className="text-slate-200">Shlok Pandya</div><div className="text-[9px] text-slate-500">Founder, Yugantar Growth</div></div><ChevronDown size={13} className="ml-auto text-slate-500"/></button>
  </aside>;
}

function Stat({ label, value, delta, icon: Icon, color = "#a87cff" }: { label: string; value: string; delta: string; icon: typeof Gauge; color?: string }) {
  return <Panel className="p-4"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-400">{label}</span><Icon size={15} style={{ color }}/></div><div className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</div><div className="mt-2 flex items-center gap-1 text-[9px] text-emerald-300"><ArrowUpRight size={11}/>{delta}</div></Panel>;
}
function Sparkline({ color = "#a87cff" }: { color?: string }) {
  return <svg viewBox="0 0 260 70" className="h-20 w-full"><path d="M0 56 C25 52 22 31 43 42 S70 57 83 39 S103 27 115 45 S136 30 147 35 S160 52 176 27 S198 30 205 19 S229 25 260 4" fill="none" stroke={color} strokeWidth="2"/><path d="M0 56 C25 52 22 31 43 42 S70 57 83 39 S103 27 115 45 S136 30 147 35 S160 52 176 27 S198 30 205 19 S229 25 260 4 V70 H0" fill={`${color}12`} stroke="none"/></svg>;
}

function Dashboard({
  metrics,
  callQueue,
  onOpenCall,
  onTriggerEngine,
  setCurrent,
  onAdd
}: {
  metrics: DailySalesDashboardMetrics;
  callQueue: CallQueueItem[];
  onOpenCall: (item: CallQueueItem) => void;
  onTriggerEngine: () => void;
  setCurrent: (v: View) => void;
  onAdd: () => void;
}) {
  const pendingCalls = callQueue.filter(c => c.callStatus === "PENDING");

  return <div className="rise signal-grid relative space-y-4 p-4 sm:p-7">
    <div className="mb-1 flex items-center justify-between">
      <div>
        <div className="eyebrow">Yugantar Growth / Daily Sales Radar</div>
        <div className="mt-1 text-[10px] text-slate-500">Live commercial telemetry · Activepieces execution runtime connected</div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={onTriggerEngine}><Rocket size={13}/> Run Sales Engine</Button>
      </div>
    </div>

    {/* Primary Telemetry Cards */}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Stat label="Total Leads in Radar" value={String(metrics.totalLeads)} delta={`${metrics.newLeads} new today`} icon={Target}/>
      <Stat label="Qualified Opportunities" value={`${metrics.qualifiedLeads}`} delta={`Tier A: ${metrics.tierBreakdown.A} | Tier B: ${metrics.tierBreakdown.B}`} icon={BadgeCheck} color="#43e6d0"/>
      <Stat label="Calls Due Today" value={`${metrics.callsDue}`} delta={`${metrics.callsCompleted} completed`} icon={PhoneCall} color="#ff8a65"/>
      <Stat label="Outreach Awaiting Approval" value={`${metrics.outreachDue}`} delta="Human gate armed" icon={Send} color="#ffc66d"/>
    </div>

    {/* AI Crew Overview & Missions */}
    <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
      <Panel className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[.18em] text-violet-300">Active AI Employees</div>
            <div className="mt-1 text-xs text-slate-500">Universal Task System · Activepieces runtime execution</div>
          </div>
          <button onClick={() => setCurrent("AI Team")} className="text-[10px] text-violet-300 hover:text-white">Manage team →</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { name: "Scout", role: "Lead Intel", status: "Active in Sprint", color: "#43e6d0", task: `Scored ${metrics.totalLeads} leads` },
            { name: "Hunter", role: "Outreach & Calls", status: `${metrics.callsDue} calls queued`, color: "#ff8a65", task: "Guards dispatch approvals" },
            { name: "Operator", role: "Business Ops", status: "Syncing DB State", color: "#8b69ff", task: "Deduplication & memory guard" },
            { name: "Researcher", role: "Deep Research", status: "Footprint Armed", color: "#d59aff", task: "Gujarat commercial analysis" }
          ].map((a) => (
            <div key={a.name} className="rounded-lg border border-white/5 bg-black/15 p-3">
              <div className="flex items-center gap-2"><Avatar text={a.name.slice(0,2)} color={a.color}/><div><div className="text-[11px] font-medium text-slate-100">{a.name}</div><div className="text-[9px] text-slate-500">{a.role}</div></div></div>
              <div className="mt-3 flex items-center gap-1 text-[9px]" style={{color:a.color}}><span className="h-1.5 w-1.5 rounded-full" style={{background:a.color}}/>{a.status}</div>
              <div className="mt-2 text-[9px] text-slate-500">{a.task}</div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[.18em] text-violet-300">Today's Focus & Next Actions</div>
          <span className="rounded bg-violet-400/10 px-2 py-1 text-[9px] text-violet-300">{metrics.callsDue + metrics.outreachDue} pending</span>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-2 text-[10px]">
            <span className="mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-cyan-300 bg-cyan-300/20 text-cyan-200"><Check size={9}/></span>
            <div><div className="text-slate-200">Run Sales Engine on Gujarat lead pool</div><div className="mt-1 text-[9px] text-slate-500">Completed · Deduplicated & Tier-classified</div></div>
          </div>
          <div className="flex items-start gap-2 text-[10px]">
            <span className={`mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border ${metrics.callsCompleted > 0 ? "border-cyan-300 bg-cyan-300/20 text-cyan-200" : "border-slate-600 text-slate-600"}`}>{metrics.callsCompleted > 0 && <Check size={9}/>}</span>
            <div><div className="text-slate-200">Execute {metrics.callsDue} discovery calls (Tier A targets)</div><div className="mt-1 text-[9px] text-slate-500">Prioritized queue ready with talking points</div></div>
          </div>
          <div className="flex items-start gap-2 text-[10px]">
            <span className="mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-600 text-slate-600"/>
            <div><div className="text-slate-200">Review & approve {metrics.outreachDue} staged outreach drafts</div><div className="mt-1 text-[9px] text-slate-500">Approvals Gate · Hunter awaiting founder consent</div></div>
          </div>
        </div>
        <button onClick={() => setCurrent("Approvals")} className="mt-4 text-[10px] text-violet-300">Go to Approvals queue →</button>
      </Panel>
    </div>

    {/* Prioritized Call Queue & Sales Pipeline Breakdown */}
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Daily Call Queue Panel */}
      <Panel className="p-5 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[.18em] text-violet-300">Prioritized Daily Call Queue</div>
            <h3 className="mt-1 text-sm text-white">Click to call with structured talking points</h3>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[9px] text-emerald-200">{pendingCalls.length} calls due</span>
        </div>
        <div className="mt-4 divide-y divide-white/5">
          {pendingCalls.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Call queue is clear. No calls pending.</div>
          ) : (
            pendingCalls.slice(0, 4).map((c) => (
              <div key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{c.companyName}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${c.priority === "URGENT" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"}`}>{c.priority}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{c.contactPerson} · <span className="text-slate-300 font-mono">{c.phone}</span></div>
                  <div className="mt-1 truncate text-[9px] text-slate-500">{c.reason}</div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={c.clickToCallUrl} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] text-cyan-200 hover:bg-cyan-300/20"><Phone size={12}/> Call</a>
                  <Button onClick={() => onOpenCall(c)}><Edit3 size={12}/> Record Outcome</Button>
                </div>
              </div>
            ))
          )}
        </div>
        {pendingCalls.length > 4 && (
          <button onClick={() => setCurrent("Leads")} className="mt-3 text-[10px] text-violet-300 hover:text-white">View all {pendingCalls.length} queued calls in Leads radar →</button>
        )}
      </Panel>

      {/* Commercial Pipeline Funnel */}
      <Panel className="p-5">
        <div className="text-[10px] uppercase tracking-[.18em] text-violet-300">Sales Pipeline Stages</div>
        <div className="mt-4 space-y-2 text-[10px]">
          <div className="flex items-center justify-between rounded bg-violet-500/25 px-3 py-2 text-violet-100">
            <span>New Leads</span><b>{metrics.newLeads}</b>
          </div>
          <div className="flex items-center justify-between rounded bg-cyan-500/20 px-3 py-2 text-cyan-100">
            <span>Calls / Contacted</span><b>{metrics.callsCompleted}</b>
          </div>
          <div className="flex items-center justify-between rounded bg-blue-500/20 px-3 py-2 text-blue-100">
            <span>Qualified (Tier A & B)</span><b>{metrics.qualifiedLeads}</b>
          </div>
          <div className="flex items-center justify-between rounded bg-amber-400/20 px-3 py-2 text-amber-100">
            <span>Interested / Opportunities</span><b>{metrics.interestedProspects}</b>
          </div>
          <div className="flex items-center justify-between rounded bg-emerald-400/20 px-3 py-2 text-emerald-100">
            <span>Won / Closed</span><b>{metrics.won}</b>
          </div>
        </div>
        <div className="mt-4 border-t border-white/5 pt-3 flex justify-between text-[9px] text-slate-500">
          <span>Gujarat corridor focus</span>
          <span className="text-cyan-200">100% human-verified dispatch</span>
        </div>
      </Panel>
    </div>
  </div>;
}

function LeadsView({
  leads,
  setLeads,
  callQueue,
  setCallQueue,
  onOpenCall,
  onTriggerEngine,
  setCurrent,
  notify,
  settings,
  activepiecesUrl
}: {
  leads: NormalizedLead[];
  setLeads: Dispatch<SetStateAction<NormalizedLead[]>>;
  callQueue: CallQueueItem[];
  setCallQueue: Dispatch<SetStateAction<CallQueueItem[]>>;
  onOpenCall: (item: CallQueueItem) => void;
  onTriggerEngine: () => void;
  setCurrent: (v: View) => void;
  notify: (text: string) => void;
  settings: YuviSettings;
  activepiecesUrl: string;
}) {
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [research, setResearch] = useState<{ name: string; text: string } | null>(null);
  const [researching, setResearching] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = leads.filter(l => {
    const q = query.toLowerCase();
    const matchQ = `${l.companyName} ${l.contactPerson} ${l.city} ${l.category}`.toLowerCase().includes(q);
    const matchTier = tierFilter === "All" || l.tier === tierFilter;
    const matchStatus = statusFilter === "All" || l.status === statusFilter;
    return matchQ && matchTier && matchStatus;
  });

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      notify(`Importing ${file.name}...`);
      const text = await file.text();
      const parseResult = parseLeadSheet(text);

      if (!parseResult.success) {
        notify(`Import error: ${parseResult.errors.join(", ") || "Failed to parse file."}`);
        return;
      }

      notify(`Parsed ${parseResult.validRows} valid rows. Running Sales Engine...`);
      const engineResult = await runDailySalesEngine(parseResult.leads, leads, { baseUrl: activepiecesUrl });

      setLeads(engineResult.processedLeads);
      setCallQueue(engineResult.callQueue);
      notify(`Sales Engine completed: ${engineResult.newLeadsCount} new leads, ${engineResult.callQueue.length} calls queued.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Failed to process sheet: ${msg}`);
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const runResearch = async (l: NormalizedLead) => {
    const key = loadGroqKey();
    if (!key) {
      notify("Add a Groq API key in Settings → API & AI to run real-time research synthesis.");
      return;
    }
    setResearching(l.companyName);
    const api = getApi("lead-research");
    if (!api) {
      notify("Lead Research skill is not enabled.");
      setResearching(null);
      return;
    }
    const result = await (api.execute as (c: string, a?: Record<string, unknown>) => Promise<GenerateBriefResult>)(
      "lead-research.generate-brief",
      {
        lead: { name: l.contactPerson, company: l.companyName, category: l.category, stage: l.status, value: "Commercial" },
        personalityPrompt: settings.identity.personalityPrompt,
        apiKey: key,
        modelId: settings.groq.modelId
      }
    );
    setResearching(null);
    if (result.ok) {
      setResearch({ name: l.companyName, text: result.text });
    } else {
      notify(`Research failed: ${result.reason}`);
    }
  };

  return <div className="rise space-y-5 p-4 sm:p-7">
    <ViewHeading
      view="Leads"
      description="Daily Sales Radar — Normalized, Deduplicated, Tier-Classified, and Call-Prioritized."
      action={
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileUpload}/>
          <Button onClick={() => fileInputRef.current?.click()}><UploadCloud size={14}/> Import CSV/Sheet</Button>
          <Button variant="primary" onClick={onTriggerEngine}><Rocket size={14}/> Run Sales Engine</Button>
          <Button onClick={() => setCurrent("Approvals")}><BadgeCheck size={14}/> Approvals</Button>
        </div>
      }
    />

    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/5 p-4 lg:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/15 px-3">
          <Search size={15} className="text-slate-600"/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search company, contact, city or niche..." className="w-full bg-transparent py-2.5 text-xs text-white outline-none placeholder:text-slate-600"/>
        </div>
        <select value={tierFilter} onChange={e=>setTierFilter(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-slate-400">
          <option value="All">All Tiers</option>
          <option value="A">Tier A (Score 80+)</option>
          <option value="B">Tier B (Score 60-79)</option>
          <option value="C">Tier C (Score 45-59)</option>
          <option value="D">Tier D (Disqualified)</option>
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-slate-400">
          <option value="All">All Statuses</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="INTERESTED">Interested</option>
          <option value="CALLBACK">Callback</option>
          <option value="WON">Won</option>
        </select>
      </div>

      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 text-[9px] text-slate-600">
        <span>{filtered.length} leads visible · 30-day deduplication guard active</span>
        <span className="hidden sm:inline">Activepieces Background Execution Layer</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="border-b border-white/5 text-[9px] uppercase tracking-[.15em] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-normal">Company & Contact</th>
              <th className="px-4 py-3 font-normal">Location</th>
              <th className="px-4 py-3 font-normal">Tier & Score</th>
              <th className="px-4 py-3 font-normal">Channel & Phone</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(l => (
              <tr key={l.id} className="hover:bg-white/[.025]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar text={l.companyName.slice(0,2).toUpperCase()} color="#a87cff"/>
                    <div>
                      <div className="text-xs font-semibold text-slate-100">{l.companyName}</div>
                      <div className="text-[10px] text-slate-400">{l.contactPerson || "Decision Maker"} · {l.category}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[10px] text-slate-300">
                  {l.city}, {l.state}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TierPill tier={l.tier}/>
                    <span className="text-[11px] font-mono font-semibold text-cyan-200">{l.score}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[10px]">
                  {l.phone ? (
                    <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 text-cyan-300 hover:underline">
                      <Phone size={11}/> {l.phone}
                    </a>
                  ) : (
                    <span className="text-slate-500">No phone listed</span>
                  )}
                </td>
                <td className="px-4 py-3"><StatusPill status={l.status}/></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {l.phone && (
                      <button
                        onClick={() => {
                          const callItem = callQueue.find(c => c.leadId === l.id) || {
                            id: `call_${l.id}`,
                            leadId: l.id,
                            companyName: l.companyName,
                            contactPerson: l.contactPerson || "Decision Maker",
                            phone: l.phone,
                            priority: l.tier === "A" ? "URGENT" : "HIGH",
                            reason: l.bottleneck || "Sales engine follow-up",
                            talkingPoints: [
                              `Company: ${l.companyName} (${l.city})`,
                              `Contact: ${l.contactPerson}`,
                              `Bottleneck: ${l.bottleneck || "Conversion architecture"}`,
                              `Primary Service: ${l.primaryService || "Revenue growth"}`,
                              `Goal: Book 15-min discovery consultation`
                            ],
                            clickToCallUrl: `tel:${l.phone}`,
                            callStatus: "PENDING"
                          };
                          onOpenCall(callItem);
                        }}
                        className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2 py-1.5 text-[9px] text-cyan-200 hover:bg-cyan-300/20"
                      >
                        <PhoneCall size={11} className="mr-1 inline"/> Call
                      </button>
                    )}
                    <button
                      onClick={() => runResearch(l)}
                      disabled={researching === l.companyName}
                      className="rounded-lg border border-violet-300/15 bg-violet-300/5 px-2 py-1.5 text-[9px] text-violet-200 hover:bg-violet-300/10 disabled:opacity-50"
                    >
                      <Sparkles size={11} className="mr-1 inline"/> {researching === l.companyName ? "Thinking..." : "AI Intel"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>

    {research && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040510]/75 p-4 backdrop-blur-sm" onClick={() => setResearch(null)}>
        <div className="panel w-full max-w-lg rounded-2xl p-6" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow">Researcher / Deep Intelligence</div>
              <h3 className="mt-2 text-lg text-white">{research.name}</h3>
            </div>
            <button onClick={() => setResearch(null)} className="text-slate-500 hover:text-white"><X size={18}/></button>
          </div>
          <p className="mt-5 whitespace-pre-wrap text-xs leading-6 text-slate-300">{research.text}</p>
        </div>
      </div>
    )}
  </div>;
}

function CallModal({
  call,
  onClose,
  onRecordOutcome
}: {
  call: CallQueueItem;
  onClose: () => void;
  onRecordOutcome: (callId: string, outcome: string, notes: string, nextDate: string) => void;
}) {
  const [outcome, setOutcome] = useState("Connected - Interested");
  const [notes, setNotes] = useState("");
  const [nextDate, setNextDate] = useState(() => new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split("T")[0]);

  const save = (e: FormEvent) => {
    e.preventDefault();
    onRecordOutcome(call.id, outcome, notes, nextDate);
    onClose();
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040510]/80 p-4 backdrop-blur-md" onClick={onClose}>
    <div className="panel w-full max-w-lg rounded-2xl p-6" onClick={e=>e.stopPropagation()}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow">Hunter / Phone Discovery Call</span>
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${call.priority === "URGENT" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-cyan-500/20 text-cyan-300"}`}>{call.priority}</span>
          </div>
          <h3 className="mt-1 text-lg font-bold text-white">{call.companyName}</h3>
          <div className="text-xs text-slate-400">Speak with: <b className="text-slate-200">{call.contactPerson}</b></div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-3">
        <div>
          <div className="text-[10px] text-cyan-300">Click to call directly on device:</div>
          <div className="text-sm font-mono font-bold text-white">{call.phone}</div>
        </div>
        <a href={call.clickToCallUrl} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-300">
          <Phone size={14}/> Dial Now
        </a>
      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-4">
        <div className="text-[10px] uppercase tracking-wider text-violet-300">Talking Points & Commercial Angle</div>
        <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
          {call.talkingPoints.map((tp, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-cyan-400">•</span>
              <span>{tp}</span>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={save} className="mt-5 space-y-3">
        <div>
          <label className="text-[10px] text-slate-400">Call Outcome</label>
          <select value={outcome} onChange={e=>setOutcome(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none">
            <option value="Connected - Interested">Connected - Interested in consultation</option>
            <option value="Callback requested">Callback requested</option>
            <option value="No answer">No answer / Voicemail</option>
            <option value="Not interested">Not interested / Wrong fit</option>
            <option value="Meeting booked">Meeting booked directly</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-400">Call Notes & Observations</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Spoke with founder, discussed SG Highway showroom client pipeline..." className="mt-1 h-18 w-full resize-none rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none placeholder:text-slate-600"/>
        </div>

        <div>
          <label className="text-[10px] text-slate-400">Next Action Scheduled Date</label>
          <input type="date" value={nextDate} onChange={e=>setNextDate(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none"/>
        </div>

        <Button type="submit" variant="primary" className="mt-4 w-full">Record Outcome & Auto-Schedule Next Step</Button>
      </form>
    </div>
  </div>;
}

function ApprovalsView({
  approvals,
  setApprovals,
  selectedId,
  setSelectedId,
  notify
}: {
  approvals: Approval[];
  setApprovals: Dispatch<SetStateAction<Approval[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  notify: (text: string) => void;
}) {
  const selected = approvals.find(a => a.id === selectedId);
  const [filter, setFilter] = useState<"ALL"|ApprovalStatus>("ALL");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const shown = approvals.filter(a => filter === "ALL" || a.status === filter);

  const transition = (id: string, status: ApprovalStatus) => {
    setApprovals(items => items.map(item => item.id === id ? { ...item, status } : item));
    notify(status === "APPROVED" ? "Approved! Staged for Hunter controlled dispatch." : `Approval marked ${status.toLowerCase()}`);
  };

  const saveEdit = (id: string) => {
    setApprovals(items => items.map(item => item.id === id ? { ...item, exactMessage: editText, status: "APPROVED" } : item));
    setEditing(false);
    notify("Draft updated and marked as APPROVED for dispatch.");
  };

  return <div className="rise space-y-5 p-4 sm:p-7">
    <ViewHeading
      view="Approvals"
      description="Consequential Action Gate — Hunter never dispatches unapproved outreach. Human consent is mandatory."
      action={
        <div className="flex items-center gap-2">
          <select value={filter} onChange={e=>setFilter(e.target.value as "ALL"|ApprovalStatus)} className="min-h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] text-slate-300">
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      }
    />

    <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs text-amber-200">
      🛡️ <b>Safe Sending Policy Armed:</b> No external WhatsApp, email, or SMS messages are transmitted automatically. Every outbound communication is staged here first for founder authorization.
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
      <div className="space-y-3">
        {shown.map(item => (
          <Panel key={item.id} className={`p-4 sm:p-5 ${selectedId===item.id?"border-violet-300/45":""}`}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                {item.type.includes("WhatsApp") ? <MessageCircle size={18}/> : item.type.includes("Report") ? <FileBarChart size={18}/> : <Send size={18}/>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] uppercase tracking-[.15em] text-violet-300">{item.type}</span>
                  {item.tier && <TierPill tier={item.tier}/>}
                  <StatusPill status={item.status}/>
                </div>
                <h3 className="mt-1 text-sm font-semibold text-white">{item.title}</h3>
                <div className="mt-1 text-[10px] text-slate-500">{item.workspace} · by {item.createdBy} · {item.timestamp}</div>
              </div>
            </div>

            <p className="mt-4 text-[11px] leading-5 text-slate-400">{item.description}</p>

            {item.exactMessage && (
              <div className="mt-3 rounded-lg border border-white/5 bg-black/20 p-3">
                <div className="text-[9px] uppercase tracking-wider text-slate-500">Staged 3-Part Outreach Copy</div>
                <div className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-200">{item.exactMessage}</div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={()=>transition(item.id,"APPROVED")} disabled={item.status==="APPROVED" || item.status==="PUBLISHED / COMPLETED"}><Check size={13}/> Approve for Hunter</Button>
              <Button variant="danger" onClick={()=>transition(item.id,"REJECTED")} disabled={item.status==="REJECTED"}><XCircle size={13}/> Reject & Disqualify</Button>
              <Button onClick={()=>{setSelectedId(item.id);setEditText(item.exactMessage || "");setEditing(true)}}><Edit3 size={13}/> Edit Copy</Button>
            </div>
          </Panel>
        ))}
      </div>

      <div>
        <Panel className="p-5">
          <div className="eyebrow">Approval Review & Details</div>
          {selected ? (
            <div className="mt-4 space-y-4 text-xs">
              <h3 className="text-sm font-semibold text-white">{selected.title}</h3>
              <div className="rounded-lg bg-black/20 p-3 text-slate-300">
                <div className="text-[10px] text-slate-500">Workspace / Engine</div>
                <div className="mt-1 font-medium">{selected.workspace}</div>
                <div className="mt-2 text-[10px] text-slate-500">Authorizing Agent</div>
                <div className="mt-1 text-cyan-300">{selected.createdBy}</div>
              </div>
              {editing ? (
                <div className="space-y-2">
                  <div className="text-[10px] text-violet-300">Edit Staged Copy:</div>
                  <textarea value={editText} onChange={e=>setEditText(e.target.value)} className="h-44 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 font-mono text-xs text-white outline-none"/>
                  <div className="flex gap-2">
                    <Button onClick={()=>setEditing(false)}>Cancel</Button>
                    <Button variant="primary" onClick={()=>saveEdit(selected.id)}>Save & Approve</Button>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] leading-5 text-slate-400">
                  Select an item to view full inspection notes, verify claims, or edit draft before Hunter dispatch.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 text-center text-xs text-slate-500">Select an approval item on the left to preview full details.</div>
          )}
        </Panel>
      </div>
    </div>
  </div>;
}

function ChatView({
  conversations,
  setConversations,
  selectedId,
  setSelectedId,
  notify,
  settings,
  leads,
  callQueue,
  report,
  onTriggerEngine
}: {
  conversations: Conversation[];
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  selectedId: string;
  setSelectedId: (id: string) => void;
  notify: (text: string) => void;
  settings: YuviSettings;
  leads: NormalizedLead[];
  callQueue: CallQueueItem[];
  report?: DailySalesReport;
  onTriggerEngine: () => void;
}) {
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const selected = conversations.find(c => c.id === selectedId) || conversations[0];

  const send = async () => {
    const clean = text.trim();
    if (!clean) return;

    const userMsg: Message = {
      id: `m-${Date.now()}-user`,
      role: "user",
      text: clean,
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    };

    setConversations(items => items.map(c => c.id === selected.id ? { ...c, messages: [...c.messages, userMsg], updatedAt: "Just now" } : c));
    setText("");
    setThinking(true);

    // Check daily commands first
    const intent = detectDailyIntent(clean);
    if (intent !== "UNKNOWN") {
      const dailyResult = handleDailyCommand(intent, { leads, callQueue, report, onTriggerEngine });
      if (dailyResult.handled) {
        setThinking(false);
        const yuviMsg: Message = {
          id: `m-${Date.now()}-yuvi`,
          role: "yuvi",
          text: dailyResult.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        };
        setConversations(items => items.map(c => c.id === selected.id ? { ...c, messages: [...c.messages, yuviMsg], preview: dailyResult.replyText.slice(0, 80) } : c));
        return;
      }
    }

    // Fall back to Groq if key exists
    const key = loadGroqKey();
    if (key) {
      const systemPrompt = `${settings.identity.personalityPrompt}\n\n${settings.identity.customInstructions}\n\nCurrent Context: You are running the Yugantar Growth Sales Engine. Leads in radar: ${leads.length}. Calls queued: ${callQueue.length}. Qualified: ${leads.filter(l=>l.tier==="A"||l.tier==="B").length}.`;
      const history = selected.messages.slice(-6).map(m => ({ role: m.role === "yuvi" ? "assistant" as const : "user" as const, content: m.text }));
      const result = await askGroq([{ role: "system", content: systemPrompt }, ...history, { role: "user", content: clean }], key, settings.groq.modelId);
      setThinking(false);
      const reply = result.ok ? result.text : `⚠️ ${result.reason}`;
      const yuviMsg: Message = {
        id: `m-${Date.now()}-yuvi`,
        role: "yuvi",
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      };
      setConversations(items => items.map(c => c.id === selected.id ? { ...c, messages: [...c.messages, yuviMsg], preview: reply.slice(0, 80) } : c));
      return;
    }

    // Deterministic offline response
    setThinking(false);
    const offlineReply = `I received your command: "${clean}".\n\nSales Engine Status: Active (${leads.length} leads in radar, ${callQueue.filter(c=>c.callStatus==="PENDING").length} calls due today). Add a Groq API key in Settings to enable natural voice/conversational synthesis, or try asking:\n• "Work on my leads today"\n• "Give me todays calls"\n• "Prepare todays outreach"\n• "Show hot leads"\n• "What should I do today?"\n• "Give me todays sales report"`;
    const yuviMsg: Message = {
      id: `m-${Date.now()}-yuvi`,
      role: "yuvi",
      text: offlineReply,
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    };
    setConversations(items => items.map(c => c.id === selected.id ? { ...c, messages: [...c.messages, yuviMsg], preview: offlineReply.slice(0, 80) } : c));
  };

  return <div className="rise flex min-h-[calc(100dvh-74px)] flex-col p-3 sm:p-5 lg:p-7">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <div className="eyebrow">YUVI / Executive Command Deck</div>
        <p className="mt-1 text-[10px] text-slate-500">Natural Language Control Plane for Sales Engine & Activepieces</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onTriggerEngine}><Rocket size={13}/> Run Sales Engine</Button>
      </div>
    </div>

    <div className="panel flex min-h-[610px] flex-1 overflow-hidden rounded-xl">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-white/5 p-3 sm:p-4">
          <Avatar text="YU" color="#a87cff"/>
          <div>
            <div className="text-xs font-semibold text-white">{selected?.title || "Daily Sales Command"}</div>
            <div className="text-[9px] text-cyan-300">Active conversation · Sales Engine connected</div>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-7">
          {selected?.messages.map(m => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              <div className={`flex max-w-[86%] items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                {m.role === "yuvi" ? <Avatar text="YU" color="#a87cff"/> : <Avatar text="SP" color="#d59aff"/>}
                <div>
                  <div className={`rounded-2xl border p-3.5 text-xs leading-5 whitespace-pre-wrap ${m.role === "user" ? "border-violet-300/20 bg-violet-500/15 text-violet-50" : "border-white/8 bg-black/15 text-slate-200"}`}>
                    {m.text}
                  </div>
                  <div className={`mt-1 text-[9px] text-slate-600 ${m.role === "user" ? "text-right" : ""}`}>{m.timestamp}</div>
                </div>
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex items-center gap-3">
              <Avatar text="YU" color="#a87cff"/>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-[10px] text-violet-200">
                <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300"/>
                Consulting sales radar & synthesizing action plan...
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/5 p-3 sm:p-4">
          <div className="rounded-xl border border-violet-300/20 bg-black/20 p-2">
            <textarea
              value={text}
              onChange={e=>setText(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}}
              placeholder="Tell YUVI what you want done (e.g. 'Work on my leads today', 'Give me todays calls')..."
              className="h-16 w-full resize-none bg-transparent p-2 text-xs text-white outline-none placeholder:text-slate-600"
            />
            <div className="flex items-center justify-between border-t border-white/5 pt-2">
              <span className="text-[9px] text-slate-500">Enter to send · Supports 10+ daily business commands</span>
              <Button variant="primary" onClick={send} disabled={!text.trim()}><Send size={13}/> Send</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>;
}

function SettingsView({
  onLock,
  settings,
  setSettings,
  notify,
  activepiecesUrl,
  setActivepiecesUrl
}: {
  onLock: () => void;
  settings: YuviSettings;
  setSettings: Dispatch<SetStateAction<YuviSettings>>;
  notify: (text: string) => void;
  activepiecesUrl: string;
  setActivepiecesUrl: (url: string) => void;
}) {
  const tabs = ["API & AI", "Activepieces Runtime", "Security", "YUVI Identity"];
  const [tab, setTab] = useState(tabs[0]);
  const [testingAp, setTestingAp] = useState(false);
  const [apStatus, setApStatus] = useState<string>("");

  const testAp = async () => {
    setTestingAp(true);
    const res = await testActivepiecesConnection(activepiecesUrl);
    setTestingAp(false);
    setApStatus(res.message);
    notify(res.message);
  };

  return <div className="rise space-y-5 p-4 sm:p-7">
    <ViewHeading view="Settings" description="Configure runtime edges, AI credentials, and Activepieces background execution."/>
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <Panel className="h-fit p-2">
        {tabs.map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[10px] ${tab===t?"bg-violet-500/15 text-white":"text-slate-500 hover:bg-white/[.04] hover:text-slate-300"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${tab===t?"bg-cyan-300":"bg-slate-700"}`}/>{t}
          </button>
        ))}
      </Panel>

      <Panel className="min-h-[520px] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="eyebrow">Configuration surface</div><h3 className="mt-2 text-xl text-white">{tab}</h3></div>
          <span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-1.5 text-[9px] text-amber-200">Local-first persistence</span>
        </div>

        {tab === "API & AI" && <SettingsApi settings={settings} updateSettings={patch => setSettings(s => ({ ...s, groq: { ...s.groq, ...patch } }))} notify={notify}/>}

        {tab === "Activepieces Runtime" && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-4 text-xs text-cyan-200">
              ⚡ <b>Activepieces Background Runtime Bridge:</b> YUVI acts as the brain and orchestrator, dispatching heavy employee background tasks to Activepieces via webhooks.
            </div>

            <SettingRow label="Activepieces Instance URL" description="Target Activepieces deployment or container endpoint.">
              <input
                type="text"
                value={activepiecesUrl}
                onChange={e => setActivepiecesUrl(e.target.value)}
                placeholder="http://localhost:8080"
                className="w-72 rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-white outline-none"
              />
            </SettingRow>

            <SettingRow label="Connection Health" description="Ping the Activepieces runtime to verify webhook readiness.">
              <div className="flex items-center gap-3">
                <Button onClick={testAp} disabled={testingAp}>
                  {testingAp ? <RefreshCw size={13} className="animate-spin"/> : <Link2 size={13}/>} Test Bridge
                </Button>
                {apStatus && <span className="text-[10px] text-slate-300">{apStatus}</span>}
              </div>
            </SettingRow>
          </div>
        )}

        {tab === "Security" && (
          <div className="mt-5">
            <SettingRow label="Lock Session" description="Return to lock screen immediately without clearing memory.">
              <Button onClick={onLock}><Lock size={13}/> Lock Now</Button>
            </SettingRow>
          </div>
        )}

        {tab === "YUVI Identity" && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-[10px] text-slate-400">Personality & Commercial Mission</label>
              <textarea
                value={settings.identity.personalityPrompt}
                onChange={e=>setSettings(s=>({...s,identity:{...s.identity,personalityPrompt:e.target.value}}))}
                className="mt-1 h-36 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white outline-none"
              />
            </div>
            <Button onClick={()=>notify("Identity updated locally.")}><Save size={13}/> Save Identity</Button>
          </div>
        )}
      </Panel>
    </div>
  </div>;
}

function SettingsApi({settings,updateSettings,notify}:{settings:YuviSettings;updateSettings:(patch:Partial<YuviSettings["groq"]>)=>void;notify:(t:string)=>void}){
  const [key,setKey]=useState(()=>loadGroqKey());
  const [showKey,setShowKey]=useState(false);
  const [testing,setTesting]=useState(false);
  const [lastError,setLastError]=useState("");
  const save=()=>{
    if(!key.trim()){notify("Enter a Groq API key before saving.");return}
    saveGroqKey(key);
    updateSettings({hasKey:true,keyLastFour:key.slice(-4),connectionStatus:"not_connected"});
    setLastError("");
    notify("Key saved locally. It is never logged or displayed in full.");
  };
  const test=async()=>{
    if(!key.trim()){notify("Enter a Groq API key before testing.");return}
    setTesting(true);setLastError("");
    const result=await testGroqConnection(key);
    setTesting(false);
    if(result.ok){updateSettings({connectionStatus:"connected",hasKey:true,keyLastFour:key.slice(-4)});notify(`Connected — Groq confirmed the key (${result.modelCount} models visible).`);}
    else{updateSettings({connectionStatus:"failed"});setLastError(result.reason);notify(`Connection failed: ${result.reason}`);}
  };
  const status=settings.groq.connectionStatus;
  return <div className="mt-5"><SettingRow label="Groq API key" description="Stored in your browser's local storage for this preview. Never logged, never shown in full."><div className="flex items-center gap-2"><input type={showKey?"text":"password"} value={key} onChange={e=>setKey(e.target.value)} placeholder="gsk_..." aria-label="Groq API key" className="w-44 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-white outline-none focus:border-violet-300/40 sm:w-56"/><button onClick={()=>setShowKey(v=>!v)} aria-label={showKey?"Hide key":"Show key"} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><Eye size={14}/></button><Button onClick={save}><Save size={13}/> Save</Button></div></SettingRow>{settings.groq.hasKey&&<div className="border-b border-white/5 py-3 text-[10px] text-slate-500">Saved key ends in <span className="text-cyan-200">{settings.groq.keyLastFour}</span>.</div>}<SettingRow label="Default model" description="Sent as the model id once a live call is made."><select value={settings.groq.modelId} onChange={e=>updateSettings({modelId:e.target.value})} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-slate-300">{GROQ_MODELS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></SettingRow><SettingRow label="Connection status" description="Only shows Connected after a real successful call to Groq."><span className={`rounded-full border px-2 py-1 text-[9px] ${status==="connected"?"border-emerald-300/25 bg-emerald-300/10 text-emerald-200":status==="failed"?"border-rose-300/25 bg-rose-300/10 text-rose-200":"border-amber-300/20 text-amber-200"}`}>{status==="connected"?"Connected":status==="failed"?"Failed":"Not connected"}</span></SettingRow><SettingRow label="Test connection" description="Makes a real request to Groq's API using the key above."><Button onClick={test} disabled={testing}>{testing?<><RefreshCw size={13} className="animate-spin"/> Testing…</>:<><RefreshCw size={13}/> Test connection</>}</Button></SettingRow>{lastError&&<div className="mt-3 rounded-lg border border-rose-300/20 bg-rose-300/5 p-3 text-[10px] leading-4 text-rose-200">{lastError}</div>}</div>}

function SettingRow({ label, description, children }: { label:string;description:string;children:ReactNode }) { return <div className="flex flex-col gap-3 border-b border-white/5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs text-slate-200">{label}</div><div className="mt-1 max-w-lg text-[10px] leading-4 text-slate-600">{description}</div></div>{children}</div> }

function ViewHeading({ view, description, action }: { view: View; description: string; action?: ReactNode }) {
  return <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="text-[10px] uppercase tracking-[.2em] text-violet-300">YUVI / {view}</div><h2 className="mt-2 text-2xl font-semibold text-white">{view}</h2><p className="mt-1 max-w-xl text-xs text-slate-500">{description}</p></div>{action}</div>;
}

function Button({ children, onClick, variant = "ghost", disabled = false, type = "button", className = "" }: { children: ReactNode; onClick?: () => void; variant?: "ghost"|"primary"|"danger"; disabled?: boolean; type?: "button"|"submit"; className?: string }) {
  const style = variant === "primary" ? "bg-violet-500 text-white hover:bg-violet-400" : variant === "danger" ? "border border-rose-300/20 bg-rose-300/5 text-rose-200 hover:bg-rose-300/10" : "border border-white/10 bg-white/[.03] text-slate-300 hover:border-violet-300/30 hover:text-white";
  return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[10px] disabled:cursor-not-allowed disabled:opacity-40 ${style} ${className}`}>{children}</button>;
}

export function YuviOS() {
  const [view, setView] = useState<View>("Dashboard");
  const [sidebar, setSidebar] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [locked, setLocked] = useState(false);
  const [toast, setToast] = useState("");
  const [notifPanel, setNotifPanel] = useState(false);
  const [activeCall, setActiveCall] = useState<CallQueueItem | null>(null);

  const [settings, setSettings] = useState<YuviSettings>(() => loadSettings());
  useEffect(() => { saveSettings(settings); }, [settings]);

  const [activepiecesUrl, setActivepiecesUrl] = useState<string>(() => store.read("activepieces_url", "http://localhost:8080"));
  useEffect(() => { store.write("activepieces_url", activepiecesUrl); }, [activepiecesUrl]);

  const [leads, setLeads] = useState<NormalizedLead[]>(() => store.read("normalized_leads", initialGujaratLeads));
  useEffect(() => { store.write("normalized_leads", leads); }, [leads]);

  const [callQueue, setCallQueue] = useState<CallQueueItem[]>(() => {
    return initialGujaratLeads.filter(l => l.phone).map(l => ({
      id: `call_${l.id}`,
      leadId: l.id,
      companyName: l.companyName,
      contactPerson: l.contactPerson || "Decision Maker",
      phone: l.phone,
      priority: l.tier === "A" ? "URGENT" : "HIGH",
      reason: l.bottleneck || "Sales engine follow-up",
      talkingPoints: [
        `Reference firm: "${l.companyName}" based in ${l.city}, ${l.state}.`,
        `Decision Maker: Speak directly with ${l.contactPerson || "founder / principal"}.`,
        `Hook / Bottleneck: "${l.bottleneck || "Expanding predictable high-value client pipeline in Gujarat"}".`,
        `Core Offer: ${l.primaryService || "Yugantar Growth revenue architecture"}.`,
        `Call Objective: Secure 15-minute diagnostic walkthrough meeting.`
      ],
      clickToCallUrl: `tel:${l.phone}`,
      callStatus: "PENDING"
    }));
  });

  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>(() => store.read("conversations", initialConversations));
  useEffect(() => { store.write("conversations", conversations); }, [conversations]);

  const [selectedConversation, setSelectedConversation] = useState(() => store.read("selected_conversation", "conv-01"));
  const [notifs, setNotifs] = useState<Notif[]>(initialNotifs);

  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(""), 2800); };
  const navigateTo = (next: View) => { setView(next); setSidebar(false); setUserMenu(false); setNotifPanel(false); };

  // Dynamic Sales Dashboard Metrics
  const metrics: DailySalesDashboardMetrics = useMemo(() => {
    const tierCounts = { A: 0, B: 0, C: 0, D: 0 };
    let callsCompleted = 0;
    let interestedCount = 0;
    let wonCount = 0;
    let lostCount = 0;

    leads.forEach(l => {
      tierCounts[l.tier]++;
      if (l.status === "CONTACTED") callsCompleted++;
      if (l.status === "INTERESTED") interestedCount++;
      if (l.status === "WON") wonCount++;
      if (l.status === "LOST") lostCount++;
    });

    const pendingCallsCount = callQueue.filter(c => c.callStatus === "PENDING").length;
    const pendingApprovalsCount = approvals.filter(a => a.status === "PENDING").length;

    return {
      totalLeads: leads.length,
      newLeads: leads.filter(l => l.status === "NEW").length,
      qualifiedLeads: tierCounts.A + tierCounts.B,
      tierBreakdown: tierCounts,
      callsDue: pendingCallsCount,
      callsCompleted,
      outreachDue: pendingApprovalsCount,
      followUpsDue: leads.filter(l => l.status === "CALLBACK").length,
      replies: interestedCount,
      interestedProspects: interestedCount,
      meetingsOpportunities: interestedCount,
      won: wonCount,
      lost: lostCount,
      pendingActions: pendingCallsCount + pendingApprovalsCount
    };
  }, [leads, callQueue, approvals]);

  const triggerSalesEngine = async () => {
    notify("Starting Daily Sales Engine for Yugantar Growth...");
    const rawInputs = leads.map(l => ({
      companyName: l.companyName,
      contactPerson: l.contactPerson,
      phone: l.phone,
      email: l.email,
      websiteUrl: l.websiteUrl,
      city: l.city,
      state: l.state,
      country: l.country,
      industry: l.industry,
      category: l.category,
      notes: l.notes,
      rawRecord: l.rawRecord
    }));

    const result = await runDailySalesEngine(rawInputs, [], { baseUrl: activepiecesUrl });
    setLeads(result.processedLeads);
    setCallQueue(result.callQueue);
    notify(`Sales Engine completed! ${result.newLeadsCount} leads processed, ${result.callQueue.length} calls queued.`);
  };

  const handleRecordCallOutcome = (callId: string, outcome: string, notes: string, nextDate: string) => {
    setCallQueue(prev => prev.map(c => {
      if (c.id === callId) {
        return {
          ...c,
          callStatus: outcome === "No answer" ? "NO_ANSWER" : outcome === "Callback requested" ? "CALLBACK_REQUESTED" : "COMPLETED",
          outcomeNotes: notes,
          calledAt: new Date().toISOString(),
          nextScheduledFollowUp: nextDate
        };
      }
      return c;
    }));

    const targetCall = callQueue.find(c => c.id === callId);
    if (targetCall) {
      setLeads(prev => prev.map(l => {
        if (l.id === targetCall.leadId) {
          const newStatus = outcome === "Connected - Interested" || outcome === "Meeting booked" ? "INTERESTED" : outcome === "Callback requested" ? "CALLBACK" : outcome === "Not interested" ? "NOT_INTERESTED" : "CONTACTED";
          return { ...l, status: newStatus, notes: notes ? `${l.notes}\n[Call]: ${notes}` : l.notes };
        }
        return l;
      }));
    }

    notify(`Outcome recorded: ${outcome}. Pipeline updated.`);
  };

  const content = useMemo(() => {
    if (view === "Dashboard") {
      return <Dashboard
        metrics={metrics}
        callQueue={callQueue}
        onOpenCall={setActiveCall}
        onTriggerEngine={triggerSalesEngine}
        setCurrent={navigateTo}
        onAdd={() => navigateTo("Leads")}
      />;
    }
    if (view === "Leads") {
      return <LeadsView
        leads={leads}
        setLeads={setLeads}
        callQueue={callQueue}
        setCallQueue={setCallQueue}
        onOpenCall={setActiveCall}
        onTriggerEngine={triggerSalesEngine}
        setCurrent={navigateTo}
        notify={notify}
        settings={settings}
        activepiecesUrl={activepiecesUrl}
      />;
    }
    if (view === "Approvals") {
      return <ApprovalsView
        approvals={approvals}
        setApprovals={setApprovals}
        selectedId={selectedApproval}
        setSelectedId={setSelectedApproval}
        notify={notify}
      />;
    }
    if (view === "Chat") {
      return <ChatView
        conversations={conversations}
        setConversations={setConversations}
        selectedId={selectedConversation}
        setSelectedId={setSelectedConversation}
        notify={notify}
        settings={settings}
        leads={leads}
        callQueue={callQueue}
        onTriggerEngine={triggerSalesEngine}
      />;
    }
    if (view === "Settings") {
      return <SettingsView
        onLock={() => setLocked(true)}
        settings={settings}
        setSettings={setSettings}
        notify={notify}
        activepiecesUrl={activepiecesUrl}
        setActivepiecesUrl={setActivepiecesUrl}
      />;
    }

    // Secondary Views: AI Team, Pipeline, Reports, Notifications
    if (view === "AI Team") {
      return <div className="rise space-y-5 p-4 sm:p-7">
        <ViewHeading view="AI Team" description="Active AI Employees — Coordinated via Task Execution System."/>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Object.values(EMPLOYEES).map(emp => (
            <Panel key={emp.id} className="p-5">
              <div className="flex items-center gap-3">
                <Avatar text={emp.name.slice(0,2)} color={emp.color} size="h-10 w-10"/>
                <div>
                  <h3 className="text-base font-semibold text-white">{emp.name}</h3>
                  <p className="text-[10px] text-slate-500">{emp.role}</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-slate-400">{emp.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {emp.capabilities.slice(0, 4).map(c => (
                  <span key={c} className="rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 text-[9px] text-slate-400">{c}</span>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-black/15 p-3 text-[10px] text-slate-300">
                <span className="text-[9px] uppercase tracking-wider text-slate-500">Allowed Tools: </span>
                {emp.allowedTools.join(", ")}
              </div>
            </Panel>
          ))}
        </div>
      </div>;
    }

    if (view === "Pipeline") {
      return <div className="rise space-y-5 p-4 sm:p-7">
        <ViewHeading view="Pipeline" description="Gujarat Commercial Opportunities by Sales Lifecycle Stage."/>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { stage: "NEW", label: "New Prospects" },
            { stage: "CONTACTED", label: "Contacted / In Discovery" },
            { stage: "INTERESTED", label: "Interested / Callbacks" },
            { stage: "WON", label: "Won / Retained" }
          ].map(({ stage, label }) => {
            const list = leads.filter(l => l.status === stage || (stage === "NEW" && l.status === "IN_RESEARCH"));
            return (
              <Panel key={stage} className="min-h-[300px] p-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[10px] font-semibold text-slate-300">
                  <span>{label}</span>
                  <span className="rounded bg-violet-400/10 px-2 py-0.5 text-violet-200">{list.length}</span>
                </div>
                <div className="mt-3 space-y-2.5">
                  {list.map(l => (
                    <div key={l.id} className="rounded-lg border border-white/5 bg-black/20 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{l.companyName}</span>
                        <TierPill tier={l.tier}/>
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400">{l.contactPerson} · {l.city}</div>
                      <div className="mt-2 text-[9px] text-cyan-300">{l.phone || "No phone"}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      </div>;
    }

    if (view === "Reports") {
      return <div className="rise space-y-5 p-4 sm:p-7">
        <ViewHeading view="Reports" description="Daily Sales Engine Analytics & Conversion Intelligence."/>
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel className="p-5 lg:col-span-2">
            <div className="eyebrow">Operating Health & Velocity</div>
            <div className="mt-2 text-3xl font-bold text-white">88 <span className="text-sm font-normal text-slate-500">/ 100</span></div>
            <Sparkline color="#43e6d0"/>
            <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-4 text-[10px]">
              <div><span className="text-slate-500">Qualified Leads</span><b className="mt-1 block text-slate-100">{metrics.qualifiedLeads}</b></div>
              <div><span className="text-slate-500">Calls Completed</span><b className="mt-1 block text-slate-100">{metrics.callsCompleted}</b></div>
              <div><span className="text-slate-500">Opportunities</span><b className="mt-1 block text-slate-100">{metrics.meetingsOpportunities}</b></div>
            </div>
          </Panel>
          <Panel className="p-5">
            <div className="eyebrow">Executive Brief</div>
            <div className="mt-3 text-xs leading-5 text-slate-300">
              The Daily Sales Engine is actively qualifying Gujarat commercial leads. Priority focus is on Tier A targets in Ahmedabad and Surat, with direct WhatsApp introductions following human approval.
            </div>
          </Panel>
        </div>
      </div>;
    }

    return <div className="p-7 text-xs text-slate-500">View under active mission management.</div>;
  }, [view, metrics, callQueue, leads, approvals, selectedApproval, conversations, selectedConversation, settings, activepiecesUrl]);

  return <div className="yuvi">
    <style>{css}</style>
    <div className="flex min-h-[100dvh]">
      <Sidebar current={view} setCurrent={navigateTo} open={sidebar} onUser={()=>setUserMenu(v=>!v)}/>
      <main className="min-w-0 flex-1 overflow-hidden">
        <Header
          view={view}
          onAdd={() => navigateTo("Leads")}
          onMenu={() => setSidebar(true)}
          onUser={() => setUserMenu(v=>!v)}
          notifs={notifs}
          onOpenNotif={n => { setNotifs(items=>items.map(i=>i.id===n.id?{...i,read:true}:i)); navigateTo(n.target?.kind === "approval" ? "Approvals" : "Dashboard"); }}
          onClearNotif={id => setNotifs(items => items.filter(i => i.id !== id))}
          onClearAllNotifs={() => setNotifs([])}
          notifPanel={notifPanel}
          setNotifPanel={setNotifPanel}
        />
        {content}
      </main>
    </div>

    {/* Call Dialog Modal with click-to-call & outcome recorder */}
    {activeCall && (
      <CallModal
        call={activeCall}
        onClose={() => setActiveCall(null)}
        onRecordOutcome={handleRecordCallOutcome}
      />
    )}

    {toast && (
      <div className="fixed bottom-5 left-1/2 z-[70] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border border-emerald-300/25 bg-[#101d25] px-4 py-3 text-center text-xs text-emerald-200 shadow-xl">
        <CheckCircle2 size={15}/>{toast}
      </div>
    )}
  </div>;
}

export default YuviOS;
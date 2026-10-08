// YuviOS.tsx — Production YUVI AI Business Operating System (Finished Daily-Use OS)
import React, { useMemo, useState, useEffect, type ChangeEvent } from "react";
import yuviLogo from "../../../assets/yuvi-logo.png";
import { store, loadSettings, saveSettings, type YuviSettings } from "./lib/store";
import { runDailySalesEngine } from "./lib/sales/salesEngine";
import { upsertLeadToSupabase, deleteLeadFromSupabase } from "./lib/supabaseClient";
import type { NormalizedLead, CallQueueItem, DailySalesDashboardMetrics, LeadTier } from "./lib/types/sales";
import type { View } from "./components/ui";
import { Avatar, Panel, TierPill, StatusPill } from "./components/ui";

// View Components
import { DashboardView } from "./components/DashboardView";
import { LeadsView } from "./components/LeadsView";
import { PipelineView } from "./components/PipelineView";
import { ClientsView } from "./components/ClientsView";
import { AITeamView } from "./components/AITeamView";
import { ApprovalsView, type ApprovalItem } from "./components/ApprovalsView";
import { ChatView } from "./components/ChatView";
import { KnowledgeBaseView } from "./components/KnowledgeBaseView";
import { ReportsView } from "./components/ReportsView";
import { SettingsView } from "./components/SettingsView";

// Modal Components
import { LeadDetailModal } from "./components/LeadDetailModal";
import { AddLeadModal } from "./components/AddLeadModal";
import { CallModal } from "./components/CallModal";

import {
  Home, BadgeCheck, MessageSquare, Bot, Target, KanbanSquare,
  UsersRound, Database, FileBarChart, Settings2, Menu, Bell,
  Plus, X, ChevronDown, Radio, ShieldCheck, Check
} from "lucide-react";

const VALID_VIEWS: View[] = [
  "Dashboard",
  "Approvals",
  "Chat",
  "AI Team",
  "Leads",
  "Pipeline",
  "Clients",
  "Knowledge Base",
  "Reports",
  "Settings"
];

const nav: { name: View; icon: typeof Home; group?: string }[] = [
  { name: "Dashboard", icon: Home, group: "Workspace" },
  { name: "Approvals", icon: BadgeCheck },
  { name: "Chat", icon: MessageSquare },
  { name: "Leads", icon: Target, group: "Operate & CRM" },
  { name: "Pipeline", icon: KanbanSquare },
  { name: "Clients", icon: UsersRound },
  { name: "AI Team", icon: Bot },
  { name: "Knowledge Base", icon: Database, group: "Intelligence & System" },
  { name: "Reports", icon: FileBarChart },
  { name: "Settings", icon: Settings2 },
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
        body: "Dear Rajesh Jangid,\n\nAt Yugantar Growth, we help premier Gujarat design studios build predictable high-ticket client pipelines.\n\nWould it be worth a short 10-minute briefing call this week to share two growth angles we mapped for Jangid Furniture Studio?\n\nBest regards,\nShlok Pandya\nFounder, Yugantar Growth\nAhmedabad, Gujarat"
      },
      sms: "Hi Rajesh, Shlok from Yugantar Growth here. Put together two commercial client acquisition ideas for Jangid Furniture Studio. Can I send a 2-min brief?"
    },
    tasks: [
      { id: "t-01", title: "Conduct SG Highway showroom walk-in or follow up call", dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split("T")[0], completed: false, createdAt: new Date().toISOString() }
    ],
    activityHistory: [
      { id: "a-01", timestamp: new Date().toISOString(), action: "Scored Tier A (94/100)", author: "Scout" }
    ]
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
    status: "CONTACTED",
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
    approvalStatus: "APPROVED",
    outreachDrafts: {
      whatsapp: "Hello Mara,\n\nI was admiring Urban Habitat's sustainable architectural projects in Bodakdev, Ahmedabad.\n\nAt Yugantar Growth, we partner with premier architects to establish direct high-ticket private client pipelines.\n\nWould it be worth a brief 10-minute call this Thursday to share two growth lanes we analyzed for Urban Habitat?\n\n— Shlok Pandya, Yugantar Growth",
      email: {
        subject: "Private client pipeline angles for Urban Habitat Architects",
        body: "Dear Mara Klein,\n\nAt Yugantar Growth, we help premier architectural studios build direct private client pipelines.\n\nBest regards,\nShlok Pandya"
      }
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
    status: "WON",
    score: 76,
    tier: "B",
    notes: "Commercial office fitouts and turnkey spaces across Gujarat. Retained agency client.",
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
    approvalStatus: "APPROVED"
  }
];

const initialApprovals: ApprovalItem[] = [
  {
    id: "approval-jfs-01",
    type: "Outreach (WhatsApp)",
    title: "Jangid Furniture Studio — Tier A WhatsApp Outreach",
    workspace: "Yugantar Growth / Sales Engine",
    createdBy: "Scout + Hunter",
    timestamp: "Today · 8:15 AM",
    status: "PENDING",
    tier: "A",
    phone: "+919825012345",
    leadId: "lead_jfs_gujarat_01",
    description: "3-part personalized outreach: SG Highway observation + predictable architect pipeline offer + 10-min briefing CTA.",
    exactMessage: "Hello Rajesh,\n\nI was reviewing Jangid Furniture Studio's presence in Ahmedabad and noticed the exceptional bespoke craftsmanship you showcase on SG Highway.\n\nAt Yugantar Growth, we help premier Ahmedabad interior studios build predictable high-ticket architect and builder client pipelines using conversion architecture and dedicated outbound systems.\n\nWould it be worth a short 10-minute briefing call this Thursday or Friday to share two growth angles we mapped for Jangid Furniture Studio?\n\n— Shlok Pandya, Yugantar Growth"
  },
  {
    id: "approval-tradesphere-02",
    type: "Outreach (WhatsApp)",
    title: "Tradesphere Exports — Tier A WhatsApp Outreach",
    workspace: "Yugantar Growth / Sales Engine",
    createdBy: "Scout + Hunter",
    timestamp: "Today · 8:20 AM",
    status: "PENDING",
    tier: "A",
    phone: "+919879054321",
    leadId: "lead_tradesphere_gujarat_02",
    description: "3-part personalized outreach: Surat industrial export observation + global buyer acquisition offer + briefing CTA.",
    exactMessage: "Hello Nikhil,\n\nI was looking into leading industrial export operations in Surat and came across Tradesphere Exports.\n\nAt Yugantar Growth, we help prominent Gujarat export houses systematize high-margin overseas buyer acquisition using targeted conversion funnels and automated qualification.\n\nWould a 10-minute conversation this week be useful to explore two actionable buyer acquisition angles for Tradesphere?\n\n— Shlok Pandya, Yugantar Growth"
  }
];

type Notif = {
  id: string;
  type: string;
  text: string;
  timestamp: string;
  read: boolean;
  targetView: View;
};

const initialNotifs: Notif[] = [
  {
    id: "n-01",
    type: "Approval Required",
    text: "2 Tier A WhatsApp drafts for Jangid Furniture and Tradesphere staged in Approvals.",
    timestamp: "Today · 8:30 AM",
    read: false,
    targetView: "Approvals",
  },
  {
    id: "n-02",
    type: "Important Lead",
    text: "Jangid Furniture Studio (Ahmedabad) scored 94 — Tier A commercial priority.",
    timestamp: "Today · 8:15 AM",
    read: false,
    targetView: "Leads",
  },
  {
    id: "n-03",
    type: "YUVI Briefing",
    text: "Sales Engine ready. Type 'Work on my leads today' or use Voice Mic to command.",
    timestamp: "Today · 8:00 AM",
    read: true,
    targetView: "Chat",
  },
];

const css = `
@keyframes yuvi-rise { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
.yuvi * { box-sizing:border-box }
.yuvi { font-family:'DM Sans',ui-sans-serif,system-ui,sans-serif; color:#e9eaff; background:#070918; min-height:100dvh; }
.yuvi ::-webkit-scrollbar { width:5px; height:5px }
.yuvi ::-webkit-scrollbar-thumb { background:#292450; border-radius:8px }
.yuvi .rise { animation:yuvi-rise .35s both }
.yuvi .panel { background:linear-gradient(145deg,rgba(18,19,45,.9),rgba(10,12,30,.88)); border:1px solid rgba(139,92,246,.18); box-shadow:inset 0 1px rgba(255,255,255,.045),0 14px 40px rgba(0,0,0,.25); }
.yuvi .panel:hover { border-color:rgba(168,135,255,.35); transition:.2s ease }
.yuvi button { transition:.18s ease }
.yuvi button:active { transform:scale(.98) }
.yuvi .signal-grid { background-image:linear-gradient(rgba(125,94,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(125,94,255,.04) 1px,transparent 1px); background-size:32px 32px; mask-image:linear-gradient(to bottom,black,transparent 90%); }
.yuvi .status-dot { display:inline-block;width:6px;height:6px;border-radius:50%;background:#43e6d0;box-shadow:0 0 10px #43e6d0; }
`;

export function YuviOS() {
  const [view, setView] = useState<View>("Dashboard");
  const [sidebar, setSidebar] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [locked, setLocked] = useState(false);
  const [toast, setToast] = useState("");
  const [notifPanel, setNotifPanel] = useState(false);

  // Core CRM & Engine Data
  const [settings, setSettings] = useState<YuviSettings>(() => loadSettings());
  useEffect(() => { saveSettings(settings); }, [settings]);

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
        `Company: "${l.companyName}" based in ${l.city}, ${l.state}.`,
        `Contact: Speak with ${l.contactPerson || "founder / principal"}.`,
        `Hook: "${l.bottleneck || "Expanding predictable high-value client pipeline in Gujarat"}".`,
        `Offer: ${l.primaryService || "Yugantar Growth revenue architecture"}.`,
        `Goal: Secure 15-minute diagnostic walkthrough meeting.`
      ],
      clickToCallUrl: `tel:${l.phone}`,
      callStatus: "PENDING"
    }));
  });

  const [approvals, setApprovals] = useState<ApprovalItem[]>(() => store.read("staged_approvals", initialApprovals));
  useEffect(() => { store.write("staged_approvals", approvals); }, [approvals]);

  const [notifs, setNotifs] = useState<Notif[]>(initialNotifs);

  // Modals state
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<NormalizedLead | null>(null);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [activeCallItem, setActiveCallItem] = useState<CallQueueItem | null>(null);
  const [researchingLeadId, setResearchingLeadId] = useState<string | null>(null);

  // Notification helper
  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 3000);
  };

  // URL Hash Sync for Refresh Stability
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, "").replace(/-/g, " ");
      const found = VALID_VIEWS.find(v => v.toLowerCase() === hash.toLowerCase());
      if (found) {
        setView(found);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateTo = (next: View) => {
    setView(next);
    window.location.hash = next.replace(/\s+/g, "-");
    setSidebar(false);
    setUserMenu(false);
    setNotifPanel(false);
  };

  // Dynamic Sales Metrics
  const metrics: DailySalesDashboardMetrics = useMemo(() => {
    const tierCounts = { A: 0, B: 0, C: 0, D: 0 };
    let callsCompleted = 0;
    let interestedCount = 0;
    let wonCount = 0;
    let lostCount = 0;

    leads.forEach(l => {
      if (tierCounts[l.tier] !== undefined) tierCounts[l.tier]++;
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

  // Daily Sales Engine Execution
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

    const result = await runDailySalesEngine(rawInputs, [], { baseUrl: settings.activepieces?.baseUrl });
    setLeads(result.processedLeads);
    setCallQueue(result.callQueue);
    notify(`Sales Engine completed! ${result.newLeadsCount} leads processed, ${result.callQueue.length} calls queued.`);
  };

  // Lead CRUD handlers
  const handleUpdateLead = (updated: NormalizedLead) => {
    setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)));
    if (selectedLeadForDetail?.id === updated.id) {
      setSelectedLeadForDetail(updated);
    }
    upsertLeadToSupabase(updated, settings.supabase?.url, settings.supabase?.anonKey).catch(() => {});
  };

  const handleAddLead = (newLead: NormalizedLead) => {
    setLeads(prev => [newLead, ...prev]);
    if (newLead.phone) {
      const callItem: CallQueueItem = {
        id: `call_${newLead.id}`,
        leadId: newLead.id,
        companyName: newLead.companyName,
        contactPerson: newLead.contactPerson,
        phone: newLead.phone,
        priority: newLead.tier === "A" ? "URGENT" : "HIGH",
        reason: newLead.bottleneck || "Sales engine follow-up",
        talkingPoints: [
          `Company: ${newLead.companyName} (${newLead.city})`,
          `Contact: ${newLead.contactPerson}`,
          `Angle: ${newLead.bottleneck || "Gujarat client pipeline"}`,
        ],
        clickToCallUrl: `tel:${newLead.phone}`,
        callStatus: "PENDING"
      };
      setCallQueue(prev => [callItem, ...prev]);
    }
    upsertLeadToSupabase(newLead, settings.supabase?.url, settings.supabase?.anonKey).catch(() => {});
  };

  const handleDeleteLead = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setCallQueue(prev => prev.filter(c => c.leadId !== leadId));
    if (selectedLeadForDetail?.id === leadId) {
      setSelectedLeadForDetail(null);
    }
    deleteLeadFromSupabase(leadId, settings.supabase?.url, settings.supabase?.anonKey).catch(() => {});
    notify("Lead deleted from CRM.");
  };

  // Call outcome recording
  const handleRecordCallOutcome = (callId: string, outcome: string, notes: string, nextDate: string) => {
    setCallQueue(prev => prev.map(c => {
      if (c.id === callId) {
        return {
          ...c,
          callStatus: outcome === "No answer" ? "NO_ANSWER" : outcome === "Callback requested" ? "CALLBACK_REQUESTED" : outcome === "Not interested" ? "NOT_INTERESTED" : "COMPLETED",
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
          const newStatus = outcome === "Connected - Interested" || outcome === "Meeting booked" ? "INTERESTED" : outcome === "Callback requested" ? "CALLBACK" : outcome === "Not interested" ? "LOST" : "CONTACTED";
          return {
            ...l,
            status: newStatus,
            notes: notes ? `${l.notes}\n[Call]: ${notes}` : l.notes,
            activityHistory: [
              { id: `act_${Date.now()}`, timestamp: new Date().toISOString(), action: `Call Outcome: ${outcome}`, note: notes, author: "Shlok Pandya" },
              ...(l.activityHistory || [])
            ]
          };
        }
        return l;
      }));
    }

    notify(`Recorded call outcome: ${outcome}. Pipeline updated.`);
  };

  // Researcher trigger
  const handleRunResearch = (lead: NormalizedLead) => {
    setResearchingLeadId(lead.id);
    notify(`Researcher analyzing digital footprint for ${lead.companyName}...`);
    window.setTimeout(() => {
      setResearchingLeadId(null);
      notify(`Intelligence verified for ${lead.companyName}. Checked Gujarat presence and commercial services.`);
      if (selectedLeadForDetail?.id === lead.id) {
        setSelectedLeadForDetail(lead);
      }
    }, 1200);
  };

  // Lock screen view
  if (locked) {
    return (
      <div className="yuvi flex min-h-[100dvh] items-center justify-center p-4">
        <style>{css}</style>
        <div className="panel w-full max-w-sm rounded-2xl p-7 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-300 border border-violet-500/30">
            <Radio size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">YUVI Command Deck Locked</h2>
          <p className="text-xs text-slate-400">Founder session protected. Tap below to resume.</p>
          <button
            onClick={() => setLocked(false)}
            className="w-full rounded-xl bg-violet-600 py-3 text-xs font-bold text-white hover:bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]"
          >
            Unlock Session
          </button>
        </div>
      </div>
    );
  }

  // Active View Renderer
  const renderCurrentView = () => {
    switch (view) {
      case "Dashboard":
        return (
          <DashboardView
            metrics={metrics}
            callQueue={callQueue}
            onOpenCall={setActiveCallItem}
            onTriggerEngine={triggerSalesEngine}
            setCurrent={navigateTo}
          />
        );
      case "Leads":
        return (
          <LeadsView
            leads={leads}
            setLeads={setLeads}
            callQueue={callQueue}
            setCallQueue={setCallQueue}
            onOpenCall={setActiveCallItem}
            onSelectLead={setSelectedLeadForDetail}
            onOpenAddModal={() => setShowAddLeadModal(true)}
            onTriggerEngine={triggerSalesEngine}
            notify={notify}
            onRunResearch={handleRunResearch}
            researchingId={researchingLeadId}
            settings={settings}
          />
        );
      case "Pipeline":
        return (
          <PipelineView
            leads={leads}
            onUpdateLead={handleUpdateLead}
            onSelectLead={setSelectedLeadForDetail}
            notify={notify}
          />
        );
      case "Clients":
        return (
          <ClientsView
            leads={leads}
            onSelectLead={setSelectedLeadForDetail}
            onOpenAddModal={() => setShowAddLeadModal(true)}
          />
        );
      case "Approvals":
        return (
          <ApprovalsView
            approvals={approvals}
            setApprovals={setApprovals}
            notify={notify}
          />
        );
      case "AI Team":
        return (
          <AITeamView
            leads={leads}
            setLeads={setLeads}
            callQueue={callQueue}
            setCallQueue={setCallQueue}
            settings={settings}
            notify={notify}
          />
        );
      case "Chat":
        return (
          <ChatView
            leads={leads}
            callQueue={callQueue}
            onTriggerEngine={triggerSalesEngine}
            settings={settings}
            notify={notify}
            onNavigate={navigateTo}
          />
        );
      case "Knowledge Base":
        return <KnowledgeBaseView notify={notify} />;
      case "Reports":
        return (
          <ReportsView
            metrics={metrics}
            leads={leads}
            callQueue={callQueue}
            notify={notify}
          />
        );
      case "Settings":
        return (
          <SettingsView
            settings={settings}
            setSettings={setSettings}
            leads={leads}
            setLeads={setLeads}
            notify={notify}
            onLock={() => setLocked(true)}
          />
        );
      default:
        return <DashboardView metrics={metrics} callQueue={callQueue} onOpenCall={setActiveCallItem} onTriggerEngine={triggerSalesEngine} setCurrent={navigateTo} />;
    }
  };

  return (
    <div className="yuvi">
      <style>{css}</style>
      <div className="flex min-h-[100dvh]">
        {/* Navigation Sidebar */}
        <aside
          className={`${
            sidebar ? "translate-x-0" : "-translate-x-full"
          } fixed inset-y-0 left-0 z-30 w-64 border-r border-violet-400/10 bg-[#090a1e] px-4 py-5 transition-transform lg:static lg:translate-x-0 flex flex-col justify-between`}
        >
          <div>
            <div className="mb-8 flex items-center gap-3 px-2">
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-violet-600/20 border border-violet-500/30">
                <img src={yuviLogo} alt="YUVI" className="h-full w-full object-contain p-1" />
              </div>
              <div>
                <div className="text-xl font-black tracking-widest text-white">YUVI</div>
                <div className="-mt-1 text-[8px] tracking-[.25em] text-violet-300/70 font-semibold">
                  AI BUSINESS OS
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              {nav.map(({ name, icon: Icon, group }) => (
                <div key={name}>
                  {group && (
                    <div className="mb-1.5 mt-5 px-3 text-[9px] uppercase tracking-[.2em] text-slate-500 font-semibold">
                      {group}
                    </div>
                  )}
                  <button
                    onClick={() => navigateTo(name)}
                    className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium transition-all ${
                      view === name
                        ? "border border-violet-400/35 bg-violet-600/15 text-white shadow-[0_0_20px_rgba(121,77,255,.15)]"
                        : "text-slate-400 hover:bg-white/[.04] hover:text-slate-200"
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.8} className={view === name ? "text-violet-300" : "text-slate-500"} />
                    <span>{name}</span>
                    {view === name && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300" />}
                  </button>
                </div>
              ))}
            </nav>
          </div>

          <div>
            {/* System Status Tile */}
            <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[.04] p-3 text-center mb-4">
              <div className="flex items-center justify-center gap-2 text-[10px] text-cyan-200 font-semibold">
                <Radio size={12} /> YUVI RUNTIME
              </div>
              <div className="mt-2 text-xs font-bold tracking-widest text-emerald-300 flex items-center justify-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
              </div>
              <div className="mt-0.5 text-[9px] text-slate-400">Gujarat Sales Radar Armed</div>
            </div>

            {/* User Profile Bar */}
            <button
              onClick={() => setUserMenu(!userMenu)}
              className="flex w-full items-center gap-2.5 border-t border-white/5 pt-3 text-left"
            >
              <Avatar text="SP" color="#d59aff" />
              <div className="text-xs">
                <div className="text-white font-semibold">{settings.identity?.founderName || "Shlok Pandya"}</div>
                <div className="text-[10px] text-slate-400">{settings.identity?.agencyName || "Yugantar Growth"}</div>
              </div>
              <ChevronDown size={14} className="ml-auto text-slate-500" />
            </button>
          </div>
        </aside>

        {/* Main Content Pane */}
        <main className="min-w-0 flex-1 overflow-x-hidden flex flex-col">
          {/* Top Header */}
          <header className="relative flex items-center justify-between gap-3 border-b border-violet-400/10 px-4 py-3.5 sm:px-7 bg-[#070918]/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                aria-label="Open navigation"
                onClick={() => setSidebar(true)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div>
                <div className="text-[10px] uppercase tracking-[.2em] text-violet-300 font-semibold">
                  YUVI OS / {view}
                </div>
                <h1 className="text-base font-bold text-white sm:text-lg">
                  {view === "Dashboard" ? `Welcome back, ${settings.identity?.founderName || "Shlok"}.` : view}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-[10px] font-semibold text-cyan-200 sm:flex">
                <i className="status-dot" /> Brain Armed · Gujarat Engine Active
              </div>

              {/* Notification Button */}
              <button
                aria-label="Notifications"
                onClick={() => setNotifPanel(!notifPanel)}
                className="relative rounded-lg p-2 text-slate-400 hover:bg-white/5"
              >
                <Bell size={18} />
                {notifs.filter(n => !n.read).length > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">
                    {notifs.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowAddLeadModal(true)}
                className="rounded-lg border border-violet-400/30 bg-violet-600/20 p-2 text-violet-200 hover:bg-violet-600/30"
                title="Add New Lead"
              >
                <Plus size={18} />
              </button>

              <button onClick={() => navigateTo("Settings")}>
                <Avatar text="SP" color="#d59aff" />
              </button>
            </div>

            {/* Notification Drawer */}
            {notifPanel && (
              <div className="absolute right-4 top-[60px] z-40 max-h-[70vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-violet-400/20 bg-[#0d0f2b] p-3 shadow-2xl sm:right-7 sm:w-96">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 px-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-violet-300">
                    Notifications ({notifs.length})
                  </span>
                  <button
                    onClick={() => setNotifs([])}
                    className="text-[9px] text-slate-400 hover:text-white"
                  >
                    Clear All
                  </button>
                </div>
                <div className="mt-2 space-y-1.5">
                  {notifs.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">You're all caught up.</div>
                  ) : (
                    notifs.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setNotifs(items => items.map(i => (i.id === n.id ? { ...i, read: true } : i)));
                          navigateTo(n.targetView);
                        }}
                        className={`cursor-pointer rounded-xl p-2.5 text-xs transition-colors ${
                          n.read ? "bg-white/[.02] text-slate-400" : "bg-violet-600/15 text-white border border-violet-500/20"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[9px] text-violet-300 font-semibold uppercase">
                          <span>{n.type}</span>
                          <span>{n.timestamp}</span>
                        </div>
                        <div className="mt-1 leading-relaxed text-slate-200">{n.text}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </header>

          {/* Active Screen */}
          <div className="flex-1 overflow-y-auto">
            {renderCurrentView()}
          </div>
        </main>
      </div>

      {/* MODALS */}
      {selectedLeadForDetail && (
        <LeadDetailModal
          lead={selectedLeadForDetail}
          onClose={() => setSelectedLeadForDetail(null)}
          onUpdateLead={handleUpdateLead}
          onDeleteLead={handleDeleteLead}
          onOpenCall={l => {
            const call = callQueue.find(c => c.leadId === l.id) || {
              id: `call_${l.id}`,
              leadId: l.id,
              companyName: l.companyName,
              contactPerson: l.contactPerson,
              phone: l.phone,
              priority: l.tier === "A" ? "URGENT" : "HIGH",
              reason: l.bottleneck || "Discovery call",
              talkingPoints: [
                `Company: ${l.companyName} (${l.city})`,
                `Contact: ${l.contactPerson}`,
                `Hook: ${l.bottleneck || "Client pipeline expansion"}`,
              ],
              clickToCallUrl: `tel:${l.phone}`,
              callStatus: "PENDING"
            };
            setActiveCallItem(call);
          }}
          onRunResearch={handleRunResearch}
          notify={notify}
        />
      )}

      {showAddLeadModal && (
        <AddLeadModal
          existingLeads={leads}
          onClose={() => setShowAddLeadModal(false)}
          onAddLead={handleAddLead}
          notify={notify}
        />
      )}

      {activeCallItem && (
        <CallModal
          call={activeCallItem}
          onClose={() => setActiveCallItem(null)}
          onRecordOutcome={handleRecordCallOutcome}
        />
      )}

      {/* Global Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-violet-400/30 bg-[#0d0f2b] px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-md animate-bounce">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
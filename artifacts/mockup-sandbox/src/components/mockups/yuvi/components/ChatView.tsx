// components/ChatView.tsx — YUVI Conversational Orchestrator & Bounded Autonomous Agent
import React, { useState, useRef, useEffect } from "react";
import type {
  NormalizedLead,
  CallQueueItem,
  DailySalesReport,
  AgentConfig,
  ClientInvoice,
  ClientAccount,
  CommercialProposal,
  ApprovalItem,
} from "../lib/types/sales";
import type { YuviSettings } from "../lib/store";
import { runAgentLoop, type AgentPlanStep, type AgentExecutionReceipt } from "../lib/execution/agentLoop";
import { parseConversationalAgentInstruction } from "../lib/agents/agentConfigEngine";
import { startListening, stopListening, speakText, stopSpeaking, isSpeechRecognitionSupported } from "../lib/voiceEngine";
import { Button, Avatar, Panel } from "./ui";
import {
  Send, Mic, MicOff, VolumeX, Rocket,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, ShieldCheck, Download
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "yuvi" | "user";
  text: string;
  timestamp: string;
  plan?: AgentPlanStep[];
  receipts?: AgentExecutionReceipt[];
  navigationSuggestion?: "Leads" | "Approvals" | "Proposals" | "Pipeline" | "Today" | "Finance";
}

interface ChatViewProps {
  leads: NormalizedLead[];
  setLeads?: (leads: NormalizedLead[]) => void;
  callQueue: CallQueueItem[];
  setCallQueue?: (queue: CallQueueItem[]) => void;
  report?: DailySalesReport;
  configs?: AgentConfig[];
  onUpdateConfigs?: (configs: AgentConfig[]) => void;
  invoices?: ClientInvoice[];
  setInvoices?: (invoices: ClientInvoice[]) => void;
  clients?: ClientAccount[];
  setClients?: (clients: ClientAccount[]) => void;
  proposals?: CommercialProposal[];
  setProposals?: (proposals: CommercialProposal[]) => void;
  approvals?: ApprovalItem[];
  setApprovals?: (approvals: ApprovalItem[]) => void;
  onTriggerEngine: () => void;
  settings: YuviSettings;
  notify: (text: string) => void;
  onNavigate: (view: any) => void;
}

export function ChatView({
  leads,
  setLeads,
  callQueue,
  setCallQueue,
  report,
  configs = [],
  onUpdateConfigs,
  invoices = [],
  setInvoices,
  clients = [],
  setClients,
  proposals = [],
  setProposals,
  approvals = [],
  setApprovals,
  onTriggerEngine,
  settings,
  notify,
  onNavigate,
}: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "init-01",
      role: "yuvi",
      text: `Good day, ${settings.identity?.founderName || "Shlok"}. YUVI Autonomous Business Operator is ready.\n\nI can execute bounded operational missions: find relevant local businesses, research and score prospects, extract public contact details, draft evidence-backed proposals, prepare WhatsApp outreach sequences, and organize daily sales priorities.\n\nTry issuing any natural language instruction below, click a quick prompt, or use voice commands.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    },
  ]);

  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported] = useState(() => isSpeechRecognitionSupported());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const clean = (textToSend || input).trim();
    if (!clean) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      text: clean,
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    // 1. Check for Conversational Agent Workforce Customization
    const conversationalUpdate = parseConversationalAgentInstruction(clean, configs || []);
    if (conversationalUpdate.matched) {
      if (onUpdateConfigs && conversationalUpdate.updatedConfigs) {
        onUpdateConfigs(conversationalUpdate.updatedConfigs);
      }
      setIsThinking(false);
      const replyMsg: ChatMessage = {
        id: `yuv_${Date.now()}`,
        role: "yuvi",
        text: conversationalUpdate.replyMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, replyMsg]);
      if (settings.voice?.enabled) {
        setIsSpeaking(true);
        speakText(conversationalUpdate.replyMessage, {
          rate: settings.voice?.rate ?? 1.05,
          onEnd: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }
      notify("Agent workforce skills & service catalog updated.");
      return;
    }

    // 2. Execute Bounded Observable Agent Loop
    try {
      const toolContext = {
        leads,
        setLeads,
        proposals,
        setProposals,
        invoices,
        setInvoices,
        clients,
        setClients,
        callQueue,
        setCallQueue,
        approvals,
        setApprovals,
        founderName: settings.identity?.founderName || "Shlok",
        upiVpa: settings.payments?.upiVpa || "shlok@upi",
      };

      const loopResult = await runAgentLoop(clean, toolContext, {
        personalityPrompt: settings.identity?.personalityPrompt,
        modelId: settings.groq?.modelId,
      });

      setIsThinking(false);

      const replyMsg: ChatMessage = {
        id: `yuv_${Date.now()}`,
        role: "yuvi",
        text: loopResult.report,
        timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        plan: loopResult.plan,
        receipts: loopResult.receipts,
        navigationSuggestion: loopResult.navigationSuggestion,
      };

      setMessages((prev) => [...prev, replyMsg]);

      if (settings.voice?.enabled) {
        setIsSpeaking(true);
        speakText(`Task completed. ${loopResult.understoodIntent}. ${loopResult.receipts.length} tool receipts verified.`, {
          rate: settings.voice?.rate ?? 1.05,
          onEnd: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }

      notify(`Agent loop executed ${loopResult.plan.length} steps (${loopResult.durationMs}ms).`);
    } catch (err) {
      setIsThinking(false);
      const errText = err instanceof Error ? err.message : String(err);
      const replyMsg: ChatMessage = {
        id: `yuv_${Date.now()}`,
        role: "yuvi",
        text: `⚠️ Execution error occurred while running agent loop:\n${errText}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, replyMsg]);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
    } else {
      if (isSpeaking) {
        stopSpeaking();
        setIsSpeaking(false);
      }
      setIsListening(true);
      notify("Listening... Speak your command.");

      startListening({
        lang: settings.voice?.lang || "en-IN",
        onTranscript: (transcript, isFinal) => {
          setInput(transcript);
          if (isFinal && transcript.trim()) {
            setIsListening(false);
            handleSend(transcript.trim());
          }
        },
        onError: (err) => {
          setIsListening(false);
          notify(err);
        },
        onEnd: () => {
          setIsListening(false);
        },
      });
    }
  };

  const handleStopSpeaking = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  const quickCommands = [
    "Find 50 dental clinics in Ahmedabad",
    "Search luxury architects in Bodakdev",
    "Research Jangid Furniture Studio",
    "Draft 1-page proposal for Jangid Furniture",
    "Draft WhatsApp outreach for top leads",
    "What should I do today?",
    "Export leads to CSV",
  ];

  return (
    <div className="rise flex min-h-[calc(100dvh-74px)] flex-col p-3 sm:p-5 lg:p-7 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">
            YUVI / Autonomous Business Operator & Multi-Step Agent Loop
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Issues multi-step autonomous missions: understand → plan → select registered tools → execute → verify receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <button
              onClick={handleStopSpeaking}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-400/20 animate-pulse"
            >
              <VolumeX size={14} /> Stop Speech
            </button>
          )}
          <Button onClick={onTriggerEngine} variant="primary">
            <Rocket size={13} /> Run Sales Engine
          </Button>
        </div>
      </div>

      {/* Main Chat Box */}
      <Panel className="flex flex-1 flex-col overflow-hidden min-h-[550px]">
        {/* Messages Feed */}
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
                <div className={`flex max-w-[90%] md:max-w-[80%] items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  <Avatar
                    text={isUser ? "SP" : "YU"}
                    color={isUser ? "#d59aff" : "#8b5cf6"}
                  />
                  <div className="space-y-2 flex-1">
                    <div
                      className={`rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "border border-violet-400/30 bg-violet-600/20 text-white"
                          : "border border-white/10 bg-black/40 text-slate-200 shadow-xl"
                      }`}
                    >
                      {m.text}

                      {/* Render Structured Execution Plan */}
                      {m.plan && m.plan.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                            <ShieldCheck size={12} /> Bounded Execution Plan:
                          </div>
                          <div className="space-y-1.5">
                            {m.plan.map((step) => (
                              <div
                                key={step.stepIndex}
                                className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-1.5 text-[11px] border border-white/5"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-slate-400">#{step.stepIndex}</span>
                                  <span className="font-semibold text-white">{step.toolName}</span>
                                  <span className="text-slate-400 hidden sm:inline">— {step.rationale}</span>
                                </div>
                                <div>
                                  {step.status === "COMPLETED" && (
                                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                                      <CheckCircle2 size={10} /> Verified
                                    </span>
                                  )}
                                  {step.status === "RUNNING" && (
                                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                                      <Clock size={10} /> Running
                                    </span>
                                  )}
                                  {step.status === "FAILED" && (
                                    <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400">
                                      <AlertTriangle size={10} /> Failed
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Navigation CTA Button if suggested */}
                      {m.navigationSuggestion && (
                        <div className="mt-3 pt-2">
                          <button
                            onClick={() => onNavigate(m.navigationSuggestion)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-600/30 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-600/50 transition-colors"
                          >
                            <span>Open in {m.navigationSuggestion}</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className={`text-[9px] text-slate-500 ${isUser ? "text-right" : ""}`}>
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isThinking && (
            <div className="flex items-center gap-3">
              <Avatar text="YU" color="#8b5cf6" />
              <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-violet-200 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Executing autonomous agent loop: Understanding → Planning → Executing Tools...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Command Pills */}
        <div className="border-t border-white/5 bg-black/20 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] uppercase font-semibold text-slate-500 shrink-0">Daily Missions:</span>
          {quickCommands.map((cmd) => (
            <button
              key={cmd}
              onClick={() => handleSend(cmd)}
              className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[10px] text-slate-300 hover:border-violet-400/30 hover:bg-white/[.08] hover:text-white shrink-0 transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t border-white/10 bg-black/40 p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Give YUVI an operational instruction (e.g. 'Find 50 clinics in Ahmedabad', 'Draft proposal for Jangid Furniture')..."
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-violet-400/50 focus:outline-none"
            />
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`rounded-xl border p-2.5 transition-colors ${
                  isListening
                    ? "border-rose-400/50 bg-rose-500/20 text-rose-300 animate-pulse"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
                }`}
                title={isListening ? "Listening... click to stop" : "Voice control"}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="rounded-xl border border-violet-500/40 bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </Panel>
    </div>
  );
}

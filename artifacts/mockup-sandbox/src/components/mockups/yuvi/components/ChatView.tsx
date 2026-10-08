// components/ChatView.tsx — YUVI Conversational Orchestrator & Real Voice Chat
import React, { useState, useRef, useEffect, type FormEvent } from "react";
import type { NormalizedLead, CallQueueItem, DailySalesReport } from "../lib/types/sales";
import type { YuviSettings } from "../lib/store";
import { detectDailyIntent, handleDailyCommand } from "../lib/sales/intentRouter";
import { askGroq } from "../lib/groq";
import { loadGroqKey } from "../lib/store";
import { startListening, stopListening, speakText, stopSpeaking, isSpeechRecognitionSupported } from "../lib/voiceEngine";
import { INITIAL_KNOWLEDGE_ARTICLES, buildKnowledgeContextPrompt } from "../lib/knowledgeBase";
import { Button, Avatar, Panel, ViewHeading } from "./ui";
import {
  Send, Mic, MicOff, Volume2, VolumeX, Sparkles, Rocket,
  Phone, Radio, Bot, Command, HelpCircle
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "yuvi" | "user";
  text: string;
  timestamp: string;
}

interface ChatViewProps {
  leads: NormalizedLead[];
  callQueue: CallQueueItem[];
  report?: DailySalesReport;
  onTriggerEngine: () => void;
  settings: YuviSettings;
  notify: (text: string) => void;
  onNavigate: (view: any) => void;
}

export function ChatView({
  leads,
  callQueue,
  report,
  onTriggerEngine,
  settings,
  notify,
  onNavigate,
}: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "init-01",
      role: "yuvi",
      text: `Good day, ${settings.identity?.founderName || "Shlok"}. YUVI Brain is armed and monitoring the Gujarat commercial corridor.\n\nI can execute daily commands, coordinate Hunter and Scout, retrieve priority call queues, or answer questions about your pipeline.\n\nTry clicking any quick action below, typing your instruction, or tapping the microphone for hands-free voice control.`,
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

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    // 1. Check for Daily Command Intents
    const intent = detectDailyIntent(clean);
    if (intent !== "UNKNOWN") {
      const result = handleDailyCommand(intent, { leads, callQueue, report, onTriggerEngine });
      if (result.handled) {
        setIsThinking(false);
        const replyMsg: ChatMessage = {
          id: `yuv_${Date.now()}`,
          role: "yuvi",
          text: result.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        };
        setMessages(prev => [...prev, replyMsg]);

        if (settings.voice?.enabled) {
          setIsSpeaking(true);
          speakText(result.replyText, {
            rate: settings.voice?.rate ?? 1.05,
            onEnd: () => setIsSpeaking(false),
            onError: () => setIsSpeaking(false),
          });
        }
        return;
      }
    }

    // 2. Groq AI Generation with Full Live Context
    const groqKey = loadGroqKey();
    if (groqKey) {
      try {
        const kbContext = buildKnowledgeContextPrompt(INITIAL_KNOWLEDGE_ARTICLES);
        const systemPrompt = `${settings.identity.personalityPrompt}\n\n${settings.identity.customInstructions}\n\n=== LIVE CRM TELEMETRY ===\nTotal Leads in Radar: ${leads.length}\nQualified Leads (Tier A/B): ${leads.filter(l => l.tier === "A" || l.tier === "B").length}\nPending Phone Calls: ${callQueue.filter(c => c.callStatus === "PENDING").length}\nWon Deals: ${leads.filter(l => l.status === "WON").length}\n=== END TELEMETRY ===\n${kbContext}`;

        const history = messages.slice(-5).map(m => ({
          role: m.role === "yuvi" ? ("assistant" as const) : ("user" as const),
          content: m.text,
        }));

        const res = await askGroq(
          [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: clean },
          ],
          groqKey,
          settings.groq.modelId
        );

        setIsThinking(false);
        const replyText = res.ok ? res.text : `⚠️ ${res.reason}`;
        const replyMsg: ChatMessage = {
          id: `yuv_${Date.now()}`,
          role: "yuvi",
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        };
        setMessages(prev => [...prev, replyMsg]);

        if (res.ok && settings.voice?.enabled) {
          setIsSpeaking(true);
          speakText(replyText, {
            rate: settings.voice?.rate ?? 1.05,
            onEnd: () => setIsSpeaking(false),
            onError: () => setIsSpeaking(false),
          });
        }
        return;
      } catch (err) {
        setIsThinking(false);
      }
    }

    // 3. Deterministic Fallback Response
    setIsThinking(false);
    const offlineReply = `I received your command: "${clean}".\n\nSales Engine Status: Active with ${leads.length} leads in radar and ${callQueue.filter(c => c.callStatus === "PENDING").length} calls due.\n\nTo enable open natural-language reasoning, add a Groq API key in Settings → Groq & AI Models. You can also run these direct commands right now:\n• "Work on my leads today"\n• "Give me todays calls"\n• "Prepare todays outreach"\n• "Show hot leads"\n• "What should I do today?"\n• "Give me todays sales report"`;

    const replyMsg: ChatMessage = {
      id: `yuv_${Date.now()}`,
      role: "yuvi",
      text: offlineReply,
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, replyMsg]);
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
        onError: err => {
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
    "What should I do today?",
    "Give me todays calls",
    "Prepare todays outreach",
    "Show hot leads",
    "Run the sales engine",
    "Give me todays sales report",
  ];

  return (
    <div className="rise flex min-h-[calc(100dvh-74px)] flex-col p-3 sm:p-5 lg:p-7 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">
            YUVI / Conversational Orchestrator & Voice Interface
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Natural language control plane for daily sales operations and AI workforce.
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
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.map(m => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
                <div className={`flex max-w-[85%] items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  <Avatar
                    text={isUser ? "SP" : "YU"}
                    color={isUser ? "#d59aff" : "#8b5cf6"}
                  />
                  <div>
                    <div
                      className={`rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "border border-violet-400/30 bg-violet-600/20 text-white"
                          : "border border-white/10 bg-black/30 text-slate-200"
                      }`}
                    >
                      {m.text}
                    </div>
                    <div className={`mt-1 text-[9px] text-slate-500 ${isUser ? "text-right" : ""}`}>
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
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-violet-200 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Consulting Gujarat sales radar and routing task...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Command Pills */}
        <div className="border-t border-white/5 bg-black/20 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] uppercase font-semibold text-slate-500 shrink-0">Daily Prompts:</span>
          {quickCommands.map(cmd => (
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
        <div className="border-t border-white/10 p-3 sm:p-4 bg-[#070918]">
          <div className="rounded-xl border border-violet-400/25 bg-black/40 p-2 focus-within:border-violet-400 transition-colors">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isListening ? "Listening... Speak now..." : "Tell YUVI what to do or ask about your sales pipeline..."}
              className="h-16 w-full resize-none bg-transparent p-2 text-xs text-white outline-none placeholder:text-slate-600"
            />

            <div className="flex items-center justify-between border-t border-white/5 pt-2">
              <div className="flex items-center gap-2">
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      isListening
                        ? "bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]"
                        : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    <span>{isListening ? "Listening..." : "Voice Mic"}</span>
                  </button>
                )}
                <span className="hidden text-[10px] text-slate-500 sm:inline">
                  Enter to send · Groq GPT-OSS-120B Connected
                </span>
              </div>

              <Button
                variant="primary"
                onClick={() => handleSend()}
                disabled={!input.trim() || isThinking}
              >
                <Send size={13} /> Send
              </Button>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

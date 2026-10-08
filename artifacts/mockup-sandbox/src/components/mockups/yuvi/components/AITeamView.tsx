// components/AITeamView.tsx — Interactive AI Workforce Execution Hub (7 Employees)
import React, { useState } from "react";
import type { NormalizedLead, CallQueueItem, EmployeeId, EmployeeTask } from "../lib/types/sales";
import type { YuviSettings } from "../lib/store";
import { EMPLOYEES } from "../lib/execution/taskSystem";
import { EMPLOYEE_PRESET_ACTIONS, executeEmployeeAction } from "../lib/execution/employeeExecutors";
import { Button, Panel, ViewHeading } from "./ui";
import {
  Bot, Play, CheckCircle2, AlertCircle, RefreshCw, Terminal,
  Clock, ShieldCheck, ChevronRight, History, Layers
} from "lucide-react";

interface AITeamViewProps {
  leads: NormalizedLead[];
  setLeads: (leads: NormalizedLead[]) => void;
  callQueue: CallQueueItem[];
  setCallQueue: (queue: CallQueueItem[]) => void;
  settings: YuviSettings;
  notify: (text: string) => void;
}

export function AITeamView({
  leads,
  setLeads,
  callQueue,
  setCallQueue,
  settings,
  notify,
}: AITeamViewProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<EmployeeId>("hunter");
  const [selectedActionId, setSelectedActionId] = useState<string>("");
  const [customObjective, setCustomObjective] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentTask, setCurrentTask] = useState<EmployeeTask | null>(null);
  const [taskHistory, setTaskHistory] = useState<EmployeeTask[]>([]);

  const employee = EMPLOYEES[selectedEmpId];
  const presets = EMPLOYEE_PRESET_ACTIONS[selectedEmpId] || [];

  const handleRunTask = async () => {
    setIsExecuting(true);
    notify(`Dispatching task to ${employee.name}...`);

    try {
      const task = await executeEmployeeAction(
        selectedEmpId,
        selectedActionId || presets[0]?.id || "",
        customObjective.trim() || undefined,
        {
          leads,
          setLeads,
          callQueue,
          setCallQueue,
          bridgeConfig: { baseUrl: settings.activepieces?.baseUrl },
        }
      );

      setCurrentTask(task);
      setTaskHistory(prev => [task, ...prev]);
      notify(`${employee.name} completed task successfully.`);
      setCustomObjective("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Execution failed: ${msg}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="rise space-y-5 p-4 sm:p-7">
      <ViewHeading
        view="AI Team"
        description="Autonomous Enterprise Workforce — Scout, Hunter, Researcher, Analyst, Operator, Spark, and Publisher."
      />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Employee Roster List */}
        <Panel className="h-fit p-3 space-y-1.5">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Active Workforce
          </div>
          {Object.values(EMPLOYEES).map(emp => {
            const isSelected = selectedEmpId === emp.id;
            return (
              <button
                key={emp.id}
                onClick={() => {
                  setSelectedEmpId(emp.id);
                  setSelectedActionId(EMPLOYEE_PRESET_ACTIONS[emp.id]?.[0]?.id || "");
                }}
                className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-all ${
                  isSelected
                    ? "bg-violet-600/20 border border-violet-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                    : "text-slate-400 hover:bg-white/[.04] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold"
                    style={{ background: `${emp.color}22`, color: emp.color, border: `1px solid ${emp.color}66` }}
                  >
                    {emp.name.slice(0, 2)}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-white">{emp.name}</div>
                    <div className="text-[10px] text-slate-400">{emp.role}</div>
                  </div>
                </div>
                <ChevronRight size={14} className={isSelected ? "text-violet-300" : "text-slate-600"} />
              </button>
            );
          })}
        </Panel>

        {/* Selected Employee Execution Workspace */}
        <div className="space-y-5">
          {/* Employee Header Profile */}
          <Panel className="p-5 sm:p-6 bg-gradient-to-r from-violet-900/15 to-black/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold"
                  style={{ background: `${employee.color}25`, color: employee.color, border: `1px solid ${employee.color}77` }}
                >
                  {employee.name.slice(0, 2)}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white sm:text-xl">{employee.name}</h3>
                    <span className="rounded-full px-2.5 py-0.5 text-[9px] font-semibold border" style={{ borderColor: `${employee.color}44`, color: employee.color }}>
                      {employee.role}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300 max-w-xl">{employee.description}</p>
                </div>
              </div>

              {employee.consequentialTools.length > 0 && (
                <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center gap-2">
                  <ShieldCheck size={16} className="shrink-0" />
                  <span>Consequential send gates armed</span>
                </div>
              )}
            </div>

            {/* Allowed Capabilities */}
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/5 pt-4">
              {employee.capabilities.map(c => (
                <span key={c} className="rounded-md border border-white/10 bg-white/[.03] px-2 py-0.5 text-[10px] text-slate-300">
                  {c}
                </span>
              ))}
            </div>
          </Panel>

          {/* Task Dispatch Console */}
          <Panel className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">
                Task Dispatch Console
              </div>
              <span className="text-xs text-slate-400">Target: Activepieces Bridge + Groq</span>
            </div>

            {/* Preset Actions */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400">Select Preset Mission</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {presets.map(p => {
                  const isPicked = (selectedActionId || presets[0]?.id) === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedActionId(p.id)}
                      className={`cursor-pointer rounded-xl border p-3 transition-all ${
                        isPicked
                          ? "border-violet-400 bg-violet-600/15 text-white"
                          : "border-white/10 bg-black/30 text-slate-400 hover:border-white/20 hover:text-slate-200"
                      }`}
                    >
                      <div className="text-xs font-semibold text-white">{p.label}</div>
                      <div className="mt-1 text-[10px] text-slate-400 leading-4">{p.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Objective Option */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400">Or Custom Directive</label>
              <input
                type="text"
                value={customObjective}
                onChange={e => setCustomObjective(e.target.value)}
                placeholder={`Tell ${employee.name} what specific outcome to achieve...`}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-violet-400 placeholder:text-slate-600"
              />
            </div>

            <Button
              variant="primary"
              onClick={handleRunTask}
              disabled={isExecuting}
              className="w-full py-2.5"
            >
              {isExecuting ? (
                <>
                  <RefreshCw size={14} className="animate-spin mr-1" />
                  Executing Task ({employee.name})...
                </>
              ) : (
                <>
                  <Play size={14} className="mr-1" />
                  Dispatch Task to {employee.name}
                </>
              )}
            </Button>
          </Panel>

          {/* Live Task Execution Terminal & Structured Output */}
          {currentTask && (
            <Panel className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal size={16} className="text-cyan-300" />
                  <span className="text-xs font-bold text-white">Execution Console: {currentTask.objective}</span>
                </div>
                <span className={`rounded px-2 py-0.5 text-[9px] font-bold ${
                  currentTask.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/10 text-amber-300"
                }`}>
                  {currentTask.status}
                </span>
              </div>

              {/* Execution Trace Logs */}
              <div className="rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-[11px] space-y-1.5 max-h-48 overflow-y-auto">
                {currentTask.logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-slate-600 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span className={log.level === "error" ? "text-rose-400" : log.level === "warn" ? "text-amber-400" : "text-cyan-300"}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))}
              </div>

              {/* Structured Task Result Output */}
              {currentTask.output && (
                <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">Structured Task Results</div>
                  <pre className="overflow-x-auto font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(currentTask.output, null, 2)}
                  </pre>
                </div>
              )}
            </Panel>
          )}

          {/* Past Task History */}
          {taskHistory.length > 0 && (
            <Panel className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-white border-b border-white/5 pb-3">
                <History size={14} className="text-slate-400" />
                <span>Task Execution History ({taskHistory.length} completed)</span>
              </div>
              <div className="mt-3 divide-y divide-white/5">
                {taskHistory.map(t => (
                  <div key={t.taskId} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white">{t.objective}</span>
                      <div className="text-[10px] text-slate-500">Agent: {t.employeeId} · Completed at {new Date(t.timestamps.completedAt || t.timestamps.createdAt).toLocaleTimeString()}</div>
                    </div>
                    <span className="text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Done
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

// components/AgentCustomizationDeck.tsx — Agent Workforce Customization & Skill Adaptation Deck
// Allows Founder Shlok Pandya to manually tune objectives, tone, service catalogs, and rules for
// Yuvi, Researcher, Hunter, and DeckBuilder.

import React, { useState } from "react";
import type { AgentConfig, AgentService } from "../lib/types/sales";
import { Button, Panel } from "./ui";
import {
  Bot, Sparkles, Shield, Tag, Plus, Trash2, CheckCircle2,
  Sliders, Layers, Zap, ArrowRight, Building, Globe, Save
} from "lucide-react";

interface AgentCustomizationDeckProps {
  configs: AgentConfig[];
  onUpdateConfigs: (updated: AgentConfig[]) => void;
  notify: (msg: string) => void;
}

export function AgentCustomizationDeck({
  configs,
  onUpdateConfigs,
  notify,
}: AgentCustomizationDeckProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("researcher");
  const selectedConfig = configs.find(c => c.id === selectedAgentId) || configs[0];

  // Editable fields for current agent
  const [role, setRole] = useState(selectedConfig?.role || "");
  const [objective, setObjective] = useState(selectedConfig?.objective || "");
  const [tone, setTone] = useState(selectedConfig?.tone || "");
  const [autonomy, setAutonomy] = useState(selectedConfig?.autonomy || "full");

  // New tag inputs
  const [newIndustry, setNewIndustry] = useState("");
  const [newGeo, setNewGeo] = useState("");
  const [newRule, setNewRule] = useState("");

  // New Service Modal / Form
  const [showAddService, setShowAddService] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceTimeline, setNewServiceTimeline] = useState("48 Hours");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [newServicePitch, setNewServicePitch] = useState("");
  const [applyServiceToAll, setApplyServiceToAll] = useState(true);

  // Sync state when agent selection changes
  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    const cfg = configs.find(c => c.id === agentId);
    if (cfg) {
      setRole(cfg.role);
      setObjective(cfg.objective);
      setTone(cfg.tone);
      setAutonomy(cfg.autonomy);
    }
  };

  const handleSaveCurrentAgent = () => {
    if (!selectedConfig) return;
    const updated: AgentConfig = {
      ...selectedConfig,
      role,
      objective,
      tone,
      autonomy,
      updatedAt: new Date().toISOString(),
    };

    const newConfigs = configs.map(c => (c.id === updated.id ? updated : c));
    onUpdateConfigs(newConfigs);
    notify(`Updated configuration for ${selectedConfig.name}.`);
  };

  const handleAddIndustry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIndustry.trim() || !selectedConfig) return;
    const updated: AgentConfig = {
      ...selectedConfig,
      targetIndustries: [...selectedConfig.targetIndustries, newIndustry.trim()],
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfigs(configs.map(c => (c.id === updated.id ? updated : c)));
    setNewIndustry("");
    notify(`Added target industry: "${newIndustry.trim()}"`);
  };

  const handleRemoveIndustry = (idx: number) => {
    if (!selectedConfig) return;
    const updated: AgentConfig = {
      ...selectedConfig,
      targetIndustries: selectedConfig.targetIndustries.filter((_, i) => i !== idx),
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfigs(configs.map(c => (c.id === updated.id ? updated : c)));
  };

  const handleAddGeo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGeo.trim() || !selectedConfig) return;
    const updated: AgentConfig = {
      ...selectedConfig,
      targetGeographies: [...selectedConfig.targetGeographies, newGeo.trim()],
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfigs(configs.map(c => (c.id === updated.id ? updated : c)));
    setNewGeo("");
    notify(`Added geography: "${newGeo.trim()}"`);
  };

  const handleRemoveGeo = (idx: number) => {
    if (!selectedConfig) return;
    const updated: AgentConfig = {
      ...selectedConfig,
      targetGeographies: selectedConfig.targetGeographies.filter((_, i) => i !== idx),
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfigs(configs.map(c => (c.id === updated.id ? updated : c)));
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.trim() || !selectedConfig) return;
    const updated: AgentConfig = {
      ...selectedConfig,
      rules: [...selectedConfig.rules, newRule.trim()],
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfigs(configs.map(c => (c.id === updated.id ? updated : c)));
    setNewRule("");
    notify(`Added operating rule for ${selectedConfig.name}.`);
  };

  const handleRemoveRule = (idx: number) => {
    if (!selectedConfig) return;
    const updated: AgentConfig = {
      ...selectedConfig,
      rules: selectedConfig.rules.filter((_, i) => i !== idx),
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfigs(configs.map(c => (c.id === updated.id ? updated : c)));
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    const serviceId = `srv-${newServiceName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const newService: AgentService = {
      id: serviceId,
      name: newServiceName.trim(),
      pricing: newServicePrice.trim() || "₹35,000/mo",
      deliveryTimeline: newServiceTimeline.trim() || "48 Hours",
      description: newServiceDesc.trim() || `Turnkey commercial service: ${newServiceName.trim()}`,
      pitchAngle: newServicePitch.trim() || `Our ${newServiceName.trim()} solves conversion leaks with guaranteed ROI.`,
      tags: ["custom", serviceId],
    };

    let updatedConfigs: AgentConfig[];
    if (applyServiceToAll) {
      updatedConfigs = configs.map(c => ({
        ...c,
        services: [...c.services.filter(s => s.id !== serviceId), newService],
        updatedAt: new Date().toISOString(),
      }));
    } else {
      updatedConfigs = configs.map(c => {
        if (c.id === selectedConfig?.id) {
          return {
            ...c,
            services: [...c.services.filter(s => s.id !== serviceId), newService],
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });
    }

    onUpdateConfigs(updatedConfigs);
    setShowAddService(false);
    setNewServiceName("");
    setNewServicePrice("");
    setNewServiceDesc("");
    setNewServicePitch("");
    notify(`Registered new agency offering: "${newService.name}". Active in agent workforce!`);
  };

  const handleRemoveService = (serviceId: string) => {
    if (!selectedConfig) return;
    const updated: AgentConfig = {
      ...selectedConfig,
      services: selectedConfig.services.filter(s => s.id !== serviceId),
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfigs(configs.map(c => (c.id === updated.id ? updated : c)));
    notify(`Removed service from ${selectedConfig.name}'s active catalog.`);
  };

  if (!selectedConfig) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-purple-900/20 to-black/40 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-violet-400" />
            <h3 className="text-base font-bold text-white">Agent Customization & Skill Adaptation Deck</h3>
          </div>
          <p className="mt-1 text-xs text-slate-300">
            Tune employee capabilities, pricing models, targeting boundaries, and service catalogs.
            All updates sync immediately with Researcher audits, Hunter outreach copy, and DeckBuilder presentations.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAddService(true)}>
          <Plus size={14} /> Add Agency Service
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Agent Selector Sidebar */}
        <div className="space-y-2">
          <div className="px-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Workforce Hierarchy
          </div>
          {configs.map(cfg => {
            const isSelected = cfg.id === selectedAgentId;
            return (
              <button
                key={cfg.id}
                onClick={() => handleSelectAgent(cfg.id)}
                className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all ${
                  isSelected
                    ? "bg-violet-600/25 border border-violet-400/40 text-white shadow-lg"
                    : "border border-white/5 bg-black/20 text-slate-400 hover:bg-white/[.04] hover:text-white"
                }`}
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  cfg.id === "yuvi" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                }`}>
                  <Bot size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white">{cfg.name}</span>
                    <span className="text-[10px] text-violet-400 font-mono capitalize">{cfg.autonomy}</span>
                  </div>
                  <div className="truncate text-[11px] text-slate-400">{cfg.role}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Agent Configuration Panel */}
        <div className="space-y-5">
          <Panel className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bot size={16} className="text-violet-400" />
                  {selectedConfig.name} Configuration Profile
                </h4>
                <div className="text-xs text-slate-400 mt-0.5">{selectedConfig.role}</div>
              </div>
              <Button variant="primary" onClick={handleSaveCurrentAgent}>
                <Save size={13} /> Save Profile
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Specialist Role Title</label>
                <input
                  type="text"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Operating Autonomy</label>
                <select
                  value={autonomy}
                  onChange={e => setAutonomy(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400 font-semibold"
                >
                  <option value="full">Full Autonomy (Runs without manual gate)</option>
                  <option value="assisted">Assisted (Requests approval before critical actions)</option>
                  <option value="manual">Manual (Founder-triggered only)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Mission & Objective</label>
                <textarea
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400 resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Voice Tone & Persona</label>
                <input
                  type="text"
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
                />
              </div>
            </div>

            {/* Target Criteria & Operating Boundaries */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-white/5">
              {/* Target Industries */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <Building size={12} /> Target Industries & Niches
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                  {selectedConfig.targetIndustries.map((ind, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-300"
                    >
                      {ind}
                      <button onClick={() => handleRemoveIndustry(i)} className="hover:text-red-300">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <form onSubmit={handleAddIndustry} className="flex gap-2">
                  <input
                    type="text"
                    value={newIndustry}
                    onChange={e => setNewIndustry(e.target.value)}
                    placeholder="Add target industry..."
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white outline-none focus:border-violet-400"
                  />
                  <Button type="submit">
                    <Plus size={12} />
                  </Button>
                </form>
              </div>

              {/* Target Geographies */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <Globe size={12} /> Target Geographies
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                  {selectedConfig.targetGeographies.map((geo, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-300"
                    >
                      {geo}
                      <button onClick={() => handleRemoveGeo(i)} className="hover:text-red-300">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <form onSubmit={handleAddGeo} className="flex gap-2">
                  <input
                    type="text"
                    value={newGeo}
                    onChange={e => setNewGeo(e.target.value)}
                    placeholder="Add city or region..."
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white outline-none focus:border-violet-400"
                  />
                  <Button type="submit">
                    <Plus size={12} />
                  </Button>
                </form>
              </div>
            </div>

            {/* Operating Rules */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                <Shield size={12} /> Operating Boundaries & Safety Rules
              </div>
              <div className="space-y-1.5">
                {selectedConfig.rules.map((rule, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs text-slate-300"
                  >
                    <span>• {rule}</span>
                    <button onClick={() => handleRemoveRule(i)} className="text-slate-500 hover:text-red-300">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddRule} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newRule}
                  onChange={e => setNewRule(e.target.value)}
                  placeholder="Add operating constraint or rule..."
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-violet-400"
                />
                <Button type="submit">
                  <Plus size={13} /> Add Rule
                </Button>
              </form>
            </div>
          </Panel>

          {/* Active Services Catalog for this Agent */}
          <Panel className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={16} className="text-emerald-400" />
                  Active Service Catalog ({selectedConfig.services.length} Offerings)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Services {selectedConfig.name} can formulate playbooks for, audit against, or pitch in outreach.
                </p>
              </div>
              <Button variant="primary" onClick={() => setShowAddService(true)}>
                <Plus size={13} /> Add Offering
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {selectedConfig.services.map(srv => (
                <div
                  key={srv.id}
                  className="rounded-xl border border-white/10 bg-black/25 p-3.5 space-y-2 hover:border-violet-400/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-white">{srv.name}</div>
                      <span className="font-mono text-[11px] text-emerald-400 font-semibold">{srv.pricing}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 line-clamp-2">{srv.description}</div>
                  </div>

                  <div className="pt-2 border-t border-white/5 space-y-1">
                    {srv.pitchAngle && (
                      <div className="text-[10px] text-slate-400 italic line-clamp-2">
                        "{srv.pitchAngle}"
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Timeline: {srv.deliveryTimeline || "48 Hours"}</span>
                      <button
                        onClick={() => handleRemoveService(srv.id)}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* ADD SERVICE MODAL */}
      {showAddService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-violet-500/30 bg-[#0c0e24] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-violet-400" /> Add New Agency Offering to Workforce
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Register a new service, pricing structure, and pitch angle. Researcher and Hunter will immediately incorporate it into audits and outreach.
            </p>

            <form onSubmit={handleCreateService} className="mt-4 space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Service Name</label>
                <input
                  type="text"
                  required
                  value={newServiceName}
                  onChange={e => setNewServiceName(e.target.value)}
                  placeholder="e.g. AI Receptionist for Luxury Clinics"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Pricing Structure</label>
                  <input
                    type="text"
                    value={newServicePrice}
                    onChange={e => setNewServicePrice(e.target.value)}
                    placeholder="e.g. ₹35,000/mo or ₹50,000"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Delivery Timeline</label>
                  <input
                    type="text"
                    value={newServiceTimeline}
                    onChange={e => setNewServiceTimeline(e.target.value)}
                    placeholder="e.g. 48 Hours, 72 Hours"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Service Scope & Deliverables</label>
                <textarea
                  value={newServiceDesc}
                  onChange={e => setNewServiceDesc(e.target.value)}
                  rows={2}
                  placeholder="Describe core deliverables, tech stack, and what the client receives..."
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Hunter Pitch Angle / Hook</label>
                <textarea
                  value={newServicePitch}
                  onChange={e => setNewServicePitch(e.target.value)}
                  rows={2}
                  placeholder="The concrete angle Hunter will use in WhatsApp and discovery calls..."
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs text-white outline-none focus:border-violet-400 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="applyAll"
                  checked={applyServiceToAll}
                  onChange={e => setApplyServiceToAll(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/40 text-violet-500 focus:ring-0"
                />
                <label htmlFor="applyAll" className="text-xs text-slate-300">
                  Deploy to all subordinate agents (Researcher, Hunter, DeckBuilder & Yuvi)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button type="button" onClick={() => setShowAddService(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Deploy Offering
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

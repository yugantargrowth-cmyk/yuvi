// components/KnowledgeBaseView.tsx — Interactive Agency Business Intelligence & Context
import React, { useState } from "react";
import { INITIAL_KNOWLEDGE_ARTICLES, type KnowledgeArticle } from "../lib/knowledgeBase";
import { Button, Panel, ViewHeading } from "./ui";
import { Database, Plus, Search, BookOpen, Tag, Check, BrainCircuit } from "lucide-react";

interface KnowledgeBaseViewProps {
  notify: (text: string) => void;
}

export function KnowledgeBaseView({ notify }: KnowledgeBaseViewProps) {
  const [articles, setArticles] = useState<KnowledgeArticle[]>(INITIAL_KNOWLEDGE_ARTICLES);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle>(articles[0]);
  const [isAdding, setIsAdding] = useState(false);

  // New Article Form
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<KnowledgeArticle["category"]>("SERVICES");
  const [newSummary, setNewSummary] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [newTags, setNewTags] = useState("");

  const filtered = articles.filter(a => {
    const matchCat = categoryFilter === "ALL" || a.category === categoryFilter;
    const matchQ = `${a.title} ${a.summary} ${a.details} ${a.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDetails.trim()) return;

    const article: KnowledgeArticle = {
      id: `kb_${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      summary: newSummary.trim() || newTitle.trim(),
      details: newDetails.trim(),
      tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
      lastUpdated: new Date().toISOString().split("T")[0],
    };

    setArticles([article, ...articles]);
    setSelectedArticle(article);
    setIsAdding(false);
    setNewTitle("");
    setNewSummary("");
    setNewDetails("");
    setNewTags("");
    notify("Knowledge entry added. YUVI's reasoning context updated.");
  };

  return (
    <div className="rise space-y-5 p-4 sm:p-7">
      <ViewHeading
        view="Knowledge Base"
        description="Agency Context & Intelligence — YUVI's conversational brain automatically injects this context for high-precision business reasoning."
        action={
          <Button variant="primary" onClick={() => setIsAdding(!isAdding)}>
            <Plus size={14} /> {isAdding ? "Cancel" : "Add Knowledge Record"}
          </Button>
        }
      />

      <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4 text-xs text-slate-300 flex items-center gap-3">
        <BrainCircuit size={18} className="text-violet-300 shrink-0" />
        <div>
          <b>Automatic Context Synchronization:</b> All stored entries are mapped into YUVI's core system prompt. When asking YUVI about services, ICP, pricing, or case studies, responses reference this knowledge directly.
        </div>
      </div>

      {isAdding && (
        <Panel className="p-5 border-violet-400/40 bg-[#0d0f2b]">
          <h3 className="text-sm font-bold text-white mb-3">Add Agency Knowledge Record</h3>
          <form onSubmit={handleSaveArticle} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Record Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Gujarat Commercial Builder ICP Criteria"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 p-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 p-2 text-xs text-white outline-none"
                >
                  <option value="SERVICES">Services & Deliverables</option>
                  <option value="ICP_CRITERIA">ICP & Market Rules</option>
                  <option value="CASE_STUDIES">Case Studies & Results</option>
                  <option value="COMMERCIAL_TERMS">Pricing & Commercial Terms</option>
                  <option value="MARKET_INTELLIGENCE">Market Intelligence</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400">Executive Summary (1 sentence)</label>
              <input
                type="text"
                value={newSummary}
                onChange={e => setNewSummary(e.target.value)}
                placeholder="High-level takeaway for rapid LLM recall"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 p-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400">Full Details & Guidelines</label>
              <textarea
                required
                value={newDetails}
                onChange={e => setNewDetails(e.target.value)}
                placeholder="Pricing breakdown, service specs, evidence claims, or qualification rules..."
                className="mt-1 h-28 w-full rounded-lg border border-white/10 bg-black/40 p-2 text-xs text-white outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button type="submit" variant="primary">
                Save & Inject into YUVI
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1.3fr]">
        {/* Articles List */}
        <Panel className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3">
              <Search size={14} className="text-slate-500" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search knowledge records..."
                className="w-full bg-transparent py-1.5 text-xs text-white outline-none"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 text-xs text-slate-300 outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="SERVICES">Services</option>
              <option value="ICP_CRITERIA">ICP Rules</option>
              <option value="CASE_STUDIES">Case Studies</option>
              <option value="COMMERCIAL_TERMS">Pricing</option>
            </select>
          </div>

          <div className="divide-y divide-white/5">
            {filtered.map(a => {
              const isSelected = selectedArticle?.id === a.id;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedArticle(a)}
                  className={`cursor-pointer p-3 transition-colors rounded-xl ${
                    isSelected ? "bg-violet-600/20 border border-violet-500/30 text-white" : "hover:bg-white/[.03]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded px-1.5 py-0.5 text-[8px] font-bold bg-white/10 text-cyan-300 font-mono">
                      {a.category}
                    </span>
                    <span className="text-[10px] text-slate-500">{a.lastUpdated}</span>
                  </div>
                  <h4 className="mt-1 text-xs font-bold text-white">{a.title}</h4>
                  <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{a.summary}</p>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Selected Article Viewer */}
        {selectedArticle ? (
          <Panel className="p-5 sm:p-6 space-y-4 h-fit">
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded px-2 py-0.5 text-[9px] font-bold bg-cyan-400/10 text-cyan-300 border border-cyan-400/25">
                {selectedArticle.category}
              </span>
              <span className="text-slate-500">Updated {selectedArticle.lastUpdated}</span>
            </div>

            <h3 className="text-lg font-bold text-white">{selectedArticle.title}</h3>
            <p className="text-xs text-violet-200 font-medium italic">{selectedArticle.summary}</p>

            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200 font-mono">
                {selectedArticle.details}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <Tag size={12} className="text-slate-500 mr-1" />
              {selectedArticle.tags.map(t => (
                <span key={t} className="rounded-md border border-white/5 bg-white/[.04] px-2 py-0.5 text-[9px] text-slate-400">
                  #{t}
                </span>
              ))}
            </div>
          </Panel>
        ) : (
          <Panel className="p-8 text-center text-xs text-slate-500">
            Select an article to view details.
          </Panel>
        )}
      </div>
    </div>
  );
}

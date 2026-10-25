// lib/skillLoader.ts — auto-discovers and registers bundled skill modules into skillRegistry.

import { register, isEnabled, type SkillManifest } from "./skillRegistry";
import { validateSkillManifest } from "./security";
import { emit } from "./eventBus";
import type { SkillModule } from "./skills/types";

// Bundled skill modules
import leadResearchSkill from "./skills/lead-research/index";
import leadTriageSkill from "./skills/lead-triage/index";
import deepResearchSkill from "./skills/deep-research/index";
import needsAnalysisSkill from "./skills/needs-analysis/index";
import proposalComposeSkill from "./skills/proposal-compose/index";
import outreachSequenceSkill from "./skills/outreach-sequence/index";
import replyAssistSkill from "./skills/reply-assist/index";
import projectNextActionSkill from "./skills/project-next-action/index";
import collectionsNudgeSkill from "./skills/collections-nudge/index";
import dailyPlanSkill from "./skills/daily-plan/index";
import businessDiscoverySkill from "./skills/business-discovery/index";

export const STATIC_BUNDLED_SKILLS: SkillModule[] = [
  leadResearchSkill,
  leadTriageSkill,
  deepResearchSkill,
  needsAnalysisSkill,
  proposalComposeSkill,
  outreachSequenceSkill,
  replyAssistSkill,
  projectNextActionSkill,
  collectionsNudgeSkill,
  dailyPlanSkill,
  businessDiscoverySkill,
];

export interface SkillLoadReportEntry {
  skill_id: string;
  status: "loaded" | "error";
  version?: string;
  error?: string;
}

const loadReport: SkillLoadReportEntry[] = [];

function hasCycle(skillId: string, deps: Record<string, string[]>, visited: Set<string> = new Set()): boolean {
  if (visited.has(skillId)) return true;
  visited.add(skillId);
  for (const dep of deps[skillId] || []) {
    if (hasCycle(dep, deps, new Set(visited))) return true;
  }
  return false;
}

function loadOne(mod: SkillModule, allDeps: Record<string, string[]>): boolean {
  const manifest = mod.manifest as SkillManifest;

  const validation = validateSkillManifest(manifest);
  if (!validation.valid) {
    const err = `Invalid manifest: ${validation.errors.join(", ")}`;
    console.error(`[skillLoader] ✗ ${manifest?.id ?? "(unknown)"}: ${err}`);
    loadReport.push({ skill_id: manifest?.id ?? "(unknown)", status: "error", error: err });
    return false;
  }

  const deps = manifest.dependencies || [];
  if (deps.length) {
    const missing = deps.filter((dep) => !isEnabled(dep));
    if (missing.length) {
      const err = `Missing dependencies: ${missing.join(", ")}`;
      console.warn(`[skillLoader] ✗ ${manifest.id}: ${err}`);
      loadReport.push({ skill_id: manifest.id, status: "error", error: err });
      return false;
    }
    allDeps[manifest.id] = deps;
    if (hasCycle(manifest.id, allDeps)) {
      const err = "Circular dependency detected";
      console.error(`[skillLoader] ✗ ${manifest.id}: ${err}`);
      loadReport.push({ skill_id: manifest.id, status: "error", error: err });
      return false;
    }
  }

  const ok = register(manifest, mod.api);
  if (ok) {
    loadReport.push({ skill_id: manifest.id, status: "loaded", version: manifest.version });
  } else {
    loadReport.push({ skill_id: manifest.id, status: "error", error: "register() returned false" });
  }
  return ok;
}

/**
 * Discovers and registers bundled skill modules into skillRegistry.
 */
export function loadAllSkills(): SkillLoadReportEntry[] {
  loadReport.length = 0;

  // Use Vite import.meta.glob if in bundler; fallback to STATIC_BUNDLED_SKILLS in Node.js / tests
  let skillModules: SkillModule[] = STATIC_BUNDLED_SKILLS;
  try {
    if (typeof import.meta !== "undefined" && typeof (import.meta as any).glob === "function") {
      const globbed = (import.meta as any).glob("./skills/*/index.ts", { eager: true });
      const values = Object.values(globbed) as SkillModule[];
      if (values.length > 0) {
        skillModules = values;
      }
    }
  } catch {}

  const allDeps: Record<string, string[]> = {};
  let loaded = 0;
  let errors = 0;

  for (const mod of skillModules) {
    const ok = loadOne(mod, allDeps);
    if (ok) loaded++;
    else errors++;
  }

  emit("skills.loaded", { loaded, total: loaded + errors, errors });
  return getReport();
}

export function getReport(): SkillLoadReportEntry[] {
  return [...loadReport];
}

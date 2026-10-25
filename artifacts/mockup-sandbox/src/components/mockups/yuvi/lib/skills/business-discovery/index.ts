// lib/skills/business-discovery/index.ts — Local Business Discovery & Search Skill
import type { SkillModule } from "../types";
import { searchLocalBusinesses, exportLeadsToCsv, type BusinessSearchCriteria } from "../../execution/businessDiscovery";
import type { NormalizedLead } from "../../types/sales";

const skill: SkillModule = {
  manifest: {
    id: "business-discovery",
    name: "Gujarat Local Business Discovery",
    version: "1.0.0",
    description: "Searches and normalizes commercial businesses across Ahmedabad and Gujarat corridors with contact details, GMB ratings, and CSV export.",
    category: "sales",
    icon: "🗺️",
    dependencies: [],
    capabilities: ["business-discovery.search-local", "business-discovery.export-csv"],
  },
  api: {
    async execute(capability: string, args?: Record<string, unknown>) {
      switch (capability) {
        case "business-discovery.search-local": {
          const criteria = (args || {}) as unknown as BusinessSearchCriteria;
          return searchLocalBusinesses(criteria);
        }
        case "business-discovery.export-csv": {
          const leads = (args?.leads as NormalizedLead[]) || [];
          return exportLeadsToCsv(leads);
        }
        default:
          throw new Error(`[business-discovery] Unknown capability: ${capability}`);
      }
    },
  },
};

export default skill;

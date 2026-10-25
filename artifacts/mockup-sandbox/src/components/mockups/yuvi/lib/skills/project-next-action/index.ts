// lib/skills/project-next-action/index.ts — Project Navigator & Next-Action Skill
import type { SkillModule } from "../types";
import { advanceProjectStage, canAdvanceStage, type ClientProject, type ProjectStage } from "../../project/projectNavigator";

const skill: SkillModule = {
  manifest: {
    id: "project-next-action",
    name: "Project Navigator & Next Action",
    version: "1.0.0",
    description: "Tracks active builds, advances project stages, and enforces WIP limits on active development.",
    category: "delivery",
    icon: "🧭",
    dependencies: [],
    capabilities: ["project-next-action.advance-stage", "project-next-action.check-can-advance"],
  },
  api: {
    execute(capability: string, args?: Record<string, unknown>) {
      switch (capability) {
        case "project-next-action.advance-stage": {
          const project = args?.project as ClientProject;
          const targetStage = args?.targetStage as ProjectStage;
          const allProjects = (args?.allProjects as ClientProject[]) || [];
          if (!project || !targetStage) throw new Error("[project-next-action] 'project' and 'targetStage' required");
          return advanceProjectStage(project, targetStage, allProjects);
        }
        case "project-next-action.check-can-advance": {
          const project = args?.project as ClientProject;
          const targetStage = args?.targetStage as ProjectStage;
          const allProjects = (args?.allProjects as ClientProject[]) || [];
          if (!project || !targetStage) throw new Error("[project-next-action] 'project' and 'targetStage' required");
          return canAdvanceStage(project, targetStage, allProjects);
        }
        default:
          throw new Error(`[project-next-action] Unknown capability: ${capability}`);
      }
    },
  },
};

export default skill;

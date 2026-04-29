import type { Agent } from "./agent.js";
import type { Skill } from "./skill.js";
import type { LayoutMap } from "./layout.js";

export interface Project {
  rootPath: string;
  hasClaudeFolder: boolean;
  hasClaudeMd: boolean;
  agents: Agent[];
  skills: Skill[];
  layout: LayoutMap;
}

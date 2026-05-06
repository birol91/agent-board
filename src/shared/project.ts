import type { Agent } from "./agent";
import type { Skill } from "./skill";
import type { LayoutMap } from "./layout";

export interface Project {
  rootPath: string;
  hasClaudeFolder: boolean;
  hasClaudeMd: boolean;
  agents: Agent[];
  skills: Skill[];
  layout: LayoutMap;
}

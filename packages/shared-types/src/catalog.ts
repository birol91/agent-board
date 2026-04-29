import type { AgentFrontmatter } from "./agent.js";
import type { SkillFrontmatter } from "./skill.js";

export interface CatalogAgent {
  plugin: string;
  frontmatter: AgentFrontmatter;
  systemPrompt: string;
  relPath: string;
}

export interface CatalogSkill {
  plugin: string;
  frontmatter: SkillFrontmatter;
  body: string;
  relPath: string;
  hasReferences: boolean;
  hasAssets: boolean;
}

export interface Catalog {
  generatedAt: string;
  counts: { agents: number; skills: number };
  agents: CatalogAgent[];
  skills: CatalogSkill[];
}

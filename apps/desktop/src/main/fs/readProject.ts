import { promises as fs } from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../parser/frontmatter.js";
import { readLayout } from "./layout.js";
import type {
  Agent,
  AgentFrontmatter,
  Project,
  Skill,
  SkillFrontmatter,
} from "@agentdeck/shared-types";

export async function readProject(rootPath: string): Promise<Project> {
  const claudeDir = path.join(rootPath, ".claude");
  const claudeMdPath = path.join(rootPath, "CLAUDE.md");

  const [hasClaudeFolder, hasClaudeMd] = await Promise.all([
    pathExists(claudeDir),
    pathExists(claudeMdPath),
  ]);

  if (!hasClaudeFolder) {
    return {
      rootPath,
      hasClaudeFolder: false,
      hasClaudeMd,
      agents: [],
      skills: [],
      layout: { agents: {} },
    };
  }

  const [agents, skills, layout] = await Promise.all([
    readAgents(path.join(claudeDir, "agents"), rootPath),
    readSkills(path.join(claudeDir, "skills")),
    readLayout(rootPath),
  ]);

  return {
    rootPath,
    hasClaudeFolder: true,
    hasClaudeMd,
    agents,
    skills,
    layout,
  };
}

async function readAgents(
  agentsDir: string,
  projectRoot: string,
): Promise<Agent[]> {
  if (!(await pathExists(agentsDir))) return [];
  const entries = await fs.readdir(agentsDir);
  const out: Agent[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const filePath = path.join(agentsDir, entry);
    const raw = await fs.readFile(filePath, "utf8");
    const { data, content } = parseFrontmatter(raw);
    const fm = parseAgentFrontmatter(data, entry);
    if (!fm) continue;
    out.push({
      frontmatter: fm,
      systemPrompt: content.trim(),
      filePath,
      source: { kind: "project", projectPath: projectRoot },
    });
  }
  return out;
}

async function readSkills(skillsDir: string): Promise<Skill[]> {
  if (!(await pathExists(skillsDir))) return [];
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  const out: Skill[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folderPath = path.join(skillsDir, entry.name);
    const skillFile = path.join(folderPath, "SKILL.md");
    if (!(await pathExists(skillFile))) continue;
    const raw = await fs.readFile(skillFile, "utf8");
    const { data, content } = parseFrontmatter(raw);
    const fm = parseSkillFrontmatter(data);
    if (!fm) continue;
    out.push({
      frontmatter: fm,
      body: content.trim(),
      folderPath,
      hasReferences: await pathExists(path.join(folderPath, "references")),
      hasAssets: await pathExists(path.join(folderPath, "assets")),
    });
  }
  return out;
}

function parseAgentFrontmatter(
  data: Record<string, unknown>,
  fallbackName: string,
): AgentFrontmatter | null {
  const name =
    typeof data.name === "string"
      ? data.name
      : fallbackName.replace(/\.md$/, "");
  const description =
    typeof data.description === "string" ? data.description : "";
  if (!description) return null;
  const fm: AgentFrontmatter = { name, description };
  if (
    data.model === "opus" ||
    data.model === "sonnet" ||
    data.model === "haiku" ||
    data.model === "inherit"
  ) {
    fm.model = data.model;
  }
  if (
    data.color === "blue" ||
    data.color === "green" ||
    data.color === "red" ||
    data.color === "yellow" ||
    data.color === "cyan" ||
    data.color === "magenta"
  ) {
    fm.color = data.color;
  }
  if (typeof data.tools === "string") {
    fm.tools = data.tools
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(data.tools)) {
    fm.tools = data.tools.filter((s): s is string => typeof s === "string");
  }
  return fm;
}

function parseSkillFrontmatter(
  data: Record<string, unknown>,
): SkillFrontmatter | null {
  if (typeof data.name !== "string" || typeof data.description !== "string") {
    return null;
  }
  return { name: data.name, description: data.description };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

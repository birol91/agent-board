import { promises as fs } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type {
  AgentFrontmatter,
  CatalogAgent,
} from "../../shared";

export async function installAgent(
  rootPath: string,
  from: CatalogAgent,
): Promise<{ filePath: string }> {
  const agentsDir = path.join(rootPath, ".claude", "agents");
  await fs.mkdir(agentsDir, { recursive: true });
  const filePath = path.join(agentsDir, `${from.frontmatter.name}.md`);
  const content = serializeAgent(from.frontmatter, from.systemPrompt);
  await fs.writeFile(filePath, content, "utf8");
  return { filePath };
}

export async function saveAgent(
  filePath: string,
  frontmatter: AgentFrontmatter,
  systemPrompt: string,
): Promise<void> {
  const content = serializeAgent(frontmatter, systemPrompt);
  await fs.writeFile(filePath, content, "utf8");
}

export async function deleteAgent(filePath: string): Promise<void> {
  await fs.unlink(filePath);
}

function serializeAgent(fm: AgentFrontmatter, body: string): string {
  const data: Record<string, unknown> = {
    name: fm.name,
    description: fm.description,
  };
  if (fm.model) data.model = fm.model;
  if (fm.color) data.color = fm.color;
  if (fm.tools && fm.tools.length > 0) data.tools = fm.tools.join(", ");
  const yamlText = yaml.dump(data, { lineWidth: 0 }).trimEnd();
  return `---\n${yamlText}\n---\n\n${body.trim()}\n`;
}

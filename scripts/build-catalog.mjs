import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import yaml from "js-yaml";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const vendor = resolve(root, "vendor", "wshobson-agents");
const pluginsDir = resolve(vendor, "plugins");
const out = resolve(root, "src", "main", "catalog.json");

if (!existsSync(pluginsDir)) {
  console.error(`[build-catalog] vendor missing at ${pluginsDir}`);
  process.exit(1);
}

const agents = [];
const skills = [];

for (const pluginName of readdirSync(pluginsDir)) {
  const pluginPath = join(pluginsDir, pluginName);
  if (!statSync(pluginPath).isDirectory()) continue;

  const agentsPath = join(pluginPath, "agents");
  if (existsSync(agentsPath)) {
    for (const f of readdirSync(agentsPath)) {
      if (!f.endsWith(".md")) continue;
      const parsed = parseMarkdown(join(agentsPath, f));
      if (!parsed) continue;
      const fm = parseAgentFm(parsed.data, f);
      if (!fm) continue;
      agents.push({
        plugin: pluginName,
        frontmatter: fm,
        systemPrompt: parsed.content.trim(),
        relPath: `plugins/${pluginName}/agents/${f}`,
      });
    }
  }

  const skillsPath = join(pluginPath, "skills");
  if (existsSync(skillsPath)) {
    for (const skillName of readdirSync(skillsPath)) {
      const skillDir = join(skillsPath, skillName);
      if (!statSync(skillDir).isDirectory()) continue;
      const skillFile = join(skillDir, "SKILL.md");
      if (!existsSync(skillFile)) continue;
      const parsed = parseMarkdown(skillFile);
      if (!parsed) continue;
      const fm = parseSkillFm(parsed.data);
      if (!fm) continue;
      skills.push({
        plugin: pluginName,
        frontmatter: fm,
        body: parsed.content.trim(),
        relPath: `plugins/${pluginName}/skills/${skillName}`,
        hasReferences: existsSync(join(skillDir, "references")),
        hasAssets: existsSync(join(skillDir, "assets")),
      });
    }
  }
}

const dedupedAgents = dedupe(agents, (a) => a.frontmatter.name, (a) => a.systemPrompt);
const dedupedSkills = dedupe(skills, (s) => s.frontmatter.name, (s) => s.body);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      counts: { agents: dedupedAgents.length, skills: dedupedSkills.length },
      agents: dedupedAgents,
      skills: dedupedSkills,
    },
    null,
    2,
  ),
);
const droppedAgents = agents.length - dedupedAgents.length;
const droppedSkills = skills.length - dedupedSkills.length;
console.log(
  `[build-catalog] wrote ${out} — ${dedupedAgents.length} agents (${droppedAgents} duplicates merged), ${dedupedSkills.length} skills (${droppedSkills} duplicates merged)`,
);

// Merge entries that share both name AND content hash. Keep entries that share
// a name but have different content as separate variants. The kept entry gets
// an `alsoInPlugins` list so the UI can show "this is also bundled in X, Y".
function dedupe(items, getName, getContent) {
  const groups = new Map();
  for (const item of items) {
    const name = getName(item);
    const hash = createHash("sha1").update(getContent(item)).digest("hex");
    const key = `${name}::${hash}`;
    const existing = groups.get(key);
    if (existing) {
      existing.alsoInPlugins.push(item.plugin);
    } else {
      groups.set(key, { ...item, alsoInPlugins: [] });
    }
  }
  return Array.from(groups.values()).map((entry) => {
    if (entry.alsoInPlugins.length === 0) {
      // No collisions — drop the empty array so the JSON stays clean.
      const { alsoInPlugins: _omit, ...rest } = entry;
      return rest;
    }
    return entry;
  });
}

function parseMarkdown(filePath) {
  const raw = readFileSync(filePath, "utf8");
  if (!raw.startsWith("---")) return null;
  const after = raw.slice(3);
  const nl = after.indexOf("\n");
  if (nl === -1) return null;
  const body = after.slice(nl + 1);
  const close = body.indexOf("\n---");
  if (close === -1) return null;
  const yamlText = body.slice(0, close);
  const rest = body.slice(close + 4);
  const content = rest.startsWith("\n") ? rest.slice(1) : rest;
  let data = {};
  try {
    const parsed = yaml.load(yamlText);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      data = parsed;
    }
  } catch {
    return null;
  }
  return { data, content };
}

function parseAgentFm(data, fallback) {
  const name = typeof data.name === "string" ? data.name : fallback.replace(/\.md$/, "");
  const description = typeof data.description === "string" ? data.description : "";
  if (!description) return null;
  const fm = { name, description };
  if (["opus", "sonnet", "haiku", "inherit"].includes(data.model)) fm.model = data.model;
  if (["blue", "green", "red", "yellow", "cyan", "magenta"].includes(data.color)) fm.color = data.color;
  if (typeof data.tools === "string") {
    fm.tools = data.tools.split(",").map((s) => s.trim()).filter(Boolean);
  } else if (Array.isArray(data.tools)) {
    fm.tools = data.tools.filter((s) => typeof s === "string");
  }
  return fm;
}

function parseSkillFm(data) {
  if (typeof data.name !== "string" || typeof data.description !== "string") return null;
  return { name: data.name, description: data.description };
}

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseFrontmatter } from "../parser/frontmatter.js";
import type { MemoryEntry } from "@agentdeck/shared-types";

function memoryDir(): string {
  return path.join(os.homedir(), ".claude", "memory");
}

function indexPath(): string {
  return path.join(memoryDir(), "MEMORY.md");
}

export async function listMemory(): Promise<{
  entries: MemoryEntry[];
  indexPath: string;
  indexBody: string;
}> {
  const dir = memoryDir();
  await fs.mkdir(dir, { recursive: true });
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    names = [];
  }
  const entries: MemoryEntry[] = [];
  for (const name of names) {
    if (!name.endsWith(".md") || name === "MEMORY.md") continue;
    const filePath = path.join(dir, name);
    const raw = await fs.readFile(filePath, "utf8");
    const { data, content } = parseFrontmatter(raw);
    const title = typeof data.name === "string" ? data.name : name;
    const description =
      typeof data.description === "string" ? data.description : "";
    const type = typeof data.type === "string" ? data.type : "user";
    entries.push({
      fileName: name,
      filePath,
      title,
      description,
      type,
      body: content.trim(),
    });
  }
  let indexBody = "";
  try {
    indexBody = await fs.readFile(indexPath(), "utf8");
  } catch {
    indexBody = "";
  }
  return { entries, indexPath: indexPath(), indexBody };
}

export async function deleteMemory(fileName: string): Promise<void> {
  const safe = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
  await fs.unlink(path.join(memoryDir(), safe));
}

export async function initializeMemory(): Promise<{
  indexPath: string;
  created: boolean;
}> {
  const dir = memoryDir();
  await fs.mkdir(dir, { recursive: true });
  const idx = indexPath();
  try {
    await fs.access(idx);
    return { indexPath: idx, created: false };
  } catch {
    const seed = `# Memory Index

This file is maintained by Claude Code. Each line points to a memory file in
this directory.

`;
    await fs.writeFile(idx, seed, "utf8");
    return { indexPath: idx, created: true };
  }
}

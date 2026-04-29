import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function claudeMdPath(rootPath: string): string {
  return path.join(rootPath, "CLAUDE.md");
}

export async function readClaudeMd(
  rootPath: string,
): Promise<{ content: string; filePath: string; exists: boolean }> {
  const filePath = claudeMdPath(rootPath);
  try {
    const content = await fs.readFile(filePath, "utf8");
    return { content, filePath, exists: true };
  } catch {
    return { content: projectTemplate(), filePath, exists: false };
  }
}

export async function writeClaudeMd(
  rootPath: string,
  content: string,
): Promise<void> {
  const filePath = claudeMdPath(rootPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

function projectTemplate(): string {
  let karpathy = "";
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const tpl = path.join(here, "..", "templates", "karpathy-claude.md");
    karpathy = readFileSync(tpl, "utf8").trim();
  } catch {
    karpathy = "";
  }
  return `# Project: <name>

Short description of what this project does.

## Orchestrator
This project uses **Claude Code** as the orchestrator — the Claude that runs
in your chat session. It reads this file, your memory, and dispatches work to
the specialist agents installed via AgentDeck (see \`.claude/agents/\`).

## Stack
- Language:
- Framework:
- Package manager:

## Conventions
- File layout:
- Tests:
- Commits:

## Domain
Brief context: who uses this, what business problem it solves.

## Things to avoid
- ...

---

${karpathy}
`;
}

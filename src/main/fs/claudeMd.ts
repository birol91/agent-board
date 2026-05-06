import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";

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
  try {
    const tpl = path.join(__dirname, "..", "templates", "karpathy-claude.md");
    return readFileSync(tpl, "utf8");
  } catch {
    return "# CLAUDE.md\n\nBehavioral guidelines.\n";
  }
}

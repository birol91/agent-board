import { promises as fs } from "node:fs";
import path from "node:path";

export type ResetWhat = "claudeMd" | "agents" | "skills" | "all";

export async function resetProject(
  rootPath: string,
  what: ResetWhat,
): Promise<void> {
  if (what === "claudeMd" || what === "all") {
    const f = path.join(rootPath, "CLAUDE.md");
    await fs.rm(f, { force: true });
  }
  if (what === "agents" || what === "all") {
    const dir = path.join(rootPath, ".claude", "agents");
    await fs.rm(dir, { recursive: true, force: true });
  }
  if (what === "skills" || what === "all") {
    const dir = path.join(rootPath, ".claude", "skills");
    await fs.rm(dir, { recursive: true, force: true });
  }
  if (what === "all") {
    const layout = path.join(rootPath, ".claude", "agentdeck.json");
    await fs.rm(layout, { force: true });
  }
}

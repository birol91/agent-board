import { promises as fs } from "node:fs";
import path from "node:path";

export type ResetWhat =
  | "claudeMd"
  | "agents"
  | "skills"
  | "hooks"
  | "all";

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
  if (what === "hooks" || what === "all") {
    await removeHookEntries(rootPath);
    const hooksDir = path.join(rootPath, ".claude", "hooks");
    await fs.rm(hooksDir, { recursive: true, force: true });
  }
  if (what === "all") {
    const layout = path.join(rootPath, ".claude", "agent-board.json");
    await fs.rm(layout, { force: true });
  }
}

interface HookEntry {
  type?: string;
  command?: string;
}
interface HookGroup {
  matcher?: string;
  hooks?: HookEntry[];
}
interface SettingsShape {
  hooks?: Record<string, HookGroup[]>;
  [key: string]: unknown;
}

async function removeHookEntries(rootPath: string): Promise<void> {
  const settingsPath = path.join(rootPath, ".claude", "settings.json");
  let raw: string;
  try {
    raw = await fs.readFile(settingsPath, "utf8");
  } catch {
    return;
  }
  let settings: SettingsShape;
  try {
    settings = JSON.parse(raw) as SettingsShape;
  } catch {
    return;
  }
  if (!settings.hooks) {
    delete settings["agent-board-managed"];
  } else {
    for (const event of Object.keys(settings.hooks)) {
      const groups = settings.hooks[event];
      if (!groups) continue;
      const filtered = groups
        .map((g) => ({
          ...g,
          hooks: (g.hooks ?? []).filter(
            (h) =>
              typeof h.command !== "string" ||
              !h.command.includes("agent-board-emit"),
          ),
        }))
        .filter((g) => (g.hooks?.length ?? 0) > 0);
      if (filtered.length === 0) {
        delete settings.hooks[event];
      } else {
        settings.hooks[event] = filtered;
      }
    }
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }
    delete settings["agent-board-managed"];
  }

  if (Object.keys(settings).length === 0) {
    await fs.rm(settingsPath, { force: true });
  } else {
    await fs.writeFile(
      settingsPath,
      JSON.stringify(settings, null, 2) + "\n",
      "utf8",
    );
  }
}

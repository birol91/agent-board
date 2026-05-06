import { promises as fs } from "node:fs";
import path from "node:path";
import type { LayoutMap } from "../../shared";

const LAYOUT_FILE = "agent-board.json";

export async function readLayout(rootPath: string): Promise<LayoutMap> {
  const file = path.join(rootPath, ".claude", LAYOUT_FILE);
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<LayoutMap>;
    return {
      agents: parsed.agents ?? {},
      windows: parsed.windows ?? {},
      openWindows: parsed.openWindows ?? [],
    };
  } catch {
    return { agents: {}, windows: {}, openWindows: [] };
  }
}

export async function writeLayout(
  rootPath: string,
  layout: LayoutMap,
): Promise<void> {
  const dir = path.join(rootPath, ".claude");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, LAYOUT_FILE);
  await fs.writeFile(file, JSON.stringify(layout, null, 2) + "\n", "utf8");
}

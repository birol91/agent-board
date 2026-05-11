import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";

const FILE = "recent-projects.json";
const MAX_RECENT = 10;

interface UserConfig {
  recent: string[];
}

function configPath(): string {
  return path.join(app.getPath("userData"), FILE);
}

async function readRaw(): Promise<UserConfig> {
  try {
    const raw = await fs.readFile(configPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<UserConfig>;
    return { recent: Array.isArray(parsed.recent) ? parsed.recent : [] };
  } catch {
    return { recent: [] };
  }
}

async function writeRaw(cfg: UserConfig): Promise<void> {
  const file = configPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(cfg, null, 2) + "\n", "utf8");
  await fs.rename(tmp, file);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function readRecent(): Promise<string[]> {
  const cfg = await readRaw();
  const checks = await Promise.all(
    cfg.recent.map(async (p) => ((await pathExists(p)) ? p : null)),
  );
  const cleaned = checks.filter((p): p is string => p !== null);
  if (cleaned.length !== cfg.recent.length) {
    await writeRaw({ recent: cleaned });
  }
  return cleaned;
}

export async function addRecent(rootPath: string): Promise<void> {
  const cfg = await readRaw();
  const next = [rootPath, ...cfg.recent.filter((p) => p !== rootPath)].slice(
    0,
    MAX_RECENT,
  );
  await writeRaw({ recent: next });
}

export async function clearRecent(rootPath: string): Promise<void> {
  const cfg = await readRaw();
  await writeRaw({ recent: cfg.recent.filter((p) => p !== rootPath) });
}

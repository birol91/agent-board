import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function resolveProjectRoot(): string {
  const fromEnv = process.env.AGENTDECK_PROJECT_ROOT;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (hasPackageJson(dir) && !isAgentDeckDir(dir)) return dir;
    const parent = path.resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function hasPackageJson(dir: string): boolean {
  return existsSync(path.join(dir, "package.json"));
}

function isAgentDeckDir(dir: string): boolean {
  const pkgPath = path.join(dir, "package.json");
  if (!existsSync(pkgPath)) return false;
  try {
    const raw = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      name?: string;
    };
    const name = raw.name ?? "";
    return (
      name === "agentdeck" ||
      name === "@agentdeck/desktop" ||
      name === "@agentdeck/service" ||
      name.startsWith("@agentdeck/")
    );
  } catch {
    return false;
  }
}

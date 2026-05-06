import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export function resolveProjectRoot(): string {
  const fromEnv = process.env.AGENTDECK_PROJECT_ROOT;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  // Walk up from cwd; first non-AgentBoard directory with a package.json wins.
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (hasPackageJson(dir) && !isAgentBoardDir(dir)) return dir;
    const parent = path.resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  // Fallback: if we are inside the AgentBoard folder, use its parent
  // even if it has no package.json yet. This is the common "user opened
  // AgentBoard from inside agent-board/" case — the project root is one
  // level up and CLAUDE.md / .claude/ should land there.
  const cwd = process.cwd();
  if (isAgentBoardDir(cwd)) {
    const parent = path.resolve(cwd, "..");
    if (parent !== cwd) return parent;
  }
  return cwd;
}

function hasPackageJson(dir: string): boolean {
  return existsSync(path.join(dir, "package.json"));
}

function isAgentBoardDir(dir: string): boolean {
  const pkgPath = path.join(dir, "package.json");
  if (!existsSync(pkgPath)) return false;
  try {
    const raw = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      name?: string;
    };
    const name = raw.name ?? "";
    return (
      name === "agent-board" ||
      name === "@agent-board/desktop" ||
      name === "@agent-board/service" ||
      name.startsWith("@agent-board/")
    );
  } catch {
    return false;
  }
}

// Exported for the install postinstall script context if ever needed.
export { writeFileSync };

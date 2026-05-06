import { promises as fs, statSync } from "node:fs";
import path from "node:path";
import type { CatalogSkill } from "../../shared";

function vendorRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, "vendor", "wshobson-agents");
    try {
      if (statSync(candidate).isDirectory()) return candidate;
    } catch {
      // ignore
    }
    const parent = path.resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("vendor/wshobson-agents not found");
}

export async function installSkill(
  rootPath: string,
  from: CatalogSkill,
): Promise<{ folderPath: string }> {
  const skillsDir = path.join(rootPath, ".claude", "skills");
  await fs.mkdir(skillsDir, { recursive: true });
  const target = path.join(skillsDir, from.frontmatter.name);
  const source = path.join(vendorRoot(), from.relPath);
  await copyDir(source, target);
  return { folderPath: target };
}

export async function deleteSkill(folderPath: string): Promise<void> {
  await fs.rm(folderPath, { recursive: true, force: true });
}

async function copyDir(src: string, dst: string): Promise<void> {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyDir(s, d);
    } else if (entry.isFile()) {
      await fs.copyFile(s, d);
    }
  }
}

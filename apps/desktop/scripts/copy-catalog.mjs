import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "..", "src", "main", "catalog.json");
const dst = resolve(here, "..", "dist", "main", "catalog.json");

if (!existsSync(src)) {
  console.warn(`[copy-catalog] no catalog.json at ${src} — skipping`);
  process.exit(0);
}

mkdirSync(dirname(dst), { recursive: true });
copyFileSync(src, dst);
const size = (statSync(dst).size / 1024).toFixed(1);
console.log(`[copy-catalog] copied catalog.json (${size} KB) -> dist/main/`);

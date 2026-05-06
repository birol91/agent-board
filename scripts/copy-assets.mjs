import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, "..", "src", "main");
const dstRoot = resolve(here, "..", "dist", "main");

mkdirSync(dstRoot, { recursive: true });
writeFileSync(
  join(dstRoot, "package.json"),
  JSON.stringify({ type: "commonjs" }, null, 2),
);
console.log("[copy-assets] dist/main/package.json (commonjs)");

const catalog = join(srcRoot, "catalog.json");
if (existsSync(catalog)) {
  copyFileSync(catalog, join(dstRoot, "catalog.json"));
  const kb = (statSync(catalog).size / 1024).toFixed(1);
  console.log(`[copy-assets] catalog.json (${kb} KB)`);
}

const tplDir = join(srcRoot, "templates");
if (existsSync(tplDir)) {
  const dstTpl = join(dstRoot, "templates");
  mkdirSync(dstTpl, { recursive: true });
  for (const f of readdirSync(tplDir)) {
    copyFileSync(join(tplDir, f), join(dstTpl, f));
  }
  console.log("[copy-assets] templates -> dist/main/templates");
}

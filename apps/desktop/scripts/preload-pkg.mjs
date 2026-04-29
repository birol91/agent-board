import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "..", "dist", "preload", "package.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify({ type: "commonjs" }, null, 2));
console.log(`[preload-pkg] wrote ${target}`);

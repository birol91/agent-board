import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const agentDeckRoot = resolve(here, "..");
const projectRoot = resolve(agentDeckRoot, "..");
const projectPkgPath = resolve(projectRoot, "package.json");

if (!existsSync(projectPkgPath)) {
  console.log(
    `[agentdeck:install] no package.json at ${projectPkgPath}, skipping host wiring`,
  );
  process.exit(0);
}

if (resolve(projectRoot) === resolve(agentDeckRoot)) {
  console.log(
    "[agentdeck:install] running inside the AgentDeck repo itself, skipping host wiring",
  );
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(projectPkgPath, "utf8"));
pkg.scripts ??= {};

const relPath = relative(projectRoot, agentDeckRoot).replace(/\\/g, "/");
const cmd = `npm run dev --prefix ${relPath}`;

if (pkg.scripts.agentdeck === cmd) {
  console.log("[agentdeck:install] host script already wired");
  process.exit(0);
}

pkg.scripts.agentdeck = cmd;
writeFileSync(projectPkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(
  `[agentdeck:install] added "agentdeck" script to ${relative(process.cwd(), projectPkgPath)}`,
);
console.log(`[agentdeck:install] run it with: npm run agentdeck`);

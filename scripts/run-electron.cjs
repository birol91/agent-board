/* Resolves the electron binary across package layouts and spawns it
 * with the app entry point. Avoids the "electron has no `app` export"
 * trap that occurs when the main script is loaded through Node instead
 * of the Electron binary. */
const { spawn } = require("node:child_process");
const path = require("node:path");

let electronBin;
try {
  electronBin = require("electron");
} catch (e) {
  console.error(
    "[run-electron] failed to require('electron'):",
    e.message,
  );
  process.exit(1);
}

if (typeof electronBin !== "string") {
  console.error(
    "[run-electron] electron module did not export a path (got",
    typeof electronBin,
    ")",
  );
  process.exit(1);
}

const appRoot = path.resolve(__dirname, "..");
const child = spawn(electronBin, [appRoot], {
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 0));

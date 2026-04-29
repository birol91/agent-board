import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";

let logFile: string | null = null;

async function ensureLogFile(): Promise<string> {
  if (logFile) return logFile;
  const dir = app.getPath("logs");
  await fs.mkdir(dir, { recursive: true });
  logFile = path.join(dir, "agentdeck.log");
  return logFile;
}

export async function logInfo(scope: string, message: string): Promise<void> {
  await write("INFO", scope, message);
}

export async function logError(scope: string, err: unknown): Promise<void> {
  const message =
    err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  await write("ERROR", scope, message);
}

async function write(
  level: "INFO" | "ERROR",
  scope: string,
  message: string,
): Promise<void> {
  const file = await ensureLogFile();
  const line = `[${new Date().toISOString()}] ${level} [${scope}] ${message}\n`;
  try {
    await fs.appendFile(file, line, "utf8");
  } catch {
    // swallow — logging failure must never crash the app
  }
  if (level === "ERROR") {
    console.error(line.trim());
  } else {
    console.log(line.trim());
  }
}

import { createServer, type Server, type Socket } from "node:net";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { BrowserWindow } from "electron";
import type { HookEvent } from "../../shared";
import { logError, logInfo } from "../log";
import { readProject } from "../fs/readProject";
import { resolveAgentNameFromTranscript } from "./resolveAgent";

const isWindows = process.platform === "win32";
const PIPE_NAME = "agent-board";
const SOCKET_PATH = isWindows
  ? `\\\\.\\pipe\\${PIPE_NAME}`
  : path.join(tmpdir(), "agent-board.sock");
let server: Server | null = null;

/**
 * On macOS/Linux: filesystem path to the Unix domain socket.
 * On Windows: full \\.\pipe\... path used by net.createServer.
 * The hook script needs the bare pipe name on Windows; expose it via
 * getSocketPath returning the value the hook script needs.
 */
export function getSocketPath(): string {
  return isWindows ? PIPE_NAME : SOCKET_PATH;
}

function listenAddress(): string {
  return SOCKET_PATH;
}

export async function startHookServer(): Promise<void> {
  if (!isWindows) {
    await fs.rm(SOCKET_PATH, { force: true });
  }
  server = createServer((socket: Socket) => {
    let buffer = "";
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let nl;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line) void handleLine(line);
      }
    });
    socket.on("end", () => {
      if (buffer.trim()) void handleLine(buffer.trim());
    });
    socket.on("error", (err) => {
      void logError("hooks:socket", err);
    });
  });
  server.on("error", (err) => {
    void logError("hooks:server", err);
  });
  await new Promise<void>((resolve) => {
    server!.listen(listenAddress(), () => {
      void logInfo("hooks", `listening on ${listenAddress()}`);
      resolve();
    });
  });
}

export async function stopHookServer(): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = null;
  if (!isWindows) {
    await fs.rm(SOCKET_PATH, { force: true });
  }
}

function broadcast(event: HookEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("hook:event", event);
  }
}

function deriveAgentTranscriptPath(
  parentTranscriptPath: string | null,
  agentId: string,
): string | null {
  if (!parentTranscriptPath) return null;
  const dir = path.dirname(parentTranscriptPath);
  const base = path.basename(parentTranscriptPath, ".jsonl");
  return path.join(dir, base, "subagents", `agent-${agentId}.jsonl`);
}

async function tryResolveAgent(
  cwd: string,
  transcriptPath: string,
): Promise<string | null> {
  const project = await readProject(cwd);
  const known = project.agents.map((a) => ({
    name: a.frontmatter.name,
    description: a.frontmatter.description,
  }));
  return resolveAgentNameFromTranscript(transcriptPath, known);
}

async function pollResolveAndAnnounce(
  event: HookEvent & { type: "SubagentStart" },
  transcriptPath: string,
): Promise<void> {
  const deadline = Date.now() + 60_000;
  let delay = 200;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.3, 2000);
    const name = await tryResolveAgent(event.cwd, transcriptPath);
    if (name) {
      broadcast({ ...event, agentName: name });
      return;
    }
  }
}

async function handleLine(line: string): Promise<void> {
  let event: HookEvent;
  try {
    event = JSON.parse(line) as HookEvent;
  } catch {
    void logError("hooks:parse", `bad payload: ${line.slice(0, 200)}`);
    return;
  }

  if (event.type === "SubagentStart") {
    // Send the start event immediately for the "active" badge,
    // then resolve agent name in the background.
    broadcast(event);
    const transcript =
      event.agentTranscriptPath ??
      deriveAgentTranscriptPath(event.transcriptPath, event.agentId);
    if (transcript) {
      void pollResolveAndAnnounce(event, transcript).catch((err) =>
        logError("hooks:resolveStart", err),
      );
    }
    return;
  }

  if (
    event.type === "SubagentStop" &&
    !event.agentName &&
    (event.agentTranscriptPath || event.transcriptPath)
  ) {
    try {
      const transcript =
        event.agentTranscriptPath ??
        deriveAgentTranscriptPath(event.transcriptPath, event.agentId);
      if (transcript) {
        const name = await tryResolveAgent(event.cwd, transcript);
        if (name) event.agentName = name;
      }
    } catch (err) {
      void logError("hooks:resolveStop", err);
    }
  }

  broadcast(event);
}

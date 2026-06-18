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

// agentIds whose name has been broadcast in a resolved SubagentStart event.
// Used by SubagentStop to decide whether to send a retroactive Start.
const resolvedStartAgentIds = new Set<string>();
// agentIds that have stopped. Prevents pollResolveAndAnnounce from broadcasting
// a resolved SubagentStart after SubagentStop has already been processed,
// which would leave the agent card stuck as "running".
const stoppedAgentIds = new Set<string>();

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
  const metaPath = transcriptPath.replace(/\.jsonl$/, ".meta.json");
  const deadline = Date.now() + 60_000;
  let delay = 150;
  while (Date.now() < deadline) {
    // If the agent already stopped, broadcasting a resolved Start now would
    // leave the card stuck as "running" with no subsequent Stop to clear it.
    if (event.agentId && stoppedAgentIds.has(event.agentId)) return;
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.4, 2000);
    if (event.agentId && stoppedAgentIds.has(event.agentId)) return;

    // Wait for meta.json first — it's the most reliable source and
    // appears shortly after the subagent starts. Transcript may arrive later.
    try {
      await fs.access(metaPath);
    } catch {
      try {
        await fs.access(transcriptPath);
      } catch {
        continue;
      }
    }

    const name = await tryResolveAgent(event.cwd, transcriptPath);
    if (name) {
      if (event.agentId && stoppedAgentIds.has(event.agentId)) return;
      if (event.agentId) resolvedStartAgentIds.add(event.agentId);
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
    // If the hook payload already carries the agent name, mark it resolved now.
    if (event.agentName && event.agentId) {
      resolvedStartAgentIds.add(event.agentId);
    }
    // Send the start event immediately for the "active" badge,
    // then resolve agent name in the background.
    broadcast(event);
    const transcript =
      event.agentTranscriptPath ??
      deriveAgentTranscriptPath(event.transcriptPath, event.agentId);
    if (transcript && !event.agentName) {
      void pollResolveAndAnnounce(event, transcript).catch((err) =>
        logError("hooks:resolveStart", err),
      );
    }
    return;
  }

  if (event.type === "SubagentStop") {
    // Mark as stopped before any async work so the poll loop sees it promptly.
    if (event.agentId) stoppedAgentIds.add(event.agentId);

    if (
      !event.agentName &&
      (event.agentTranscriptPath || event.transcriptPath)
    ) {
      try {
        const transcript =
          event.agentTranscriptPath ??
          deriveAgentTranscriptPath(event.transcriptPath, event.agentId);
        if (transcript) {
          const name = await tryResolveAgent(event.cwd, transcript);
          if (name) {
            event.agentName = name;
            // If the background poll never broadcast a resolved Start for this
            // agent (e.g. the agent finished before the first poll tick), send
            // a retroactive Start now so the activity log and card reflect that
            // the agent actually ran.
            if (event.agentId && !resolvedStartAgentIds.has(event.agentId)) {
              resolvedStartAgentIds.add(event.agentId);
              broadcast({
                type: "SubagentStart",
                timestamp: event.timestamp,
                sessionId: event.sessionId,
                agentId: event.agentId,
                agentName: name,
                agentTranscriptPath: event.agentTranscriptPath,
                transcriptPath: event.transcriptPath,
                cwd: event.cwd,
              });
            }
          }
        }
      } catch (err) {
        void logError("hooks:resolveStop", err);
      }
    }
  }

  broadcast(event);
}

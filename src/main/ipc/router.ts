import { ipcMain } from "electron";
import type {
  IpcChannel,
  IpcContract,
  IpcEnvelope,
  IpcInput,
} from "../../shared";
import { readProject } from "../fs/readProject";
import {
  installAgent,
  saveAgent,
  deleteAgent,
} from "../fs/writeAgent";
import { installSkill, deleteSkill } from "../fs/writeSkill";
import { writeLayout } from "../fs/layout";
import { readClaudeMd, writeClaudeMd } from "../fs/claudeMd";
import {
  listMemory,
  deleteMemory,
  initializeMemory,
} from "../fs/memory";
import { resetProject } from "../fs/reset";
import { installHooks, isHooksInstalled } from "../hooks/install";
import { getSocketPath } from "../hooks/server";
import { resolveProjectRoot } from "../projectRoot";
import { loadCatalog } from "../catalog";
import { logError } from "../log";

type Handler<C extends IpcChannel> = (
  input: IpcInput<C>,
) => Promise<IpcContract[C]["output"]> | IpcContract[C]["output"];

const handlers: { [C in IpcChannel]: Handler<C> } = {
  "app:health": () => ({ version: "1.0.0", ok: true }),
  "app:projectRoot": () => ({ rootPath: resolveProjectRoot() }),
  "project:read": async ({ rootPath }) => readProject(rootPath),
  "catalog:read": () => loadCatalog(),
  "agent:install": async ({ rootPath, from }) => installAgent(rootPath, from),
  "agent:save": async ({ filePath, frontmatter, systemPrompt }) => {
    await saveAgent(filePath, frontmatter, systemPrompt);
    return { ok: true };
  },
  "agent:delete": async ({ filePath }) => {
    await deleteAgent(filePath);
    return { ok: true };
  },
  "skill:install": async ({ rootPath, from }) => installSkill(rootPath, from),
  "skill:delete": async ({ folderPath }) => {
    await deleteSkill(folderPath);
    return { ok: true };
  },
  "layout:save": async ({ rootPath, layout }) => {
    await writeLayout(rootPath, layout);
    return { ok: true };
  },
  "claudeMd:read": async ({ rootPath }) => readClaudeMd(rootPath),
  "claudeMd:write": async ({ rootPath, content }) => {
    await writeClaudeMd(rootPath, content);
    return { ok: true };
  },
  "memory:list": async () => listMemory(),
  "memory:delete": async ({ fileName }) => {
    await deleteMemory(fileName);
    return { ok: true };
  },
  "memory:initialize": async () => initializeMemory(),
  "project:reset": async ({ rootPath, what }) => {
    await resetProject(rootPath, what);
    return { ok: true };
  },
  "hooks:install": async ({ rootPath }) => {
    await installHooks(rootPath);
    return { ok: true };
  },
  "hooks:status": async ({ rootPath }) => ({
    installed: await isHooksInstalled(rootPath),
    socketPath: getSocketPath(),
  }),
};

export function registerIpc(): void {
  for (const channel of Object.keys(handlers) as IpcChannel[]) {
    ipcMain.handle(channel, async (_evt, input: unknown) => {
      try {
        const handler = handlers[channel] as Handler<typeof channel>;
        const data = await handler(input as IpcInput<typeof channel>);
        const envelope: IpcEnvelope<typeof data> = { ok: true, data };
        return envelope;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logError(`ipc:${channel}`, err);
        const envelope: IpcEnvelope<never> = {
          ok: false,
          error: { message },
        };
        return envelope;
      }
    });
  }
}

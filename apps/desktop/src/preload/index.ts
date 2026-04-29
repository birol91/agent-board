import { contextBridge, ipcRenderer } from "electron";
import type {
  HookEvent,
  IpcChannel,
  IpcEnvelope,
  IpcInput,
  IpcOutput,
} from "@agentdeck/shared-types";

const api = {
  invoke: <C extends IpcChannel>(
    channel: C,
    input: IpcInput<C>,
  ): Promise<IpcEnvelope<IpcOutput<C>>> => ipcRenderer.invoke(channel, input),
  onHookEvent: (cb: (event: HookEvent) => void): (() => void) => {
    const listener = (_e: unknown, evt: HookEvent): void => cb(evt);
    ipcRenderer.on("hook:event", listener);
    return () => ipcRenderer.removeListener("hook:event", listener);
  },
};

contextBridge.exposeInMainWorld("agentdeck", api);

export type AgentDeckBridge = typeof api;

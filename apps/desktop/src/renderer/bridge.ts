import type {
  HookEvent,
  IpcChannel,
  IpcEnvelope,
  IpcInput,
  IpcOutput,
} from "@agentdeck/shared-types";

interface AgentDeckBridge {
  invoke<C extends IpcChannel>(
    channel: C,
    input: IpcInput<C>,
  ): Promise<IpcEnvelope<IpcOutput<C>>>;
  onHookEvent(cb: (event: HookEvent) => void): () => void;
}

declare global {
  interface Window {
    agentdeck: AgentDeckBridge;
  }
}

export async function call<C extends IpcChannel>(
  channel: C,
  input: IpcInput<C>,
): Promise<IpcOutput<C>> {
  const env = await window.agentdeck.invoke(channel, input);
  if (!env.ok) throw new Error(env.error.message);
  return env.data;
}

export function onHookEvent(cb: (event: HookEvent) => void): () => void {
  return window.agentdeck.onHookEvent(cb);
}

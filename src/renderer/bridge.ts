import type {
  HookEvent,
  IpcChannel,
  IpcEnvelope,
  IpcInput,
  IpcOutput,
} from "../shared";

interface AgentBoardBridge {
  invoke<C extends IpcChannel>(
    channel: C,
    input: IpcInput<C>,
  ): Promise<IpcEnvelope<IpcOutput<C>>>;
  onHookEvent(cb: (event: HookEvent) => void): () => void;
}

declare global {
  interface Window {
    agentBoard: AgentBoardBridge;
  }
}

export async function call<C extends IpcChannel>(
  channel: C,
  input: IpcInput<C>,
): Promise<IpcOutput<C>> {
  const env = await window.agentBoard.invoke(channel, input);
  if (!env.ok) throw new Error(env.error.message);
  return env.data;
}

export function onHookEvent(cb: (event: HookEvent) => void): () => void {
  return window.agentBoard.onHookEvent(cb);
}

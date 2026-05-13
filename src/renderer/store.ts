import { create } from "zustand";
import type { Agent, HookEvent, Project } from "../shared";

export type View = "picker" | "setup" | "project" | "marketplace";
export type MarketplaceTab = "agents" | "skills";
export type RunStatus = "idle" | "running" | "waiting" | "disabled";
export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "agent-board:theme";

function loadInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // ignore
  }
  return "light";
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  agentName: string | null;
  toolName: string | null;
  kind: "tool" | "subagent-start" | "subagent-stop" | "stop";
  detail: string;
}

export interface AgentActivityEntry {
  id: string;
  timestamp: string;
  toolName: string | null;
  kind: "tool" | "subagent-start" | "subagent-stop" | "message";
  detail: string;
}

const MAX_ACTIVITY = 200;
const MAX_PER_AGENT = 100;

interface UiStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  view: View;
  setView: (v: View) => void;
  marketplaceTab: MarketplaceTab;
  setMarketplaceTab: (t: MarketplaceTab) => void;
  openMarketplace: (tab: MarketplaceTab) => void;
  project: Project | null;
  setProject: (p: Project | null) => void;
  selectedAgent: Agent | null;
  setSelectedAgent: (a: Agent | null) => void;
  statuses: Record<string, RunStatus>;
  setStatus: (agentName: string, status: RunStatus) => void;
  activeSubagents: number;
  activity: ActivityEntry[];
  perAgentActivity: Record<string, AgentActivityEntry[]>;
  pendingByAgentId: Record<string, AgentActivityEntry[]>;
  agentIdToName: Record<string, string>;
  openWindows: string[];
  minimizedWindows: string[];
  quantumWindows: string[];
  setOpenWindows: (names: string[]) => void;
  closeAllWindows: () => void;
  toggleWindow: (agentName: string) => void;
  closeWindow: (agentName: string) => void;
  minimizeWindow: (agentName: string) => void;
  restoreWindow: (agentName: string) => void;
  toQuantum: (agentName: string) => void;
  toTerminal: (agentName: string) => void;
  ingestHookEvent: (e: HookEvent) => void;
  restartHintAt: number | null;
  flagRestartNeeded: () => void;
  dismissRestartHint: () => void;
}

export const useUi = create<UiStore>((set) => ({
  theme: loadInitialTheme(),
  setTheme: (theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return { theme: next };
    }),
  view: "picker",
  setView: (view) => set({ view }),
  marketplaceTab: "agents",
  setMarketplaceTab: (marketplaceTab) => set({ marketplaceTab }),
  openMarketplace: (tab) => set({ view: "marketplace", marketplaceTab: tab }),
  project: null,
  setProject: (project) => set({ project }),
  selectedAgent: null,
  setSelectedAgent: (selectedAgent) => set({ selectedAgent }),
  statuses: {},
  setStatus: (name, status) =>
    set((s) => ({ statuses: { ...s.statuses, [name]: status } })),
  activeSubagents: 0,
  activity: [],
  perAgentActivity: {},
  pendingByAgentId: {},
  agentIdToName: {},
  openWindows: [],
  minimizedWindows: [],
  quantumWindows: [],
  setOpenWindows: (names) =>
    set({ openWindows: [...names], minimizedWindows: [], quantumWindows: [] }),
  closeAllWindows: () =>
    set({ openWindows: [], minimizedWindows: [], quantumWindows: [] }),
  toggleWindow: (name) =>
    set((s) => ({
      openWindows: s.openWindows.includes(name)
        ? s.openWindows.filter((n) => n !== name)
        : [...s.openWindows, name],
      minimizedWindows: s.minimizedWindows.filter((n) => n !== name),
      quantumWindows: s.quantumWindows.filter((n) => n !== name),
    })),
  closeWindow: (name) =>
    set((s) => ({
      openWindows: s.openWindows.filter((n) => n !== name),
      minimizedWindows: s.minimizedWindows.filter((n) => n !== name),
      quantumWindows: s.quantumWindows.filter((n) => n !== name),
    })),
  minimizeWindow: (name) =>
    set((s) => ({
      minimizedWindows: s.minimizedWindows.includes(name)
        ? s.minimizedWindows
        : [...s.minimizedWindows, name],
    })),
  restoreWindow: (name) =>
    set((s) => ({
      minimizedWindows: s.minimizedWindows.filter((n) => n !== name),
    })),
  toQuantum: (name) =>
    set((s) => ({
      quantumWindows: s.quantumWindows.includes(name)
        ? s.quantumWindows
        : [...s.quantumWindows, name],
    })),
  toTerminal: (name) =>
    set((s) => ({
      quantumWindows: s.quantumWindows.filter((n) => n !== name),
    })),
  restartHintAt: null,
  flagRestartNeeded: () => set({ restartHintAt: Date.now() }),
  dismissRestartHint: () => set({ restartHintAt: null }),
  ingestHookEvent: (e) =>
    set((s) => {
      const statuses = { ...s.statuses };
      const activity = [...s.activity];
      const perAgentActivity = { ...s.perAgentActivity };
      const pendingByAgentId = { ...s.pendingByAgentId };
      const agentIdToName = { ...s.agentIdToName };
      const id = `${e.timestamp}-${Math.random().toString(36).slice(2, 8)}`;
      let activeSubagents = s.activeSubagents;

      const pushToAgent = (
        name: string,
        entry: AgentActivityEntry,
      ): void => {
        const existing = perAgentActivity[name] ?? [];
        perAgentActivity[name] = [entry, ...existing].slice(0, MAX_PER_AGENT);
      };

      const pushPending = (
        agentId: string,
        entry: AgentActivityEntry,
      ): void => {
        const existing = pendingByAgentId[agentId] ?? [];
        pendingByAgentId[agentId] = [entry, ...existing].slice(
          0,
          MAX_PER_AGENT,
        );
      };

      const flushPending = (agentId: string, name: string): void => {
        const buffered = pendingByAgentId[agentId];
        if (!buffered || buffered.length === 0) return;
        const existing = perAgentActivity[name] ?? [];
        // Pending was newest-first; existing is also newest-first.
        // Merge by timestamp DESC.
        const merged = [...buffered, ...existing]
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() -
              new Date(a.timestamp).getTime(),
          )
          .slice(0, MAX_PER_AGENT);
        perAgentActivity[name] = merged;
        delete pendingByAgentId[agentId];
      };

      if (e.type === "SubagentStart") {
        if (!e.agentName) {
          activeSubagents += 1;
          // Buffer a synthetic "started" entry under the agent_id so we can
          // attach it to the resolved agent later.
          if (e.agentId) {
            pushPending(e.agentId, {
              id,
              timestamp: e.timestamp,
              toolName: null,
              kind: "subagent-start",
              detail: "started",
            });
          }
          activity.unshift({
            id,
            timestamp: e.timestamp,
            agentName: null,
            toolName: null,
            kind: "subagent-start",
            detail: "subagent started",
          });
        } else {
          statuses[e.agentName] = "running";
          if (e.agentId) {
            agentIdToName[e.agentId] = e.agentName;
            flushPending(e.agentId, e.agentName);
          }
          activity.unshift({
            id,
            timestamp: e.timestamp,
            agentName: e.agentName,
            toolName: null,
            kind: "subagent-start",
            detail: `${e.agentName} resolved`,
          });
        }
      } else if (e.type === "SubagentStop") {
        activeSubagents = Math.max(0, activeSubagents - 1);
        if (e.agentName) {
          statuses[e.agentName] = "idle";
          if (e.agentId) {
            agentIdToName[e.agentId] = e.agentName;
            flushPending(e.agentId, e.agentName);
          }
          if (e.lastAssistantMessage) {
            pushToAgent(e.agentName, {
              id: `${id}-msg`,
              timestamp: e.timestamp,
              toolName: null,
              kind: "message",
              detail: e.lastAssistantMessage,
            });
          }
          pushToAgent(e.agentName, {
            id,
            timestamp: e.timestamp,
            toolName: null,
            kind: "subagent-stop",
            detail: e.reason ?? "finished",
          });
        }
        activity.unshift({
          id,
          timestamp: e.timestamp,
          agentName: e.agentName,
          toolName: null,
          kind: "subagent-stop",
          detail: e.agentName
            ? `${e.agentName} ${e.reason ?? "finished"}`
            : (e.reason ?? "subagent finished"),
        });
      } else if (e.type === "PreToolUse") {
        const summary = summarizeToolInput(e.toolName, e.toolInput);
        activity.unshift({
          id,
          timestamp: e.timestamp,
          agentName: null,
          toolName: e.toolName,
          kind: "tool",
          detail: summary,
        });
        const entry: AgentActivityEntry = {
          id,
          timestamp: e.timestamp,
          toolName: e.toolName,
          kind: "tool",
          detail: summary,
        };
        const owner = e.agentId ? agentIdToName[e.agentId] : null;
        if (owner) {
          pushToAgent(owner, entry);
        } else if (e.agentId) {
          // Agent name not resolved yet — buffer under agent_id.
          pushPending(e.agentId, entry);
        }
      } else if (e.type === "Stop") {
        activity.unshift({
          id,
          timestamp: e.timestamp,
          agentName: null,
          toolName: null,
          kind: "stop",
          detail: "turn complete",
        });
      }

      return {
        statuses,
        activeSubagents,
        activity: activity.slice(0, MAX_ACTIVITY),
        perAgentActivity,
        pendingByAgentId,
        agentIdToName,
      };
    }),
}));

function summarizeToolInput(
  tool: string,
  input: Record<string, unknown>,
): string {
  const v = (k: string): string =>
    typeof input[k] === "string" ? (input[k] as string) : "";
  if (tool === "Read" || tool === "Edit" || tool === "Write") {
    return v("file_path") || tool;
  }
  if (tool === "Bash") {
    const cmd = v("command");
    return cmd.length > 80 ? cmd.slice(0, 77) + "…" : cmd;
  }
  if (tool === "Grep") return v("pattern");
  if (tool === "Glob") return v("pattern");
  if (tool === "Task") {
    return v("description") || v("subagent_type") || "delegate";
  }
  return tool;
}

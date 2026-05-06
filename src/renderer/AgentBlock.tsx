import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { Agent } from "../shared";
import type { RunStatus } from "./store";

export interface AgentBlockData {
  agent: Agent;
  status: RunStatus;
}

const STATUS_DOT: Record<RunStatus, string> = {
  idle: "bg-stone-300",
  running: "bg-emerald-500 animate-pulse",
  waiting: "bg-amber-400",
  disabled: "bg-stone-200",
};

const COLOR_BAR: Record<string, string> = {
  blue: "bg-sky-500",
  green: "bg-emerald-500",
  red: "bg-rose-500",
  yellow: "bg-amber-400",
  cyan: "bg-cyan-500",
  magenta: "bg-fuchsia-500",
};

function AgentBlockInner({ data, selected }: NodeProps<AgentBlockData>) {
  const { agent, status } = data;
  const fm = agent.frontmatter;
  const colorClass = (fm.color && COLOR_BAR[fm.color]) || "bg-claude-400";
  return (
    <div
      style={{ width: 224 }}
      className={
        "overflow-hidden rounded-xl border bg-white shadow-sm transition " +
        (selected
          ? "border-claude-500 ring-2 ring-claude-500/30"
          : "border-stone-200 hover:border-claude-300")
      }
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <div className={`h-1 ${colorClass}`} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-stone-900">
              {fm.name}
            </div>
            <div className="text-xs text-stone-500">
              {fm.model ?? "inherit"}
            </div>
          </div>
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        </div>
        <p className="mt-2 line-clamp-3 text-xs text-stone-500">
          {fm.description}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
}

export const AgentBlock = memo(AgentBlockInner);

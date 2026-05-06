import { useCallback, useEffect, useRef, useState } from "react";
import type { WindowFrame } from "../shared";
import type { AgentActivityEntry } from "./store";

interface Props {
  agentName: string;
  status: "idle" | "running" | "waiting" | "disabled";
  frame: WindowFrame;
  activity: AgentActivityEntry[];
  containerRef: React.RefObject<HTMLDivElement>;
  onMove: (frame: WindowFrame) => void;
  onMoveCommit: (frame: WindowFrame) => void;
  onClose: () => void;
  onClear: () => void;
  onMinimize: () => void;
}

export function AgentWindow({
  agentName,
  status,
  frame,
  activity,
  containerRef,
  onMove,
  onMoveCommit,
  onClose,
  onClear,
  onMinimize,
}: Props): JSX.Element {
  const dragRef = useRef<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    startFrame: WindowFrame;
  } | null>(null);
  const liveRef = useRef(frame);
  liveRef.current = frame;

  const onHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        mode: "move",
        startX: e.clientX,
        startY: e.clientY,
        startFrame: { ...frame },
      };
    },
    [frame],
  );

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        mode: "resize",
        startX: e.clientX,
        startY: e.clientY,
        startFrame: { ...frame },
      };
    },
    [frame],
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent): void {
      const ds = dragRef.current;
      if (!ds) return;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      if (ds.mode === "move") {
        onMove({
          x: Math.max(0, ds.startFrame.x + dx),
          y: Math.max(0, ds.startFrame.y + dy),
          width: ds.startFrame.width,
          height: ds.startFrame.height,
        });
      } else {
        onMove({
          x: ds.startFrame.x,
          y: ds.startFrame.y,
          width: Math.max(280, ds.startFrame.width + dx),
          height: Math.max(180, ds.startFrame.height + dy),
        });
      }
    }
    function onMouseUp(): void {
      if (dragRef.current) {
        dragRef.current = null;
        onMoveCommit(liveRef.current);
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMove, onMoveCommit]);

  return (
    <div
      className="absolute flex flex-col overflow-hidden rounded-xl border border-stone-300 bg-white shadow-2xl"
      style={{
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
      }}
    >
      <header
        onMouseDown={onHeaderMouseDown}
        className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-stone-50 px-3 py-2"
        style={{ cursor: "grab" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={
              "h-2 w-2 rounded-full " +
              (status === "running"
                ? "bg-emerald-500 animate-pulse"
                : "bg-stone-300")
            }
          />
          <div className="truncate text-xs font-semibold text-stone-900">
            {agentName}
          </div>
          <span className="text-[10px] text-stone-400">live</span>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="rounded px-1.5 py-0.5 text-[10px] text-stone-500 hover:bg-stone-200"
            title="Clear"
          >
            clear
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            className="rounded p-0.5 text-stone-500 hover:bg-stone-200"
            aria-label="Minimize"
            title="Minimize"
          >
            –
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded p-0.5 text-stone-500 hover:bg-stone-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </header>

      <ScrollLog activity={activity} agentName={agentName} />

      <div
        onMouseDown={onResizeMouseDown}
        className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize"
        style={{
          background:
            "linear-gradient(135deg, transparent 50%, #a8a29e 50%, #a8a29e 60%, transparent 60%, transparent 70%, #a8a29e 70%, #a8a29e 80%, transparent 80%)",
        }}
      />
    </div>
  );
}

function ScrollLog({
  activity,
  agentName,
}: {
  activity: AgentActivityEntry[];
  agentName: string;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const ordered = [...activity].reverse();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activity.length]);

  return (
    <div
      ref={ref}
      className="flex-1 overflow-auto bg-stone-950 px-3 py-2 font-mono text-[11px] text-stone-100"
    >
      {ordered.length === 0 ? (
        <div className="text-stone-500">
          Waiting for {agentName} to do something…
        </div>
      ) : (
        <ul className="space-y-1">
          {ordered.map((a) =>
            a.kind === "message" ? (
              <li
                key={a.id}
                className="my-2 rounded-md border-l-2 border-claude-400 bg-stone-900 px-3 py-2"
              >
                <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-claude-300">
                  <span>{timeOf(a.timestamp)}</span>
                  <span>final message</span>
                </div>
                <div className="whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-stone-100">
                  {a.detail}
                </div>
              </li>
            ) : (
              <li key={a.id} className="flex gap-2">
                <span className="shrink-0 text-stone-500">
                  {timeOf(a.timestamp)}
                </span>
                <span
                  className={
                    "shrink-0 " +
                    (a.kind === "subagent-start"
                      ? "text-emerald-400"
                      : a.kind === "subagent-stop"
                        ? "text-stone-400"
                        : a.kind === "tool"
                          ? "text-claude-300"
                          : "text-stone-300")
                  }
                >
                  {a.kind === "subagent-start"
                    ? "▶"
                    : a.kind === "subagent-stop"
                      ? "■"
                      : (a.toolName ?? "·")}
                </span>
                <span className="break-all text-stone-200">{a.detail}</span>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

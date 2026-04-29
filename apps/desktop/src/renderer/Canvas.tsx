import { useCallback, useEffect, useRef } from "react";
import type {
  Agent,
  NodePosition,
  WindowFrame,
} from "@agentdeck/shared-types";
import { AgentBlockCard } from "./AgentBlockCard.js";
import { AgentWindow } from "./AgentWindow.js";
import { useUi, type RunStatus } from "./store.js";

const BLOCK_WIDTH = 224;
const BLOCK_HEIGHT_APPROX = 170;

interface Props {
  agents: Agent[];
  positions: Record<string, NodePosition>;
  statuses: Record<string, RunStatus>;
  windowFrames: Record<string, WindowFrame>;
  onPositionChange: (name: string, pos: NodePosition) => void;
  onPositionCommit: (positions: Record<string, NodePosition>) => void;
  onWindowFrameChange: (name: string, frame: WindowFrame) => void;
  onWindowFrameCommit: (frames: Record<string, WindowFrame>) => void;
  onAgentDoubleClick: (agent: Agent) => void;
}

export function Canvas({
  agents,
  positions,
  statuses,
  windowFrames,
  onPositionChange,
  onPositionCommit,
  onWindowFrameChange,
  onWindowFrameCommit,
  onAgentDoubleClick,
}: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    name: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const livePositions = useRef(positions);
  livePositions.current = positions;
  const liveFrames = useRef(windowFrames);
  liveFrames.current = windowFrames;

  const openWindows = useUi((s) => s.openWindows);
  const toggleWindow = useUi((s) => s.toggleWindow);
  const closeWindow = useUi((s) => s.closeWindow);
  const perAgentActivity = useUi((s) => s.perAgentActivity);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, agent: Agent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const current = positions[agent.frontmatter.name] ?? { x: 0, y: 0 };
      dragState.current = {
        name: agent.frontmatter.name,
        offsetX: e.clientX - rect.left - current.x,
        offsetY: e.clientY - rect.top - current.y,
      };
      e.preventDefault();
    },
    [positions],
  );

  useEffect(() => {
    function move(e: MouseEvent): void {
      const ds = dragState.current;
      const container = containerRef.current;
      if (!ds || !container) return;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, e.clientX - rect.left - ds.offsetX);
      const y = Math.max(0, e.clientY - rect.top - ds.offsetY);
      onPositionChange(ds.name, { x, y });
    }
    function up(): void {
      if (dragState.current) {
        dragState.current = null;
        onPositionCommit(livePositions.current);
      }
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [onPositionChange, onPositionCommit]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-auto"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgb(231 229 228) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      <ConnectionLayer
        agents={agents}
        positions={positions}
        windowFrames={windowFrames}
        openWindows={openWindows}
      />

      {agents.map((a) => {
        const name = a.frontmatter.name;
        const pos = positions[name] ?? { x: 0, y: 0 };
        const isOpen = openWindows.includes(name);
        return (
          <div
            key={a.filePath}
            className="absolute select-none"
            style={{ left: pos.x, top: pos.y, zIndex: 10 }}
          >
            <div
              onMouseDown={(e) => onMouseDown(e, a)}
              onDoubleClick={() => onAgentDoubleClick(a)}
              style={{ cursor: "grab" }}
            >
              <AgentBlockCard
                agent={a}
                status={statuses[name] ?? "idle"}
                windowOpen={isOpen}
                onToggleWindow={() => toggleWindow(name)}
              />
            </div>
          </div>
        );
      })}

      {agents.map((a) => {
        const name = a.frontmatter.name;
        if (!openWindows.includes(name)) return null;
        const frame = windowFrames[name] ?? defaultFrameFor(positions[name]);
        return (
          <div key={`win-${name}`} style={{ zIndex: 20 }}>
            <AgentWindow
              agentName={name}
              status={statuses[name] ?? "idle"}
              frame={frame}
              activity={perAgentActivity[name] ?? []}
              containerRef={containerRef}
              onMove={(f) => onWindowFrameChange(name, f)}
              onMoveCommit={() => onWindowFrameCommit(liveFrames.current)}
              onClose={() => closeWindow(name)}
              onClear={() => {
                useUi.setState((s) => ({
                  perAgentActivity: { ...s.perAgentActivity, [name]: [] },
                }));
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function defaultFrameFor(blockPos: NodePosition | undefined): WindowFrame {
  const base = blockPos ?? { x: 0, y: 0 };
  return {
    x: base.x + BLOCK_WIDTH + 80,
    y: base.y,
    width: 360,
    height: 280,
  };
}

function ConnectionLayer({
  agents,
  positions,
  windowFrames,
  openWindows,
}: {
  agents: Agent[];
  positions: Record<string, NodePosition>;
  windowFrames: Record<string, WindowFrame>;
  openWindows: string[];
}): JSX.Element {
  const lines = agents
    .map((a) => {
      const name = a.frontmatter.name;
      if (!openWindows.includes(name)) return null;
      const block = positions[name];
      const win = windowFrames[name] ?? defaultFrameFor(block);
      if (!block) return null;
      const blockCx = block.x + BLOCK_WIDTH / 2;
      const blockCy = block.y + BLOCK_HEIGHT_APPROX / 2;
      const winCx = win.x + win.width / 2;
      const winCy = win.y + win.height / 2;
      // Anchor on whichever side is closer.
      const ax = winCx > blockCx ? block.x + BLOCK_WIDTH : block.x;
      const ay = blockCy;
      const bx = winCx > blockCx ? win.x : win.x + win.width;
      const by = winCy;
      const midX = (ax + bx) / 2;
      const path = `M ${ax} ${ay} C ${midX} ${ay}, ${midX} ${by}, ${bx} ${by}`;
      return { name, path, ax, ay, bx, by };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 5 }}
    >
      {lines.map((l) => (
        <g key={l.name}>
          <path
            d={l.path}
            stroke="#f38020"
            strokeWidth={2}
            fill="none"
            strokeDasharray="4 4"
            opacity={0.6}
          />
          <circle cx={l.ax} cy={l.ay} r={3} fill="#f38020" />
          <circle cx={l.bx} cy={l.by} r={3} fill="#f38020" />
        </g>
      ))}
    </svg>
  );
}

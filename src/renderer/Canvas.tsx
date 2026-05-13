import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Agent,
  NodePosition,
  WindowFrame,
} from "../shared";
import { AgentBlockCard } from "./AgentBlockCard";
import { AgentWindow } from "./AgentWindow";
import { QuantumCore } from "./QuantumCore";
import { useUi, type RunStatus } from "./store";

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

interface DragSingle {
  kind: "single";
  name: string;
  offsetX: number;
  offsetY: number;
}
interface DragGroup {
  kind: "group";
  primary: string;
  startX: number;
  startY: number;
  startPositions: Record<string, NodePosition>;
}
interface DragLasso {
  kind: "lasso";
  startX: number;
  startY: number;
  curX: number;
  curY: number;
}

type DragMode = DragSingle | DragGroup | DragLasso | null;

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
  const dragState = useRef<DragMode>(null);
  const [, forceRender] = useState(0);
  const livePositions = useRef(positions);
  livePositions.current = positions;
  const liveFrames = useRef(windowFrames);
  liveFrames.current = windowFrames;

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const openWindows = useUi((s) => s.openWindows);
  const minimizedWindows = useUi((s) => s.minimizedWindows);
  const quantumWindows = useUi((s) => s.quantumWindows);
  const toggleWindow = useUi((s) => s.toggleWindow);
  const closeWindow = useUi((s) => s.closeWindow);
  const minimizeWindow = useUi((s) => s.minimizeWindow);
  const restoreWindow = useUi((s) => s.restoreWindow);
  const toQuantum = useUi((s) => s.toQuantum);
  const toTerminal = useUi((s) => s.toTerminal);
  const perAgentActivity = useUi((s) => s.perAgentActivity);

  const onBlockMouseDown = useCallback(
    (e: React.MouseEvent, agent: Agent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const name = agent.frontmatter.name;

      // If user clicks on a non-selected block while holding nothing, that
      // block becomes the only selection. If the block is already part of a
      // multi-select, drag the whole group.
      if (selected.has(name) && selected.size > 1) {
        dragState.current = {
          kind: "group",
          primary: name,
          startX: e.clientX,
          startY: e.clientY,
          startPositions: { ...livePositions.current },
        };
      } else {
        // Single-select on click; group selection is dropped.
        if (!(selected.size === 1 && selected.has(name))) {
          setSelected(new Set([name]));
        }
        const current = positions[name] ?? { x: 0, y: 0 };
        dragState.current = {
          kind: "single",
          name,
          offsetX: e.clientX - rect.left - current.x,
          offsetY: e.clientY - rect.top - current.y,
        };
      }
      e.preventDefault();
      e.stopPropagation();
    },
    [positions, selected],
  );

  const onCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start lasso when the user clicks on the empty canvas, not on a
      // child element (block, window, button).
      if (e.target !== e.currentTarget) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left + container.scrollLeft;
      const y = e.clientY - rect.top + container.scrollTop;
      dragState.current = {
        kind: "lasso",
        startX: x,
        startY: y,
        curX: x,
        curY: y,
      };
      setSelected(new Set());
      forceRender((n) => n + 1);
      e.preventDefault();
    },
    [],
  );

  useEffect(() => {
    function move(e: MouseEvent): void {
      const ds = dragState.current;
      const container = containerRef.current;
      if (!ds || !container) return;
      const rect = container.getBoundingClientRect();

      if (ds.kind === "single") {
        const x = Math.max(0, e.clientX - rect.left - ds.offsetX);
        const y = Math.max(0, e.clientY - rect.top - ds.offsetY);
        onPositionChange(ds.name, { x, y });
        return;
      }

      if (ds.kind === "group") {
        const dx = e.clientX - ds.startX;
        const dy = e.clientY - ds.startY;
        for (const [name, base] of Object.entries(ds.startPositions)) {
          if (!selected.has(name)) continue;
          onPositionChange(name, {
            x: Math.max(0, base.x + dx),
            y: Math.max(0, base.y + dy),
          });
        }
        return;
      }

      // lasso
      const x = e.clientX - rect.left + container.scrollLeft;
      const y = e.clientY - rect.top + container.scrollTop;
      ds.curX = x;
      ds.curY = y;
      const minX = Math.min(ds.startX, x);
      const minY = Math.min(ds.startY, y);
      const maxX = Math.max(ds.startX, x);
      const maxY = Math.max(ds.startY, y);
      const next = new Set<string>();
      for (const a of agents) {
        const name = a.frontmatter.name;
        const pos = livePositions.current[name];
        if (!pos) continue;
        const cx = pos.x + BLOCK_WIDTH / 2;
        const cy = pos.y + BLOCK_HEIGHT_APPROX / 2;
        if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
          next.add(name);
        }
      }
      setSelected(next);
      forceRender((n) => n + 1);
    }

    function up(): void {
      const ds = dragState.current;
      if (!ds) return;
      if (ds.kind === "single" || ds.kind === "group") {
        onPositionCommit(livePositions.current);
      }
      dragState.current = null;
      forceRender((n) => n + 1);
    }

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [onPositionChange, onPositionCommit, agents, selected]);

  const lasso =
    dragState.current?.kind === "lasso" ? dragState.current : null;

  const theme = useUi((s) => s.theme);
  const lightBg = {
    backgroundImage:
      "radial-gradient(circle, rgb(231 229 228) 1px, transparent 1px)",
    backgroundSize: "16px 16px",
  };
  const darkBg = {
    backgroundColor: "#020617",
    backgroundImage: [
      "radial-gradient(ellipse 80% 40% at 50% 100%, rgba(243,128,32,0.18), transparent 70%)",
      "linear-gradient(to top, rgba(243,128,32,0.10), transparent 50%)",
      "radial-gradient(circle, rgba(243,128,32,0.18) 1px, transparent 1px)",
    ].join(", "),
    backgroundSize: "100% 100%, 100% 100%, 24px 24px",
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={onCanvasMouseDown}
      className="relative h-full w-full overflow-auto"
      style={theme === "dark" ? darkBg : lightBg}
    >
      <ConnectionLayer
        agents={agents}
        positions={positions}
        windowFrames={windowFrames}
        statuses={statuses}
        theme={theme}
        activeNames={openWindows.filter((n) => !minimizedWindows.includes(n))}
        quantumNames={quantumWindows}
      />

      {agents.map((a) => {
        const name = a.frontmatter.name;
        const pos = positions[name] ?? { x: 0, y: 0 };
        const isOpen = openWindows.includes(name);
        const isSelected = selected.has(name);
        return (
          <div
            key={a.filePath}
            className="absolute select-none"
            style={{ left: pos.x, top: pos.y, zIndex: 10 }}
          >
            <div
              onMouseDown={(e) => onBlockMouseDown(e, a)}
              onDoubleClick={() => onAgentDoubleClick(a)}
              style={{ cursor: "grab" }}
              className={
                isSelected
                  ? "rounded-xl ring-2 ring-claude-500 ring-offset-2"
                  : ""
              }
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

      {/* AgentWindow terminals — shown when window is open and NOT in quantum mode */}
      {agents.map((a) => {
        const name = a.frontmatter.name;
        if (!openWindows.includes(name)) return null;
        if (minimizedWindows.includes(name)) return null;
        if (quantumWindows.includes(name)) return null;
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
              onMinimize={() => minimizeWindow(name)}
              onToQuantum={() => toQuantum(name)}
              onClear={() => {
                useUi.setState((s) => ({
                  perAgentActivity: { ...s.perAgentActivity, [name]: [] },
                }));
              }}
            />
          </div>
        );
      })}

      {/* QuantumCore widgets — shown when window is open and in quantum mode */}
      {agents.map((a) => {
        const name = a.frontmatter.name;
        if (!openWindows.includes(name)) return null;
        if (minimizedWindows.includes(name)) return null;
        if (!quantumWindows.includes(name)) return null;
        const frame = windowFrames[name] ?? defaultFrameFor(positions[name]);
        return (
          <QuantumWidget
            key={`qc-${name}`}
            agentName={name}
            status={statuses[name] ?? "idle"}
            frame={frame}
            onMove={(f) => onWindowFrameChange(name, f)}
            onMoveCommit={() => onWindowFrameCommit(liveFrames.current)}
            onToTerminal={() => toTerminal(name)}
          />
        );
      })}

      {lasso && (
        <div
          className="pointer-events-none absolute border border-claude-400 bg-claude-200/20"
          style={{
            left: Math.min(lasso.startX, lasso.curX),
            top: Math.min(lasso.startY, lasso.curY),
            width: Math.abs(lasso.curX - lasso.startX),
            height: Math.abs(lasso.curY - lasso.startY),
            zIndex: 15,
          }}
        />
      )}

      <MinimizedTray
        names={minimizedWindows.filter((n) => openWindows.includes(n))}
        statuses={statuses}
        onRestore={restoreWindow}
        onClose={closeWindow}
      />
    </div>
  );
}

function MinimizedTray({
  names,
  statuses,
  onRestore,
  onClose,
}: {
  names: string[];
  statuses: Record<string, RunStatus>;
  onRestore: (name: string) => void;
  onClose: (name: string) => void;
}): JSX.Element | null {
  if (names.length === 0) return null;
  return (
    <div className="pointer-events-none sticky bottom-3 left-3 z-30 flex flex-wrap gap-2">
      {names.map((name) => (
        <div
          key={`min-${name}`}
          className="pointer-events-auto flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 shadow-md dark:border-claude-700/60 dark:bg-slate-900 dark:shadow-claude-glow"
        >
          <span
            className={
              "h-1.5 w-1.5 rounded-full " +
              (statuses[name] === "running"
                ? "bg-emerald-500 animate-pulse"
                : "bg-stone-300 dark:bg-slate-600")
            }
          />
          <button
            type="button"
            onClick={() => onRestore(name)}
            className="text-xs font-medium text-stone-800 hover:text-claude-700 dark:text-slate-100 dark:hover:text-claude-300"
          >
            {name}
          </button>
          <button
            type="button"
            onClick={() => onClose(name)}
            className="rounded px-1 text-[10px] text-stone-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function defaultFrameFor(blockPos: NodePosition | undefined): WindowFrame {
  const base = blockPos ?? { x: 0, y: 0 };
  return {
    x: base.x + BLOCK_WIDTH + 80,
    y: base.y,
    width: 180,
    height: 180,
  };
}

function QuantumWidget({
  agentName,
  status,
  frame,
  onMove,
  onMoveCommit,
  onToTerminal,
}: {
  agentName: string;
  status: RunStatus;
  frame: WindowFrame;
  onMove: (f: WindowFrame) => void;
  onMoveCommit: (f: WindowFrame) => void;
  onToTerminal: () => void;
}): JSX.Element {
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
      dragRef.current = { mode: "move", startX: e.clientX, startY: e.clientY, startFrame: { ...frame } };
    },
    [frame],
  );

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { mode: "resize", startX: e.clientX, startY: e.clientY, startFrame: { ...frame } };
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
        onMove({ x: Math.max(0, ds.startFrame.x + dx), y: Math.max(0, ds.startFrame.y + dy), width: ds.startFrame.width, height: ds.startFrame.height });
      } else {
        // Keep square: use the larger delta to drive both dimensions
        const side = Math.max(140, ds.startFrame.width + dx, ds.startFrame.height + dy);
        onMove({ x: ds.startFrame.x, y: ds.startFrame.y, width: side, height: side });
      }
    }
    function onMouseUp(): void {
      if (dragRef.current) { dragRef.current = null; onMoveCommit(liveRef.current); }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMove, onMoveCommit]);

  // size = square side; QuantumCore fills the frame
  const size = Math.min(frame.width, frame.height);

  return (
    <div
      className="absolute"
      style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height, zIndex: 20 }}
    >
      {/* full-area drag + double-click zone */}
      <div
        onMouseDown={onHeaderMouseDown}
        onDoubleClick={onToTerminal}
        title="Double-click to open terminal · drag to move"
        className="absolute inset-0 flex items-center justify-center"
        style={{ cursor: "grab" }}
      >
        <QuantumCore agentName={agentName} status={status} size={size} />
      </div>

      {/* resize handle — tiny dot bottom-right */}
      <div
        onMouseDown={onResizeMouseDown}
        className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize z-10"
      />
    </div>
  );
}

interface Route {
  name: string;
  path: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

function ConnectionLayer({
  agents,
  positions,
  windowFrames,
  statuses,
  theme,
  activeNames,
  quantumNames,
}: {
  agents: Agent[];
  positions: Record<string, NodePosition>;
  windowFrames: Record<string, WindowFrame>;
  statuses: Record<string, RunStatus>;
  theme: "light" | "dark";
  activeNames: string[];
  quantumNames: string[];
}): JSX.Element {
  const lines = agents
    .map((a) => {
      const name = a.frontmatter.name;
      if (!activeNames.includes(name)) return null;
      const block = positions[name];
      const win = windowFrames[name] ?? defaultFrameFor(block);
      if (!block) return null;
      const isQuantum = quantumNames.includes(name);
      const route = computeRoute(block, win, name, isQuantum);
      const isRunning = statuses[name] === "running";
      return { ...route, isRunning };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 5 }}
    >
      <defs>
        <filter id="line-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {lines.map((l) => {
        const color =
          l.isRunning && theme === "dark" ? "#10b981" : "#f38020";
        return (
          <g key={l.name} filter="url(#line-glow)">
            <path
              d={l.path}
              stroke={color}
              strokeWidth={2}
              fill="none"
              strokeDasharray="4 4"
              opacity={0.85}
            />
            <circle cx={l.ax} cy={l.ay} r={3.5} fill={color} />
            <circle cx={l.bx} cy={l.by} r={3.5} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

function computeRoute(
  block: NodePosition,
  win: WindowFrame,
  name: string,
  isQuantum = false,
): Route {
  const blockBox = {
    left: block.x,
    right: block.x + BLOCK_WIDTH,
    top: block.y,
    bottom: block.y + BLOCK_HEIGHT_APPROX,
    cx: block.x + BLOCK_WIDTH / 2,
    cy: block.y + BLOCK_HEIGHT_APPROX / 2,
  };

  const wcx = win.x + win.width / 2;
  const wcy = win.y + win.height / 2;

  let winBox: { left: number; right: number; top: number; bottom: number; cx: number; cy: number };

  if (isQuantum) {
    // Line terminates at the outer ring surface (r * 0.88 of the smaller dimension)
    const outerR = Math.min(win.width, win.height) / 2 * 0.88;
    // Direction from block center to quantum core center
    const dx = wcx - blockBox.cx;
    const dy = wcy - blockBox.cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    // Surface point on the outer ring toward the block
    const sx = wcx - nx * outerR;
    const sy = wcy - ny * outerR;
    // Collapse winBox to that surface point so the route ends there
    winBox = { left: sx, right: sx, top: sy, bottom: sy, cx: wcx, cy: wcy };
    // For the B endpoint we use the surface point directly
    const ax = blockBox.right;
    const ay = blockBox.cy;
    const bx = sx;
    const by = sy;
    const midX = (ax + bx) / 2;
    const path = `M ${ax} ${ay} C ${midX} ${ay}, ${midX} ${by}, ${bx} ${by}`;
    return { name, path, ax, ay, bx, by };
  }

  winBox = {
    left: win.x,
    right: win.x + win.width,
    top: win.y,
    bottom: win.y + win.height,
    cx: wcx,
    cy: wcy,
  };

  const horizGap = Math.max(
    blockBox.left - winBox.right,
    winBox.left - blockBox.right,
  );
  const vertGap = Math.max(
    blockBox.top - winBox.bottom,
    winBox.top - blockBox.bottom,
  );

  const useHorizontal = horizGap >= vertGap;

  let ax: number, ay: number, bx: number, by: number, c1x: number, c2x: number, c1y: number, c2y: number;

  if (useHorizontal) {
    if (winBox.cx > blockBox.cx) {
      ax = blockBox.right;
      bx = winBox.left;
    } else {
      ax = blockBox.left;
      bx = winBox.right;
    }
    ay = blockBox.cy;
    by = winBox.cy;
    const midX = (ax + bx) / 2;
    c1x = midX; c1y = ay; c2x = midX; c2y = by;
  } else {
    if (winBox.cy > blockBox.cy) {
      ay = blockBox.bottom;
      by = winBox.top;
    } else {
      ay = blockBox.top;
      by = winBox.bottom;
    }
    ax = blockBox.cx;
    bx = winBox.cx;
    const midY = (ay + by) / 2;
    c1x = ax; c1y = midY; c2x = bx; c2y = midY;
  }

  const path = `M ${ax} ${ay} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${bx} ${by}`;
  return { name, path, ax, ay, bx, by };
}

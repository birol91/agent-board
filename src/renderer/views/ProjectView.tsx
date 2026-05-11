import { useCallback, useEffect, useRef, useState } from "react";
import { call } from "../bridge";
import { useUi } from "../store";
import type {
  Agent,
  LayoutMap,
  NodePosition,
  Project,
  WindowFrame,
} from "../../shared";
import { Canvas } from "../Canvas";
import { AgentProperties } from "../AgentProperties";

export function ProjectView(): JSX.Element {
  const project = useUi((s) => s.project);
  const setProject = useUi((s) => s.setProject);
  const statuses = useUi((s) => s.statuses);
  const openWindows = useUi((s) => s.openWindows);
  const setOpenWindows = useUi((s) => s.setOpenWindows);
  const closeAllWindows = useUi((s) => s.closeAllWindows);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [windowFrames, setWindowFrames] = useState<
    Record<string, WindowFrame>
  >({});
  const restoredOpenWindowsForProject = useRef<string | null>(null);

  useEffect(() => {
    if (!project) return;
    const validNames = new Set(project.agents.map((a) => a.frontmatter.name));

    // Merge: keep current local positions/frames, fill in newly added agents
    // from the persisted layout, and drop entries for removed agents.
    setPositions((prev) => {
      const next: Record<string, NodePosition> = {};
      const placed: NodePosition[] = [];
      // Pre-seed from current local state so existing agents don't shift.
      for (const [name, pos] of Object.entries(prev)) {
        if (validNames.has(name)) {
          next[name] = pos;
          placed.push(pos);
        }
      }
      project.agents.forEach((a, i) => {
        const name = a.frontmatter.name;
        if (next[name]) return;
        const stored = project.layout.agents[name];
        const pos = stored ?? findFreeSlot(placed, i, project.agents.length);
        next[name] = pos;
        placed.push(pos);
      });
      return next;
    });

    setWindowFrames((prev) => {
      const next: Record<string, WindowFrame> = {};
      // Keep local frames for agents that still exist.
      for (const [name, frame] of Object.entries(prev)) {
        if (validNames.has(name)) next[name] = frame;
      }
      // Pull in persisted frames for agents we don't have locally yet.
      for (const [name, frame] of Object.entries(
        project.layout.windows ?? {},
      )) {
        if (validNames.has(name) && !next[name]) next[name] = frame;
      }
      return next;
    });

    // Restore open windows from layout — only once per project root.
    if (restoredOpenWindowsForProject.current !== project.rootPath) {
      const persisted = (project.layout.openWindows ?? []).filter((n) =>
        validNames.has(n),
      );
      console.log(
        "[ProjectView] restoring openWindows for",
        project.rootPath,
        "→",
        persisted,
        "(layout had:",
        project.layout.openWindows,
        ")",
      );
      setOpenWindows(persisted);
      restoredOpenWindowsForProject.current = project.rootPath;
    }
  }, [project, setOpenWindows]);

  // Persist open-windows whenever the user opens/closes one.
  // We compare against the current project layout to skip the no-op
  // initial save that fires right after restore.
  useEffect(() => {
    if (!project) return;
    if (restoredOpenWindowsForProject.current !== project.rootPath) return;
    const persisted = project.layout.openWindows ?? [];
    if (
      persisted.length === openWindows.length &&
      persisted.every((n, i) => n === openWindows[i])
    ) {
      return;
    }
    const layout: LayoutMap = {
      agents: positions,
      windows: windowFrames,
      openWindows,
    };
    void call("layout:save", { rootPath: project.rootPath, layout });
  }, [openWindows, project, positions, windowFrames]);

  const reload = useCallback(async () => {
    if (!project) return;
    const p = await call("project:read", { rootPath: project.rootPath });
    setProject(p);
  }, [project, setProject]);

  const handlePositionChange = useCallback(
    (name: string, pos: NodePosition) => {
      setPositions((prev) => ({ ...prev, [name]: pos }));
    },
    [],
  );

  const handlePositionCommit = useCallback(
    (final: Record<string, NodePosition>) => {
      if (!project) return;
      const layout: LayoutMap = {
        agents: final,
        windows: windowFrames,
        openWindows,
      };
      const updated: Project = { ...project, layout };
      setProject(updated);
      void call("layout:save", { rootPath: project.rootPath, layout });
    },
    [project, setProject, windowFrames, openWindows],
  );

  const handleWindowFrameChange = useCallback(
    (name: string, frame: WindowFrame) => {
      setWindowFrames((prev) => ({ ...prev, [name]: frame }));
    },
    [],
  );

  const handleWindowFrameCommit = useCallback(
    (frames: Record<string, WindowFrame>) => {
      if (!project) return;
      const layout: LayoutMap = {
        agents: positions,
        windows: frames,
        openWindows,
      };
      const updated: Project = { ...project, layout };
      setProject(updated);
      void call("layout:save", { rootPath: project.rootPath, layout });
    },
    [project, setProject, positions, openWindows],
  );

  const handleClearLayout = useCallback(() => {
    if (!project) return;
    const tidy = tidyLayout(project.agents.map((a) => a.frontmatter.name));
    setPositions(tidy);
    setWindowFrames({});
    closeAllWindows();
    const layout: LayoutMap = {
      agents: tidy,
      windows: {},
      openWindows: [],
    };
    const updated: Project = { ...project, layout };
    setProject(updated);
    void call("layout:save", { rootPath: project.rootPath, layout });
  }, [project, setProject, closeAllWindows]);

  if (!project) {
    return (
      <div className="text-sm text-stone-500 dark:text-slate-400">
        Loading project…
      </div>
    );
  }

  if (project.agents.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-1 items-center justify-center rounded-xl border border-claude-200 bg-claude-50/60 p-6">
          <div className="text-center">
            <h2 className="mb-1 text-sm font-semibold text-stone-800">
              {baseName(project.rootPath)}
            </h2>
            <p className="mb-3 text-sm text-stone-600">No agents yet.</p>
            <button
              type="button"
              onClick={() => useUi.getState().setView("marketplace")}
              className="rounded-md bg-claude-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-claude-600"
            >
              + Add agent
            </button>
          </div>
        </div>
        <SkillStrip skills={project.skills} onChange={reload} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg bg-white/80 px-3 py-1.5 text-xs text-stone-600 shadow-sm backdrop-blur dark:bg-slate-900/80 dark:text-slate-300 dark:shadow-claude-glow">
          <span className="font-semibold text-stone-900 dark:text-slate-100">
            {baseName(project.rootPath)}
          </span>
          <span className="text-stone-400 dark:text-slate-500">
            {project.agents.length} agents
          </span>
          <ActiveBadge />
          <button
            type="button"
            onClick={handleClearLayout}
            className="ml-1 rounded border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-700 hover:border-claude-300 hover:bg-claude-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-claude-500 dark:hover:bg-slate-800"
            title="Close all windows and tidy block positions"
          >
            Clear layout
          </button>
        </div>
        <Canvas
          agents={project.agents}
          positions={positions}
          statuses={statuses}
          windowFrames={windowFrames}
          onPositionChange={handlePositionChange}
          onPositionCommit={handlePositionCommit}
          onWindowFrameChange={handleWindowFrameChange}
          onWindowFrameCommit={handleWindowFrameCommit}
          onAgentDoubleClick={(a) => setEditing(a)}
        />
      </div>

      <AgentStrip count={project.agents.length} />
      <SkillStrip skills={project.skills} onChange={reload} />

      {editing && (
        <AgentProperties
          agent={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await reload();
            setEditing(null);
          }}
          onDeleted={async () => {
            await reload();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ActiveBadge(): JSX.Element | null {
  const activeSubagents = useUi((s) => s.activeSubagents);
  if (activeSubagents === 0) return null;
  return (
    <span className="flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      {activeSubagents} active
    </span>
  );
}

function AgentStrip({ count }: { count: number }): JSX.Element {
  const setView = useUi((s) => s.setView);
  return (
    <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:shadow-claude-glow">
      <div>
        <div className="text-xs font-semibold text-stone-700 dark:text-slate-200">
          Agents
        </div>
        <div className="text-xs text-stone-500 dark:text-slate-400">
          {count} installed · drag blocks on the canvas to arrange
        </div>
      </div>
      <button
        type="button"
        onClick={() => setView("marketplace")}
        className="rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-claude-300 hover:bg-claude-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-claude-500 dark:hover:bg-slate-800"
      >
        + Add agent
      </button>
    </div>
  );
}

function SkillStrip({
  skills,
  onChange,
}: {
  skills: Project["skills"];
  onChange: () => Promise<void>;
}): JSX.Element {
  const setView = useUi((s) => s.setView);
  if (skills.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:shadow-claude-glow">
        <div>
          <div className="text-xs font-semibold text-stone-700 dark:text-slate-200">
            Skills
          </div>
          <div className="text-xs text-stone-500 dark:text-slate-400">
            No skills installed. Add domain knowledge packs from the
            marketplace.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setView("marketplace")}
          className="rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-claude-300 hover:bg-claude-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-claude-500 dark:hover:bg-slate-800"
        >
          Browse Skills
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:shadow-claude-glow">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-stone-700 dark:text-slate-200">
          Skills ({skills.length})
        </div>
        <button
          type="button"
          onClick={() => setView("marketplace")}
          className="text-xs font-medium text-claude-700 hover:text-claude-800 dark:text-claude-400 dark:hover:text-claude-300"
        >
          + Add more
        </button>
      </div>
      <div
        className="grid max-h-[60px] gap-2 overflow-y-auto"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        }}
      >
        {skills.map((s) => (
          <SkillChip key={s.folderPath} skill={s} onRemoved={onChange} />
        ))}
      </div>
    </div>
  );
}

function SkillChip({
  skill,
  onRemoved,
}: {
  skill: Project["skills"][number];
  onRemoved: () => Promise<void>;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  async function remove(e: React.MouseEvent): Promise<void> {
    e.stopPropagation();
    if (!confirm(`Remove skill "${skill.frontmatter.name}"?`)) return;
    setBusy(true);
    try {
      await call("skill:delete", { folderPath: skill.folderPath });
      useUi.getState().flagRestartNeeded();
      await onRemoved();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="group relative min-w-0 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
      title={skill.frontmatter.description}
    >
      <div className="truncate pr-5 text-xs font-medium text-stone-900 dark:text-slate-100">
        {skill.frontmatter.name}
      </div>
      <div className="line-clamp-1 pr-5 text-[11px] text-stone-500 dark:text-slate-400">
        {skill.frontmatter.description}
      </div>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="absolute right-1 top-1 rounded p-0.5 text-stone-400 opacity-0 hover:bg-stone-200 hover:text-stone-700 group-hover:opacity-100 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label="Remove skill"
      >
        ✕
      </button>
    </div>
  );
}

const COL_GAP = 260;
const ROW_GAP = 200;
const PAD = 40;

function gridPosition(index: number): NodePosition {
  const cols = 3;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: PAD + col * COL_GAP, y: PAD + row * ROW_GAP };
}

function overlaps(a: NodePosition, b: NodePosition): boolean {
  return Math.abs(a.x - b.x) < COL_GAP && Math.abs(a.y - b.y) < ROW_GAP;
}

function findFreeSlot(
  placed: NodePosition[],
  startIndex: number,
  total: number,
): NodePosition {
  for (let i = startIndex; i < startIndex + total + 9; i++) {
    const candidate = gridPosition(i);
    if (!placed.some((p) => overlaps(p, candidate))) return candidate;
  }
  return gridPosition(startIndex);
}

function tidyLayout(names: string[]): Record<string, NodePosition> {
  // Pick a column count that produces a roughly square grid.
  // Up to 4 agents go in a single row; otherwise sqrt-ish grid.
  const n = names.length;
  const cols = n <= 4 ? n : Math.ceil(Math.sqrt(n));
  const tidyPadX = 40;
  const tidyPadY = 80; // extra room below the header / Clear layout button
  const out: Record<string, NodePosition> = {};
  names.forEach((name, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    out[name] = { x: tidyPadX + col * COL_GAP, y: tidyPadY + row * ROW_GAP };
  });
  return out;
}

function baseName(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

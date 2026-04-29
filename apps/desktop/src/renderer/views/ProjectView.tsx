import { useCallback, useEffect, useState } from "react";
import { call } from "../bridge.js";
import { useUi } from "../store.js";
import type {
  Agent,
  LayoutMap,
  NodePosition,
  Project,
  WindowFrame,
} from "@agentdeck/shared-types";
import { Canvas } from "../Canvas.js";
import { AgentProperties } from "../AgentProperties.js";

export function ProjectView(): JSX.Element {
  const project = useUi((s) => s.project);
  const setProject = useUi((s) => s.setProject);
  const statuses = useUi((s) => s.statuses);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [windowFrames, setWindowFrames] = useState<
    Record<string, WindowFrame>
  >({});

  useEffect(() => {
    if (!project) return;
    const next: Record<string, NodePosition> = {};
    project.agents.forEach((a, i) => {
      const stored = project.layout.agents[a.frontmatter.name];
      next[a.frontmatter.name] =
        stored ?? defaultPosition(i, project.agents.length);
    });
    setPositions(next);
    setWindowFrames(project.layout.windows ?? {});
  }, [project]);

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
      const layout: LayoutMap = { agents: final, windows: windowFrames };
      const updated: Project = { ...project, layout };
      setProject(updated);
      void call("layout:save", { rootPath: project.rootPath, layout });
    },
    [project, setProject, windowFrames],
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
      const layout: LayoutMap = { agents: positions, windows: frames };
      const updated: Project = { ...project, layout };
      setProject(updated);
      void call("layout:save", { rootPath: project.rootPath, layout });
    },
    [project, setProject, positions],
  );

  if (!project) {
    return <div className="text-sm text-stone-500">Loading project…</div>;
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
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg bg-white/80 px-3 py-1.5 text-xs text-stone-600 shadow-sm backdrop-blur">
          <span className="font-semibold text-stone-900">
            {baseName(project.rootPath)}
          </span>
          <span className="text-stone-400">{project.agents.length} agents</span>
          <ActiveBadge />
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
    <span className="flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      {activeSubagents} active
    </span>
  );
}

function AgentStrip({ count }: { count: number }): JSX.Element {
  const setView = useUi((s) => s.setView);
  return (
    <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div>
        <div className="text-xs font-semibold text-stone-700">Agents</div>
        <div className="text-xs text-stone-500">
          {count} installed · drag blocks on the canvas to arrange
        </div>
      </div>
      <button
        type="button"
        onClick={() => setView("marketplace")}
        className="rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-claude-300 hover:bg-claude-50"
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
      <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <div className="text-xs font-semibold text-stone-700">Skills</div>
          <div className="text-xs text-stone-500">
            No skills installed. Add domain knowledge packs from the
            marketplace.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setView("marketplace")}
          className="rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-claude-300 hover:bg-claude-50"
        >
          Browse Skills
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-stone-700">
          Skills ({skills.length})
        </div>
        <button
          type="button"
          onClick={() => setView("marketplace")}
          className="text-xs font-medium text-claude-700 hover:text-claude-800"
        >
          + Add more
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto">
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
      await onRemoved();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="group relative shrink-0 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
      title={skill.frontmatter.description}
    >
      <div className="pr-5 text-xs font-medium text-stone-900">
        {skill.frontmatter.name}
      </div>
      <div className="line-clamp-1 max-w-[200px] pr-5 text-[11px] text-stone-500">
        {skill.frontmatter.description}
      </div>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="absolute right-1 top-1 rounded p-0.5 text-stone-400 opacity-0 hover:bg-stone-200 hover:text-stone-700 group-hover:opacity-100 disabled:opacity-50"
        aria-label="Remove skill"
      >
        ✕
      </button>
    </div>
  );
}

function defaultPosition(index: number, _total: number): NodePosition {
  const cols = 3;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: 40 + col * 260, y: 40 + row * 160 };
}

function baseName(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

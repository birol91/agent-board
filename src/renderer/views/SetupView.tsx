import { useCallback, useEffect, useState } from "react";
import { call } from "../bridge";
import { useUi } from "../store";
import type { Project } from "../../shared";

export function SetupView(): JSX.Element {
  const project = useUi((s) => s.project);
  const setProject = useUi((s) => s.setProject);
  const setView = useUi((s) => s.setView);
  const [hooksInstalled, setHooksInstalled] = useState(false);

  const refreshHooks = useCallback(async (rootPath: string) => {
    try {
      const r = await call("hooks:status", { rootPath });
      setHooksInstalled(r.installed);
    } catch {
      setHooksInstalled(false);
    }
  }, []);

  const refreshProject = useCallback(async () => {
    if (!project) return;
    const p = await call("project:read", { rootPath: project.rootPath });
    setProject(p);
  }, [project, setProject]);

  useEffect(() => {
    if (project) void refreshHooks(project.rootPath);
  }, [project, refreshHooks]);

  if (!project) {
    return <div className="text-sm text-stone-500 dark:text-slate-400 dark:text-slate-400">Loading…</div>;
  }

  const checks = {
    claudeMd: project.hasClaudeMd,
    agents: project.agents.length > 0,
    skills: project.skills.length > 0,
    hooks: hooksInstalled,
  };
  const total = Object.values(checks).filter(Boolean).length;
  const ready = checks.claudeMd && checks.agents;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
      <header className="flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100 dark:text-slate-100">
            Set up Claude Code in {baseName(project.rootPath)}
          </h2>
          <p className="text-xs text-stone-500 dark:text-slate-400 dark:text-slate-400">
            Claude Code Main runs in your chat. It reads CLAUDE.md and
            dispatches work to the agents you install. Recommended order: rules
            → agents → skills → live link.
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs">
          <span className="font-semibold text-stone-900 dark:text-slate-100 dark:text-slate-100">{total}/4</span>
          <span className="ml-1 text-stone-500 dark:text-slate-400 dark:text-slate-400">complete</span>
        </div>
      </header>

      <Step
        n={1}
        done={checks.claudeMd}
        title="Project rules — CLAUDE.md"
        sub="Claude Code Main reads this on every chat. State your stack, conventions, and what to avoid."
      >
        <ClaudeMdEditor
          rootPath={project.rootPath}
          onSaved={refreshProject}
        />
      </Step>

      <Step
        n={2}
        done={checks.agents}
        title="Agents"
        sub="Specialists Claude Code can delegate to. Pick what fits this project."
      >
        <ChipList
          items={project.agents.map((a) => ({
            id: a.filePath,
            name: a.frontmatter.name,
          }))}
          emptyLabel="No agents installed yet."
          onRemove={async (id) => {
            await call("agent:delete", { filePath: id });
            await refreshProject();
          }}
          onBrowse={() => setView("marketplace")}
          browseLabel="Browse Agents"
        />
      </Step>

      <Step
        n={3}
        done={checks.skills}
        title="Skills (optional)"
        sub="Domain knowledge packs that load into Claude Code's own context when relevant."
      >
        <ChipList
          items={project.skills.map((s) => ({
            id: s.folderPath,
            name: s.frontmatter.name,
          }))}
          emptyLabel="No skills installed."
          onRemove={async (id) => {
            await call("skill:delete", { folderPath: id });
            useUi.getState().flagRestartNeeded();
            await refreshProject();
          }}
          onBrowse={() => setView("marketplace")}
          browseLabel="Browse Skills"
        />
      </Step>

      <Step
        n={4}
        done={hooksInstalled}
        title="Live link — Claude Code → AgentBoard"
        sub="Install hooks so AgentBoard sees agent activity in real time. One-time setup per project."
      >
        <HooksRow
          rootPath={project.rootPath}
          installed={hooksInstalled}
          onInstall={async () => {
            await call("hooks:install", { rootPath: project.rootPath });
            await refreshHooks(project.rootPath);
          }}
        />
      </Step>

      <div className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="text-sm text-stone-700 dark:text-slate-200 dark:text-slate-200">
          {ready
            ? "Ready to ship. CLAUDE.md and at least one agent are in place."
            : "Finish steps 1 and 2 to be production-ready."}
        </div>
        <button
          type="button"
          disabled={!ready}
          onClick={() => setView("project")}
          className="rounded-lg bg-claude-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-claude-600 disabled:cursor-not-allowed disabled:bg-claude-300"
        >
          Open Project
        </button>
      </div>

      <ResetSection project={project} onChanged={refreshProject} />
    </div>
  );
}

function Step({
  n,
  done,
  title,
  sub,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  sub: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <header className="mb-2 flex items-center gap-2">
        <span
          className={
            "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold shadow-sm " +
            (done
              ? "bg-emerald-500 text-white"
              : "bg-claude-100 text-claude-700 ring-2 ring-claude-200")
          }
        >
          {done ? "✓" : n}
        </span>
        <h3 className="text-sm font-semibold text-stone-900 dark:text-slate-100 dark:text-slate-100">{title}</h3>
        {done && (
          <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-emerald-600">
            done
          </span>
        )}
      </header>
      <p className="mb-3 text-xs text-stone-500 dark:text-slate-400 dark:text-slate-400">{sub}</p>
      {children}
    </section>
  );
}

function HooksRow({
  rootPath,
  installed,
  onInstall,
}: {
  rootPath: string;
  installed: boolean;
  onInstall: () => Promise<void>;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-100 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 px-3 py-2">
      <span className="text-xs text-stone-600 dark:text-slate-300 dark:text-slate-300">
        {installed
          ? `Hooks installed in ${rootPath}/.claude/settings.json`
          : "Hooks not installed yet"}
      </span>
      <button
        type="button"
        disabled={busy || installed}
        onClick={async () => {
          setBusy(true);
          try {
            await onInstall();
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-md bg-claude-500 px-3 py-1 text-xs font-medium text-white hover:bg-claude-600 disabled:bg-claude-300"
      >
        {installed ? "Installed" : busy ? "Installing…" : "Install hooks"}
      </button>
    </div>
  );
}

function ChipList({
  items,
  emptyLabel,
  onRemove,
  onBrowse,
  browseLabel,
}: {
  items: { id: string; name: string }[];
  emptyLabel: string;
  onRemove: (id: string) => Promise<void>;
  onBrowse: () => void;
  browseLabel: string;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-stone-100 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 p-3">
      {items.length === 0 ? (
        <p className="text-xs text-stone-500 dark:text-slate-400 dark:text-slate-400">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it) => (
            <span
              key={it.id}
              className="group inline-flex items-center gap-1.5 rounded-md border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-stone-800 dark:text-slate-100 dark:text-slate-100"
            >
              {it.name}
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`Remove ${it.name}?`)) return;
                  await onRemove(it.id);
                }}
                className="text-stone-400 dark:text-slate-500 hover:text-red-600"
                aria-label={`Remove ${it.name}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={onBrowse}
          className="rounded-md border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-medium text-stone-700 dark:text-slate-200 hover:border-claude-300 hover:bg-claude-50"
        >
          {browseLabel}
        </button>
      </div>
    </div>
  );
}

function ResetSection({
  project,
  onChanged,
}: {
  project: Project;
  onChanged: () => Promise<void>;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reset(
    what: "claudeMd" | "agents" | "skills" | "hooks" | "all",
    label: string,
  ): Promise<void> {
    if (!confirm(`${label}\nThis cannot be undone. Continue?`)) return;
    setBusy(true);
    try {
      await call("project:reset", { rootPath: project.rootPath, what });
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <div className="text-sm font-semibold text-stone-900 dark:text-slate-100 dark:text-slate-100">
            Restore to default
          </div>
          <div className="text-xs text-stone-500 dark:text-slate-400 dark:text-slate-400">
            Wipe parts of this project's Claude Code setup.
          </div>
        </div>
        <span className="text-stone-400 dark:text-slate-500 dark:text-slate-500">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <ResetRow
            label="Reset CLAUDE.md"
            sub={`Delete ${project.rootPath}/CLAUDE.md (template will reload).`}
            disabled={busy || !project.hasClaudeMd}
            onClick={() => reset("claudeMd", "Reset CLAUDE.md")}
          />
          <ResetRow
            label="Clear all agents"
            sub={`Delete every file in .claude/agents/ (${project.agents.length} agents).`}
            disabled={busy || project.agents.length === 0}
            onClick={() => reset("agents", "Clear all agents")}
          />
          <ResetRow
            label="Clear all skills"
            sub={`Delete every folder in .claude/skills/ (${project.skills.length} skills).`}
            disabled={busy || project.skills.length === 0}
            onClick={() => reset("skills", "Clear all skills")}
          />
          <ResetRow
            label="Uninstall hooks"
            sub="Remove agent-board hook entries from settings.json and delete .claude/hooks/."
            disabled={busy}
            onClick={() => reset("hooks", "Uninstall hooks")}
          />
          <ResetRow
            label="Reset everything"
            sub="CLAUDE.md, agents, skills, hooks, layout — all gone."
            destructive
            disabled={busy}
            onClick={() => reset("all", "Reset everything")}
          />
        </div>
      )}
    </div>
  );
}

function ResetRow({
  label,
  sub,
  destructive,
  disabled,
  onClick,
}: {
  label: string;
  sub: string;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-100 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs font-medium text-stone-800 dark:text-slate-100 dark:text-slate-100">{label}</div>
        <div className="truncate text-xs text-stone-500 dark:text-slate-400 dark:text-slate-400">{sub}</div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={
          "shrink-0 rounded-md px-3 py-1 text-xs font-medium disabled:opacity-40 " +
          (destructive
            ? "border border-red-200 text-red-700 hover:bg-red-50"
            : "border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-200 hover:border-claude-300 hover:bg-claude-50")
        }
      >
        Reset
      </button>
    </div>
  );
}

function ClaudeMdEditor({
  rootPath,
  onSaved,
}: {
  rootPath: string;
  onSaved: () => Promise<void>;
}): JSX.Element {
  const [content, setContent] = useState("");
  const [filePath, setFilePath] = useState("");
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSavedAt(null);
    call("claudeMd:read", { rootPath })
      .then((r) => {
        if (cancelled) return;
        setContent(r.content);
        setFilePath(r.filePath);
        setExists(r.exists);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  async function save(): Promise<void> {
    setBusy(true);
    try {
      await call("claudeMd:write", { rootPath, content });
      useUi.getState().flagRestartNeeded();
      setExists(true);
      setSavedAt(Date.now());
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-stone-100 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 p-3">
      <div className="mb-2 truncate text-xs text-stone-400 dark:text-slate-500 dark:text-slate-500" title={filePath}>
        {filePath} {exists ? "" : "(new)"}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={14}
        className="w-full rounded-md border border-stone-200 bg-white p-3 font-mono text-xs text-stone-800 focus:border-claude-400 focus:outline-none focus:ring-2 focus:ring-claude-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      />
      <div className="mt-2 flex items-center justify-end gap-3">
        {savedAt && <span className="text-xs text-emerald-600">Saved.</span>}
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-claude-500 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-claude-600 disabled:bg-claude-300"
        >
          {busy ? "Saving…" : "Save CLAUDE.md"}
        </button>
      </div>
    </div>
  );
}

function baseName(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

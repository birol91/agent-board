import { useEffect, useState } from "react";
import { call } from "./bridge";
import { useUi, type View } from "./store";

const items: { id: View; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "project", label: "Project" },
  { id: "marketplace", label: "Marketplace" },
];

export function Sidebar(): JSX.Element {
  const view = useUi((s) => s.view);
  const setView = useUi((s) => s.setView);
  const project = useUi((s) => s.project);
  const setProject = useUi((s) => s.setProject);
  const statuses = useUi((s) => s.statuses);
  const activeSubagents = Object.values(statuses).filter((v) => v === "running").length;
  const theme = useUi((s) => s.theme);
  const toggleTheme = useUi((s) => s.toggleTheme);

  const switchProject = (): void => {
    setProject(null);
    setView("picker");
  };
  const [hooksOk, setHooksOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!project) {
      setHooksOk(null);
      return;
    }
    const check = async (): Promise<void> => {
      try {
        const r = await call("hooks:status", { rootPath: project.rootPath });
        if (!cancelled) setHooksOk(r.installed);
      } catch {
        if (!cancelled) setHooksOk(false);
      }
    };
    void check();
    const id = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [project]);

  const liveLabel =
    hooksOk === null
      ? "checking…"
      : hooksOk
        ? activeSubagents > 0
          ? `${activeSubagents} active`
          : "ready"
        : "not connected";

  const liveDotClass =
    hooksOk === null
      ? "bg-stone-300 dark:bg-slate-600"
      : hooksOk
        ? activeSubagents > 0
          ? "bg-emerald-500 animate-pulse"
          : "bg-emerald-500"
        : "bg-stone-300 dark:bg-slate-600";

  return (
    <aside className="flex w-48 flex-col border-r border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="px-4 py-4">
        <div className="text-sm font-semibold text-stone-900 dark:text-slate-100">
          AgentBoard
        </div>
        <div className="text-xs text-stone-500 dark:text-slate-500">v2.0.0</div>
        <div className="mt-3 rounded-md border border-claude-200 bg-claude-50/60 px-2 py-1.5 dark:border-claude-700/50 dark:bg-claude-900/20 dark:shadow-claude-glow">
          <div className="text-[10px] font-medium uppercase tracking-wide text-claude-700 dark:text-claude-400">
            Main
          </div>
          <div className="text-xs font-semibold text-stone-900 dark:text-slate-100">
            Claude Code Main
          </div>
          <div className="mt-1 flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${liveDotClass}`} />
            <span className="text-[10px] text-stone-500 dark:text-slate-400">
              {liveLabel}
            </span>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {items.map((it) => {
          const active = view === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setView(it.id)}
              className={
                "block w-full rounded-lg px-3 py-2 text-left text-sm transition " +
                (active
                  ? "bg-claude-50 font-medium text-claude-700 dark:bg-claude-900/30 dark:text-claude-300"
                  : "text-stone-600 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-900")
              }
            >
              {it.label}
            </button>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-stone-200 px-3 py-3 dark:border-slate-800">
        {project && (
          <div>
            <div
              className="truncate text-[10px] text-stone-500 dark:text-slate-500"
              title={project.rootPath}
            >
              {project.rootPath}
            </div>
            <button
              type="button"
              onClick={switchProject}
              className="mt-1 flex w-full items-center justify-center rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:border-claude-300 hover:bg-claude-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-claude-500 dark:hover:bg-slate-800"
            >
              Switch project
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center justify-between rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:border-claude-300 hover:bg-claude-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-claude-500 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          <span>{theme === "dark" ? "Dark" : "Light"} mode</span>
          <span aria-hidden>{theme === "dark" ? "☾" : "☀"}</span>
        </button>
      </div>
    </aside>
  );
}

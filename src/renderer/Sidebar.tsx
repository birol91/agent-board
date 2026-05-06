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
  const activeSubagents = useUi((s) => s.activeSubagents);
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
      ? "bg-stone-300"
      : hooksOk
        ? activeSubagents > 0
          ? "bg-emerald-500 animate-pulse"
          : "bg-emerald-500"
        : "bg-stone-300";

  return (
    <aside className="flex w-48 flex-col border-r border-stone-200 bg-white">
      <div className="px-4 py-4">
        <div className="text-sm font-semibold text-stone-900">AgentBoard</div>
        <div className="text-xs text-stone-500">v1.0.0</div>
        <div className="mt-3 rounded-md border border-claude-200 bg-claude-50/60 px-2 py-1.5">
          <div className="text-[10px] font-medium uppercase tracking-wide text-claude-700">
            Main
          </div>
          <div className="text-xs font-semibold text-stone-900">Claude Code Main</div>
          <div className="mt-1 flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${liveDotClass}`} />
            <span className="text-[10px] text-stone-500">{liveLabel}</span>
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
                  ? "bg-claude-50 font-medium text-claude-700"
                  : "text-stone-600 hover:bg-stone-100")
              }
            >
              {it.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

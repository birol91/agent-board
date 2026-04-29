import { useUi, type View } from "./store.js";

const items: { id: View; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "project", label: "Project" },
  { id: "memory", label: "Memory" },
  { id: "marketplace", label: "Marketplace" },
];

export function Sidebar(): JSX.Element {
  const view = useUi((s) => s.view);
  const setView = useUi((s) => s.setView);
  return (
    <aside className="flex w-48 flex-col border-r border-stone-200 bg-white">
      <div className="px-4 py-4">
        <div className="text-sm font-semibold text-stone-900">AgentDeck</div>
        <div className="text-xs text-stone-500">v0.0.0</div>
        <div className="mt-3 rounded-md border border-claude-200 bg-claude-50/60 px-2 py-1.5">
          <div className="text-[10px] font-medium uppercase tracking-wide text-claude-700">
            Orchestrator
          </div>
          <div className="text-xs font-semibold text-stone-900">Claude Code</div>
          <div className="text-[10px] text-stone-500">runs in your chat</div>
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

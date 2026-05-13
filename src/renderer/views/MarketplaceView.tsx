import { useEffect, useMemo, useState } from "react";
import { call } from "../bridge";
import { useUi } from "../store";
import type {
  Catalog,
  CatalogAgent,
  CatalogSkill,
} from "../../shared";

type Tab = "agents" | "skills";

export function MarketplaceView(): JSX.Element {
  const storeTab = useUi((s) => s.marketplaceTab);
  const setMarketplaceTab = useUi((s) => s.setMarketplaceTab);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tab: Tab = storeTab;
  const setTab = (t: Tab) => setMarketplaceTab(t);
  const [query, setQuery] = useState("");
  const [plugin, setPlugin] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [selected, setSelected] = useState<CatalogAgent | null>(null);

  useEffect(() => {
    let cancelled = false;
    call("catalog:read", undefined)
      .then((c) => {
        if (!cancelled) setCatalog(c);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <pre className="text-xs text-red-700">{error}</pre>
      </div>
    );
  }
  if (!catalog) return <div className="text-sm text-stone-500 dark:text-slate-400 dark:text-slate-400">Loading…</div>;

  return (
    <div className="flex h-full gap-4">
      <div className="flex flex-1 flex-col">
        <Tabs tab={tab} setTab={setTab} catalog={catalog} />
        <Filters
          query={query}
          setQuery={setQuery}
          plugin={plugin}
          setPlugin={setPlugin}
          plugins={uniquePlugins(catalog, tab).filter(
            (p) => category === "all" || categoryOf(p) === category,
          )}
          category={category}
          setCategory={setCategory}
          categories={uniqueCategories(catalog, tab)}
        />
        <div className="mt-3 flex-1 overflow-auto rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm dark:bg-slate-950 dark:shadow-claude-glow">
          {tab === "agents" && (
            <AgentList
              catalog={catalog}
              query={query}
              plugin={plugin}
              selected={selected}
              onSelect={setSelected}
            />
          )}
          {tab === "skills" && (
            <SkillList
              catalog={catalog}
              query={query}
              plugin={plugin}
            />
          )}
        </div>
      </div>
      {tab === "agents" && (
        <aside className="w-96 overflow-auto rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <AgentDetail agent={selected} />
        </aside>
      )}
    </div>
  );
}

function Tabs({
  tab,
  setTab,
  catalog,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  catalog: Catalog;
}): JSX.Element {
  const list: { id: Tab; label: string; n: number }[] = [
    { id: "agents", label: "Agents", n: catalog.counts.agents },
    { id: "skills", label: "Skills", n: catalog.counts.skills },
  ];
  return (
    <div className="flex gap-1 border-b border-stone-200 dark:border-slate-800">
      {list.map((it) => {
        const active = it.id === tab;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => setTab(it.id)}
            className={
              "px-3 py-2 text-sm transition " +
              (active
                ? "border-b-2 border-claude-500 font-medium text-claude-700"
                : "text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:text-slate-100 dark:text-slate-100")
            }
          >
            {it.label}{" "}
            <span className="ml-1 text-xs text-stone-400 dark:text-slate-500 dark:text-slate-500">{it.n}</span>
          </button>
        );
      })}
    </div>
  );
}

function Filters({
  query,
  setQuery,
  plugin,
  setPlugin,
  plugins,
  category,
  setCategory,
  categories,
}: {
  query: string;
  setQuery: (s: string) => void;
  plugin: string;
  setPlugin: (s: string) => void;
  plugins: string[];
  category: string;
  setCategory: (s: string) => void;
  categories: string[];
}): JSX.Element {
  return (
    <div className="mt-3 flex gap-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or description…"
        className="flex-1 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm placeholder:text-stone-400 dark:text-slate-500 focus:border-claude-400 focus:outline-none focus:ring-2 focus:ring-claude-500/20"
      />
      <select
        value={category}
        onChange={(e) => {
          setCategory(e.target.value);
          setPlugin("all");
        }}
        className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:border-claude-400 focus:outline-none focus:ring-2 focus:ring-claude-500/20"
      >
        <option value="all">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={plugin}
        onChange={(e) => setPlugin(e.target.value)}
        className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:border-claude-400 focus:outline-none focus:ring-2 focus:ring-claude-500/20"
      >
        <option value="all">All plugins</option>
        {plugins.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
}

function uniqueCategories(catalog: Catalog, tab: Tab): string[] {
  const plugins =
    tab === "agents"
      ? catalog.agents.map((a) => a.plugin)
      : catalog.skills.map((s) => s.plugin);
  return Array.from(new Set(plugins.map(categoryOf))).sort();
}

function AgentList({
  catalog,
  query,
  plugin,
  selected,
  onSelect,
}: {
  catalog: Catalog;
  query: string;
  plugin: string;
  selected: CatalogAgent | null;
  onSelect: (a: CatalogAgent) => void;
}): JSX.Element {
  const filtered = useMemo(
    () =>
      catalog.agents.filter(
        (a) =>
          (matches(a.frontmatter.name, query) ||
            matches(a.frontmatter.description, query)) &&
          matchesPlugin(a.plugin, plugin),
      ),
    [catalog, query, plugin],
  );

  return (
    <ul className="divide-y divide-stone-100">
      {filtered.map((a) => {
        const active = selected?.relPath === a.relPath;
        return (
          <li key={a.relPath}>
            <button
              type="button"
              onClick={() => onSelect(a)}
              className={
                "block w-full px-4 py-3 text-left transition " +
                (active ? "bg-claude-50" : "hover:bg-stone-50 dark:bg-slate-900 dark:bg-slate-900")
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-stone-900 dark:text-slate-100 dark:text-slate-100">
                  {a.frontmatter.name}
                </span>
                <span className="text-xs text-stone-400 dark:text-slate-500 dark:text-slate-500">{a.plugin}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-stone-500 dark:text-slate-400 dark:text-slate-400">
                {a.frontmatter.description}
              </p>
            </button>
          </li>
        );
      })}
      {filtered.length === 0 && (
        <li className="px-4 py-6 text-center text-sm text-stone-400 dark:text-slate-500 dark:text-slate-500">
          No matches
        </li>
      )}
    </ul>
  );
}

function AgentDetail({
  agent,
}: {
  agent: CatalogAgent | null;
}): JSX.Element {
  const project = useUi((s) => s.project);
  const setProject = useUi((s) => s.setProject);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!agent) {
    return (
      <p className="text-sm text-stone-400 dark:text-slate-500 dark:text-slate-500">
        Select an agent on the left to see details.
      </p>
    );
  }

  const installed = !!project?.agents.find(
    (a) => a.frontmatter.name === agent.frontmatter.name,
  );

  async function add(): Promise<void> {
    if (!project) return;
    setBusy(true);
    setErr(null);
    try {
      await call("agent:install", { rootPath: project.rootPath, from: agent! });
      useUi.getState().flagRestartNeeded();
      const fresh = await call("project:read", { rootPath: project.rootPath });
      setProject(fresh);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-stone-900 dark:text-slate-100 dark:text-slate-100">
        {agent.frontmatter.name}
      </h3>
      <p className="text-xs text-stone-500 dark:text-slate-400 dark:text-slate-400">
        {agent.plugin} · model: {agent.frontmatter.model ?? "inherit"}
      </p>
      <p className="mt-3 text-sm text-stone-700 dark:text-slate-200 dark:text-slate-200">
        {agent.frontmatter.description}
      </p>
      {agent.frontmatter.tools && (
        <div className="mt-3">
          <div className="text-xs font-medium text-stone-500 dark:text-slate-400 dark:text-slate-400">Tools</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {agent.frontmatter.tools.map((t) => (
              <span
                key={t}
                className="rounded bg-stone-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs text-stone-700 dark:text-slate-200 dark:text-slate-200"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4">
        <div className="text-xs font-medium text-stone-500 dark:text-slate-400 dark:text-slate-400">System prompt</div>
        <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 p-3 text-xs text-stone-700 dark:text-slate-200 dark:text-slate-200">
          {agent.systemPrompt}
        </pre>
      </div>
      {err && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {err}
        </div>
      )}
      <button
        type="button"
        onClick={add}
        disabled={busy || installed || !project}
        className="mt-4 w-full rounded-lg bg-claude-500 px-3 py-2 text-sm font-medium text-white hover:bg-claude-600 disabled:cursor-not-allowed disabled:bg-claude-300"
      >
        {installed ? "Already in project" : busy ? "Adding…" : "Add to project"}
      </button>
    </div>
  );
}

function SkillList({
  catalog,
  query,
  plugin,
}: {
  catalog: Catalog;
  query: string;
  plugin: string;
}): JSX.Element {
  const project = useUi((s) => s.project);
  const setProject = useUi((s) => s.setProject);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      catalog.skills.filter(
        (s) =>
          (matches(s.frontmatter.name, query) ||
            matches(s.frontmatter.description, query)) &&
          matchesPlugin(s.plugin, plugin),
      ),
    [catalog, query, plugin],
  );

  const installedNames = new Set(
    project?.skills.map((s) => s.frontmatter.name) ?? [],
  );

  async function install(s: CatalogSkill): Promise<void> {
    if (!project) return;
    setBusy(s.relPath);
    setErr(null);
    try {
      await call("skill:install", { rootPath: project.rootPath, from: s });
      useUi.getState().flagRestartNeeded();
      const fresh = await call("project:read", { rootPath: project.rootPath });
      setProject(fresh);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {err && (
        <div className="m-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {err}
        </div>
      )}
      <ul className="divide-y divide-stone-100">
        {filtered.map((s) => {
          const installed = installedNames.has(s.frontmatter.name);
          return (
            <li
              key={s.relPath}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-stone-900 dark:text-slate-100 dark:text-slate-100">
                    {s.frontmatter.name}
                  </span>
                  <span className="text-xs text-stone-400 dark:text-slate-500 dark:text-slate-500">{s.plugin}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-stone-500 dark:text-slate-400 dark:text-slate-400">
                  {s.frontmatter.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => install(s)}
                disabled={installed || busy === s.relPath || !project}
                className="shrink-0 rounded-md border border-stone-200 dark:border-slate-800 px-2.5 py-1 text-xs font-medium text-stone-700 dark:text-slate-200 hover:border-claude-300 hover:bg-claude-50 disabled:cursor-not-allowed disabled:bg-stone-50 dark:bg-slate-900 disabled:text-stone-400 dark:text-slate-500 dark:text-slate-500"
              >
                {installed
                  ? "Installed"
                  : busy === s.relPath
                    ? "Adding…"
                    : "Add"}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-stone-400 dark:text-slate-500 dark:text-slate-500">
            No matches
          </li>
        )}
      </ul>
    </div>
  );
}

function matches(text: string, query: string): boolean {
  if (!query) return true;
  return text.toLowerCase().includes(query.toLowerCase());
}

function matchesPlugin(p: string, filter: string): boolean {
  return filter === "all" || p === filter;
}

function uniquePlugins(catalog: Catalog, tab: Tab): string[] {
  const arr =
    tab === "agents"
      ? catalog.agents.map((a) => a.plugin)
      : catalog.skills.map((s) => s.plugin);
  return Array.from(new Set(arr)).sort();
}

function categoryOf(plugin: string): string {
  // First hyphen-separated token works as a coarse category for
  // wshobson's naming convention (e.g. "python-development" → "python",
  // "security-compliance" → "security", "agent-orchestration" → "agent").
  const i = plugin.indexOf("-");
  return i === -1 ? plugin : plugin.slice(0, i);
}

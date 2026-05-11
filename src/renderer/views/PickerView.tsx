import { useCallback, useEffect, useState } from "react";
import { call } from "../bridge";
import { useUi } from "../store";

export function PickerView(): JSX.Element {
  const setProject = useUi((s) => s.setProject);
  const setView = useUi((s) => s.setView);
  const [recent, setRecent] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNew, setPendingNew] = useState<string | null>(null);

  const refreshRecent = useCallback(async () => {
    try {
      const r = await call("app:recentProjects", undefined);
      setRecent(r.paths);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    void refreshRecent();
  }, [refreshRecent]);

  const openProject = useCallback(
    async (rootPath: string) => {
      setBusy(true);
      setError(null);
      try {
        const p = await call("project:read", { rootPath });
        await call("app:addRecent", { rootPath });
        setProject(p);
        if (!p.hasClaudeMd && p.agents.length === 0) {
          setView("setup");
        } else {
          setView("project");
        }
        try {
          const { installed } = await call("hooks:status", { rootPath });
          if (!installed) {
            await call("hooks:install", { rootPath });
          }
        } catch {
          // hooks are nice-to-have
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [setProject, setView],
  );

  const handleBrowse = useCallback(async () => {
    setError(null);
    try {
      const r = await call("dialog:openProject", undefined);
      if (!r.rootPath) return;
      const { exists } = await call("project:hasClaudeFolder", {
        rootPath: r.rootPath,
      });
      if (!exists) {
        setPendingNew(r.rootPath);
        return;
      }
      await openProject(r.rootPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [openProject]);

  const handleRemoveRecent = useCallback(
    async (rootPath: string) => {
      try {
        await call("app:clearRecent", { rootPath });
        await refreshRecent();
      } catch {
        // ignore
      }
    },
    [refreshRecent],
  );

  if (pendingNew) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-lg rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-slate-100">
            Set up AgentBoard here?
          </h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-slate-400">
            This folder does not have a <code>.claude/</code> directory yet.
            AgentBoard will create one and add the default configuration.
          </p>
          <p className="mt-3 break-all rounded bg-stone-100 px-3 py-2 font-mono text-xs text-stone-700 dark:bg-slate-800 dark:text-slate-300">
            {pendingNew}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              className="rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => setPendingNew(null)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              onClick={() => {
                const target = pendingNew;
                setPendingNew(null);
                void openProject(target);
              }}
              disabled={busy}
            >
              Set up here
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-slate-100">
          Open a project
        </h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
          Choose a folder to manage with AgentBoard.
        </p>

        <button
          type="button"
          className="mt-5 rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          onClick={handleBrowse}
          disabled={busy}
        >
          Browse…
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {recent.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-slate-400">
              Recent
            </h2>
            <ul className="mt-2 divide-y divide-stone-200 rounded border border-stone-200 dark:divide-slate-700 dark:border-slate-700">
              {recent.map((p) => (
                <li
                  key={p}
                  className="group flex items-center gap-2 px-3 py-2 hover:bg-stone-50 dark:hover:bg-slate-800"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-sm text-stone-700 hover:text-orange-700 disabled:opacity-50 dark:text-slate-300 dark:hover:text-orange-400"
                    onClick={() => void openProject(p)}
                    disabled={busy}
                    title={p}
                  >
                    {p}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-stone-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                    onClick={() => void handleRemoveRecent(p)}
                    disabled={busy}
                    aria-label="Remove from recent"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

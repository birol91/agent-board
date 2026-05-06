import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { useUi } from "./store";
import { ProjectView } from "./views/ProjectView";
import { MarketplaceView } from "./views/MarketplaceView";
import { SetupView } from "./views/SetupView";
import { RestartHint } from "./RestartHint";
import { call, onHookEvent } from "./bridge";

export function App(): JSX.Element {
  const view = useUi((s) => s.view);
  const setView = useUi((s) => s.setView);
  const setProject = useUi((s) => s.setProject);
  const ingestHookEvent = useUi((s) => s.ingestHookEvent);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { rootPath } = await call("app:projectRoot", undefined);
        const p = await call("project:read", { rootPath });
        if (cancelled) return;
        setProject(p);
        if (!p.hasClaudeMd && p.agents.length === 0) {
          setView("setup");
        }
        // Auto-install hooks on first open if absent — quietly.
        try {
          const { installed } = await call("hooks:status", { rootPath });
          if (!installed && !cancelled) {
            await call("hooks:install", { rootPath });
          }
        } catch {
          // hooks are nice-to-have; never fail boot for them
        }
      } catch {
        // surfaced by individual views
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setProject, setView]);

  useEffect(() => onHookEvent(ingestHookEvent), [ingestHookEvent]);

  return (
    <div className="flex h-screen bg-stone-50">
      <Sidebar />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        {view === "setup" ? (
          <SetupView />
        ) : view === "project" ? (
          <ProjectView />
        ) : (
          <MarketplaceView />
        )}
      </main>
      <RestartHint />
    </div>
  );
}

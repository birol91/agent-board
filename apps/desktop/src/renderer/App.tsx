import { useEffect } from "react";
import { Sidebar } from "./Sidebar.js";
import { useUi } from "./store.js";
import { ProjectView } from "./views/ProjectView.js";
import { MarketplaceView } from "./views/MarketplaceView.js";
import { SetupView } from "./views/SetupView.js";
import { MemoryView } from "./views/MemoryView.js";
import { call, onHookEvent } from "./bridge.js";

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
        ) : view === "memory" ? (
          <MemoryView />
        ) : (
          <MarketplaceView />
        )}
      </main>
    </div>
  );
}

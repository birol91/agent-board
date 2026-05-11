import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { useUi } from "./store";
import { ProjectView } from "./views/ProjectView";
import { MarketplaceView } from "./views/MarketplaceView";
import { SetupView } from "./views/SetupView";
import { PickerView } from "./views/PickerView";
import { RestartHint } from "./RestartHint";
import { onHookEvent } from "./bridge";

export function App(): JSX.Element {
  const view = useUi((s) => s.view);
  const project = useUi((s) => s.project);
  const ingestHookEvent = useUi((s) => s.ingestHookEvent);
  const theme = useUi((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => onHookEvent(ingestHookEvent), [ingestHookEvent]);

  if (view === "picker" || !project) {
    return (
      <div className="flex h-screen bg-stone-50 dark:bg-slate-950">
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
          <PickerView />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-stone-50 dark:bg-slate-950">
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

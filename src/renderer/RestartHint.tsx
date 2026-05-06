import { useEffect } from "react";
import { useUi } from "./store";

const AUTO_DISMISS_MS = 12_000;

export function RestartHint(): JSX.Element | null {
  const restartHintAt = useUi((s) => s.restartHintAt);
  const dismissRestartHint = useUi((s) => s.dismissRestartHint);

  useEffect(() => {
    if (!restartHintAt) return;
    const id = setTimeout(dismissRestartHint, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [restartHintAt, dismissRestartHint]);

  if (!restartHintAt) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-claude-300 bg-white px-4 py-2.5 shadow-lg">
        <span className="h-2 w-2 rounded-full bg-claude-500" />
        <span className="text-sm text-stone-800">
          Restart your Claude Code session for changes to apply.
        </span>
        <button
          type="button"
          onClick={dismissRestartHint}
          className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

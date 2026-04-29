import { useEffect, useState } from "react";
import { call } from "../bridge.js";
import type { MemoryEntry } from "@agentdeck/shared-types";

export function MemoryView(): JSX.Element {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [indexBody, setIndexBody] = useState("");
  const [indexPath, setIndexPath] = useState("");
  const [selected, setSelected] = useState<MemoryEntry | null>(null);

  async function reload(): Promise<void> {
    const r = await call("memory:list", undefined);
    setEntries(r.entries);
    setIndexBody(r.indexBody);
    setIndexPath(r.indexPath);
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="rounded-xl border border-claude-200 bg-claude-50/60 px-4 py-3">
        <div className="text-xs font-semibold text-claude-800">
          Memory is written by Claude Code (orchestrator)
        </div>
        <p className="mt-0.5 text-xs text-stone-600">
          As you chat, Claude Code (orchestrator) saves things you tell it to remember (your role,
          preferences, project context). This panel shows what's been recorded
          so you can review and remove entries. To edit content, open the file
          directly in your editor.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        <aside className="flex w-72 flex-col rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-3 py-2">
            <div className="text-xs font-semibold text-stone-700">
              Entries ({entries.length})
            </div>
          </div>
          <ul className="flex-1 overflow-auto">
            {entries.map((e) => (
              <li key={e.fileName}>
                <button
                  type="button"
                  onClick={() => setSelected(e)}
                  className={
                    "block w-full px-3 py-2 text-left transition " +
                    (selected?.fileName === e.fileName
                      ? "bg-claude-50"
                      : "hover:bg-stone-50")
                  }
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-stone-900">
                      {e.title}
                    </span>
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
                      {e.type}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">
                    {e.description}
                  </p>
                </button>
              </li>
            ))}
            {entries.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-stone-400">
                No memory entries yet. Claude Code (orchestrator) will start populating this
                automatically as you chat.
              </li>
            )}
          </ul>
        </aside>

        <section className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          {selected ? (
            <Detail
              entry={selected}
              onDeleted={async () => {
                setSelected(null);
                await reload();
              }}
            />
          ) : (
            <Index indexPath={indexPath} body={indexBody} />
          )}
        </section>
      </div>
    </div>
  );
}

function Detail({
  entry,
  onDeleted,
}: {
  entry: MemoryEntry;
  onDeleted: () => Promise<void>;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function remove(): Promise<void> {
    if (
      !confirm(
        `Remove memory entry "${entry.title}"?\nThis deletes ${entry.fileName}.`,
      )
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      await call("memory:delete", { fileName: entry.fileName });
      await onDeleted();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-stone-100 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-stone-900">
              {entry.title}
            </div>
            <div className="truncate text-xs text-stone-500">
              {entry.filePath}
            </div>
          </div>
          <span className="shrink-0 rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
            {entry.type}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 py-3">
        <Field label="Description">{entry.description}</Field>
        <Field label="Body">
          <pre className="whitespace-pre-wrap rounded-lg border border-stone-200 bg-stone-50 p-3 font-mono text-xs text-stone-700">
            {entry.body || "(empty)"}
          </pre>
        </Field>
        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {err}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-end border-t border-stone-100 px-4 py-3">
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {busy ? "Removing…" : "Remove entry"}
        </button>
      </footer>
    </div>
  );
}

function Index({
  indexPath,
  body,
}: {
  indexPath: string;
  body: string;
}): JSX.Element {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-stone-100 px-4 py-3">
        <div className="text-sm font-semibold text-stone-900">MEMORY.md</div>
        <div className="truncate text-xs text-stone-500">{indexPath}</div>
      </header>
      <div className="flex-1 overflow-auto px-4 py-3">
        {body.trim() ? (
          <pre className="whitespace-pre-wrap rounded-lg border border-stone-200 bg-stone-50 p-3 font-mono text-xs text-stone-700">
            {body}
          </pre>
        ) : (
          <p className="text-xs text-stone-400">
            MEMORY.md is empty. Claude Code (orchestrator) maintains this index automatically as
            entries are created.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="mb-3">
      <div className="mb-1 text-xs font-medium text-stone-600">{label}</div>
      {typeof children === "string" ? (
        <p className="text-sm text-stone-700">{children}</p>
      ) : (
        children
      )}
    </div>
  );
}

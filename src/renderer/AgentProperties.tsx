import { useEffect, useMemo, useState } from "react";
import type {
  Agent,
  AgentColor,
  AgentFrontmatter,
  ClaudeModel,
} from "../shared";
import { call } from "./bridge";
import { useUi } from "./store";



const MODELS: ClaudeModel[] = ["inherit", "opus", "sonnet", "haiku"];

const MODEL_HELP: Record<ClaudeModel, string> = {
  inherit: "Use whatever model the main chat is on.",
  opus: "Heaviest reasoning. Best for architecture, security, hard problems.",
  sonnet: "Balanced. Good for docs, tests, debugging.",
  haiku: "Fast and cheap. Good for simple, quick tasks.",
};

type Permission = "read" | "write" | "both";

const READ_TOOLS = ["Read", "Grep", "Glob"];
const WRITE_TOOLS = ["Read", "Grep", "Glob", "Write", "Edit"];

function inferPermission(tools: string[] | undefined): Permission {
  if (!tools || tools.length === 0) return "both";
  const set = new Set(tools);
  const hasWrite = set.has("Write") || set.has("Edit");
  const hasBash = set.has("Bash");
  if (hasBash) return "both";
  if (hasWrite) return "write";
  return "read";
}

function tooolsForPermission(p: Permission): string[] | undefined {
  if (p === "read") return READ_TOOLS;
  if (p === "write") return WRITE_TOOLS;
  return undefined;
}

const COLORS: { id: AgentColor | "default"; cls: string; label: string }[] = [
  { id: "default", cls: "bg-claude-400", label: "default" },
  { id: "blue", cls: "bg-sky-500", label: "blue" },
  { id: "green", cls: "bg-emerald-500", label: "green" },
  { id: "red", cls: "bg-rose-500", label: "red" },
  { id: "yellow", cls: "bg-amber-400", label: "yellow" },
  { id: "cyan", cls: "bg-cyan-500", label: "cyan" },
  { id: "magenta", cls: "bg-fuchsia-500", label: "magenta" },
];

interface Props {
  agent: Agent;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function AgentProperties({
  agent,
  onClose,
  onSaved,
  onDeleted,
}: Props): JSX.Element {
  const [model, setModel] = useState<ClaudeModel>(
    agent.frontmatter.model ?? "inherit",
  );
  const [permission, setPermission] = useState<Permission>(
    inferPermission(agent.frontmatter.tools),
  );
  const [color, setColor] = useState<AgentColor | "default">(
    agent.frontmatter.color ?? "default",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const theme = useUi((s) => s.theme);

  useEffect(() => {
    setModel(agent.frontmatter.model ?? "inherit");
    setPermission(inferPermission(agent.frontmatter.tools));
    setColor(agent.frontmatter.color ?? "default");
  }, [agent]);

  const resolvedTools = useMemo(() => tooolsForPermission(permission), [
    permission,
  ]);

  async function save(): Promise<void> {
    setBusy(true);
    setErr(null);
    const fm: AgentFrontmatter = {
      name: agent.frontmatter.name,
      description: agent.frontmatter.description,
      model,
    };
    if (color !== "default") fm.color = color;
    if (resolvedTools) fm.tools = resolvedTools;
    try {
      await call("agent:save", {
        filePath: agent.filePath,
        frontmatter: fm,
        systemPrompt: agent.systemPrompt,
      });
      useUi.getState().flagRestartNeeded();
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(): Promise<void> {
    if (!confirm(`Remove ${agent.frontmatter.name} from project?`)) return;
    setBusy(true);
    try {
      await call("agent:delete", { filePath: agent.filePath });
      useUi.getState().flagRestartNeeded();
      onDeleted();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl dark:bg-slate-950 dark:shadow-claude-glow-strong">
        <header className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 px-5 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-stone-900 dark:text-slate-100 dark:text-slate-100">
              {agent.frontmatter.name}
            </div>
            <div className="truncate text-xs text-stone-500 dark:text-slate-400 dark:text-slate-400">
              {agent.filePath}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-stone-500 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-auto px-5 py-4">
          <ReadOnlyField label="Description">
            {agent.frontmatter.description}
          </ReadOnlyField>

          <Field label="Model">
            <div className="grid grid-cols-4 gap-2">
              {MODELS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModel(m)}
                  className={
                    "rounded-lg border px-3 py-2 text-sm transition " +
                    (model === m
                      ? "border-claude-500 bg-claude-50 font-medium text-claude-700"
                      : "border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-200 hover:border-stone-300")
                  }
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-stone-500 dark:text-slate-400 dark:text-slate-400">{MODEL_HELP[model]}</p>
          </Field>

          <Field label="Permissions">
            <div className="grid grid-cols-3 gap-2">
              {(["read", "write", "both"] as Permission[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPermission(p)}
                  className={
                    "rounded-lg border px-3 py-2 text-sm capitalize transition " +
                    (permission === p
                      ? "border-claude-500 bg-claude-50 font-medium text-claude-700"
                      : "border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-200 hover:border-stone-300")
                  }
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-stone-500 dark:text-slate-400 dark:text-slate-400">
              {permission === "read"
                ? "Read, Grep, Glob — agent can only read files."
                : permission === "write"
                  ? "Read, Grep, Glob, Write, Edit — agent can edit files."
                  : "All tools (Bash included) — full access."}
            </p>
          </Field>

          {theme === "light" ? (
            <Field label="Block color">
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    title={c.label}
                    className={
                      "h-8 w-8 rounded-full border-2 transition " +
                      c.cls +
                      " " +
                      (color === c.id
                        ? "border-stone-900 ring-2 ring-stone-900/20"
                        : "border-white shadow-sm hover:scale-110")
                    }
                  />
                ))}
              </div>
            </Field>
          ) : null}

          <ReadOnlyField label="System prompt (read-only)">
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 p-3 font-mono text-xs text-stone-700 dark:text-slate-200 dark:text-slate-200">
              {agent.systemPrompt}
            </pre>
          </ReadOnlyField>

          {err && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {err}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-stone-200 dark:border-slate-800 px-5 py-3">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Remove from project
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-claude-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-claude-600 disabled:bg-claude-300"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </footer>
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
    <label className="mb-4 block">
      <span className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-slate-300 dark:text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function ReadOnlyField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-xs font-medium text-stone-600 dark:text-slate-300 dark:text-slate-300">{label}</div>
      {typeof children === "string" ? (
        <p className="text-sm text-stone-700 dark:text-slate-200 dark:text-slate-200">{children}</p>
      ) : (
        children
      )}
    </div>
  );
}

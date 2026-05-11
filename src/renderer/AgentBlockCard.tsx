import type { Agent } from "../shared";
import { useUi, type RunStatus } from "./store";

const STATUS_DOT: Record<RunStatus, string> = {
  idle: "bg-stone-300 dark:bg-slate-600",
  running: "bg-emerald-500 animate-pulse",
  waiting: "bg-amber-400",
  disabled: "bg-stone-200 dark:bg-slate-700",
};

const COLOR_BAR: Record<string, string> = {
  blue: "bg-sky-500",
  green: "bg-emerald-500",
  red: "bg-rose-500",
  yellow: "bg-amber-400",
  cyan: "bg-cyan-500",
  magenta: "bg-fuchsia-500",
};

type Permission = "read" | "write" | "both";

function inferPermission(tools: string[] | undefined): Permission {
  if (!tools || tools.length === 0) return "both";
  const set = new Set(tools);
  if (set.has("Bash")) return "both";
  if (set.has("Write") || set.has("Edit")) return "write";
  return "read";
}

const PERMISSION_STYLE: Record<Permission, string> = {
  read: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60",
  write:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
  both: "bg-stone-100 text-stone-700 border-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export function AgentBlockCard({
  agent,
  status,
  windowOpen,
  onToggleWindow,
}: {
  agent: Agent;
  status: RunStatus;
  windowOpen: boolean;
  onToggleWindow: () => void;
}): JSX.Element {
  const fm = agent.frontmatter;
  const theme = useUi((s) => s.theme);
  const isRunning = status === "running";
  const isDark = theme === "dark";
  const colorClass =
    isRunning && isDark
      ? "bg-emerald-500"
      : isDark
        ? "bg-claude-400"
        : (fm.color && COLOR_BAR[fm.color]) || "bg-claude-400";
  const permission = inferPermission(fm.tools);
  return (
    <div
      style={{ width: 224 }}
      className={
        "overflow-hidden rounded-xl border bg-white shadow-md transition dark:bg-slate-900 " +
        (isRunning
          ? "border-stone-200 hover:border-claude-300 dark:border-emerald-500 dark:shadow-running-glow"
          : "border-stone-200 hover:border-claude-300 dark:border-slate-700 dark:shadow-claude-glow dark:hover:border-claude-500")
      }
    >
      <div className={`h-1 ${colorClass}`} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-stone-900 dark:text-slate-100">
              {fm.name}
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-slate-800 dark:text-slate-300">
                {fm.model ?? "inherit"}
              </span>
              <span
                className={
                  "rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize " +
                  PERMISSION_STYLE[permission]
                }
              >
                {permission}
              </span>
            </div>
          </div>
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        </div>
        <p className="mt-2 line-clamp-3 text-xs text-stone-500 dark:text-slate-400">
          {fm.description}
        </p>
        {isRunning && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Agent is running…
          </div>
        )}
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWindow();
          }}
          className={
            "mt-2 w-full rounded-md border px-2 py-1 text-[11px] font-medium transition " +
            (windowOpen
              ? "border-claude-300 bg-claude-50 text-claude-700 dark:border-claude-500/60 dark:bg-claude-900/30 dark:text-claude-300"
              : "border-stone-200 bg-white text-stone-700 hover:border-claude-300 hover:bg-claude-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-claude-500 dark:hover:bg-slate-800")
          }
        >
          {windowOpen ? "Close window" : "Open window"}
        </button>
      </div>
    </div>
  );
}

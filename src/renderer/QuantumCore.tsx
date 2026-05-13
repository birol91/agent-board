import type { Agent } from "../shared";
import type { RunStatus } from "./store";

export function QuantumCore({
  agent,
  status,
}: {
  agent: Agent;
  status: RunStatus;
}): JSX.Element {
  const fm = agent.frontmatter;
  const isRunning = status === "running";
  const isWaiting = status === "waiting";

  return (
    <div className="flex flex-col items-center select-none" style={{ width: 120 }}>
      <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
        {/* Outer ring — idle pulse or running spin */}
        <div
          className={
            "absolute rounded-full border-2 " +
            (isRunning
              ? "border-sky-400 animate-[spin_3s_linear_infinite] opacity-70"
              : isWaiting
                ? "border-amber-400 animate-pulse opacity-60"
                : "border-orange-400 animate-pulse opacity-50")
          }
          style={{ width: 76, height: 76 }}
        />

        {/* Mid ring — only visible when running */}
        {isRunning && (
          <div
            className="absolute rounded-full border-2 border-cyan-400 opacity-60 animate-[spin_2s_linear_infinite_reverse]"
            style={{ width: 58, height: 58 }}
          />
        )}

        {/* Inner ring */}
        <div
          className={
            "absolute rounded-full border " +
            (isRunning
              ? "border-emerald-400 animate-[spin_1.2s_linear_infinite] opacity-80"
              : "border-orange-300 opacity-30")
          }
          style={{ width: 42, height: 42 }}
        />

        {/* Core dot */}
        <div
          className={
            "relative z-10 rounded-full " +
            (isRunning
              ? "h-4 w-4 bg-sky-400 shadow-[0_0_12px_4px_rgba(56,189,248,0.6)] animate-pulse"
              : isWaiting
                ? "h-3 w-3 bg-amber-400 shadow-[0_0_8px_3px_rgba(251,191,36,0.5)]"
                : "h-3 w-3 bg-orange-400 shadow-[0_0_8px_3px_rgba(251,146,60,0.4)]")
          }
        />
      </div>

      {/* Agent name */}
      <div className="mt-1.5 max-w-full truncate text-center text-[11px] font-semibold text-stone-800 dark:text-slate-200">
        {fm.name}
      </div>

      {/* Status label */}
      <div
        className={
          "text-[10px] font-medium " +
          (isRunning
            ? "text-sky-500 dark:text-sky-400"
            : isWaiting
              ? "text-amber-500 dark:text-amber-400"
              : "text-stone-400 dark:text-slate-500")
        }
      >
        {isRunning ? "running" : isWaiting ? "waiting" : "idle"}
      </div>
    </div>
  );
}

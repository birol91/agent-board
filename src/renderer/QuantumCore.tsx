import type { RunStatus } from "./store";

export function QuantumCore({
  agentName,
  status,
}: {
  agentName: string;
  status: RunStatus;
}): JSX.Element {
  const isRunning = status === "running";
  const isWaiting = status === "waiting";

  return (
    <div className="flex flex-col items-center select-none" style={{ width: 160 }}>
      <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
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
          style={{ width: 96, height: 96 }}
        />

        {/* Mid ring — only visible when running */}
        {isRunning && (
          <div
            className="absolute rounded-full border-2 border-cyan-400 opacity-60 animate-[spin_2s_linear_infinite_reverse]"
            style={{ width: 72, height: 72 }}
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
          style={{ width: 50, height: 50 }}
        />

        {/* Core dot */}
        <div
          className={
            "relative z-10 rounded-full " +
            (isRunning
              ? "h-5 w-5 bg-sky-400 shadow-[0_0_16px_6px_rgba(56,189,248,0.6)] animate-pulse"
              : isWaiting
                ? "h-4 w-4 bg-amber-400 shadow-[0_0_10px_4px_rgba(251,191,36,0.5)]"
                : "h-4 w-4 bg-orange-400 shadow-[0_0_10px_4px_rgba(251,146,60,0.4)]")
          }
        />
      </div>

      {/* Agent name */}
      <div className="mt-2 max-w-full truncate text-center text-xs font-semibold text-stone-200">
        {agentName}
      </div>

      {/* Status label */}
      <div
        className={
          "mt-0.5 text-[10px] font-medium " +
          (isRunning
            ? "text-sky-400"
            : isWaiting
              ? "text-amber-400"
              : "text-stone-500")
        }
      >
        {isRunning ? "running" : isWaiting ? "waiting" : "idle"}
      </div>

      <div className="mt-3 text-[9px] text-stone-600">double-click → log</div>
    </div>
  );
}

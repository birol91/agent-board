import type { RunStatus } from "./store";

export function QuantumCore({
  agentName,
  status,
  size = 160,
}: {
  agentName: string;
  status: RunStatus;
  size?: number;
}): JSX.Element {
  const isRunning = status === "running";
  const isWaiting = status === "waiting";
  const r = size / 2;

  return (
    <div
      className="relative select-none"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="absolute inset-0 overflow-visible"
      >
        <defs>
          {/* Running — blue/cyan glow */}
          <radialGradient id="qc-core-run" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor="#7dd3fc" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>
          {/* Idle — orange/amber glow */}
          <radialGradient id="qc-core-idle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#fdba74" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f38020" stopOpacity="0" />
          </radialGradient>
          <filter id="qc-glow-run" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="qc-glow-idle" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="qc-glow-soft" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {isRunning ? (
          <>
            {/* Outermost slow ring */}
            <circle
              cx={r} cy={r} r={r * 0.9}
              fill="none" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.25"
              strokeDasharray="6 10"
              className="animate-[spin_8s_linear_infinite]"
              style={{ transformOrigin: `${r}px ${r}px` }}
            />
            {/* Outer ring spinning */}
            <circle
              cx={r} cy={r} r={r * 0.76}
              fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5"
              strokeDasharray="20 8"
              filter="url(#qc-glow-soft)"
              className="animate-[spin_4s_linear_infinite]"
              style={{ transformOrigin: `${r}px ${r}px` }}
            />
            {/* Mid ring reverse */}
            <circle
              cx={r} cy={r} r={r * 0.58}
              fill="none" stroke="#06b6d4" strokeWidth="2" strokeOpacity="0.7"
              strokeDasharray="14 6"
              filter="url(#qc-glow-soft)"
              className="animate-[spin_2.5s_linear_infinite_reverse]"
              style={{ transformOrigin: `${r}px ${r}px` }}
            />
            {/* Inner ring fast */}
            <circle
              cx={r} cy={r} r={r * 0.38}
              fill="none" stroke="#7dd3fc" strokeWidth="2.5" strokeOpacity="0.85"
              strokeDasharray="10 4"
              filter="url(#qc-glow-run)"
              className="animate-[spin_1.4s_linear_infinite]"
              style={{ transformOrigin: `${r}px ${r}px` }}
            />
            {/* Innermost tight ring */}
            <circle
              cx={r} cy={r} r={r * 0.22}
              fill="none" stroke="#bae6fd" strokeWidth="1.5" strokeOpacity="0.9"
              filter="url(#qc-glow-run)"
              className="animate-[spin_0.9s_linear_infinite_reverse]"
              style={{ transformOrigin: `${r}px ${r}px` }}
            />
            {/* Core glow blob */}
            <circle
              cx={r} cy={r} r={r * 0.18}
              fill="url(#qc-core-run)"
              filter="url(#qc-glow-run)"
              className="animate-pulse"
            />
          </>
        ) : (
          <>
            {/* Outermost faint ring */}
            <circle
              cx={r} cy={r} r={r * 0.88}
              fill="none" stroke="#f38020" strokeWidth="0.75" strokeOpacity="0.18"
              strokeDasharray="4 12"
              className="animate-[spin_12s_linear_infinite]"
              style={{ transformOrigin: `${r}px ${r}px` }}
            />
            {/* Outer pulsing ring */}
            <circle
              cx={r} cy={r} r={r * 0.72}
              fill="none" stroke="#fb923c" strokeWidth="1.5" strokeOpacity="0.4"
              strokeDasharray="16 8"
              filter="url(#qc-glow-soft)"
              className={isWaiting ? "animate-pulse" : "animate-[spin_6s_linear_infinite_reverse]"}
              style={{ transformOrigin: `${r}px ${r}px` }}
            />
            {/* Mid ring */}
            <circle
              cx={r} cy={r} r={r * 0.54}
              fill="none" stroke="#f97316" strokeWidth="2" strokeOpacity="0.55"
              strokeDasharray="10 6"
              filter="url(#qc-glow-idle)"
              className="animate-[spin_4s_linear_infinite]"
              style={{ transformOrigin: `${r}px ${r}px` }}
            />
            {/* Inner ring */}
            <circle
              cx={r} cy={r} r={r * 0.34}
              fill="none" stroke="#fdba74" strokeWidth="2" strokeOpacity="0.7"
              filter="url(#qc-glow-idle)"
              className="animate-[spin_2s_linear_infinite_reverse]"
              style={{ transformOrigin: `${r}px ${r}px` }}
            />
            {/* Core */}
            <circle
              cx={r} cy={r} r={r * 0.16}
              fill="url(#qc-core-idle)"
              filter="url(#qc-glow-idle)"
              className="animate-pulse"
            />
          </>
        )}
      </svg>

      {/* Agent name — below the core */}
      <div
        className="absolute left-0 right-0 text-center text-[11px] font-semibold tracking-wide"
        style={{ top: size + 4 }}
      >
        <span
          className={
            isRunning
              ? "text-sky-300 drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]"
              : isWaiting
                ? "text-amber-300"
                : "text-orange-300 drop-shadow-[0_0_4px_rgba(251,146,60,0.6)]"
          }
        >
          {agentName}
        </span>
      </div>
    </div>
  );
}

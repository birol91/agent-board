import type { RunStatus } from "./store";

// Outer ring ratio — must match the value used in computeRoute for line attachment
export const QUANTUM_OUTER_R_RATIO = 0.88;

export function QuantumCore({
  status,
  size = 160,
}: {
  agentName: string; // kept in props so callers don't change signature
  status: RunStatus;
  size?: number;
}): JSX.Element {
  const isRunning = status === "running";
  const r = size / 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="select-none overflow-visible"
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="qc-core-run" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1" />
          <stop offset="25%"  stopColor="#bae6fd" stopOpacity="0.95" />
          <stop offset="60%"  stopColor="#0ea5e9" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="qc-core-idle" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1" />
          <stop offset="20%"  stopColor="#fde68a" stopOpacity="0.95" />
          <stop offset="55%"  stopColor="#f97316" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </radialGradient>

        {/* Strong glow for core */}
        <filter id="qc-glow-strong" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="8" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b2" />
          <feMerge><feMergeNode in="b1" /><feMergeNode in="b2" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Medium glow for rings */}
        <filter id="qc-glow-ring" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Soft glow for outer rings */}
        <filter id="qc-glow-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {isRunning ? (
        <>
          {/* Ring 5 — outermost, very faint, slow */}
          <circle cx={r} cy={r} r={r * 0.88}
            fill="none" stroke="#67e8f9" strokeWidth="1" strokeOpacity="0.2"
            strokeDasharray="8 14"
            className="animate-[spin_10s_linear_infinite]"
            style={{ transformOrigin: `${r}px ${r}px` }}
          />
          {/* Ring 4 */}
          <circle cx={r} cy={r} r={r * 0.74}
            fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeOpacity="0.4"
            strokeDasharray="22 10"
            filter="url(#qc-glow-soft)"
            className="animate-[spin_5s_linear_infinite_reverse]"
            style={{ transformOrigin: `${r}px ${r}px` }}
          />
          {/* Ring 3 */}
          <circle cx={r} cy={r} r={r * 0.58}
            fill="none" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.6"
            strokeDasharray="16 7"
            filter="url(#qc-glow-ring)"
            className="animate-[spin_3s_linear_infinite]"
            style={{ transformOrigin: `${r}px ${r}px` }}
          />
          {/* Ring 2 */}
          <circle cx={r} cy={r} r={r * 0.42}
            fill="none" stroke="#7dd3fc" strokeWidth="2.5" strokeOpacity="0.8"
            strokeDasharray="12 5"
            filter="url(#qc-glow-ring)"
            className="animate-[spin_1.8s_linear_infinite_reverse]"
            style={{ transformOrigin: `${r}px ${r}px` }}
          />
          {/* Ring 1 — innermost */}
          <circle cx={r} cy={r} r={r * 0.26}
            fill="none" stroke="#bae6fd" strokeWidth="2" strokeOpacity="0.9"
            filter="url(#qc-glow-ring)"
            className="animate-[spin_1s_linear_infinite]"
            style={{ transformOrigin: `${r}px ${r}px` }}
          />
          {/* Core blob */}
          <circle cx={r} cy={r} r={r * 0.15}
            fill="url(#qc-core-run)"
            filter="url(#qc-glow-strong)"
            className="animate-pulse"
          />
        </>
      ) : (
        <>
          {/* Ring 5 — outermost. Matches QUANTUM_OUTER_R_RATIO */}
          <circle cx={r} cy={r} r={r * 0.88}
            fill="none" stroke="#c2410c" strokeWidth="1" strokeOpacity="0.3"
            strokeDasharray="100 0"
            filter="url(#qc-glow-soft)"
            className="animate-[spin_14s_linear_infinite]"
            style={{ transformOrigin: `${r}px ${r}px` }}
          />
          {/* Ring 4 */}
          <circle cx={r} cy={r} r={r * 0.73}
            fill="none" stroke="#ea580c" strokeWidth="1.5" strokeOpacity="0.45"
            strokeDasharray="100 0"
            filter="url(#qc-glow-soft)"
            className="animate-[spin_10s_linear_infinite_reverse]"
            style={{ transformOrigin: `${r}px ${r}px` }}
          />
          {/* Ring 3 */}
          <circle cx={r} cy={r} r={r * 0.57}
            fill="none" stroke="#f97316" strokeWidth="2" strokeOpacity="0.6"
            strokeDasharray="100 0"
            filter="url(#qc-glow-ring)"
            className="animate-[spin_6s_linear_infinite]"
            style={{ transformOrigin: `${r}px ${r}px` }}
          />
          {/* Ring 2 */}
          <circle cx={r} cy={r} r={r * 0.40}
            fill="none" stroke="#fb923c" strokeWidth="2" strokeOpacity="0.75"
            strokeDasharray="100 0"
            filter="url(#qc-glow-ring)"
            className="animate-[spin_3.5s_linear_infinite_reverse]"
            style={{ transformOrigin: `${r}px ${r}px` }}
          />
          {/* Ring 1 — innermost */}
          <circle cx={r} cy={r} r={r * 0.24}
            fill="none" stroke="#fdba74" strokeWidth="2" strokeOpacity="0.85"
            strokeDasharray="100 0"
            filter="url(#qc-glow-ring)"
            className="animate-[spin_2s_linear_infinite]"
            style={{ transformOrigin: `${r}px ${r}px` }}
          />
          {/* Core blob */}
          <circle cx={r} cy={r} r={r * 0.14}
            fill="url(#qc-core-idle)"
            filter="url(#qc-glow-strong)"
            className="animate-pulse"
          />
        </>
      )}
    </svg>
  );
}

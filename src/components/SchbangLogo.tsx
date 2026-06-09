/**
 * Schbang Pulse wordmark — the "Schbang" wordmark with a live ECG/heartbeat trace
 * woven through it: a faint baseline, a glowing blip that races along the line, and
 * a subtle heart-rhythm thump on the graph. "Pulse" sits alongside in accent green.
 * Respects prefers-reduced-motion (see globals.css).
 */

// ECG waveform across a normalized 0–100 width box (baseline ~ mid, one QRS spike).
const ECG = "M0 27 H34 L39 27 L44 16 L49 40 L54 7 L59 27 L65 27 H100";

export function SchbangLogo({
  fontSize = 22,
  className = "",
  showPulse = true,
}: {
  fontSize?: number;
  className?: string;
  showPulse?: boolean;
}) {
  return (
    <span
      className={`relative inline-flex items-baseline gap-2 select-none leading-none ${className}`}
      aria-label="Schbang Pulse"
    >
      <span className="relative inline-block" style={{ fontSize, lineHeight: 1 }}>
        <span className="font-extrabold tracking-tight text-fg">Schbang</span>

        {/* ECG trace woven through the wordmark */}
        <svg
          className="pulse-beat pointer-events-none absolute left-0 overflow-visible"
          style={{ top: "6%", height: "94%", width: "100%" }}
          viewBox="0 0 100 48"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden
        >
          {/* faint full baseline */}
          <path
            d={ECG}
            stroke="#22c55e"
            strokeOpacity="0.2"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* bright blip travelling along the line */}
          <path
            className="ecg-trace"
            d={ECG}
            pathLength={100}
            stroke="#22c55e"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 0 3px rgba(34,197,94,0.85))" }}
          />
        </svg>
      </span>

      {showPulse && (
        <span className="font-semibold text-up" style={{ fontSize: fontSize * 0.82 }}>
          Pulse
        </span>
      )}
    </span>
  );
}

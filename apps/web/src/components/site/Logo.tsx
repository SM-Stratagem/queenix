/** Queenix mark (dumbbell + H, redrawn from assets/logo) with the wordmark. */
export function Mark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={(size * 487) / 830}
      viewBox="-25 -25 880 537"
      fill="none"
      stroke="currentColor"
      strokeWidth={50}
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M25 130V358M156 50V437M674 50V437M805 130V358" strokeLinecap="round" />
      <path d="M293 0V175H540V0M293 487V309H540V487" />
    </svg>
  );
}

export function Logo({ tone = 'ink' }: { tone?: 'ink' | 'white' }) {
  return (
    <span className={`logo logo--${tone}`}>
      <Mark className="logo-mark" />
      <span className="logo-word">
        Queenix<span className="logo-sub">Fitness Center</span>
      </span>
    </span>
  );
}

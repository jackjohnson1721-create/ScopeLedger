/**
 * Atmospheric layered SVG cloudscape used on the landing hero and auth pages.
 * Pure SVG so it ships in the initial HTML and animates without hydration.
 */
export function Cloudscape({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 600"
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e3f2fd" />
          <stop offset="60%" stopColor="#fff9c4" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffccbc" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="soft" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="600" fill="url(#sky)" />
      <g className="animate-drift" opacity="0.7">
        <ellipse cx="220" cy="180" rx="260" ry="60" fill="url(#soft)" />
        <ellipse cx="560" cy="140" rx="200" ry="46" fill="url(#soft)" />
        <ellipse cx="980" cy="200" rx="300" ry="70" fill="url(#soft)" />
      </g>
      <g opacity="0.55">
        <ellipse cx="320" cy="360" rx="320" ry="80" fill="url(#soft)" />
        <ellipse cx="880" cy="400" rx="380" ry="90" fill="url(#soft)" />
        <ellipse cx="1280" cy="340" rx="240" ry="60" fill="url(#soft)" />
      </g>
    </svg>
  );
}

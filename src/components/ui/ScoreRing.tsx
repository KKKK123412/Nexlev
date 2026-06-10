'use client';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
}

export function ScoreRing({
  score,
  size = 56,
  strokeWidth = 4,
  label,
  color = '#00ff87',
}: ScoreRingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  const getColor = () => {
    if (score >= 75) return '#00ff87';
    if (score >= 50) return '#ffb800';
    if (score >= 30) return '#4fc3f7';
    return '#484f58';
  };

  const c = color === '#00ff87' ? getColor() : color;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#161b22"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={c}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px`, fill: c, fontFamily: 'JetBrains Mono, monospace', fontSize: size * 0.25, fontWeight: 600 }}
        >
          {score}
        </text>
      </svg>
      {label && (
        <span className="text-[10px] font-mono text-void-400 uppercase tracking-widest">{label}</span>
      )}
    </div>
  );
}

'use client';

interface ScoreBarProps {
  score: number;
  label: string;
  showValue?: boolean;
}

export function ScoreBar({ score, label, showValue = true }: ScoreBarProps) {
  const getColor = () => {
    if (score >= 75) return 'bg-signal';
    if (score >= 50) return 'bg-amber-signal';
    if (score >= 30) return 'bg-blue-signal';
    return 'bg-void-500';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-void-400 uppercase tracking-wider w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-void-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full score-bar ${getColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {showValue && (
        <span className="text-[10px] font-mono text-void-400 w-7 text-right">{score}</span>
      )}
    </div>
  );
}

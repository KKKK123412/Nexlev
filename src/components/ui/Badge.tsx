import { clsx } from 'clsx';

type BadgeVariant = 'breakout' | 'gem' | 'faceless' | 'signal' | 'dim' | 'amber' | 'rose' | 'blue';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  breakout: 'bg-signal-muted text-signal border border-signal/30',
  gem:      'bg-blue-muted text-blue-signal border border-blue-signal/30',
  faceless: 'bg-amber-muted text-amber-signal border border-amber-signal/30',
  signal:   'bg-signal-muted text-signal border border-signal/30',
  dim:      'bg-void-700 text-void-400 border border-void-600',
  amber:    'bg-amber-muted text-amber-signal border border-amber-signal/30',
  rose:     'bg-rose-muted text-rose-signal border border-rose-signal/30',
  blue:     'bg-blue-muted text-blue-signal border border-blue-signal/30',
};

export function Badge({ variant = 'dim', children, className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}

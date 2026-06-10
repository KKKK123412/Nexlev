'use client';

import Image from 'next/image';
import { ExternalLink, TrendingUp, Sparkles, Eye } from 'lucide-react';
import { ChannelAnalysis } from '@/types';
import { ScoreRing } from './ScoreRing';
import { ScoreBar } from './ScoreBar';
import { Badge } from './Badge';
import { fmtNum, fmtAge } from '@/lib/scoring';

interface ChannelCardProps {
  channel: ChannelAnalysis;
  primaryScore?: 'breakout' | 'gem' | 'opportunity' | 'faceless';
  showCloneReason?: boolean;
}

export function ChannelCard({
  channel,
  primaryScore = 'opportunity',
  showCloneReason = false,
}: ChannelCardProps) {
  const { metrics: m, scores: s, signals, isBreakout, isHiddenGem, isFaceless, cloneReason } = channel;

  const scoreMap = {
    breakout: s.breakoutScore,
    gem: s.hiddenGemScore,
    opportunity: s.opportunityScore,
    faceless: s.facelessScore,
  };

  const score = scoreMap[primaryScore];

  const channelUrl = m.customUrl
    ? `https://youtube.com/@${m.customUrl.replace('@', '')}`
    : `https://youtube.com/channel/${m.channelId}`;

  return (
    <div className="bg-void-800 border border-void-700 rounded-lg p-4 hover:border-void-500 transition-colors group">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Thumbnail */}
        <div className="relative shrink-0">
          {m.thumbnail ? (
            <img
              src={m.thumbnail}
              alt={m.title}
              width={48}
              height={48}
              className="rounded-full w-12 h-12 object-cover border border-void-600"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-void-700 border border-void-600 flex items-center justify-center text-void-400 font-mono text-lg">
              {m.title[0]?.toUpperCase()}
            </div>
          )}
          {isBreakout && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-signal rounded-full flex items-center justify-center">
              <TrendingUp size={9} className="text-void-950" />
            </div>
          )}
        </div>

        {/* Title and meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-semibold text-sm text-white truncate">{m.title}</h3>
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-void-500 hover:text-signal transition-colors opacity-0 group-hover:opacity-100"
            >
              <ExternalLink size={11} />
            </a>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-void-400">
            <span>{fmtNum(m.subscribers)} subs</span>
            <span className="text-void-600">·</span>
            <span>{m.uploadCount} uploads</span>
            <span className="text-void-600">·</span>
            <span>{fmtAge(m.channelAgeMonths)}</span>
          </div>
        </div>

        {/* Primary score ring */}
        <ScoreRing score={score} size={52} />
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-void-900 rounded border border-void-700">
        <MetricCell label="Views/Upload" value={fmtNum(Math.round(m.viewsPerUpload))} />
        <MetricCell label="Monthly Subs" value={`+${fmtNum(Math.round(m.estimatedMonthlySubGrowth))}`} />
        <MetricCell label="Total Views" value={fmtNum(m.totalViews)} />
      </div>

      {/* Score bars */}
      <div className="space-y-1.5 mb-3">
        <ScoreBar score={s.breakoutScore} label="Breakout" />
        <ScoreBar score={s.hiddenGemScore} label="Gem" />
        <ScoreBar score={s.facelessScore} label="Faceless" />
        <ScoreBar score={s.momentumScore} label="Momentum" />
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        {isBreakout && <Badge variant="breakout">🚀 Breakout</Badge>}
        {isHiddenGem && <Badge variant="gem">💎 Hidden Gem</Badge>}
        {isFaceless && <Badge variant="faceless">🎭 Faceless</Badge>}
        {m.channelAgeMonths <= 6 && <Badge variant="signal">New</Badge>}
        {m.uploadCount <= 10 && <Badge variant="amber">Early Stage</Badge>}
        {m.country && <Badge variant="dim">{m.country}</Badge>}
      </div>

      {/* Signals */}
      {signals.length > 0 && (
        <div className="space-y-0.5">
          {signals.slice(0, 3).map((sig, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-void-400">
              <span className="text-signal mt-0.5 shrink-0">›</span>
              <span>{sig}</span>
            </div>
          ))}
        </div>
      )}

      {/* Clone reason */}
      {showCloneReason && cloneReason && (
        <div className="mt-2 p-2 bg-signal-faint border border-signal/20 rounded text-[11px] text-signal">
          <Sparkles size={10} className="inline mr-1" />
          {cloneReason}
        </div>
      )}
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[11px] font-mono font-semibold text-white">{value}</div>
      <div className="text-[9px] font-mono text-void-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

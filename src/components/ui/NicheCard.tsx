'use client';

import { NicheScore } from '@/types';
import { ScoreRing } from './ScoreRing';
import { Badge } from './Badge';
import { fmtNum } from '@/lib/scoring';

export function NicheCard({ niche }: { niche: NicheScore }) {
  const compColor: Record<string, 'signal' | 'amber' | 'rose' | 'dim'> = {
    low: 'signal',
    medium: 'amber',
    high: 'rose',
    saturated: 'rose',
  };

  const demandColor: Record<string, 'signal' | 'amber' | 'blue' | 'dim'> = {
    emerging: 'blue',
    growing: 'signal',
    peak: 'amber',
    declining: 'dim',
  };

  return (
    <div className="bg-void-800 border border-void-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white capitalize">{niche.niche}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={compColor[niche.competitionLevel]}>
              {niche.competitionLevel} competition
            </Badge>
            <Badge variant={demandColor[niche.demandLevel]}>
              {niche.demandLevel} demand
            </Badge>
          </div>
        </div>
        <ScoreRing score={niche.opportunityScore} size={56} label="Opportunity" />
      </div>

      <div className="grid grid-cols-3 gap-2 p-2 bg-void-900 rounded border border-void-700 mb-3 text-center">
        <div>
          <div className="text-[11px] font-mono font-semibold text-white">{niche.topChannels}</div>
          <div className="text-[9px] font-mono text-void-500 uppercase tracking-wider">Channels</div>
        </div>
        <div>
          <div className="text-[11px] font-mono font-semibold text-signal">{niche.breakoutChannels}</div>
          <div className="text-[9px] font-mono text-void-500 uppercase tracking-wider">Breakouts</div>
        </div>
        <div>
          <div className="text-[11px] font-mono font-semibold text-blue-signal">{niche.hiddenGems}</div>
          <div className="text-[9px] font-mono text-void-500 uppercase tracking-wider">Gems</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-3">
        <div>
          <span className="text-void-500">Avg Subs: </span>
          <span className="text-white">{fmtNum(niche.avgSubscribers)}</span>
        </div>
        <div>
          <span className="text-void-500">Avg Age: </span>
          <span className="text-white">{niche.avgChannelAge}mo</span>
        </div>
        <div>
          <span className="text-void-500">Views/Upload: </span>
          <span className="text-white">{fmtNum(niche.avgViewsPerUpload)}</span>
        </div>
      </div>

      <p className="text-[11px] text-void-400 leading-relaxed">{niche.summary}</p>
    </div>
  );
}

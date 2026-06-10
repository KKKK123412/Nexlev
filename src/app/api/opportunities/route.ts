import { NextRequest, NextResponse } from 'next/server';
import { multiQueryChannelSearch, getChannelsByIds } from '@/lib/youtube/client';
import { analyzeChannel } from '@/lib/scoring';
import { cache, TTL } from '@/lib/cache';

const FACELESS_NICHES = [
  'animated history',
  'ai narration documentary',
  'explainer animation',
  'motion graphics educational',
];

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || 'opportunities'; // opportunities | faceless

  const ck = `api:${type}`;
  const cached = cache.get(ck);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  try {
    let totalQuota = 0;
    const queries = type === 'faceless' ? FACELESS_NICHES.slice(0, 2) : [
      'educational explainer channel',
      'documentary narration channel',
    ];

    const { channelIds, quotaCost: searchCost } = await multiQueryChannelSearch(queries, 8);
    totalQuota += searchCost;

    const { channels: rawChannels, quotaCost: fetchCost } = await getChannelsByIds(channelIds);
    totalQuota += fetchCost;

    const analyzed = rawChannels.map(analyzeChannel);

    let result;
    if (type === 'faceless') {
      const faceless = analyzed
        .filter((c) => c.scores.facelessScore >= 40)
        .sort((a, b) => b.scores.facelessScore - a.scores.facelessScore);

      result = {
        facelessChannels: faceless.slice(0, 20),
        totalScanned: analyzed.length,
        cached: false,
        quotaUsed: totalQuota,
      };
    } else {
      const opportunities = analyzed
        .sort((a, b) => b.scores.opportunityScore - a.scores.opportunityScore);

      result = {
        topOpportunities: opportunities.slice(0, 20),
        totalScanned: analyzed.length,
        cached: false,
        quotaUsed: totalQuota,
      };
    }

    cache.set(ck, result, TTL.NICHE, totalQuota);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[API /opportunities]', err);
    const message = err instanceof Error ? err.message : 'Opportunities fetch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

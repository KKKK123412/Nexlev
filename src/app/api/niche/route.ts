import { NextRequest, NextResponse } from 'next/server';
import { multiQueryChannelSearch, getChannelsByIds } from '@/lib/youtube/client';
import { analyzeChannel, scoreNiche } from '@/lib/scoring';
import { cache, cacheKey, TTL } from '@/lib/cache';

// Expand a single keyword into multiple related search queries
function expandNicheQueries(keyword: string): string[] {
  const k = keyword.toLowerCase();
  return [
    keyword,
    `${keyword} channel`,
    `${keyword} explained`,
  ].slice(0, 3); // max 3 searches to save quota
}

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('q')?.trim();
  if (!keyword) {
    return NextResponse.json({ error: 'Parameter "q" is required' }, { status: 400 });
  }

  const ck = cacheKey.niche(keyword);
  const cached = cache.get(ck);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  try {
    const queries = expandNicheQueries(keyword);
    const { channelIds, quotaCost: searchCost } = await multiQueryChannelSearch(queries, 8);

    let totalQuota = searchCost;

    const { channels: rawChannels, quotaCost: fetchCost } = await getChannelsByIds(channelIds);
    totalQuota += fetchCost;

    const analyzed = rawChannels.map(analyzeChannel);
    const niche = scoreNiche(keyword, analyzed);

    // Sort channels for different views
    const breakout = [...analyzed]
      .filter((c) => c.isBreakout)
      .sort((a, b) => b.scores.breakoutScore - a.scores.breakoutScore);

    const gems = [...analyzed]
      .filter((c) => c.isHiddenGem)
      .sort((a, b) => b.scores.hiddenGemScore - a.scores.hiddenGemScore);

    const fastest = [...analyzed]
      .sort((a, b) => b.scores.momentumScore - a.scores.momentumScore);

    const response = {
      niche,
      allChannels: analyzed,
      breakoutChannels: breakout,
      hiddenGems: gems,
      fastestGrowing: fastest.slice(0, 6),
      cached: false,
      quotaUsed: totalQuota,
    };

    cache.set(ck, response, TTL.NICHE, totalQuota);
    return NextResponse.json(response);
  } catch (err) {
    console.error('[API /niche]', err);
    const message = err instanceof Error ? err.message : 'Niche discovery failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

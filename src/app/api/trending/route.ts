import { NextRequest, NextResponse } from 'next/server';
import { searchVideos, getChannelsByIds, extractChannelIdsFromSearchResults } from '@/lib/youtube/client';
import { analyzeChannel, scoreNiche } from '@/lib/scoring';
import { cache, cacheKey, TTL } from '@/lib/cache';
import { TrendingResponse } from '@/types';

const TRENDING_TOPICS = [
  'AI explained',
  'productivity tips',
  'stoicism',
  'ancient history',
  'dark psychology',
  'money mindset',
  'minimalism',
  'space exploration',
];

export async function GET(_req: NextRequest) {
  const ck = cacheKey.trending();
  const cached = cache.get<TrendingResponse>(ck);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  try {
    let totalQuota = 0;
    const allChannelIds = new Set<string>();
    const nicheResults: Record<string, ReturnType<typeof analyzeChannel>[]> = {};

    // Run 2 searches to stay within budget
    for (const topic of TRENDING_TOPICS.slice(0, 2)) {
      try {
        const { items, quotaCost } = await searchVideos(topic, 10, 'viewCount');
        totalQuota += quotaCost;
        const ids = extractChannelIdsFromSearchResults(items);
        nicheResults[topic] = [];
        for (const id of ids) allChannelIds.add(id);
      } catch { /* skip */ }
    }

    const { channels: rawChannels, quotaCost: fetchCost } = await getChannelsByIds([...allChannelIds]);
    totalQuota += fetchCost;

    const channelMap = new Map(rawChannels.map((c) => [c.id, analyzeChannel(c)]));

    // Score niches
    const emergingNiches = Object.entries(nicheResults).map(([topic]) => {
      const relevant = rawChannels
        .filter(() => true) // all channels from this batch
        .map((c) => channelMap.get(c.id)!)
        .filter(Boolean);
      return scoreNiche(topic, relevant);
    });

    const allAnalyzed = [...channelMap.values()];
    const breakoutChannels = allAnalyzed
      .filter((c) => c.isBreakout)
      .sort((a, b) => b.scores.breakoutScore - a.scores.breakoutScore)
      .slice(0, 15);

    const response: TrendingResponse = {
      breakoutChannels,
      emergingNiches,
      cached: false,
      quotaUsed: totalQuota,
    };

    cache.set(ck, response, TTL.TRENDING, totalQuota);
    return NextResponse.json(response);
  } catch (err) {
    console.error('[API /trending]', err);
    const message = err instanceof Error ? err.message : 'Trending fetch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

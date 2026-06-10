import { NextRequest, NextResponse } from 'next/server';
import { searchVideos, getChannelsByIds, extractChannelIdsFromSearchResults } from '@/lib/youtube/client';
import { analyzeChannel } from '@/lib/scoring';
import { cache, cacheKey, TTL } from '@/lib/cache';

// Niches to scan for breakout channels
const BREAKOUT_NICHES = [
  'history documentary',
  'AI stories explained',
  'psychology facts',
  'space documentary',
  'ancient civilizations',
  'true crime documentary',
  'business explained',
  'science explained',
];

export async function GET(req: NextRequest) {
  const niche = req.nextUrl.searchParams.get('niche')?.trim();

  const ck = niche ? cacheKey.search(`breakout:${niche}`) : cacheKey.breakout();
  const cached = cache.get(ck);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  try {
    let totalQuota = 0;
    const allChannelIds = new Set<string>();

    const queriesToRun = niche ? [niche, `${niche} channel`] : BREAKOUT_NICHES.slice(0, 2);

    for (const query of queriesToRun) {
      try {
        // Search recent videos to find channels actively posting
        const { items, quotaCost } = await searchVideos(query, 10, 'date');
        totalQuota += quotaCost;
        for (const id of extractChannelIdsFromSearchResults(items)) {
          allChannelIds.add(id);
        }
      } catch { /* skip */ }
    }

    const { channels: rawChannels, quotaCost: fetchCost } = await getChannelsByIds([...allChannelIds]);
    totalQuota += fetchCost;

    const analyzed = rawChannels.map(analyzeChannel);

    // True breakout criteria: score > 55 AND few uploads AND young
    const breakout = analyzed
      .filter((c) =>
        c.scores.breakoutScore >= 55 &&
        c.metrics.uploadCount <= 30 &&
        c.metrics.channelAgeMonths <= 18
      )
      .sort((a, b) => b.scores.breakoutScore - a.scores.breakoutScore);

    // Honorable mentions
    const rising = analyzed
      .filter((c) => !breakout.includes(c) && c.scores.breakoutScore >= 40)
      .sort((a, b) => b.scores.breakoutScore - a.scores.breakoutScore)
      .slice(0, 10);

    const response = {
      breakoutChannels: breakout.slice(0, 20),
      risingChannels: rising,
      totalScanned: analyzed.length,
      cached: false,
      quotaUsed: totalQuota,
    };

    cache.set(ck, response, TTL.TRENDING, totalQuota);
    return NextResponse.json(response);
  } catch (err) {
    console.error('[API /breakout]', err);
    const message = err instanceof Error ? err.message : 'Breakout detection failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

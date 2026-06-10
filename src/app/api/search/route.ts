import { NextRequest, NextResponse } from 'next/server';
import { searchChannels, getChannelsByIds, extractChannelIdsFromSearchResults } from '@/lib/youtube/client';
import { analyzeChannel, scoreNiche } from '@/lib/scoring';
import { cache, cacheKey, TTL } from '@/lib/cache';
import { SearchResponse } from '@/types';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim();
  const maxResults = Math.min(parseInt(req.nextUrl.searchParams.get('max') || '10'), 25);

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  // Check cache first
  const ck = cacheKey.search(query);
  const cached = cache.get<SearchResponse>(ck);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  try {
    let totalQuotaUsed = 0;

    // Step 1: Search for channels (100 units)
    const { items: searchResults, quotaCost: searchCost } = await searchChannels(query, maxResults);
    totalQuotaUsed += searchCost;

    if (!searchResults.length) {
      return NextResponse.json({
        channels: [],
        query,
        totalFound: 0,
        cached: false,
        quotaUsed: totalQuotaUsed,
      } satisfies SearchResponse);
    }

    // Step 2: Get full channel details (1 unit per batch of 50)
    const channelIds = extractChannelIdsFromSearchResults(searchResults);
    const { channels: rawChannels, quotaCost: fetchCost } = await getChannelsByIds(channelIds);
    totalQuotaUsed += fetchCost;

    // Step 3: Analyze every channel
    const analyzed = rawChannels
      .map(analyzeChannel)
      .sort((a, b) => b.scores.opportunityScore - a.scores.opportunityScore);

    // Step 4: Score the niche
    const nicheScore = scoreNiche(query, analyzed);

    const response: SearchResponse = {
      channels: analyzed,
      query,
      totalFound: analyzed.length,
      nicheScore,
      cached: false,
      quotaUsed: totalQuotaUsed,
    };

    cache.set(ck, response, TTL.SEARCH, totalQuotaUsed);

    return NextResponse.json(response);
  } catch (err) {
    console.error('[API /search]', err);
    const message = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getChannelByUrl, searchChannels, getChannelsByIds, extractChannelIdsFromSearchResults } from '@/lib/youtube/client';
import { analyzeChannel, calcCloneReason } from '@/lib/scoring';
import { cache, cacheKey, TTL } from '@/lib/cache';
import { CloneOpportunity, CloneResponse } from '@/types';

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url')?.trim();
  if (!urlParam) {
    return NextResponse.json({ error: 'Parameter "url" is required' }, { status: 400 });
  }

  const ck = cacheKey.clone(urlParam);
  const cached = cache.get<CloneResponse>(ck);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  try {
    let totalQuota = 0;

    // Step 1: Resolve source channel
    const { channel: sourceRaw, quotaCost: sourceCost } = await getChannelByUrl(urlParam);
    totalQuota += sourceCost;

    if (!sourceRaw) {
      return NextResponse.json({ error: 'Source channel not found. Try the full YouTube channel URL.' }, { status: 404 });
    }

    const sourceChannel = analyzeChannel(sourceRaw);

    // Step 2: Build search queries from channel's niche
    const channelTitle = sourceChannel.metrics.title;
    const desc = sourceChannel.metrics.description.slice(0, 200);

    // Extract topic signals from title/description
    const topicWords = [...channelTitle.split(/\s+/), ...desc.split(/\s+/)]
      .filter((w) => w.length > 4)
      .slice(0, 5);

    const searchQueries = [
      channelTitle,
      topicWords.slice(0, 3).join(' '),
    ].filter(Boolean).slice(0, 2); // 2 searches = 200 quota units

    const allRelatedIds = new Set<string>();
    for (const q of searchQueries) {
      try {
        const { items } = await searchChannels(q, 8);
        totalQuota += 100;
        for (const id of extractChannelIdsFromSearchResults(items)) {
          allRelatedIds.add(id);
        }
      } catch { /* skip failed searches */ }
    }

    // Remove source channel
    allRelatedIds.delete(sourceRaw.id);

    const { channels: relatedRaw, quotaCost: fetchCost } = await getChannelsByIds(Array.from(allRelatedIds));
    totalQuota += fetchCost;

    const relatedAnalyzed = relatedRaw.map(analyzeChannel);

    // Categorize
    const cloneOpportunities: CloneOpportunity[] = relatedAnalyzed
      .filter((c) => c.metrics.channelId !== sourceRaw.id)
      .map((candidate) => {
        const { type, reason, competitionGap, growthAdvantage } = calcCloneReason(sourceChannel, candidate);
        return {
          channel: candidate,
          opportunityType: type,
          whyOpportunity: reason,
          competitionGap,
          growthAdvantage,
        };
      })
      .sort((a, b) => b.channel.scores.opportunityScore - a.channel.scores.opportunityScore);

    const fasterGrowing = relatedAnalyzed
      .filter((c) => c.metrics.estimatedMonthlySubGrowth > sourceChannel.metrics.estimatedMonthlySubGrowth)
      .sort((a, b) => b.metrics.estimatedMonthlySubGrowth - a.metrics.estimatedMonthlySubGrowth);

    const hiddenAlternatives = relatedAnalyzed
      .filter((c) => c.isHiddenGem)
      .sort((a, b) => b.scores.hiddenGemScore - a.scores.hiddenGemScore);

    const response: CloneResponse = {
      sourceChannel,
      relatedChannels: relatedAnalyzed.slice(0, 10),
      fasterGrowing: fasterGrowing.slice(0, 5),
      hiddenAlternatives: hiddenAlternatives.slice(0, 5),
      cloneOpportunities: cloneOpportunities.slice(0, 8),
      cached: false,
      quotaUsed: totalQuota,
    };

    cache.set(ck, response, TTL.CLONE, totalQuota);
    return NextResponse.json(response);
  } catch (err) {
    console.error('[API /clone]', err);
    const message = err instanceof Error ? err.message : 'Clone analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

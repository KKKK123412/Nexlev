import { NextRequest, NextResponse } from 'next/server';
import { getChannelByUrl, getChannelsByIds } from '@/lib/youtube/client';
import { analyzeChannel } from '@/lib/scoring';
import { cache, cacheKey, TTL } from '@/lib/cache';
import { ChannelAnalysis } from '@/types';

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url')?.trim();
  const idParam = req.nextUrl.searchParams.get('id')?.trim();

  if (!urlParam && !idParam) {
    return NextResponse.json({ error: 'Parameter "url" or "id" is required' }, { status: 400 });
  }

  const lookup = urlParam || idParam!;

  // Check cache
  const ck = cacheKey.channel(lookup);
  const cached = cache.get<{ channel: ChannelAnalysis; quotaUsed: number }>(ck);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  try {
    let rawChannel = null;
    let quotaUsed = 0;

    if (idParam && idParam.startsWith('UC')) {
      const { channels, quotaCost } = await getChannelsByIds([idParam]);
      rawChannel = channels[0] || null;
      quotaUsed = quotaCost;
    } else {
      const { channel, quotaCost } = await getChannelByUrl(lookup);
      rawChannel = channel;
      quotaUsed = quotaCost;
    }

    if (!rawChannel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const channel = analyzeChannel(rawChannel);
    const response = { channel, cached: false, quotaUsed };

    cache.set(ck, { channel, quotaUsed }, TTL.CHANNEL, quotaUsed);

    return NextResponse.json(response);
  } catch (err) {
    console.error('[API /channel]', err);
    const message = err instanceof Error ? err.message : 'Channel fetch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

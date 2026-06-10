/**
 * YouTube Data API v3 Client
 * 
 * Quota costs per operation (daily limit: 10,000 units):
 *   search.list          → 100 units per call
 *   channels.list        → 1 unit per call
 *   videos.list          → 1 unit per call
 *   playlistItems.list   → 1 unit per call
 * 
 * Strategy: search sparingly, enrich with channels.list (cheap).
 */

import { YTChannel, YTVideo, YTSearchResult } from '@/types';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// In-memory quota tracker (resets daily)
let dailyQuotaUsed = 0;
let quotaResetDate = new Date().toDateString();

function checkQuotaReset() {
  const today = new Date().toDateString();
  if (today !== quotaResetDate) {
    dailyQuotaUsed = 0;
    quotaResetDate = today;
  }
}

function trackQuota(units: number) {
  checkQuotaReset();
  dailyQuotaUsed += units;
  console.log(`[YT Quota] Used: ${dailyQuotaUsed}/10000 (+${units})`);
}

export function getQuotaStatus() {
  checkQuotaReset();
  return {
    used: dailyQuotaUsed,
    limit: 10000,
    remaining: 10000 - dailyQuotaUsed,
    resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
  };
}

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY environment variable is not set');
  return key;
}

async function ytFetch<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set('key', getApiKey());
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 0 }, // We handle caching ourselves
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = error?.error?.message || res.statusText;
    throw new Error(`YouTube API error (${res.status}): ${msg}`);
  }

  return res.json();
}

// ─── Search channels by keyword (costs 100 units each) ────────────────────

export async function searchChannels(
  query: string,
  maxResults = 10
): Promise<{ items: YTSearchResult[]; quotaCost: number }> {
  const data = await ytFetch<{ items: YTSearchResult[] }>('search', {
    part: 'snippet',
    type: 'channel',
    q: query,
    maxResults: String(Math.min(maxResults, 50)),
    order: 'relevance',
  });
  trackQuota(100);
  return { items: data.items || [], quotaCost: 100 };
}

// ─── Search videos by keyword (costs 100 units) ──────────────────────────

export async function searchVideos(
  query: string,
  maxResults = 10,
  order: 'date' | 'viewCount' | 'relevance' | 'rating' = 'date'
): Promise<{ items: YTSearchResult[]; quotaCost: number }> {
  const data = await ytFetch<{ items: YTSearchResult[] }>('search', {
    part: 'snippet',
    type: 'video',
    q: query,
    maxResults: String(Math.min(maxResults, 50)),
    order,
    publishedAfter: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  });
  trackQuota(100);
  return { items: data.items || [], quotaCost: 100 };
}

// ─── Get channel details by IDs (costs 1 unit per call, up to 50 IDs) ─────

export async function getChannelsByIds(
  channelIds: string[]
): Promise<{ channels: YTChannel[]; quotaCost: number }> {
  if (channelIds.length === 0) return { channels: [], quotaCost: 0 };

  // Batch in groups of 50
  const batches: YTChannel[] = [];
  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50);
    const data = await ytFetch<{ items: YTChannel[] }>('channels', {
      part: 'snippet,statistics,contentDetails,brandingSettings',
      id: batch.join(','),
      maxResults: '50',
    });
    batches.push(...(data.items || []));
    trackQuota(1);
  }

  return { channels: batches, quotaCost: Math.ceil(channelIds.length / 50) };
}

// ─── Get channel by custom URL or username ────────────────────────────────

export async function getChannelByUrl(
  urlOrHandle: string
): Promise<{ channel: YTChannel | null; quotaCost: number }> {
  // Extract channel ID or handle from URL
  let channelId: string | null = null;
  let handle: string | null = null;

  // Patterns:
  // https://www.youtube.com/channel/UCxxxxxx
  // https://www.youtube.com/@handle
  // https://www.youtube.com/c/customname
  // UCxxxxxx (raw ID)
  // @handle

  const channelIdMatch = urlOrHandle.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
  const handleMatch = urlOrHandle.match(/\/@([a-zA-Z0-9_.-]+)/);
  const rawIdMatch = urlOrHandle.match(/^(UC[a-zA-Z0-9_-]{22})$/);
  const rawHandleMatch = urlOrHandle.match(/^@([a-zA-Z0-9_.-]+)$/);
  const customUrlMatch = urlOrHandle.match(/\/c\/([a-zA-Z0-9_.-]+)/);

  if (channelIdMatch) channelId = channelIdMatch[1];
  else if (rawIdMatch) channelId = rawIdMatch[1];
  else if (handleMatch) handle = handleMatch[1];
  else if (rawHandleMatch) handle = rawHandleMatch[1];
  else if (customUrlMatch) handle = customUrlMatch[1];
  else {
    // Treat as a search query fallback
    handle = urlOrHandle.replace('https://youtube.com/', '').replace('https://www.youtube.com/', '');
  }

  if (channelId) {
    const { channels, quotaCost } = await getChannelsByIds([channelId]);
    return { channel: channels[0] || null, quotaCost };
  }

  if (handle) {
    // Try forHandle parameter
    try {
      const data = await ytFetch<{ items: YTChannel[] }>('channels', {
        part: 'snippet,statistics,contentDetails,brandingSettings',
        forHandle: handle,
      });
      trackQuota(1);
      if (data.items?.length) {
        return { channel: data.items[0], quotaCost: 1 };
      }
    } catch {
      // Fall through to search
    }

    // Fallback: search for the channel name
    const { items, quotaCost: searchCost } = await searchChannels(handle, 1);
    if (items.length && items[0].id.channelId) {
      const { channels, quotaCost: fetchCost } = await getChannelsByIds([items[0].id.channelId]);
      return { channel: channels[0] || null, quotaCost: searchCost + fetchCost };
    }
  }

  return { channel: null, quotaCost: 101 };
}

// ─── Get recent videos for a channel (costs 1 unit per call) ─────────────

export async function getChannelRecentVideos(
  uploadsPlaylistId: string,
  maxResults = 10
): Promise<{ videoIds: string[]; quotaCost: number }> {
  const data = await ytFetch<{ items: Array<{ contentDetails: { videoId: string } }> }>(
    'playlistItems',
    {
      part: 'contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: String(Math.min(maxResults, 50)),
    }
  );
  trackQuota(1);
  const videoIds = (data.items || []).map((i) => i.contentDetails.videoId);
  return { videoIds, quotaCost: 1 };
}

// ─── Get video statistics (costs 1 unit per call, up to 50 IDs) ──────────

export async function getVideoStats(
  videoIds: string[]
): Promise<{ videos: YTVideo[]; quotaCost: number }> {
  if (videoIds.length === 0) return { videos: [], quotaCost: 0 };
  const batches: YTVideo[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const data = await ytFetch<{ items: YTVideo[] }>('videos', {
      part: 'snippet,statistics',
      id: batch.join(','),
    });
    batches.push(...(data.items || []));
    trackQuota(1);
  }
  return { videos: batches, quotaCost: Math.ceil(videoIds.length / 50) };
}

// ─── Get channels from a list of video results (dedup by channel) ─────────

export function extractChannelIdsFromSearchResults(results: YTSearchResult[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const r of results) {
    const id = r.snippet?.channelId || r.id?.channelId;
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

// ─── Search for channels by niche using multiple related queries ──────────
// Reduces reliance on single expensive search by batching related terms

export async function multiQueryChannelSearch(
  queries: string[],
  maxPerQuery = 5
): Promise<{ channelIds: string[]; quotaCost: number }> {
  const allIds = new Set<string>();
  let totalCost = 0;

  for (const q of queries.slice(0, 3)) { // max 3 searches = 300 units
    try {
      const { items, quotaCost } = await searchChannels(q, maxPerQuery);
      totalCost += quotaCost;
      for (const item of items) {
        const id = item.id?.channelId || item.snippet?.channelId;
        if (id) allIds.add(id);
      }
    } catch (err) {
      console.error(`Search failed for query "${q}":`, err);
    }
  }

  return { channelIds: Array.from(allIds), quotaCost: totalCost };
}

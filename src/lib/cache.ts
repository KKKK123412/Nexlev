/**
 * NEXLEV Cache Layer
 * 
 * Purpose: Aggressively cache YouTube API responses to preserve daily quota.
 * 
 * TTLs:
 *   Channel data     → 6 hours (stats don't change minute-by-minute)
 *   Search results   → 2 hours (niches stable over hours)
 *   Trending data    → 30 minutes (more volatile)
 *   Niche analysis   → 4 hours
 */

import { CacheEntry } from '@/types';

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries = 500;

  set<T>(key: string, data: T, ttlMs: number, quotaCost = 0): void {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxEntries) {
      const oldest = [...this.store.entries()]
        .sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)[0];
      if (oldest) this.store.delete(oldest[0]);
    }

    this.store.set(key, {
      data,
      fetchedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      quotaCost,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return [...this.store.values()].filter((e) => Date.now() <= e.expiresAt).length;
  }

  stats() {
    const entries = [...this.store.entries()];
    const valid = entries.filter(([, e]) => Date.now() <= e.expiresAt);
    return {
      total: this.store.size,
      valid: valid.length,
      expired: this.store.size - valid.length,
      keys: valid.map(([k]) => k),
    };
  }
}

// Singleton cache instance
export const cache = new MemoryCache();

// TTL constants
export const TTL = {
  CHANNEL: 6 * 60 * 60 * 1000,      // 6 hours
  SEARCH: 2 * 60 * 60 * 1000,        // 2 hours
  TRENDING: 30 * 60 * 1000,          // 30 minutes
  NICHE: 4 * 60 * 60 * 1000,         // 4 hours
  CLONE: 3 * 60 * 60 * 1000,         // 3 hours
  VIDEO_STATS: 12 * 60 * 60 * 1000,  // 12 hours
} as const;

// Key generators
export const cacheKey = {
  channel: (id: string) => `channel:${id}`,
  search: (query: string) => `search:${query.toLowerCase().trim()}`,
  niche: (keyword: string) => `niche:${keyword.toLowerCase().trim()}`,
  clone: (channelId: string) => `clone:${channelId}`,
  trending: () => `trending:global`,
  breakout: () => `breakout:global`,
  videoStats: (channelId: string) => `vidstats:${channelId}`,
};

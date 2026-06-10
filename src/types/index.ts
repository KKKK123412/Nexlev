// ─── Raw YouTube API types ─────────────────────────────────────────────────

export interface YTChannelSnippet {
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
  };
  country?: string;
  defaultLanguage?: string;
}

export interface YTChannelStatistics {
  viewCount: string;
  subscriberCount: string;
  hiddenSubscriberCount: boolean;
  videoCount: string;
}

export interface YTChannelContentDetails {
  relatedPlaylists: {
    uploads: string;
  };
}

export interface YTChannel {
  kind: string;
  etag: string;
  id: string;
  snippet: YTChannelSnippet;
  statistics: YTChannelStatistics;
  contentDetails: YTChannelContentDetails;
  brandingSettings?: {
    channel?: {
      keywords?: string;
    };
  };
}

export interface YTVideoSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: Record<string, { url: string; width: number; height: number }>;
  channelTitle: string;
  tags?: string[];
  categoryId: string;
  liveBroadcastContent: string;
}

export interface YTVideoStatistics {
  viewCount: string;
  likeCount?: string;
  commentCount?: string;
}

export interface YTVideo {
  kind: string;
  etag: string;
  id: string;
  snippet: YTVideoSnippet;
  statistics: YTVideoStatistics;
}

export interface YTSearchResult {
  kind: string;
  etag: string;
  id: { kind: string; channelId?: string; videoId?: string };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: Record<string, { url: string }>;
    channelTitle: string;
  };
}

// ─── Analyzed channel (what NEXLEV produces) ──────────────────────────────

export interface ChannelMetrics {
  // Identity
  channelId: string;
  title: string;
  description: string;
  thumbnail: string;
  customUrl?: string;
  country?: string;

  // Raw numbers
  subscribers: number;
  totalViews: number;
  uploadCount: number;
  createdAt: Date;

  // Derived metrics
  channelAgeMonths: number;
  viewsPerUpload: number;
  subscribersPerUpload: number;
  avgMonthlyViews: number;
  avgMonthlySubscribers: number;

  // Velocity (per month)
  estimatedMonthlySubGrowth: number;
  estimatedMonthlyViewGrowth: number;

  // Ratios
  viewsToSubRatio: number;
}

export interface ChannelScores {
  breakoutScore: number;       // 0-100: early channels exploding
  hiddenGemScore: number;      // 0-100: under-discovered
  facelessScore: number;       // 0-100: probability of being faceless
  opportunityScore: number;    // 0-100: overall opportunity
  momentumScore: number;       // 0-100: current growth velocity
  consistencyScore: number;    // 0-100: upload regularity
  engagementScore: number;     // 0-100: views-to-sub engagement
}

export interface ChannelAnalysis {
  metrics: ChannelMetrics;
  scores: ChannelScores;
  signals: string[];           // Human-readable reason strings
  cloneReason?: string;        // Why this is a clone opportunity
  isBreakout: boolean;
  isHiddenGem: boolean;
  isFaceless: boolean;
  dataFetchedAt: Date;
}

// ─── API response shapes ───────────────────────────────────────────────────

export interface SearchResponse {
  channels: ChannelAnalysis[];
  query: string;
  totalFound: number;
  nicheScore?: NicheScore;
  cached: boolean;
  quotaUsed: number;
}

export interface NicheScore {
  niche: string;
  opportunityScore: number;    // 0-100
  competitionLevel: 'low' | 'medium' | 'high' | 'saturated';
  demandLevel: 'emerging' | 'growing' | 'peak' | 'declining';
  avgChannelAge: number;       // months
  avgSubscribers: number;
  avgViewsPerUpload: number;
  topChannels: number;
  breakoutChannels: number;
  hiddenGems: number;
  summary: string;
}

export interface CloneResponse {
  sourceChannel: ChannelAnalysis;
  relatedChannels: ChannelAnalysis[];
  fasterGrowing: ChannelAnalysis[];
  hiddenAlternatives: ChannelAnalysis[];
  cloneOpportunities: CloneOpportunity[];
  cached: boolean;
  quotaUsed: number;
}

export interface CloneOpportunity {
  channel: ChannelAnalysis;
  opportunityType: 'faster_growing' | 'less_competition' | 'emerging' | 'hidden_gem';
  whyOpportunity: string;
  competitionGap: number;      // how much easier to enter
  growthAdvantage: number;     // % faster growing than source
}

export interface TrendingResponse {
  breakoutChannels: ChannelAnalysis[];
  emergingNiches: NicheScore[];
  cached: boolean;
  quotaUsed: number;
}

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

// ─── Internal cache types ──────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
  quotaCost: number;
}

// ─── UI state types ────────────────────────────────────────────────────────

export type DashboardTab =
  | 'breakout'
  | 'hidden-gems'
  | 'clone-finder'
  | 'niche-discovery'
  | 'trending'
  | 'faceless';

export type SortField =
  | 'breakoutScore'
  | 'opportunityScore'
  | 'hiddenGemScore'
  | 'facelessScore'
  | 'subscribers'
  | 'viewsPerUpload'
  | 'channelAgeMonths'
  | 'uploadCount';

export interface FilterState {
  maxUploads?: number;
  maxAgeMonths?: number;
  minScore?: number;
  country?: string;
}

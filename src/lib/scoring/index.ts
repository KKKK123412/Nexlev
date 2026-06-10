/**
 * NEXLEV Scoring Engine
 * 
 * All scores are 0-100. Each engine is independently testable.
 * Scores are calculated purely from channel metrics — no hardcoded channels.
 */

import { YTChannel, ChannelMetrics, ChannelScores, ChannelAnalysis } from '@/types';

// ─── Extract raw metrics from YouTube API response ─────────────────────────

export function extractMetrics(channel: YTChannel): ChannelMetrics {
  const stats = channel.statistics;
  const snippet = channel.snippet;

  const subscribers = parseInt(stats.subscriberCount || '0', 10);
  const totalViews = parseInt(stats.viewCount || '0', 10);
  const uploadCount = parseInt(stats.videoCount || '0', 10);
  const createdAt = new Date(snippet.publishedAt);
  const now = new Date();

  const channelAgeMs = now.getTime() - createdAt.getTime();
  const channelAgeMonths = Math.max(channelAgeMs / (1000 * 60 * 60 * 24 * 30.44), 0.1);

  const viewsPerUpload = uploadCount > 0 ? totalViews / uploadCount : 0;
  const subscribersPerUpload = uploadCount > 0 ? subscribers / uploadCount : 0;
  const avgMonthlyViews = totalViews / channelAgeMonths;
  const avgMonthlySubscribers = subscribers / channelAgeMonths;

  // Velocity: estimated from total / age (no historical snapshots available in free tier)
  const estimatedMonthlySubGrowth = avgMonthlySubscribers;
  const estimatedMonthlyViewGrowth = avgMonthlyViews;

  const viewsToSubRatio = subscribers > 0 ? totalViews / subscribers : 0;

  const thumbnail =
    snippet.thumbnails?.high?.url ||
    snippet.thumbnails?.medium?.url ||
    snippet.thumbnails?.default?.url ||
    '';

  return {
    channelId: channel.id,
    title: snippet.title,
    description: snippet.description,
    thumbnail,
    customUrl: snippet.customUrl,
    country: snippet.country,
    subscribers,
    totalViews,
    uploadCount,
    createdAt,
    channelAgeMonths,
    viewsPerUpload,
    subscribersPerUpload,
    avgMonthlyViews,
    avgMonthlySubscribers,
    estimatedMonthlySubGrowth,
    estimatedMonthlyViewGrowth,
    viewsToSubRatio,
  };
}

// ─── Normalize helper: clamp value to 0-100 range ─────────────────────────

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function normalize(value: number, low: number, high: number): number {
  if (high <= low) return 50;
  return clamp(((value - low) / (high - low)) * 100);
}

// ─── Breakout Score ────────────────────────────────────────────────────────
// "Early channel with explosive growth"
// Ideal: < 30 uploads, < 18 months old, high views per upload, recent activity

export function calcBreakoutScore(m: ChannelMetrics): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;

  // Upload count factor: fewer uploads = higher potential (max 35 pts)
  // Sweet spot: 3-20 uploads
  let uploadFactor = 0;
  if (m.uploadCount <= 5) uploadFactor = 35;
  else if (m.uploadCount <= 10) uploadFactor = 32;
  else if (m.uploadCount <= 15) uploadFactor = 28;
  else if (m.uploadCount <= 20) uploadFactor = 22;
  else if (m.uploadCount <= 30) uploadFactor = 15;
  else if (m.uploadCount <= 50) uploadFactor = 8;
  else uploadFactor = 2;

  if (m.uploadCount <= 15) signals.push(`Only ${m.uploadCount} uploads — very early stage`);
  else if (m.uploadCount <= 30) signals.push(`${m.uploadCount} uploads — breakout window`);
  score += uploadFactor;

  // Channel age factor (max 25 pts)
  let ageFactor = 0;
  if (m.channelAgeMonths <= 3) ageFactor = 25;
  else if (m.channelAgeMonths <= 6) ageFactor = 22;
  else if (m.channelAgeMonths <= 9) ageFactor = 18;
  else if (m.channelAgeMonths <= 12) ageFactor = 14;
  else if (m.channelAgeMonths <= 18) ageFactor = 8;
  else if (m.channelAgeMonths <= 24) ageFactor = 4;
  else ageFactor = 1;

  if (m.channelAgeMonths <= 6) signals.push(`Channel created ${Math.round(m.channelAgeMonths)} months ago`);
  score += ageFactor;

  // Views per upload factor (max 25 pts)
  // >100k per upload is exceptional; >10k is good
  const vpu = m.viewsPerUpload;
  let vpuFactor = 0;
  if (vpu >= 1_000_000) { vpuFactor = 25; signals.push(`${fmtNum(vpu)} avg views per upload — viral velocity`); }
  else if (vpu >= 500_000) { vpuFactor = 23; signals.push(`${fmtNum(vpu)} avg views per upload`); }
  else if (vpu >= 100_000) { vpuFactor = 20; signals.push(`${fmtNum(vpu)} avg views per upload — strong`); }
  else if (vpu >= 50_000) { vpuFactor = 16; }
  else if (vpu >= 20_000) { vpuFactor = 12; }
  else if (vpu >= 10_000) { vpuFactor = 8; }
  else if (vpu >= 5_000) { vpuFactor = 5; }
  else if (vpu >= 1_000) { vpuFactor = 3; }
  else vpuFactor = 1;
  score += vpuFactor;

  // Monthly subscriber growth (max 15 pts)
  const msg = m.estimatedMonthlySubGrowth;
  let growthFactor = 0;
  if (msg >= 100_000) { growthFactor = 15; signals.push(`~${fmtNum(msg)}/mo subscriber growth — explosive`); }
  else if (msg >= 50_000) { growthFactor = 13; signals.push(`~${fmtNum(msg)}/mo subscriber growth`); }
  else if (msg >= 20_000) { growthFactor = 11; }
  else if (msg >= 10_000) { growthFactor = 9; }
  else if (msg >= 5_000) { growthFactor = 7; }
  else if (msg >= 2_000) { growthFactor = 5; }
  else if (msg >= 1_000) { growthFactor = 3; }
  else growthFactor = 1;
  score += growthFactor;

  // Bonus: very high views-to-sub ratio suggests external traffic (trending/viral)
  if (m.viewsToSubRatio > 50) {
    score += 5;
    signals.push('High views-to-sub ratio — content going beyond subscribers');
  }

  // Penalty: hidden subscriber count usually means small/empty channel
  // (We can't detect this from statistics alone — skip)

  return { score: clamp(Math.round(score)), signals };
}

// ─── Hidden Gem Score ──────────────────────────────────────────────────────
// "Quality content, not yet discovered"
// Good views per upload, but low subscriber count relative to view count

export function calcHiddenGemScore(m: ChannelMetrics): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;

  // Core requirement: views-to-sub ratio shows people watch but don't subscribe yet
  // High VPU despite low subscribers = hidden gem
  const discoveryGap = m.viewsToSubRatio; // views / subs

  let gapFactor = 0;
  if (discoveryGap >= 100) { gapFactor = 30; signals.push(`${Math.round(discoveryGap)}:1 views-to-sub ratio — highly undersubscribed`); }
  else if (discoveryGap >= 50) { gapFactor = 25; signals.push(`${Math.round(discoveryGap)}:1 views-to-sub ratio — undiscovered`); }
  else if (discoveryGap >= 20) { gapFactor = 18; }
  else if (discoveryGap >= 10) { gapFactor = 12; }
  else gapFactor = 5;
  score += gapFactor;

  // Upload count: <30 is ideal for hidden gem
  let uploadFactor = 0;
  if (m.uploadCount <= 10) { uploadFactor = 25; signals.push('Very few uploads — still flying under the radar'); }
  else if (m.uploadCount <= 20) { uploadFactor = 20; }
  else if (m.uploadCount <= 30) { uploadFactor = 15; }
  else if (m.uploadCount <= 50) { uploadFactor = 8; }
  else uploadFactor = 3;
  score += uploadFactor;

  // Age: <12 months strongly preferred
  let ageFactor = 0;
  if (m.channelAgeMonths <= 3) { ageFactor = 20; }
  else if (m.channelAgeMonths <= 6) { ageFactor = 17; }
  else if (m.channelAgeMonths <= 9) { ageFactor = 14; }
  else if (m.channelAgeMonths <= 12) { ageFactor = 10; signals.push('Under 1 year old'); }
  else if (m.channelAgeMonths <= 18) { ageFactor = 6; }
  else ageFactor = 2;
  score += ageFactor;

  // Views per upload quality
  let vpuFactor = 0;
  const vpu = m.viewsPerUpload;
  if (vpu >= 100_000) { vpuFactor = 25; signals.push(`${fmtNum(vpu)} avg views per upload despite low subscribers`); }
  else if (vpu >= 50_000) { vpuFactor = 20; signals.push(`${fmtNum(vpu)} avg views per upload`); }
  else if (vpu >= 20_000) { vpuFactor = 15; }
  else if (vpu >= 10_000) { vpuFactor = 10; }
  else if (vpu >= 5_000) { vpuFactor = 6; }
  else if (vpu >= 1_000) { vpuFactor = 3; }
  else vpuFactor = 1;
  score += vpuFactor;

  return { score: clamp(Math.round(score)), signals };
}

// ─── Faceless Score ────────────────────────────────────────────────────────
// Estimate probability the channel is faceless / creator-absent
// Based on title, description, keywords — no video analysis

export function calcFacelessScore(channel: YTChannel, m: ChannelMetrics): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;

  const text = [
    m.title,
    m.description,
    channel.brandingSettings?.channel?.keywords || '',
  ].join(' ').toLowerCase();

  // Strong faceless indicators
  const strongSignals: [string, string, number][] = [
    ['animation', 'Animated content detected', 20],
    ['animated', 'Animated content detected', 20],
    ['explainer', 'Explainer video format', 18],
    ['documentary', 'Documentary format', 18],
    ['narrated', 'Voice-over narration', 16],
    ['narration', 'Voice-over narration', 16],
    ['ai narrat', 'AI narration indicator', 20],
    ['stock footage', 'Stock footage channel', 18],
    ['infographic', 'Infographic/motion graphics', 15],
    ['motion graphic', 'Motion graphics format', 15],
    ['whiteboard', 'Whiteboard animation', 15],
    ['2d animation', '2D animation format', 18],
    ['3d animation', '3D animation format', 18],
    ['educational channel', 'Educational format', 12],
    ['history of', 'History narration format', 10],
    ['top 10', 'List/countdown format (often faceless)', 12],
    ['top 5', 'List/countdown format', 10],
    ['facts about', 'Facts format (often AI narrated)', 12],
    ['did you know', 'Facts format', 10],
  ];

  // Weak/supporting signals
  const weakSignals: [string, string, number][] = [
    ['history', 'History niche (often faceless)', 5],
    ['science', 'Science niche (often faceless)', 5],
    ['space', 'Space niche (often faceless)', 5],
    ['psychology', 'Psychology niche', 5],
    ['facts', 'Facts-based content', 5],
    ['ancient', 'Ancient history format', 5],
    ['mystery', 'Mystery/documentary', 5],
    ['universe', 'Universe/cosmos content', 4],
    ['story of', 'Storytelling format', 4],
    ['compilation', 'Compilation format', 8],
    ['shorts', 'Shorts channel (often AI)', 3],
  ];

  const seenSignals = new Set<string>();
  let signalScore = 0;

  for (const [keyword, label, pts] of strongSignals) {
    if (text.includes(keyword) && !seenSignals.has(label)) {
      seenSignals.add(label);
      signals.push(label);
      signalScore += pts;
    }
  }

  for (const [keyword, label, pts] of weakSignals) {
    if (text.includes(keyword) && !seenSignals.has(label)) {
      seenSignals.add(label);
      signals.push(label);
      signalScore += pts;
    }
  }

  score = Math.min(signalScore, 70); // cap text-based signals

  // No personal branding in description
  const personalPhrases = ['my name is', 'i am', "i'm a", 'host', 'presenter', 'creator'];
  const hasPersonalBrand = personalPhrases.some((p) => text.includes(p));
  if (!hasPersonalBrand && signals.length > 0) {
    score += 15;
    signals.push('No personal branding detected');
  }

  // Channel description is short or generic (faceless channels often have brief descriptions)
  if (m.description.length < 100) {
    score += 10;
    signals.push('Minimal channel description — common in faceless channels');
  }

  // No country set (many AI/faceless channels skip this)
  if (!m.country) {
    score += 5;
  }

  return { score: clamp(Math.round(score)), signals: signals.slice(0, 5) };
}

// ─── Momentum Score ───────────────────────────────────────────────────────
// How fast is this channel growing RIGHT NOW?

export function calcMomentumScore(m: ChannelMetrics): number {
  // Monthly views per upload is the key signal
  // Normalize against benchmarks
  const monthlyVPU = m.avgMonthlyViews / Math.max(m.uploadCount, 1);

  let score = 0;
  // Monthly sub growth rate
  score += normalize(m.estimatedMonthlySubGrowth, 0, 50_000) * 0.4;
  // Monthly view growth
  score += normalize(m.avgMonthlyViews, 0, 5_000_000) * 0.3;
  // Views per upload recency (younger channel with high VPU = better momentum)
  const recencyBoost = Math.max(0, 1 - m.channelAgeMonths / 24);
  score += normalize(monthlyVPU, 0, 100_000) * 0.2;
  score += recencyBoost * 10;

  return clamp(Math.round(score));
}

// ─── Consistency Score ────────────────────────────────────────────────────
// How regularly does this channel post?

export function calcConsistencyScore(m: ChannelMetrics): number {
  if (m.channelAgeMonths < 0.5 || m.uploadCount === 0) return 50;

  const uploadsPerMonth = m.uploadCount / m.channelAgeMonths;

  // Ideal: 2-8 uploads/month for most niches
  if (uploadsPerMonth >= 8) return 95;
  if (uploadsPerMonth >= 4) return 85;
  if (uploadsPerMonth >= 2) return 75;
  if (uploadsPerMonth >= 1) return 60;
  if (uploadsPerMonth >= 0.5) return 45;
  return 30;
}

// ─── Engagement Score ─────────────────────────────────────────────────────
// Views relative to subscribers — high ratio = content exceeding its audience

export function calcEngagementScore(m: ChannelMetrics): number {
  // Views per subscriber is the key metric
  // Average YouTube channel: ~2-5 views per sub per video
  const vps = m.viewsToSubRatio;

  if (vps >= 100) return 95;
  if (vps >= 50) return 85;
  if (vps >= 20) return 75;
  if (vps >= 10) return 65;
  if (vps >= 5) return 55;
  if (vps >= 2) return 45;
  return 30;
}

// ─── Opportunity Score ────────────────────────────────────────────────────
// Master score: is there a real opportunity here?

export function calcOpportunityScore(
  m: ChannelMetrics,
  breakoutScore: number,
  hiddenGemScore: number,
  momentumScore: number
): { score: number; explanation: string } {
  // Weighted combination
  const vpu = Math.min(normalize(m.viewsPerUpload, 0, 500_000), 100);
  const subVelocity = Math.min(normalize(m.estimatedMonthlySubGrowth, 0, 100_000), 100);

  // Competition proxy: higher subscribers = more established = less opportunity for new clone
  const competitionFactor = Math.max(10, 100 - normalize(m.subscribers, 0, 1_000_000));

  const rawScore = (
    vpu * 0.25 +
    subVelocity * 0.20 +
    breakoutScore * 0.25 +
    hiddenGemScore * 0.15 +
    momentumScore * 0.15
  ) * (competitionFactor / 100) * 1.5;

  const score = clamp(Math.round(rawScore));

  const parts: string[] = [];
  if (vpu > 60) parts.push(`strong views/upload (${fmtNum(m.viewsPerUpload)})`);
  if (subVelocity > 50) parts.push(`fast subscriber growth (~${fmtNum(m.estimatedMonthlySubGrowth)}/mo)`);
  if (breakoutScore > 60) parts.push('breakout trajectory');
  if (hiddenGemScore > 60) parts.push('undersubscribed for its reach');
  if (m.uploadCount < 20) parts.push('early-stage channel');
  if (competitionFactor > 70) parts.push('low subscriber base = copyable niche');

  const explanation = parts.length > 0
    ? `Scored ${score}/100 based on: ${parts.join(', ')}.`
    : `Opportunity score ${score}/100 — moderate signals.`;

  return { score, explanation };
}

// ─── Full analysis assembler ──────────────────────────────────────────────

export function analyzeChannel(channel: YTChannel): ChannelAnalysis {
  const metrics = extractMetrics(channel);

  const { score: breakoutScore, signals: breakoutSignals } = calcBreakoutScore(metrics);
  const { score: hiddenGemScore, signals: gemSignals } = calcHiddenGemScore(metrics);
  const { score: facelessScore, signals: facelessSignals } = calcFacelessScore(channel, metrics);
  const momentumScore = calcMomentumScore(metrics);
  const consistencyScore = calcConsistencyScore(metrics);
  const engagementScore = calcEngagementScore(metrics);
  const { score: opportunityScore, explanation } = calcOpportunityScore(
    metrics,
    breakoutScore,
    hiddenGemScore,
    momentumScore
  );

  const scores: ChannelScores = {
    breakoutScore,
    hiddenGemScore,
    facelessScore,
    opportunityScore,
    momentumScore,
    consistencyScore,
    engagementScore,
  };

  // Collect all signals, deduplicated
  const allSignals = Array.from(new Set([
  ...breakoutSignals,
  ...gemSignals,
  ...facelessSignals,
  explanation,
])).slice(0, 6);

  return {
    metrics,
    scores,
    signals: allSignals,
    isBreakout: breakoutScore >= 55,
    isHiddenGem: hiddenGemScore >= 50,
    isFaceless: facelessScore >= 40,
    dataFetchedAt: new Date(),
  };
}

// ─── Niche scoring (aggregate over multiple channels) ────────────────────

export function scoreNiche(
  keyword: string,
  channels: ChannelAnalysis[]
): import('@/types').NicheScore {
  if (channels.length === 0) {
    return {
      niche: keyword,
      opportunityScore: 0,
      competitionLevel: 'low',
      demandLevel: 'emerging',
      avgChannelAge: 0,
      avgSubscribers: 0,
      avgViewsPerUpload: 0,
      topChannels: 0,
      breakoutChannels: 0,
      hiddenGems: 0,
      summary: 'Insufficient data.',
    };
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const avgAge = avg(channels.map((c) => c.metrics.channelAgeMonths));
  const avgSubs = avg(channels.map((c) => c.metrics.subscribers));
  const avgVPU = avg(channels.map((c) => c.metrics.viewsPerUpload));
  const avgOpportunity = avg(channels.map((c) => c.scores.opportunityScore));
  const breakoutCount = channels.filter((c) => c.isBreakout).length;
  const gemCount = channels.filter((c) => c.isHiddenGem).length;

  // Competition: higher avg subs and age = more competition
  let competitionLevel: 'low' | 'medium' | 'high' | 'saturated';
  if (avgSubs > 1_000_000) competitionLevel = 'saturated';
  else if (avgSubs > 100_000) competitionLevel = 'high';
  else if (avgSubs > 20_000) competitionLevel = 'medium';
  else competitionLevel = 'low';

  // Demand: avg views per upload indicates audience interest
  let demandLevel: 'emerging' | 'growing' | 'peak' | 'declining';
  if (avgVPU > 500_000) demandLevel = 'peak';
  else if (avgVPU > 100_000) demandLevel = 'growing';
  else if (avgVPU > 20_000) demandLevel = 'emerging';
  else demandLevel = 'emerging';

  // Opportunity: inversely related to competition, directly to demand
  const competitionPenalty = { low: 1.0, medium: 0.85, high: 0.65, saturated: 0.4 }[competitionLevel];
  const demandBoost = { emerging: 0.8, growing: 1.1, peak: 1.0, declining: 0.6 }[demandLevel];
  const nicheOpportunity = clamp(Math.round(avgOpportunity * competitionPenalty * demandBoost));

  const summary = [
    `${channels.length} channels analyzed in this niche.`,
    `Competition is ${competitionLevel} (avg ${fmtNum(Math.round(avgSubs))} subscribers).`,
    `Demand is ${demandLevel} (avg ${fmtNum(Math.round(avgVPU))} views/upload).`,
    breakoutCount > 0 ? `${breakoutCount} breakout channel${breakoutCount > 1 ? 's' : ''} detected.` : '',
    gemCount > 0 ? `${gemCount} hidden gem${gemCount > 1 ? 's' : ''} found.` : '',
  ].filter(Boolean).join(' ');

  return {
    niche: keyword,
    opportunityScore: nicheOpportunity,
    competitionLevel,
    demandLevel,
    avgChannelAge: Math.round(avgAge * 10) / 10,
    avgSubscribers: Math.round(avgSubs),
    avgViewsPerUpload: Math.round(avgVPU),
    topChannels: channels.length,
    breakoutChannels: breakoutCount,
    hiddenGems: gemCount,
    summary,
  };
}

// ─── Clone opportunity analysis ───────────────────────────────────────────

export function calcCloneReason(
  source: ChannelAnalysis,
  candidate: ChannelAnalysis
): { type: import('@/types').CloneOpportunity['opportunityType']; reason: string; competitionGap: number; growthAdvantage: number } {
  const srcSubs = source.metrics.subscribers;
  const candSubs = candidate.metrics.subscribers;
  const srcVPU = source.metrics.viewsPerUpload;
  const candVPU = candidate.metrics.viewsPerUpload;

  const competitionGap = srcSubs > 0 ? clamp(Math.round((1 - candSubs / srcSubs) * 100)) : 50;
  const growthAdvantage = srcSubs > 0
    ? clamp(Math.round(((candidate.metrics.estimatedMonthlySubGrowth - source.metrics.estimatedMonthlySubGrowth) / Math.max(source.metrics.estimatedMonthlySubGrowth, 1)) * 100))
    : 0;

  if (candidate.isBreakout && candSubs < srcSubs * 0.1) {
    return {
      type: 'emerging',
      reason: `Only ${fmtNum(candSubs)} subscribers but breakout trajectory — earlier in S-curve than your reference channel`,
      competitionGap,
      growthAdvantage,
    };
  }

  if (candidate.isHiddenGem && candVPU > srcVPU * 0.5) {
    return {
      type: 'hidden_gem',
      reason: `High views (${fmtNum(Math.round(candVPU))}/upload) but few subscribers — content has proven demand, audience unclaimed`,
      competitionGap,
      growthAdvantage,
    };
  }

  if (candSubs < srcSubs * 0.2 && candVPU > 10_000) {
    return {
      type: 'less_competition',
      reason: `Same format, 80%+ fewer subscribers — much easier to compete in this sub-niche`,
      competitionGap,
      growthAdvantage,
    };
  }

  if (candidate.metrics.estimatedMonthlySubGrowth > source.metrics.estimatedMonthlySubGrowth * 1.2) {
    return {
      type: 'faster_growing',
      reason: `Growing ${Math.round(growthAdvantage)}% faster than your reference channel`,
      competitionGap,
      growthAdvantage,
    };
  }

  return {
    type: 'less_competition',
    reason: `Related niche with lower competition (${fmtNum(candSubs)} vs ${fmtNum(srcSubs)} subscribers)`,
    competitionGap,
    growthAdvantage,
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────

export function fmtNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function fmtAge(months: number): string {
  if (months < 1) return `${Math.round(months * 30)}d`;
  if (months < 12) return `${Math.round(months)}mo`;
  const years = Math.floor(months / 12);
  const mo = Math.round(months % 12);
  return mo > 0 ? `${years}yr ${mo}mo` : `${years}yr`;
}

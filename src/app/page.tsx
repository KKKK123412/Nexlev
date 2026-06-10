'use client';

import { useState, useCallback } from 'react';
import {
  Search, TrendingUp, Sparkles, Copy, Layers, Eye, Zap,
  AlertCircle, Loader2, ChevronRight, RefreshCw
} from 'lucide-react';
import { ChannelCard } from '@/components/ui/ChannelCard';
import { NicheCard } from '@/components/ui/NicheCard';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Badge } from '@/components/ui/Badge';
import {
  ChannelAnalysis, NicheScore, SearchResponse,
  CloneResponse, DashboardTab
} from '@/types';
import { fmtNum } from '@/lib/scoring';

type LoadState = 'idle' | 'loading' | 'error' | 'done';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('breakout');

  // Search / niche state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchState, setSearchState] = useState<LoadState>('idle');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchError, setSearchError] = useState('');

  // Clone state
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneState, setCloneState] = useState<LoadState>('idle');
  const [cloneResults, setCloneResults] = useState<CloneResponse | null>(null);
  const [cloneError, setCloneError] = useState('');

  // Breakout state
  const [breakoutState, setBreakoutState] = useState<LoadState>('idle');
  const [breakoutResults, setBreakoutResults] = useState<{ breakoutChannels: ChannelAnalysis[]; risingChannels: ChannelAnalysis[]; quotaUsed: number } | null>(null);
  const [breakoutNiche, setBreakoutNiche] = useState('');

  // Trending state
  const [trendingState, setTrendingState] = useState<LoadState>('idle');
  const [trendingResults, setTrendingResults] = useState<{ breakoutChannels: ChannelAnalysis[]; emergingNiches: NicheScore[] } | null>(null);

  // Faceless state
  const [facelessState, setFacelessState] = useState<LoadState>('idle');
  const [facelessResults, setFacelessResults] = useState<{ facelessChannels: ChannelAnalysis[]; totalScanned: number } | null>(null);

  // ─── API calls ─────────────────────────────────────────────────

  const runSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearchState('loading');
    setSearchError('');
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&max=15`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setSearchResults(data);
      setSearchState('done');
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Unknown error');
      setSearchState('error');
    }
  }, [searchQuery]);

  const runClone = useCallback(async () => {
    if (!cloneUrl.trim()) return;
    setCloneState('loading');
    setCloneError('');
    try {
      const res = await fetch(`/api/clone?url=${encodeURIComponent(cloneUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Clone analysis failed');
      setCloneResults(data);
      setCloneState('done');
    } catch (e) {
      setCloneError(e instanceof Error ? e.message : 'Unknown error');
      setCloneState('error');
    }
  }, [cloneUrl]);

  const runBreakout = useCallback(async (niche?: string) => {
    setBreakoutState('loading');
    try {
      const q = niche || breakoutNiche;
      const url = q ? `/api/breakout?niche=${encodeURIComponent(q)}` : '/api/breakout';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Breakout fetch failed');
      setBreakoutResults(data);
      setBreakoutState('done');
    } catch (e) {
      setBreakoutState('error');
    }
  }, [breakoutNiche]);

  const runTrending = useCallback(async () => {
    setTrendingState('loading');
    try {
      const res = await fetch('/api/trending');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTrendingResults(data);
      setTrendingState('done');
    } catch {
      setTrendingState('error');
    }
  }, []);

  const runFaceless = useCallback(async () => {
    setFacelessState('loading');
    try {
      const res = await fetch('/api/opportunities?type=faceless');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFacelessResults(data);
      setFacelessState('done');
    } catch {
      setFacelessState('error');
    }
  }, []);

  // ─── Tab config ────────────────────────────────────────────────

  const tabs: { id: DashboardTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'breakout', label: 'Breakout', icon: <TrendingUp size={14} />, desc: 'Exploding channels with few uploads' },
    { id: 'hidden-gems', label: 'Hidden Gems', icon: <Sparkles size={14} />, desc: 'Undersubscribed for their reach' },
    { id: 'clone-finder', label: 'Clone Finder', icon: <Copy size={14} />, desc: 'Find opportunities from any channel' },
    { id: 'niche-discovery', label: 'Niche', icon: <Search size={14} />, desc: 'Score any niche keyword' },
    { id: 'trending', label: 'Trending', icon: <Zap size={14} />, desc: 'Emerging niches right now' },
    { id: 'faceless', label: 'Faceless', icon: <Eye size={14} />, desc: 'No-face, AI-friendly channels' },
  ];

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-void-900 text-white">
      {/* Header */}
      <header className="border-b border-void-700 bg-void-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-signal live-indicator" />
              <span className="font-mono text-xs text-void-400 uppercase tracking-widest">Live</span>
            </div>
            <h1 className="font-mono font-bold text-white tracking-tight text-lg">
              NEX<span className="text-signal">LEV</span>
            </h1>
            <span className="text-void-500 font-mono text-xs hidden sm:block">
              YouTube Opportunity Intelligence
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-void-500">
            <span>Real YouTube Data</span>
            <span className="text-void-700">·</span>
            <span>No Fake Channels</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-signal text-void-950 font-semibold'
                  : 'bg-void-800 text-void-400 hover:text-white hover:bg-void-700 border border-void-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'breakout' && (
          <BreakoutTab
            state={breakoutState}
            results={breakoutResults}
            niche={breakoutNiche}
            onNicheChange={setBreakoutNiche}
            onRun={runBreakout}
          />
        )}
        {activeTab === 'hidden-gems' && (
          <HiddenGemsTab
            state={searchState}
            results={searchResults}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onRun={runSearch}
            error={searchError}
          />
        )}
        {activeTab === 'clone-finder' && (
          <CloneTab
            state={cloneState}
            results={cloneResults}
            url={cloneUrl}
            onUrlChange={setCloneUrl}
            onRun={runClone}
            error={cloneError}
          />
        )}
        {activeTab === 'niche-discovery' && (
          <NicheTab
            state={searchState}
            results={searchResults}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onRun={runSearch}
            error={searchError}
          />
        )}
        {activeTab === 'trending' && (
          <TrendingTab
            state={trendingState}
            results={trendingResults}
            onRun={runTrending}
          />
        )}
        {activeTab === 'faceless' && (
          <FacelessTab
            state={facelessState}
            results={facelessResults}
            onRun={runFaceless}
          />
        )}
      </div>
    </div>
  );
}

// ─── Tab components ─────────────────────────────────────────────────────────

function BreakoutTab({
  state, results, niche, onNicheChange, onRun,
}: {
  state: LoadState;
  results: { breakoutChannels: ChannelAnalysis[]; risingChannels: ChannelAnalysis[]; quotaUsed?: number } | null;
  niche: string;
  onNicheChange: (v: string) => void;
  onRun: (niche?: string) => void;
}) {
  const presets = ['AI Stories', 'History', 'Psychology', 'Space', 'True Crime', 'Business'];

  return (
    <div>
      <SectionHeader
        title="Breakout Channel Detector"
        desc="Channels with 1–30 uploads showing explosive early growth. Find them before they blow up."
      />
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 bg-void-800 border border-void-700 rounded px-3 py-2 text-sm font-mono text-white placeholder-void-500 focus:outline-none focus:border-signal"
          placeholder="Niche keyword (optional)..."
          value={niche}
          onChange={(e) => onNicheChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onRun()}
        />
        <RunButton state={state} onClick={() => onRun()} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => { onNicheChange(p); onRun(p); }}
            className="px-2 py-1 text-[11px] font-mono bg-void-800 border border-void-700 text-void-400 hover:text-signal hover:border-signal/50 rounded transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
      <TabContent state={state} empty={!results?.breakoutChannels.length}>
        {results && (
          <>
            <QuotaBadge used={results.quotaUsed} />
            {results.breakoutChannels.length === 0 && results.risingChannels.length === 0 ? (
              <EmptyState message="No strong breakout signals found. Try a different niche or check back later." />
            ) : (
              <>
                {results.breakoutChannels.length > 0 && (
                  <>
                    <SectionLabel text="Confirmed Breakouts" count={results.breakoutChannels.length} color="signal" />
                    <ChannelGrid channels={results.breakoutChannels} primaryScore="breakout" />
                  </>
                )}
                {results.risingChannels.length > 0 && (
                  <>
                    <SectionLabel text="Rising Channels" count={results.risingChannels.length} color="amber" />
                    <ChannelGrid channels={results.risingChannels} primaryScore="breakout" />
                  </>
                )}
              </>
            )}
          </>
        )}
      </TabContent>
    </div>
  );
}

function HiddenGemsTab({
  state, results, query, onQueryChange, onRun, error,
}: {
  state: LoadState;
  results: SearchResponse | null;
  query: string;
  onQueryChange: (v: string) => void;
  onRun: () => void;
  error: string;
}) {
  const gems = results?.channels.filter((c) => c.isHiddenGem) || [];

  return (
    <div>
      <SectionHeader
        title="Hidden Gem Scanner"
        desc="Channels with high view counts but far fewer subscribers than they deserve. Undersubscribed = opportunity."
      />
      <SearchBar query={query} onChange={onQueryChange} onRun={onRun} state={state} placeholder="Search niche for hidden gems..." />
      <TabContent state={state} error={error} empty={gems.length === 0 && state === 'done'}>
        {results && (
          <>
            <QuotaBadge used={results.quotaUsed} />
            {gems.length === 0 ? (
              <EmptyState message={`No hidden gems found for "${results.query}". Try a more specific niche.`} />
            ) : (
              <>
                <SectionLabel text="Hidden Gems" count={gems.length} color="blue" />
                <ChannelGrid channels={gems} primaryScore="gem" />
              </>
            )}
          </>
        )}
      </TabContent>
    </div>
  );
}

function CloneTab({
  state, results, url, onUrlChange, onRun, error,
}: {
  state: LoadState;
  results: CloneResponse | null;
  url: string;
  onUrlChange: (v: string) => void;
  onRun: () => void;
  error: string;
}) {
  return (
    <div>
      <SectionHeader
        title="Clone Opportunity Finder"
        desc="Enter any YouTube channel URL. Get related channels, faster-growing alternatives, and hidden opportunities in the same niche."
      />
      <div className="flex gap-2 mb-2">
        <input
          className="flex-1 bg-void-800 border border-void-700 rounded px-3 py-2 text-sm font-mono text-white placeholder-void-500 focus:outline-none focus:border-signal"
          placeholder="https://youtube.com/@channel or channel URL..."
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onRun()}
        />
        <RunButton state={state} onClick={onRun} label="Analyze" />
      </div>
      <p className="text-[11px] font-mono text-void-500 mb-5">
        Accepts: @handle · /channel/UC... · Full YouTube URL
      </p>

      <TabContent state={state} error={error} empty={!results}>
        {results && (
          <>
            <QuotaBadge used={results.quotaUsed} />

            {/* Source channel */}
            <div className="mb-5">
              <SectionLabel text="Source Channel" color="dim" />
              <div className="max-w-sm">
                <ChannelCard channel={results.sourceChannel} />
              </div>
            </div>

            {/* Clone opportunities */}
            {results.cloneOpportunities.length > 0 && (
              <div className="mb-5">
                <SectionLabel text="Clone Opportunities" count={results.cloneOpportunities.length} color="signal" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {results.cloneOpportunities.map((opp) => (
                    <div key={opp.channel.metrics.channelId}>
                      <ChannelCard
                        channel={{ ...opp.channel, cloneReason: opp.whyOpportunity }}
                        showCloneReason
                      />
                      <div className="flex gap-1.5 mt-1.5">
                        <Badge variant={opp.opportunityType === 'hidden_gem' ? 'gem' : opp.opportunityType === 'emerging' ? 'breakout' : 'blue'}>
                          {opp.opportunityType.replace('_', ' ')}
                        </Badge>
                        {opp.competitionGap > 0 && (
                          <Badge variant="signal">{opp.competitionGap}% less competition</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Faster growing */}
            {results.fasterGrowing.length > 0 && (
              <div className="mb-5">
                <SectionLabel text="Faster Growing" count={results.fasterGrowing.length} color="amber" />
                <ChannelGrid channels={results.fasterGrowing} />
              </div>
            )}

            {/* Hidden alternatives */}
            {results.hiddenAlternatives.length > 0 && (
              <div>
                <SectionLabel text="Hidden Alternatives" count={results.hiddenAlternatives.length} color="blue" />
                <ChannelGrid channels={results.hiddenAlternatives} primaryScore="gem" />
              </div>
            )}
          </>
        )}
      </TabContent>
    </div>
  );
}

function NicheTab({
  state, results, query, onQueryChange, onRun, error,
}: {
  state: LoadState;
  results: SearchResponse | null;
  query: string;
  onQueryChange: (v: string) => void;
  onRun: () => void;
  error: string;
}) {
  const presets = ['AI Explained', 'Ancient History', 'Dark Psychology', 'Space Documentary', 'Personal Finance', 'Stoicism'];

  return (
    <div>
      <SectionHeader
        title="Niche Discovery Engine"
        desc="Enter any keyword. Get competition level, demand score, and every channel worth knowing about."
      />
      <SearchBar query={query} onChange={onQueryChange} onRun={onRun} state={state} placeholder="Enter niche keyword..." />
      <div className="flex flex-wrap gap-1.5 mb-5">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => { onQueryChange(p); setTimeout(onRun, 10); }}
            className="px-2 py-1 text-[11px] font-mono bg-void-800 border border-void-700 text-void-400 hover:text-signal hover:border-signal/50 rounded transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
      <TabContent state={state} error={error} empty={state === 'done' && !results?.channels.length}>
        {results && (
          <>
            <QuotaBadge used={results.quotaUsed} />
            {results.nicheScore && (
              <div className="mb-5">
                <SectionLabel text="Niche Score" color="dim" />
                <div className="max-w-md">
                  <NicheCard niche={results.nicheScore} />
                </div>
              </div>
            )}
            {results.channels.length > 0 && (
              <>
                <SectionLabel text="All Channels Found" count={results.channels.length} color="dim" />
                <ChannelGrid channels={results.channels} />
              </>
            )}
          </>
        )}
      </TabContent>
    </div>
  );
}

function TrendingTab({
  state, results, onRun,
}: {
  state: LoadState;
  results: { breakoutChannels: ChannelAnalysis[]; emergingNiches: NicheScore[] } | null;
  onRun: () => void;
}) {
  return (
    <div>
      <SectionHeader
        title="Trending Opportunities"
        desc="What's gaining momentum right now. Emerging niches and breakout channels detected from recent upload activity."
      />
      {state === 'idle' && (
        <button
          onClick={onRun}
          className="flex items-center gap-2 px-4 py-2.5 bg-signal text-void-950 font-mono font-semibold text-sm rounded hover:bg-signal/90 transition-colors mb-5"
        >
          <Zap size={14} />
          Scan Trending Now
        </button>
      )}
      <TabContent state={state} empty={state === 'done' && !results?.breakoutChannels.length}>
        {results && (
          <>
            {results.emergingNiches.length > 0 && (
              <div className="mb-5">
                <SectionLabel text="Emerging Niches" count={results.emergingNiches.length} color="signal" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.emergingNiches.map((n) => (
                    <NicheCard key={n.niche} niche={n} />
                  ))}
                </div>
              </div>
            )}
            {results.breakoutChannels.length > 0 && (
              <>
                <SectionLabel text="Breakout Channels This Scan" count={results.breakoutChannels.length} color="amber" />
                <ChannelGrid channels={results.breakoutChannels} primaryScore="breakout" />
              </>
            )}
          </>
        )}
      </TabContent>
    </div>
  );
}

function FacelessTab({
  state, results, onRun,
}: {
  state: LoadState;
  results: { facelessChannels: ChannelAnalysis[]; totalScanned: number } | null;
  onRun: () => void;
}) {
  return (
    <div>
      <SectionHeader
        title="Faceless Channel Radar"
        desc="Channels likely using animation, AI narration, stock footage, or documentary formats — no creator face required."
      />
      {state === 'idle' && (
        <button
          onClick={onRun}
          className="flex items-center gap-2 px-4 py-2.5 bg-signal text-void-950 font-mono font-semibold text-sm rounded hover:bg-signal/90 transition-colors mb-5"
        >
          <Eye size={14} />
          Find Faceless Channels
        </button>
      )}
      <TabContent state={state} empty={state === 'done' && !results?.facelessChannels.length}>
        {results && (
          <>
            {results.totalScanned > 0 && (
              <p className="text-[11px] font-mono text-void-500 mb-4">
                Scanned {results.totalScanned} channels · {results.facelessChannels.length} matched faceless signals
              </p>
            )}
            {results.facelessChannels.length === 0 ? (
              <EmptyState message="No strong faceless signals in this scan. Try the Niche tab to search specific formats." />
            ) : (
              <ChannelGrid channels={results.facelessChannels} primaryScore="faceless" />
            )}
          </>
        )}
      </TabContent>
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-white mb-1">{title}</h2>
      <p className="text-[12px] text-void-400">{desc}</p>
    </div>
  );
}

function SearchBar({
  query, onChange, onRun, state, placeholder,
}: {
  query: string;
  onChange: (v: string) => void;
  onRun: () => void;
  state: LoadState;
  placeholder: string;
}) {
  return (
    <div className="flex gap-2 mb-4">
      <div className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-void-500" />
        <input
          className="w-full bg-void-800 border border-void-700 rounded pl-8 pr-3 py-2 text-sm font-mono text-white placeholder-void-500 focus:outline-none focus:border-signal"
          placeholder={placeholder}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onRun()}
        />
      </div>
      <RunButton state={state} onClick={onRun} />
    </div>
  );
}

function RunButton({
  state, onClick, label = 'Search',
}: {
  state: LoadState;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={state === 'loading'}
      className="flex items-center gap-1.5 px-4 py-2 bg-signal text-void-950 font-mono font-semibold text-sm rounded hover:bg-signal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
    >
      {state === 'loading' ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <ChevronRight size={14} />
      )}
      {state === 'loading' ? 'Loading...' : label}
    </button>
  );
}

function TabContent({
  state, children, error, empty,
}: {
  state: LoadState;
  children?: React.ReactNode;
  error?: string;
  empty?: boolean;
}) {
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-20 text-void-500">
        <div className="text-center">
          <Loader2 size={28} className="animate-spin mx-auto mb-3 text-signal" />
          <p className="font-mono text-sm">Fetching real YouTube data...</p>
          <p className="font-mono text-[11px] text-void-600 mt-1">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (state === 'error' && error) {
    return (
      <div className="flex items-start gap-2 p-3 bg-rose-muted border border-rose-signal/30 rounded text-rose-signal font-mono text-sm">
        <AlertCircle size={14} className="shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold">Error</div>
          <div className="text-[12px] opacity-80 mt-0.5">{error}</div>
        </div>
      </div>
    );
  }

  if (state === 'idle') return null;

  return <>{children}</>;
}

function ChannelGrid({
  channels, primaryScore,
}: {
  channels: ChannelAnalysis[];
  primaryScore?: 'breakout' | 'gem' | 'opportunity' | 'faceless';
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {channels.map((ch) => (
        <ChannelCard
          key={ch.metrics.channelId}
          channel={ch}
          primaryScore={primaryScore}
        />
      ))}
    </div>
  );
}

function SectionLabel({
  text, count, color = 'dim',
}: {
  text: string;
  count?: number;
  color?: string;
}) {
  const colorClass: Record<string, string> = {
    signal: 'text-signal',
    amber: 'text-amber-signal',
    blue: 'text-blue-signal',
    dim: 'text-void-400',
    rose: 'text-rose-signal',
  };

  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${colorClass[color] || 'text-void-400'}`}>
        {text}
      </span>
      {count !== undefined && (
        <span className="font-mono text-[10px] text-void-600">({count})</span>
      )}
      <div className="flex-1 h-px bg-void-700" />
    </div>
  );
}

function QuotaBadge({ used }: { used?: number }) {
  if (!used) return null;
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono text-void-600 mb-3">
      <span>API quota used: {used} units</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center">
      <p className="font-mono text-sm text-void-500">{message}</p>
    </div>
  );
}

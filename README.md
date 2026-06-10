# NEXLEV — YouTube Opportunity Intelligence Platform

Find YouTube channels about to blow up **before** everyone else does.

> **100% real YouTube Data API data. Zero fake channels. Zero seeded examples.**

---

## What it does

NEXLEV analyzes real YouTube channels and scores them across six intelligence engines:

| Engine | What it finds |
|--------|--------------|
| **Breakout Detector** | Channels with 1-30 uploads showing explosive early growth |
| **Hidden Gem Scanner** | Undersubscribed channels with proven view velocity |
| **Clone Finder** | Enter any channel URL → get opportunities in its niche |
| **Niche Discovery** | Score any keyword for competition + demand |
| **Trending Radar** | What's gaining momentum right now |
| **Faceless Detector** | AI/animation/narration channels (no face needed) |

---

## Scoring System

Every channel gets 6 scores (0-100):

- **Breakout Score** — upload count × age × views/upload × growth velocity
- **Hidden Gem Score** — views-to-sub ratio × upload count × recency
- **Faceless Score** — text signals: animation, narration, documentary, AI, stock footage
- **Opportunity Score** — weighted combination ÷ competition factor
- **Momentum Score** — monthly growth velocity
- **Consistency Score** — uploads per month regularity
- **Engagement Score** — views relative to subscriber count

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/yourname/nexlev
cd nexlev
npm install
```

### 2. Get a YouTube API key (free)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **YouTube Data API v3**
4. Create credentials → **API Key**
5. (Optional) Restrict the key to YouTube Data API v3

### 3. Configure environment

```bash
cp .env.local.example .env.local
# Edit .env.local and add your YOUTUBE_API_KEY
```

### 4. Run

```bash
npm run dev
# Open http://localhost:3000
```

---

## YouTube API Quota

Free tier: **10,000 units/day**

| Operation | Cost |
|-----------|------|
| `search.list` | 100 units |
| `channels.list` | 1 unit |
| `videos.list` | 1 unit |
| `playlistItems.list` | 1 unit |

**NEXLEV's quota strategy:**
- Search is used minimally (1-3 searches per action)
- Channel details fetched in batches of 50 (1 unit per batch)
- All results cached aggressively (2-6 hours)
- A typical Niche Discovery costs ~300-400 units total

---

## Deploy to Vercel (Free)

```bash
npm install -g vercel
vercel
```

In Vercel dashboard → Settings → Environment Variables:
- `YOUTUBE_API_KEY` = your key

Or use the Vercel CLI:
```bash
vercel env add YOUTUBE_API_KEY
```

---

## Architecture

```
nexlev/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main dashboard UI
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── search/route.ts   # Channel search by keyword
│   │       ├── channel/route.ts  # Single channel analysis
│   │       ├── niche/route.ts    # Niche scoring
│   │       ├── clone/route.ts    # Clone opportunity finder
│   │       ├── breakout/route.ts # Breakout detection
│   │       ├── trending/route.ts # Trending niches
│   │       └── opportunities/route.ts # Opportunities + Faceless
│   ├── components/
│   │   └── ui/
│   │       ├── ChannelCard.tsx   # Primary channel display
│   │       ├── NicheCard.tsx     # Niche score display
│   │       ├── ScoreRing.tsx     # Circular score indicator
│   │       ├── ScoreBar.tsx      # Linear score bar
│   │       └── Badge.tsx         # Status badges
│   ├── lib/
│   │   ├── youtube/client.ts     # YouTube API v3 wrapper
│   │   ├── cache.ts              # In-memory TTL cache
│   │   └── scoring/index.ts      # All scoring algorithms
│   └── types/index.ts            # TypeScript types
```

---

## API Reference

All routes return real YouTube data. No mocks.

### `GET /api/search?q=KEYWORD&max=10`
Search channels by keyword. Returns analyzed channels + niche score.

### `GET /api/channel?url=YOUTUBE_URL`
Analyze a single channel. Accepts any YouTube URL format.

### `GET /api/niche?q=KEYWORD`
Deep niche analysis: competition level, demand level, all channels.

### `GET /api/clone?url=YOUTUBE_URL`
Enter any channel URL → get related channels, faster-growing alternatives, hidden gems.

### `GET /api/breakout?niche=OPTIONAL`
Detect breakout channels. Pass `niche` to focus on a specific topic.

### `GET /api/trending`
Emerging niches and breakout channels from recent activity.

### `GET /api/opportunities?type=faceless|opportunities`
Faceless channel detection or top opportunity channels.

---

## Why no database?

NEXLEV uses in-memory caching on purpose. YouTube's free API tier is the constraint — not storage. A database would add cost and complexity without solving the real bottleneck.

For production at scale, add Upstash Redis (free tier available) via the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars.

---

## Limitations

- **No historical data**: YouTube's free API doesn't expose subscriber history. Growth rates are estimated from total ÷ channel age.
- **No video-level analysis**: Parsing individual video titles/thumbnails would cost 100 units per search. NEXLEV uses channel-level signals instead.
- **Faceless detection is probabilistic**: Based on text signals in title/description. Not 100% accurate.
- **10K units/day**: With caching, this comfortably handles 20-30 unique searches/day.

---

## License

MIT

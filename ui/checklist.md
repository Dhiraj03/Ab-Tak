# UI Checklist - Ab Tak

## Status: ✅ DEMO-READY

**Live URL:** https://ab-tak.pages.dev

---

## Completed ✅

### Setup
- [x] Create Vite React TypeScript app in `ui/`
- [x] Add `react-router-dom`
- [x] Add base CSS files
- [x] Add initial page and component folders
- [x] Add fixture and config utilities

### Contracts (Frozen)
- [x] Define `GenerateRequest`
- [x] Define `GenerateResponse`
- [x] Define `QaRequest`
- [x] Define `QaResponse`
- [x] Define `RunRecord`
- [x] Define judge score types
- [x] Define agent trace types

### Homepage - Demo-Ready News Channel
- [x] Simple, clean header with brand and "New Bulletin" button
- [x] Single bulletin player (one at a time for demo)
- [x] Default bulletin auto-displayed on page load
- [x] "ON AIR" badge with pulsing animation
- [x] Loading overlay when generating new bulletin
- [x] Refresh button with spinner state
- [x] Error handling with dismiss
- [x] Transcript always visible
- [x] Quality score display (calculated average)
- [x] About panel with stats (drafts, agents, gen time)

### Result UI
- [x] Build audio player section
- [x] Build transcript panel
- [x] Build source list
- [x] Build judge score card
- [x] Add source links

### Q&A UI
- [x] Build Q&A input
- [x] Build submit action
- [x] Build loading state
- [x] Build answer card
- [x] Show answering agent badge
- [x] Show answer sources
- [x] Add fixture-backed response flow

### Observability
- [x] Add `/observability` route
- [x] Add observability page shell
- [x] Build run list panel
- [x] Build trace panel
- [x] Render fixture run data
- [x] Show judge details in trace area
- [x] Show Q&A events in trace area

### Styling
- [x] Add CSS variables in `variables.css`
- [x] Add reset and base rules in `global.css`
- [x] Add layout rules in `layout.css`
- [x] Add component styles in `components.css`
- [x] Make homepage responsive
- [x] Make observability page responsive
- [x] Apply distinctive editorial aesthetic (Newsreader + JetBrains Mono)
- [x] Dark newsroom palette with copper/amber accents

### Integration Readiness
- [x] Centralize API access in `src/lib/api.ts`
- [x] Read backend base URL from config
- [x] Keep components independent from fixture source details
- [x] Match contract names with backend plan

### Deployment
- [x] Add Cloudflare Pages-compatible build setup
- [x] Add wrangler.toml with project name `ab-tak`
- [x] Add `npm run deploy` command (builds + deploys)
- [x] Live deployment verified

---

## Backend Requirements (For Person A)

### Required API Endpoints

#### 1. `POST /api/generate`
**Purpose:** Generate a new news bulletin

**Request:**
```json
{
  "task": "Cover the top global stories from the last 2 hours"
}
```

**Response:**
```json
{
  "runId": "uuid",
  "status": "completed",
  "audioUrl": "https://.../bulletin.mp3",
  "transcript": "Full script text...",
  "sources": [
    {
      "title": "Story title",
      "url": "https://...",
      "source": "Reuters"
    }
  ],
  "judge": {
    "approvedDraft": 2,
    "scores": {
      "depth": 8,
      "accuracy": 9,
      "clarity": 8,
      "newsworthiness": 8,
      "audio_readiness": 9
    }
  }
}
```

**Implementation:**
- Fetch RSS feeds (BBC World, Reuters)
- Extract article text
- Run Monitor Agent → Editor Agent → Writer Agent → Judge Agent
- Generate TTS audio (ElevenLabs)
- Return complete response

---

#### 2. `POST /api/qa`
**Purpose:** Answer user questions about bulletins

**Request:**
```json
{
  "runId": "uuid",
  "question": "What's the background on this story?"
}
```

**Response:**
```json
{
  "agent": "Context Agent",
  "answer": "Three sentence answer...",
  "sources": [
    {
      "title": "Source title",
      "url": "https://..."
    }
  ],
  "durationMs": 1200
}
```

**Implementation:**
- Classify question type (context/fact/opinion)
- Route to appropriate agent
- Return answer with agent badge

---

#### 3. `GET /api/runs`
**Purpose:** List all bulletin runs

**Response:**
```json
[
  {
    "run_id": "uuid",
    "timestamp": "2026-04-19T18:40:00.000Z",
    "task": "string",
    "status": "completed",
    "agents": [...],
    "transcript": "string",
    "sources": [...],
    "audio_url": "string",
    "judge": {...},
    "qa_events": [...],
    "total_duration_ms": 34400,
    "total_cost_usd": 0.098
  }
]
```

---

#### 4. `GET /api/runs/:id`
**Purpose:** Get single run details

**Response:** Same as list item above

---

### Backend Architecture Notes

**Person A Responsibilities:**
- RSS ingestion (BBC World, Reuters)
- Article extraction (@mozilla/readability)
- Agent pipeline implementation
- ElevenLabs TTS integration
- Run persistence (JSON files)
- API routes

**Agent Pipeline:**
1. **Monitor Agent** - Fetch and rank stories
2. **Editor Agent** - Select top 3, set angles
3. **Writer Agent** - Generate broadcast script
4. **Judge Agent** - Score and approve
5. **Voice Agent** - Convert to audio

**Stack:**
- TypeScript
- Cloudflare Workers (for deployment compatibility)
- JSON file storage (no database needed)

---

## Next Steps

### Option 1: Continue UI Polish (Person B)
- [ ] Add loading skeletons
- [ ] Add copy-to-clipboard for transcript
- [ ] Add share link functionality
- [ ] Add keyboard shortcuts
- [ ] Add sound effects for interactions

### Option 2: Backend Integration Prep
- [ ] Document exact API contract for Person A
- [ ] Add CORS configuration for backend
- [ ] Test backend endpoints once ready
- [ ] Swap fixture data for real API calls

### Option 3: Content & Fixtures
- [ ] Create more diverse fixture bulletins
- [ ] Add different categories (Tech, World, Business)
- [ ] Improve transcript quality in fixtures

---

## Integration Test Plan

When backend is ready:

1. Set `VITE_API_BASE_URL` in `.env`
2. Update `src/lib/api.ts` to use real endpoints
3. Test each flow:
   - Generate new bulletin
   - Play audio
   - Read transcript
   - Click sources
   - Ask Q&A question
   - Check observability
4. Deploy updated UI
5. Full end-to-end demo

---

## Demo Script (Current)

1. **Landing** - "This is Ab Tak, a 24/7 AI newsroom"
2. **Current Bulletin** - "Here's what's on air now"
3. **Click New Bulletin** - "Let's generate fresh news"
4. **Loading State** - "The AI is running: Monitor → Editor → Writer → Judge → Voice"
5. **New Bulletin Appears** - Audio ready, transcript visible
6. **Q&A** - "Ask a question about the story"
7. **Observability** - "See how the agents worked together"

---

Updated: 2026-04-19
Status: UI Complete ✅ | Waiting for Backend 🔄

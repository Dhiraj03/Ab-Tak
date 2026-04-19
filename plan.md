**Build Target**

With 3 hours and an empty repo, aim for a strong demo-first `L4-lite` build, not the full spec.

Ship this by the end:
- One public Next.js app
- One task input and `Generate Bulletin` button
- Pipeline runs end-to-end from RSS -> article extraction -> script -> judge -> TTS
- Audio player + transcript + source links
- Q&A box with `context` / `fact` / `opinion` routing
- `/observability` page backed by JSON files
- One working live deploy

Defer these unless you finish early:
- Dynamic L5 graph planning
- Run-vs-run diff
- Auto-refresh every 15 minutes
- Persistent cross-run memory
- Cost spike detection
- Full search across runs

**Core Principle**

To avoid blocking each other, freeze interfaces in the first 10 minutes and work against fixed contracts.

Use this contract set and do not renegotiate it mid-build.

**Fixed Contracts**

Frontend calls:
- `POST /api/generate`
- `POST /api/qa`
- `GET /api/runs`
- `GET /api/runs/:id`

`POST /api/generate` request:
```json
{
  "task": "Cover the top global stories from the last 2 hours"
}
```

`POST /api/generate` response:
```json
{
  "runId": "uuid",
  "status": "completed",
  "audioUrl": "/runs/<id>/bulletin.mp3",
  "transcript": "full script text",
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

`POST /api/qa` request:
```json
{
  "runId": "uuid",
  "question": "What's the background on this story?"
}
```

`POST /api/qa` response:
```json
{
  "agent": "Context Agent",
  "answer": "Three sentence answer",
  "sources": [
    {
      "title": "Source title",
      "url": "https://..."
    }
  ],
  "durationMs": 1200
}
```

Run record shape on disk:
```json
{
  "run_id": "uuid",
  "timestamp": "ISO",
  "task": "string",
  "status": "completed",
  "agents": [],
  "transcript": "string",
  "sources": [],
  "audio_url": "string",
  "judge": {},
  "qa_events": [],
  "total_duration_ms": 0,
  "total_cost_usd": 0
}
```

**Best Team Split**

**Person A: Pipeline + APIs**
Owns:
- RSS ingestion
- Article extraction
- Monitor, Editor, Writer, Judge prompts
- ElevenLabs
- Q&A routing
- JSON run logging
- API routes

**Person B: UI + Observability + Deploy**
Owns:
- App shell
- Generate form
- Status strip
- Audio player
- Transcript and source cards
- Q&A UI
- `/observability` page
- Vercel deployment
- Fallback mock data for parallel work

This is the cleanest split because Person B can build against mock JSON immediately while Person A builds real APIs.

**3-Hour Build Plan**

**0:00-0:10**
Shared setup only.
- Create Next.js app
- Add env placeholders
- Agree exact API contracts above
- Create one sample `run.json` fixture
- Decide 2 RSS feeds only for v1: BBC World + Reuters
- Decide one ElevenLabs voice and lock it

Exit condition:
- Both people can work independently with zero further design discussion

**0:10-1:00**

Person A:
- Install parser/readability/llm/tts deps
- Build `fetchFeeds()` for top items
- Build `extractArticleText()` for top 3-5 items
- Build `Monitor Agent` ranking output
- Build `Editor Agent` story selection
- Return stub transcript if Writer is not ready yet

Person B:
- Build homepage layout
- Task input + generate button + loading state
- Animated status strip with hardcoded steps
- Audio player section
- Transcript section
- Sources list
- Use local mock JSON so UI is finishable without backend

Exit condition:
- A can produce structured ranked stories in terminal or API
- B has a complete clickable UI using fixture data

**1:00-2:00**

Person A:
- Build `Writer Agent`
- Build `Judge Agent` scoring + max one rewrite loop
- Build ElevenLabs MP3 generation
- Persist run JSON and MP3 in predictable local paths
- Implement `POST /api/generate`

Person B:
- Replace fixture mode with live `POST /api/generate`
- Show real status progression based on returned phase updates or coarse polling
- Build `/observability` page reading run list and run detail
- Display per-agent duration, summary, and judge scores
- Add error state and “try again” UX

Exit condition:
- End-to-end generate works locally
- User can listen to audio and inspect one run

**2:00-3:00**

Person A:
- Build `POST /api/qa`
- Add classifier for `context` / `fact` / `opinion`
- Append Q&A events into run log
- Add basic cost and duration estimates
- Hardening: empty feed, article parse failure, TTS failure

Person B:
- Build Q&A box and answer card with agent badge
- Wire `/observability` refresh after new run / QA
- Deploy to Vercel
- Test happy path on public URL
- Tighten UI copy for demo flow

Exit condition:
- Public URL works
- Generate + play + ask question + observability all work once end-to-end

**What To Cut First If Time Slips**

Cut in this order:
1. Auto-regenerate every 15 minutes
2. Dynamic task-based graph planning
3. Run-vs-run comparison
4. Search/filter in observability
5. Persistent cross-run memory
6. Real-time token counter
7. Agent animation polish

Do not cut:
- Working audio
- Transcript + source links
- Judge scores visible somewhere
- Q&A routing badge
- Observability page with at least one trace

**Recommended File Layout**

```text
app/
  page.tsx
  observability/page.tsx
  api/generate/route.ts
  api/qa/route.ts
  api/runs/route.ts
  api/runs/[id]/route.ts

components/
  generate-form.tsx
  status-strip.tsx
  audio-player.tsx
  transcript-panel.tsx
  qa-box.tsx
  observability-run-list.tsx
  observability-trace.tsx

lib/
  feeds.ts
  readability.ts
  agents.ts
  prompts.ts
  tts.ts
  run-store.ts
  types.ts
  cost.ts

data/
  runs/
```

**Implementation Notes**

To keep independence high:
- Person B should not wait for streaming or websockets; use simple request/response and polling if needed
- Person A should write run JSON in the final shape from the start
- Person B should build observability directly from run JSON, not a separate view model
- Use one shared `types.ts` file as the only collaboration artifact

**Hourly Check-In Doc**

Paste this into a shared doc and update it at `:55` each hour.

```md
# AI Media Desk - 3 Hour Build Check-In

## Build Goal
Public demo URL that can:
1. Generate a news bulletin from live RSS
2. Play audio
3. Show transcript and source links
4. Answer one Q&A prompt
5. Show run trace in observability

## Frozen Scope
In:
- RSS -> script -> judge -> audio
- Homepage UI
- Q&A routing
- Observability page
- Vercel deploy

Out unless early:
- Dynamic graph planning
- Run-vs-run diff
- Search
- Auto-refresh
- Persistent memory

## Shared Contracts
- POST /api/generate
- POST /api/qa
- GET /api/runs
- GET /api/runs/:id

## Hour 1 Check-In
Owner A status:
- Done:
- Blockers:
- Next:
- Confidence (1-5):

Owner B status:
- Done:
- Blockers:
- Next:
- Confidence (1-5):

Decision:
- Keep scope / cut scope

## Hour 2 Check-In
Owner A status:
- Done:
- Blockers:
- Next:
- Confidence (1-5):

Owner B status:
- Done:
- Blockers:
- Next:
- Confidence (1-5):

Decision:
- Keep scope / cut scope

## Final Hour Check-In
Owner A status:
- Done:
- Blockers:
- Next:
- Confidence (1-5):

Owner B status:
- Done:
- Blockers:
- Next:
- Confidence (1-5):

Decision:
- Demo-ready / fallback plan needed

## Demo Script
- Enter task
- Generate bulletin
- Play audio
- Show transcript and source
- Ask one question
- Open observability
- Show judge rewrite loop

## Fallback Plan
If TTS fails:
- Use transcript-only mode and say "audio generation unavailable"

If full article extraction fails:
- Use RSS summaries and explicitly label as lighter bulletin

If Q&A is unstable:
- Ship one fixed agent type: Context Agent only

If observability is behind:
- Render raw run JSON prettily on /observability
```

**Hour-by-Hour Success Criteria**

Hour 1 success:
- Person A can fetch and rank stories
- Person B has a working shell with fixture data

Hour 2 success:
- Local end-to-end generation returns transcript, audio URL, judge scores

Hour 3 success:
- Public demo works from fresh browser session

**Risk Register**

Highest risks:
- Readability extraction breaks on some sites
- ElevenLabs latency is slower than expected
- LLM prompts overrun context or take too long
- Vercel file persistence is awkward for MP3 and JSON

Mitigations:
- Use only 2 feeds and top 3 stories
- Store local files for demo first, then adapt deploy
- If Vercel file writing is painful, use client-downloadable audio URL or temporary in-memory/base64 fallback for demo
- Keep one rewrite loop max
- Do not chase true dynamic orchestration today

**Recommended Demo Positioning**

Present it as:
- “An autonomous AI newsroom with a visible editorial pipeline”
- Not:
- “A fully productionized news platform”

That framing matches what you can realistically ship in 3 hours.

If you want, I can turn this into a tighter execution checklist with exact prompts for each agent and the minimum viable API implementation order.
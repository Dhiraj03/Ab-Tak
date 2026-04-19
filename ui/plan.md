# UI Plan

## Goal
Ship a frontend-first AI Media Desk experience that feels like a real product now and can be integrated later with a TypeScript backend without redesign.

## Current Ownership
Person B owns the UI work in `ui/`.

Person A will build the backend independently in `backend/` later.

## Frontend Scope
In scope now:
- Homepage
- Task input
- Generate Bulletin flow
- Status strip
- Audio player section
- Transcript panel
- Source cards
- Judge score display
- Q&A box
- Observability page scaffold
- Cloudflare Pages deployment for the UI

Out of scope for the first UI pass:
- Real backend integration
- Streaming updates
- WebSockets
- Authentication
- Auto-refresh every 15 minutes
- Search and filtering
- Run-vs-run diff
- Dynamic L5 planning behavior
- Full production observability features

## Technical Decisions
- Frontend lives in `ui/`
- Stack is `Vite + React + TypeScript`
- Styling is plain CSS
- Routing uses `react-router-dom`
- Deployment target is Cloudflare Pages
- Backend will be TypeScript and should remain easy to deploy to Cloudflare later
- UI uses a fixture-first API layer
- Real backend integration will be done through `VITE_API_BASE_URL`

## Product Experience Target
The UI should look and behave like an autonomous AI newsroom product, even before the backend is connected.

Expected user flow:
1. User lands on the homepage and understands the product immediately.
2. User enters a news task.
3. User clicks `Generate Bulletin`.
4. The UI shows believable pipeline progress.
5. The result area shows audio, transcript, sources, and judge scores.
6. The user asks a follow-up question.
7. The UI shows a response card with the answering agent badge.
8. The user can open `/observability` to inspect a run view.

## Visual Direction
Use a modern newsroom feel rather than a generic SaaS dashboard.

Design principles:
- Editorial, high-contrast visual tone
- Strong headline typography
- Clear hierarchy between generation flow and output
- Compact information cards for scores, sources, and trace details
- Two-column desktop layout where useful
- Single-column mobile layout without layout breakage

## App Routes
- `/` homepage
- `/observability` observability page

## Frozen Integration Contracts
The UI must align to these API contracts later.

### `POST /api/generate`
Request:
```json
{
  "task": "Cover the top global stories from the last 2 hours"
}
```

Response:
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

### `POST /api/qa`
Request:
```json
{
  "runId": "uuid",
  "question": "What's the background on this story?"
}
```

Response:
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

### Run record shape
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

## UI State Model
Generate flow states:
- `idle`
- `generating`
- `completed`
- `error`

Q&A states:
- `idle`
- `loading`
- `answered`
- `error`

## Planned Frontend Structure
```text
ui/
  plan.md
  checklist.md
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  public/
  src/
    main.tsx
    app/
      App.tsx
      routes.tsx
    pages/
      home-page.tsx
      observability-page.tsx
    components/
      generate-form.tsx
      status-strip.tsx
      audio-player.tsx
      transcript-panel.tsx
      source-list.tsx
      qa-box.tsx
      judge-score-card.tsx
      run-list.tsx
      trace-panel.tsx
    lib/
      types.ts
      api.ts
      fixtures.ts
      status.ts
      config.ts
    styles/
      variables.css
      global.css
      layout.css
      components.css
```

## CSS Plan
- `variables.css`: colors, spacing, radii, shadows, typography tokens
- `global.css`: reset, body styles, anchors, buttons, inputs, base text
- `layout.css`: page shell, grids, responsive breakpoints, spacing rules
- `components.css`: cards, badges, status strip, source items, trace rows, panels

## Component Plan
### Homepage
- `generate-form.tsx`
- `status-strip.tsx`
- `audio-player.tsx`
- `transcript-panel.tsx`
- `source-list.tsx`
- `judge-score-card.tsx`
- `qa-box.tsx`

### Observability
- `run-list.tsx`
- `trace-panel.tsx`

## Fixture-First Build Strategy
Build the full UI against local fixtures first.

Rules:
- Components should not fetch data directly.
- All API access should go through `src/lib/api.ts`.
- Fixture responses should mirror the final backend contract.
- Replacing fixtures with live backend calls should require minimal or no component changes.

## Integration Rules
- `src/lib/types.ts` is the source of truth for frontend contract shapes.
- `src/lib/api.ts` is the only place that talks to backend endpoints.
- Components must not hardcode backend URLs.
- Backend base URL must come from configuration.
- Do not assume same-origin API hosting.
- Do not assume server rendering.

## Cloudflare Deployment Plan
Phase 1:
- Deploy the UI as a static Vite app on Cloudflare Pages.

Phase 2:
- Integrate with the TypeScript backend through environment-configured HTTP APIs.

Required env var for UI:
- `VITE_API_BASE_URL`

## Hour 1 Success Criteria
By the first checkpoint, Person B should have:
- UI structure and plan frozen
- Component and page list frozen
- Fixture-driven homepage flow defined
- Status strip behavior defined
- Observability route scoped
- Deployment target fixed to Cloudflare Pages
- A live checklist that can be updated continuously during the build

## Immediate Build Order
1. Create the Vite app in `ui/`.
2. Add routing and base CSS files.
3. Define shared frontend contract types.
4. Add fixture-backed API helpers.
5. Build the homepage shell.
6. Build the generate flow and hardcoded status progression.
7. Build transcript, sources, judge card, and Q&A shell.
8. Scaffold the observability page.
9. Deploy the UI to Cloudflare Pages.

## Notes To Keep Updating
- Record design decisions here when they become stable.
- Record scope cuts here if time slips.
- Keep this file aligned with the actual UI architecture.

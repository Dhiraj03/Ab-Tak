# UI Checklist - Ab Tak

## Status: ✅ WORKSPACE SETUP COMPLETE

**Live URL:** https://ab-tak.pages.dev

---

## Completed ✅

### Workspace Setup
- [x] Root `package.json` with npm workspaces
- [x] `backend/package.json` created
- [x] `backend/wrangler.toml` created
- [x] `backend/index.ts` Worker entrypoint
- [x] `backend/tsconfig.json` added
- [x] `ui/.env.production` created
- [x] One-command install: `npm install`
- [x] One-command build: `npm run build`
- [x] One-command deploy: `npm run deploy`

### API Contracts (Frozen)
- [x] `POST /api/generate` - Backend + Frontend
- [x] `POST /api/qa` - Backend + Frontend
- [x] `GET /api/runs` - Backend + Frontend
- [x] `GET /api/runs/:id` - Backend + Frontend

### Secrets Management
- [x] Hardcoded API key removed from `agents.ts`
- [x] `env.OPENROUTER_API_KEY` wired through
- [x] Wrangler secret commands ready:
  - `npm run secret:openrouter -w backend`
  - `npm run secret:elevenlabs -w backend`

### Frontend
- [x] 24/7 news channel UI
- [x] API integration layer with fixture fallback
- [x] Configurable backend URL via `VITE_API_BASE_URL`

---

## Deployment Workflow

### First-Time Setup (One-Time)

1. **Deploy backend first** to get the Worker URL:
```bash
npm run deploy:backend
```
Note the URL (e.g., `https://ab-tak-api.workers.dev`)

2. **Set the API key secret** (rotate the exposed one first):
```bash
npm run secret:openrouter -w backend
# Enter your new OpenRouter API key
```

3. **Update frontend config** in `ui/.env.production`:
```env
VITE_API_BASE_URL=https://ab-tak-api.<your-subdomain>.workers.dev
```

4. **Deploy frontend**:
```bash
npm run deploy:ui
```

### Subsequent Deploys (One Command)

After the first setup, just run:
```bash
npm run deploy
```

This will:
1. Deploy backend Worker
2. Deploy frontend Pages

### Development Commands

```bash
# Install everything
npm install

# Build everything
npm run build

# Dev mode (both frontend and backend)
npm run dev

# Dev mode (backend only)
npm run dev:backend

# Dev mode (frontend only)
npm run dev:ui
```

---

## Backend Status

**Current Implementation:**
- Worker entrypoint with 4 API routes
- RSS feed fetching (BBC, Al Jazeera)
- Monitor Agent (deterministic ranking)
- Editor Agent (deterministic brief creation)
- In-memory run storage (for demo)

**Known Limitations for Buildathon:**
- ⚠️ LLM calls are stubbed (returns null, falls back to deterministic)
- ⚠️ No audio generation yet (TTS pending)
- ⚠️ No full article extraction (using RSS summaries only)
- ⚠️ No Judge Agent rewrite loop
- ⚠️ No Writer Agent (just stub transcript)

**Acceptable for Demo:**
- RSS stories are real
- Pipeline runs end-to-end
- API contract matches
- Frontend can integrate

---

## Quick Test

Before full deploy, test backend locally:
```bash
npm run dev:backend
# In another terminal:
curl http://localhost:8787/health
```

Should return: `{"status":"ok"}`

---

## Next Steps (Priority Order)

### Critical (Before First Deploy)
1. [ ] Rotate exposed OpenRouter API key
2. [ ] Run `npm run secret:openrouter -w backend`
3. [ ] Deploy backend: `npm run deploy:backend`
4. [ ] Update `ui/.env.production` with backend URL
5. [ ] Deploy frontend: `npm run deploy:ui`

### Nice to Have (If Time Permits)
- [ ] Enable LLM calls in agents (uncomment + test)
- [ ] Add ElevenLabs TTS for audio
- [ ] Add more fixture runs for observability
- [ ] Add Judge Agent scoring
- [ ] Add Writer Agent for real transcripts

---

## Emergency Fallbacks

**If backend fails to deploy:**
- Frontend still works with fixtures
- Demo can use fixture mode only
- Update `ui/.env.production` to empty string to force fixtures

**If jsdom/readability breaks in Workers:**
- Backend already falls back to RSS summaries
- No code change needed

**If API calls fail:**
- Frontend automatically falls back to fixtures
- Zero-downtime demo possible

---

Updated: 2026-04-19
Status: Workspace Complete ✅ | Backend Deploy Pending 🔄

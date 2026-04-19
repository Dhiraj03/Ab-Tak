# Deployment Guide - Ab Tak 82-Point Plan

## Prerequisites

1. Cloudflare account with Workers and Pages access
2. OpenRouter API key (for LLM calls)
3. ElevenLabs API key (optional, for audio generation)
4. Wrangler CLI installed and authenticated

## First-Time Setup

### Step 1: Create D1 Database

```bash
cd backend
wrangler d1 create ab-tak-runs
```

This will output a database ID. Copy it and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "ab-tak-runs"
database_id = "<your-database-id-from-above>"
```

### Step 2: Deploy Backend

```bash
# Set secrets
wrangler secret put OR_API_KEY
# Enter your OpenRouter API key

wrangler secret put ELEVENLABS_API_KEY
# Enter your ElevenLabs API key (optional)

# Deploy the backend
npm run deploy:backend
```

Note the deployed Worker URL (e.g., `https://ab-tak-api.your-subdomain.workers.dev`)

### Step 3: Configure Frontend

Create `ui/.env.production`:

```env
VITE_API_BASE_URL=https://ab-tak-api.your-subdomain.workers.dev
```

### Step 4: Deploy Frontend

```bash
npm run deploy:ui
```

Your app will be live at `https://ab-tak.your-pages-subdomain.pages.dev`

## Subsequent Deployments

```bash
# Deploy everything
npm run deploy
```

## Development

```bash
# Run everything locally
npm run dev

# Backend only (with D1 local)
npm run dev:backend

# Frontend only
npm run dev:ui
```

## Verification Checklist

After deployment, verify these 82-Point Plan requirements:

### ✅ Task 1: Real Free-Text Task Input
- [ ] User can type custom tasks in the homepage form
- [ ] Custom task is sent to POST /api/generate
- [ ] Result reflects the specific task entered

### ✅ Task 2: Fixture Fallback Disabled
- [ ] Staging/production requires VITE_API_BASE_URL
- [ ] Missing config shows clear error instead of silent fixtures
- [ ] Fixtures only work in local dev mode

### ✅ Task 3: Backend Pipeline Coherence
- [ ] Backend builds without TypeScript errors
- [ ] callLLM uses real OpenRouter API when key is provided
- [ ] Pipeline properly passes API keys through

### ✅ Task 4: Deployed End-to-End
- [ ] Public URL accessible
- [ ] Generate flow completes: task → output
- [ ] Sources are live RSS feeds
- [ ] No manual intervention needed

### ✅ Task 5: Persist Runs to D1
- [ ] Runs survive refresh/restart
- [ ] GET /api/runs returns historical runs
- [ ] Database is properly configured

### ✅ Task 6: Agent Traces
- [ ] agents array populated in run records
- [ ] Each agent has: name, input, output, duration, tokens, cost
- [ ] TracePanel shows real trace data

### ✅ Task 7: Duration and Cost
- [ ] total_duration_ms is real (not 0)
- [ ] total_cost_usd is estimated (not 0)
- [ ] Values visible in observability page

### ✅ Task 8: Observability Page
- [ ] Page loads real data from backend
- [ ] No fixture language in UI
- [ ] Run list shows historical runs
- [ ] Clicking run shows full trace

### ✅ Task 9: Eval Set
- [ ] eval/manual-eval-set.json exists
- [ ] 5 tasks with expected dimensions
- [ ] Can run manually and score results

### ✅ Task 10: Grounded Q&A
- [ ] Q&A answers change based on run context
- [ ] Cites at least one source from the run
- [ ] Routes by question type (context/fact/source)

## Troubleshooting

### Backend build fails
```bash
npm install -w backend
npm run build:backend
```

### D1 database not found
Ensure the `database_id` in `wrangler.toml` matches the created database.

### Frontend shows "Unable to generate"
Check that `VITE_API_BASE_URL` is set correctly in `.env.production` and that the backend Worker is deployed.

### No audio generated
- Verify `ELEVENLABS_API_KEY` is set via `wrangler secret put`
- Check browser console for errors
- Backend logs in Cloudflare dashboard

## Secrets Management

All secrets are managed via Wrangler (not in code):

```bash
wrangler secret put OR_API_KEY
wrangler secret put ELEVENLABS_API_KEY
```

## Monitoring

Check Cloudflare dashboard for:
- Worker invocations and errors
- D1 query performance
- Pages deployment status

# AI Media Desk — Full Product Spec

## One Line
An autonomous AI newsroom that generates broadcast-quality audio bulletins from live news and answers listener questions in real time.

---

## Core Product

A publicly hosted webpage that functions as a personal radio news station. It fetches live articles from RSS feeds, writes a broadcast-quality script through a multi-agent pipeline, converts it to audio, and plays it automatically. Between bulletins, listeners ask questions which are routed to specialist agents and answered in real time. Every run is fully traced in an observability panel.

---

## What the User Experiences

1. Opens the live public URL
2. Sees "Generating your bulletin..." for under 90 seconds
3. Audio plays automatically — a 2-3 minute radio-style news bulletin
4. Transcript and source links appear below the player
5. Types a question in the Q&A box
6. Gets a response in under 10 seconds, agent type visible on screen
7. Bulletin auto-regenerates every 15 minutes

---

## Agent Architecture

### L4 Org — Static Specialist Pipeline With Dynamic Q&A

```
Orchestrator (Manager)
├── Monitor Agent
│     — fetches top 10 items from 2-3 RSS feeds in parallel
│     — fetches full article text via Readability for top 5
│     — scores each story: recency, significance, source credibility
│     — outputs ranked story list with full text
│
├── Editor Agent  
│     — selects top 3 stories from ranked list
│     — decides running order and angle for each
│     — outputs structured brief: story, angle, key facts, tone
│
├── Writer Agent
│     — receives Editor brief with full article text
│     — writes 300-word broadcast script
│     — format: cold open → headlines tease → story 1 → story 2 → story 3 → sign-off
│     — outputs script text
│
├── Judge Agent
│     — scores script on 5 named criteria (1-10 each):
│         * Depth: are specific figures and named sources present?
│         * Accuracy: are claims traceable to source article text?
│         * Clarity: is the script free of jargon and ambiguity?
│         * Newsworthiness: are these the most significant stories?
│         * Audio-readiness: does it read naturally when spoken aloud?
│     — if any criterion scores below 7: generates targeted rewrite
│         instruction back to Writer (max 2 loops)
│     — logs: draft number, scores, reason, rewrite instruction
│     — outputs approved script only
│
├── Voice Agent
│     — receives approved script from Judge
│     — sends to ElevenLabs with broadcast voice settings
│     — returns MP3 file
│     — outputs hosted audio URL
│
└── On every Q&A question received:
      Orchestrator reads question, classifies type →
      ├── "context"   → Context Agent
      │     — fetches fresh NewsAPI/RSS results for named topic
      │     — returns 3-sentence background summary
      ├── "opinion"   → Commentary Agent  
      │     — generates pundit-style take with named perspective
      │     — returns 2-3 sentence commentary
      └── "fact"      → Fact Agent
            — returns direct factual answer with source
            — flags if answer cannot be verified
```

### L5 Org — Dynamic Decomposition (Upgrade Path)

The Orchestrator receives a **free-text task string** from the mentor instead of a fixed button press. It reads the task and plans the agent graph dynamically before execution.

```
Task: "Cover the India elections situation"
Orchestrator plans:
→ Spawn Regional Specialist Agent (India-focused RSS feeds)
→ Add second Fact-Check Agent (high-stakes political content)
→ Increase source count from 3 to 5
→ Add geopolitical framing instruction to Writer prompt
→ Escalate Judge threshold from 7 to 8 (higher stakes)

Task: "Cover today's IPL highlights"
Orchestrator plans:
→ Sports Monitor Agent only (ESPN Cricinfo + BBC Sport RSS)
→ Skip geopolitical agents entirely
→ Add Commentary Agent for match analysis
→ Lighter fact-check requirement
→ More conversational tone instruction to Writer

Task: "Breaking news on the Turkey earthquake"
Orchestrator plans:
→ Crisis Agent (real-time feeds only, last 30 mins)
→ Accelerated pipeline (skip opinion layer)
→ Fact-check Agent mandatory
→ Sombre tone instruction to Writer
→ Q&A pre-primed with crisis context
```

**Why this is L5:** The agent graph is not hardcoded. Different tasks produce genuinely different agent configurations at runtime. The Orchestrator is making real planning decisions, not following a fixed sequence. This is emergent decomposition — the rubric's explicit L5 criterion.

---

## Observability

### L4 Target — Visual Dashboard

A `/observability` page showing:

**Run list panel (left)**
- All bulletin runs, reverse chronological
- Each run shows: timestamp, task description, total duration, total cost, Judge Agent final score
- Click any run to inspect it

**Trace panel (right — on run click)**
- Each agent shown as a node in sequence
- Per agent: name, input summary, output summary, duration in ms, token count, cost in USD
- Judge Agent node expands to show: Draft 1 scores → rewrite instruction → Draft 2 scores → approval
- Q&A events listed below bulletin trace: question → agent spawned → answer → duration

**Data logged per run:**
```json
{
  "run_id": "uuid",
  "timestamp": "ISO string",
  "task": "free text task description",
  "agents": [
    {
      "name": "Monitor Agent",
      "input": "fetch top 10 stories",
      "output_summary": "10 stories fetched, 5 full articles extracted",
      "tokens": 450,
      "duration_ms": 2100,
      "cost_usd": 0.002
    },
    {
      "name": "Judge Agent",
      "drafts": [
        {
          "draft": 1,
          "scores": {
            "depth": 6,
            "accuracy": 8,
            "clarity": 7,
            "newsworthiness": 7,
            "audio_readiness": 6
          },
          "overall": 6.8,
          "rewrite_triggered": true,
          "rewrite_instruction": "Lead story lacks specific figures. Add Ben Roberts-Smith charge count and exact crime specification."
        },
        {
          "draft": 2,
          "scores": {
            "depth": 9,
            "accuracy": 9,
            "clarity": 8,
            "newsworthiness": 8,
            "audio_readiness": 9
          },
          "overall": 8.6,
          "rewrite_triggered": false
        }
      ]
    }
  ],
  "qa_events": [
    {
      "question": "What exactly did Roberts-Smith do?",
      "agent_spawned": "Context Agent",
      "answer": "...",
      "tokens": 180,
      "duration_ms": 720,
      "cost_usd": 0.001
    }
  ],
  "total_cost_usd": 0.14,
  "total_duration_ms": 58000,
  "audio_url": "https://your-vercel-url/bulletins/run-uuid.mp3"
}
```

**Why this is L4:** Mentor can click into any run and see the full trace tree — who called whom, token and cost per step, what the Judge Agent decided and why. The rubric's L4 criterion explicitly requires trace tree, tokens, and tool calls in a visual dashboard.

### L5 Upgrade — Production-Grade Observability

Four additions on top of L4:

1. **Run-vs-run diff** — select any two run IDs, see side-by-side comparison of Judge scores, cost, duration, and script quality delta
2. **Search across runs** — full text search on task descriptions, agent outputs, Q&A questions
3. **Failure alerting** — if Judge Agent rejects both drafts or Voice Agent fails, a visible alert banner appears on the observability page with the failure reason
4. **Cost spike detection** — if a run costs more than 2x the rolling average, it's flagged automatically in the run list

**Why this is L5:** The rubric's L5 criterion explicitly lists: traces, filters, search, alerting, and run-vs-run diffs. These four additions hit every item on that list. A senior engineer would trust this to debug production.

---

## Evaluation and Iteration

### L3 Target — Named Eval Set, Runs Automatically

The Judge Agent's 5 criteria — Depth, Accuracy, Clarity, Newsworthiness, Audio-readiness — constitute your named eval set. Every bulletin run is automatically scored against all 5. Scores are logged to the observability store.

After 3+ runs exist, the observability panel shows a quality trend: are scores improving or degrading across runs? This is a manually reviewable eval set that runs on every bulletin automatically.

**Why this is L3:** A named eval set exists with specific criteria. It runs on every task automatically. Scores are visible and comparable across runs. The rubric's L3 criterion is exactly this — eval set exists and runs, even if not yet automated in a CI pipeline.

### L4 Upgrade Path

If time permits in hour 4: add a simple version tag to each run (`v1`, `v2` when you change a prompt). Observability panel can filter by version and show average Judge scores per version. That's a primitive but real automated eval pipeline — L4 territory.

---

## Agent Handoffs and Memory

### L3 — Structured JSON Within Task

Every agent receives and outputs structured JSON. Nothing is passed as raw text between agents. The full context — fetched articles, Editor brief, Writer draft, Judge scores — accumulates in a single run object that each agent appends to.

```javascript
// Each agent receives the full run context and adds to it
const runContext = {
  task: "...",
  stories: [],        // Monitor adds this
  brief: {},          // Editor adds this  
  script: "",         // Writer adds this
  judgeScores: [],    // Judge adds this
  audioUrl: ""        // Voice adds this
}
```

**Why this is L3:** Context survives the full pipeline within a task. No agent re-asks for information a previous agent already gathered. Handoffs are complete, not lossy.

### L4 Upgrade — Persistent Cross-Task Memory

Store the last 5 run contexts in a JSON file on disk. When a new bulletin generates, the Editor Agent receives the previous bulletin's story selection and explicitly avoids repeating the same lead story. The system remembers what it already covered.

```javascript
// Editor Agent prompt includes:
"Previous bulletins covered: [story 1 from last run], [story 2 from last run].
Do not select these as lead stories unless significant new developments exist."
```

**Why this is L4:** The system remembers past tasks and uses that memory to make better decisions in the current task. That's persistent memory across tasks — the rubric's explicit L4 criterion.

---

## Cost and Latency

### Target L4 — Under 90 Seconds, Under $0.20

| Step | Model | Expected time | Expected cost |
|---|---|---|---|
| RSS fetch + article extraction | — | 3-5s | $0.00 |
| Monitor Agent scoring | Haiku | 2-3s | $0.002 |
| Editor Agent | Haiku | 2-3s | $0.002 |
| Writer Agent Draft 1 | Sonnet | 8-12s | $0.04 |
| Judge Agent evaluation | Haiku | 3-5s | $0.003 |
| Writer Agent Draft 2 (if triggered) | Sonnet | 8-12s | $0.04 |
| Judge Agent re-evaluation | Haiku | 2-3s | $0.002 |
| Voice Agent (ElevenLabs) | — | 15-25s | $0.05 |
| **Total** | | **43-68s** | **~$0.14** |

Well within L4 bounds (1-5 mins, under $0.50). Nowhere near L5 (under 1 min, under $0.10) — don't chase L5 here, it requires sacrificing script quality.

---

## Management UI

### L3 Target — Functional, Non-Engineer Operable

Single page UI with:
- Task input box at top — free text, e.g. "Cover the top global stories"
- "Generate Bulletin" button
- Live status strip showing which agent is currently running
- Audio player (auto-plays when ready)
- Transcript panel with source links
- Q&A input box at bottom
- Link to `/observability` panel

A non-engineer can sit down, type a task, and operate the full product without explanation.

**Why this is L3:** Functional UI with enough polish that a PM could operate it with documentation. The rubric's L3 criterion exactly.

### L4 Upgrade — Clean UI, One Walkthrough

Add:
- Agent org diagram that animates as each agent runs (highlight active agent)
- Real-time token counter updating as pipeline runs
- Q&A response shows agent type badge ("answered by Context Agent")
- One-sentence tooltip on each agent explaining its role

A non-engineer who gets one 2-minute walkthrough can fully operate and understand the system.

---

## Real Output

### L4 — Live Public URL, Real Sources, No Babysitting

- Vercel deployment — publicly accessible URL, no login required
- Audio generated from real RSS articles published in last 2 hours
- Mentor can verify sources by clicking links in transcript
- Bulletin generates and plays without any human intervention after task is submitted
- Q&A responds without human involvement

**Why this is L4:** Real output lands on a real public surface autonomously. Mentor can verify source quality. No babysitting required after task submission. The rubric's L4 criterion exactly.

### L5 — Production Quality Output

Three specific things separate L4 from L5 here:

**1. Script quality is genuinely journalistic**
Full article text (not headlines) flows into Writer Agent. Scripts contain specific figures, named sources, concrete details. A listener would not immediately identify it as AI-generated.

**2. Judge Agent rewrite loop demonstrably improves quality**
Observability panel shows Draft 1 score → rewrite instruction → Draft 2 score. The delta is visible and real. Mentor can see the system improving its own output in real time.

**3. Factual claims are verified against source text**
Judge Agent cross-references every specific claim in the script against the fetched article text. Unverifiable claims are flagged and removed before Voice Agent runs. Zero hallucinations in the final output.

**Why this is L5:** Output is production quality — specific, accurate, broadcast-ready. The quality improvement loop is transparent and demonstrable. A paying customer (a radio station, a news app) could use this output tomorrow without embarrassment.

---

## Stack

```
Next.js 14 (App Router)     — frontend + API routes
Claude Sonnet               — Orchestrator, Writer Agent
Claude Haiku                — Monitor, Editor, Judge, Q&A agents
RSS feeds                   — BBC World, Reuters (primary sources)
@mozilla/readability        — full article text extraction
rss-parser                  — RSS feed parsing
ElevenLabs API              — TTS audio generation
Vercel                      — deployment + audio file hosting
JSON file on disk           — observability log store
```

No database. No auth. No websockets. No multiple channels.

---

## The Demo Sequence

Mentor sits down. You hand them the URL and step back.

1. They type: *"Cover the top global stories from the last 2 hours"*
2. They watch the agent status strip — Monitor → Editor → Writer → Judge → Voice
3. Audio plays. They listen. Transcript appears with source links. They click one — it's a real BBC article.
4. They type a question in Q&A: *"What's the background on the Roberts-Smith case?"*
5. Answer appears in 8 seconds. Badge reads "Context Agent."
6. You open `/observability`. Show them the run trace. Point to the Judge Agent node — Draft 1 scored 6.8, rewrite triggered, Draft 2 scored 8.6, approved.
7. You say: *"The Orchestrator planned this agent graph based on your task. A breaking news task would spawn a Crisis Agent and skip the opinion layer entirely. A sports task routes to different specialists."*
8. You show them a previous run side by side. Scores, cost, duration, script delta.

Total mentor interaction: under 4 minutes. They touched nothing except typing the task and the Q&A question.

---

## Closing Line on Stage

*"This is one newsroom agent team covering world news. The architecture supports parallel teams — Sports, India, Finance, Breaking News — each with independent Monitor and Editor agents running simultaneously. That's the next build."*

---

## Projected Score

| Parameter | L4 Score | L5 Score | L5 Condition |
|---|---|---|---|
| Real output | 60 | 80 | Full article fetch works + audio quality passes broadcast test |
| Task decomposition | 15 | 20 | Free-text task input + dynamic agent graph per task type |
| Observability | 21 | 28 | Run-vs-run diff + search + alerting built in hour 4 |
| Evals | 10 | — | L4 requires version-tagged prompt iteration, skip if time-pressed |
| Handoffs | 4 | 8 | Persistent story memory across bulletins |
| Cost/latency | 3 | — | L5 requires under 1 min + under $0.10, not worth sacrificing quality |
| Management UI | 2 | — | L5 requires live non-eng onboarding test, not realistic in 4 hrs |
| **Total** | **115** | **149** | |

---

## Build Order

| Hour | What you build | Exit condition |
|---|---|---|
| 1 | RSS fetch → article extraction → Monitor → Editor → Writer → MP3 file exists | `node pipeline.js` produces an audio file |
| 2 | Webpage + audio player + Vercel deploy + Judge Agent + rewrite loop | Live URL exists, audio plays, Judge scores visible in console |
| 3 | Q&A dynamic agent spawning + observability JSON logging + `/observability` page | Mentor can submit a question and see which agent responded |
| 4 | Observability UI polish + run-vs-run diff + free-text task input + hardening | Demo flow runs 3 times without intervention |

**First 20 minutes of Hour 1:** Run the 5 pre-checks. Article fetch, ElevenLabs voice quality, latency estimate, claim verification logic, rewrite loop quality. These determine whether L5 is your target or L4. Do not skip them.
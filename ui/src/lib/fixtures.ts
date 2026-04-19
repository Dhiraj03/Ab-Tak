import type { GenerateResponse, QaResponse, RunRecord } from './types'

export const fixtureGenerateResponse: GenerateResponse = {
  runId: 'run-2026-04-19-001',
  status: 'completed',
  audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  transcript:
    'Good evening. Here is your AI Media Desk bulletin. World markets steadied after a fresh round of central bank signaling, relief supplies continued to move into earthquake-hit regions, and diplomatic pressure increased around the latest ceasefire talks. Across the top stories, officials emphasized supply resilience, emergency coordination, and the risk of further disruption if negotiations stall. We will keep the focus on what changed today, what matters next, and which details are confirmed by primary reporting.',
  sources: [
    {
      title: 'Markets digest latest central bank signals',
      url: 'https://www.reuters.com/world/',
      source: 'Reuters',
    },
    {
      title: 'Aid efforts expand after major earthquake',
      url: 'https://www.bbc.com/news/world',
      source: 'BBC',
    },
    {
      title: 'Diplomats push for ceasefire breakthrough',
      url: 'https://www.reuters.com/world/',
      source: 'Reuters',
    },
  ],
  judge: {
    approvedDraft: 2,
    scores: {
      depth: 8,
      accuracy: 9,
      clarity: 8,
      newsworthiness: 8,
      audio_readiness: 9,
    },
  },
}

export const fixtureQaResponse: QaResponse = {
  agent: 'Context Agent',
  answer:
    'The story has been building through a series of negotiations over the last several days, with officials balancing humanitarian access against security demands. The latest development matters because it changes the practical conditions on the ground rather than just the rhetoric around the talks. The safest framing is that the situation remains fluid, but the direction of travel is now clearer than it was this morning.',
  sources: [
    {
      title: 'Background reporting and latest updates',
      url: 'https://www.bbc.com/news/world',
      source: 'BBC',
    },
  ],
  durationMs: 1200,
}

export const fixtureRunRecord: RunRecord = {
  run_id: fixtureGenerateResponse.runId,
  timestamp: '2026-04-19T18:40:00.000Z',
  task: 'Cover the top global stories from the last 2 hours',
  status: 'completed',
  agents: [
    {
      name: 'Monitor Agent',
      input: 'Fetch top stories from BBC World and Reuters RSS feeds.',
      output_summary: '8 stories fetched and 4 strong candidates shortlisted.',
      duration_ms: 2100,
      cost_usd: 0.002,
      tokens: 420,
    },
    {
      name: 'Editor Agent',
      input: 'Select the most important stories and set the running order.',
      output_summary: '3 stories chosen with a global significance angle.',
      duration_ms: 1700,
      cost_usd: 0.002,
      tokens: 280,
    },
    {
      name: 'Writer Agent',
      input: 'Write a concise broadcast script from the approved brief.',
      output_summary: 'Two draft scripts produced for judging.',
      duration_ms: 9200,
      cost_usd: 0.041,
      tokens: 1800,
    },
    {
      name: 'Judge Agent',
      input: 'Evaluate the script for depth, accuracy, clarity, and audio quality.',
      output_summary: 'Draft 1 rejected, Draft 2 approved.',
      duration_ms: 3200,
      cost_usd: 0.003,
      tokens: 360,
      drafts: [
        {
          draft: 1,
          scores: {
            depth: 6,
            accuracy: 8,
            clarity: 7,
            newsworthiness: 7,
            audio_readiness: 6,
          },
          overall: 6.8,
          rewrite_triggered: true,
          rewrite_instruction:
            'Add specific figures and make the lead sound more natural when spoken aloud.',
        },
        {
          draft: 2,
          scores: {
            depth: 8,
            accuracy: 9,
            clarity: 8,
            newsworthiness: 8,
            audio_readiness: 9,
          },
          overall: 8.4,
          rewrite_triggered: false,
        },
      ],
    },
    {
      name: 'Voice Agent',
      input: 'Convert the approved script into a playable bulletin.',
      output_summary: 'MP3 generated and attached to the run.',
      duration_ms: 18200,
      cost_usd: 0.05,
    },
  ],
  transcript: fixtureGenerateResponse.transcript,
  sources: fixtureGenerateResponse.sources,
  audio_url: fixtureGenerateResponse.audioUrl,
  judge: fixtureGenerateResponse.judge,
  qa_events: [
    {
      question: 'What is the background on the ceasefire talks?',
      agent_spawned: 'Context Agent',
      answer: fixtureQaResponse.answer,
      duration_ms: 1200,
      cost_usd: 0.001,
      tokens: 190,
    },
  ],
  total_duration_ms: 34400,
  total_cost_usd: 0.098,
}

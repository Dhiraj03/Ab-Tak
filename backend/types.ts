export type FeedSource = {
  name: string;
  url: string;
  credibility: number;
};

export type StoryCandidate = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
  articleText: string;
  excerpt: string;
};

export type RankedStory = StoryCandidate & {
  scores: {
    recency: number;
    significance: number;
    credibility: number;
    overall: number;
  };
  reasoning: string;
};

export type EditorBriefItem = {
  storyId: string;
  title: string;
  source: string;
  link: string;
  angle: string;
  keyFacts: string[];
  tone: string;
};

export type EditorBrief = {
  task: string;
  coldOpen: string;
  headlinesTease: string[];
  stories: EditorBriefItem[];
  signOff: string;
};

// API Contract Types
export interface SourceLink {
  title: string;
  url: string;
  source?: string;
}

export interface JudgeScores {
  depth: number;
  accuracy: number;
  clarity: number;
  newsworthiness: number;
  audio_readiness: number;
}

export interface JudgeSummary {
  approvedDraft: number;
  scores: JudgeScores;
}

export interface GenerateRequest {
  task: string;
}

export interface GenerateResponse {
  runId: string;
  status: string;
  audioUrl: string;
  transcript: string;
  sources: SourceLink[];
  judge: JudgeSummary;
}

export interface QaRequest {
  runId: string;
  question: string;
}

export interface QaResponse {
  agent: string;
  answer: string;
  sources: SourceLink[];
  durationMs: number;
}

export interface QaEvent {
  question: string;
  agent_spawned: string;
  answer: string;
  duration_ms: number;
  cost_usd?: number;
  tokens?: number;
}

export interface AgentTrace {
  name: string;
  input: string;
  output_summary: string;
  duration_ms: number;
  cost_usd: number;
  tokens?: number;
}

export interface RunRecord {
  run_id: string;
  timestamp: string;
  task: string;
  status: string;
  agents: AgentTrace[];
  transcript: string;
  sources: SourceLink[];
  audio_url: string;
  judge: JudgeSummary;
  qa_events: QaEvent[];
  total_duration_ms: number;
  total_cost_usd: number;
}

// Headlines for live feed
export interface Headline {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  priority: 'high' | 'medium' | 'low';
}

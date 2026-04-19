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

export type JudgeScores = {
  depth: number;
  accuracy: number;
  clarity: number;
  newsworthiness: number;
  audio_readiness: number;
};

export type JudgeDraft = {
  draft: number;
  scores: JudgeScores;
  overall: number;
  rewrite_triggered: boolean;
  rewrite_instruction?: string;
};

export type JudgeResult = {
  approvedDraft: number;
  drafts: JudgeDraft[];
  finalScript: string;
};

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

export interface JudgeSummary {
  approvedDraft: number
  scores: JudgeScores
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
export type SourceLink = {
  title: string;
  url: string;
  source?: string;
};

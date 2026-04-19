export type PipelinePhase =
  | 'monitor'
  | 'editor'
  | 'writer'
  | 'judge'
  | 'voice'

export interface SourceLink {
  title: string
  url: string
  source?: string
}

export interface JudgeScores {
  depth: number
  accuracy: number
  clarity: number
  newsworthiness: number
  audio_readiness: number
}

export interface JudgeSummary {
  approvedDraft: number
  scores: JudgeScores
}

export interface GenerateRequest {
  task: string
}

export interface GenerateResponse {
  runId: string
  status: string
  audioUrl: string
  transcript: string
  sources: SourceLink[]
  judge: JudgeSummary
}

export interface QaRequest {
  runId: string
  question: string
}

export interface QaResponse {
  agent: string
  answer: string
  sources: SourceLink[]
  durationMs: number
}

// Headlines for live feed
export interface Headline {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  priority: 'high' | 'medium' | 'low'
}

export interface HeadlinesResponse {
  headlines: Headline[]
  count: number
}

export interface JudgeDraft {
  draft: number
  scores: JudgeScores
  overall: number
  rewrite_triggered: boolean
  rewrite_instruction?: string
}

export interface AgentTrace {
  name: string
  input: string
  output_summary: string
  duration_ms: number
  cost_usd: number
  tokens?: number
  drafts?: JudgeDraft[]
}

export interface QaEvent {
  question: string
  agent_spawned: string
  answer: string
  duration_ms: number
  cost_usd?: number
  tokens?: number
}

export interface RunRecord {
  run_id: string
  timestamp: string
  task: string
  status: string
  agents: AgentTrace[]
  transcript: string
  sources: SourceLink[]
  audio_url: string
  judge: JudgeSummary
  qa_events: QaEvent[]
  total_duration_ms: number
  total_cost_usd: number
}

// Evaluation system types
export interface EvalTask {
  id: string
  task: string
  expected_dimensions: string[]
  notes: string
}

export interface EvalResult {
  task_id: string
  task_description: string
  run_id: string
  timestamp: string
  judge_scores: JudgeScores
  overall_score: number
  passed: boolean
  duration_ms: number
  cost_usd: number
  transcript_length: number
  sources_count: number
  errors?: string[]
}

export interface EvalRun {
  eval_run_id: string
  timestamp: string
  status: 'running' | 'completed' | 'failed'
  results: EvalResult[]
  summary: {
    total_tasks: number
    passed_count: number
    failed_count: number
    average_score: number
    total_duration_ms: number
    total_cost_usd: number
  }
  version: string
}

export interface EvalSet {
  name: string
  description: string
  tasks: EvalTask[]
  scoring_guide: { [dimension: string]: string }
  pass_threshold: {
    minimum_average: number
    no_single_score_below: number
  }
}

// Live broadcast with images
export interface LiveStory {
  title: string
  url: string
  source: string
  imageUrl: string | null
  summary: string
  publishedAt: string
}

export interface GenerateLiveResponse {
  runId: string
  status: string
  audioUrl: string
  transcript: string
  stories: LiveStory[]
  judge: JudgeSummary
  currentStoryIndex?: number
}

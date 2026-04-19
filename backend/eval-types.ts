// Evaluation system types and interfaces

export interface EvalTask {
  id: string;
  task: string;
  expected_dimensions: string[];
  notes: string;
}

export interface EvalResult {
  task_id: string;
  task_description: string;
  run_id: string;
  timestamp: string;
  judge_scores: {
    depth: number;
    accuracy: number;
    clarity: number;
    newsworthiness: number;
    audio_readiness: number;
  };
  overall_score: number;
  passed: boolean;
  duration_ms: number;
  cost_usd: number;
  transcript_length: number;
  sources_count: number;
  errors?: string[];
}

export interface EvalRun {
  eval_run_id: string;
  timestamp: string;
  status: 'running' | 'completed' | 'failed';
  results: EvalResult[];
  summary: {
    total_tasks: number;
    passed_count: number;
    failed_count: number;
    average_score: number;
    total_duration_ms: number;
    total_cost_usd: number;
  };
  version: string; // Code version for iteration tracking
}

export interface EvalSet {
  name: string;
  description: string;
  tasks: EvalTask[];
  scoring_guide: {
    [dimension: string]: string;
  };
  pass_threshold: {
    minimum_average: number;
    no_single_score_below: number;
  };
}

// The standard eval set
export const STANDARD_EVAL_SET: EvalSet = {
  name: "Ab Tak Standard Eval Set",
  description: "5 standard news tasks for evaluating bulletin quality",
  tasks: [
    {
      id: "eval-1",
      task: "Cover the top global stories from the last 2 hours",
      expected_dimensions: ["depth", "accuracy", "clarity", "newsworthiness", "audio_readiness"],
      notes: "Standard baseline test - should capture major world news with good variety"
    },
    {
      id: "eval-2",
      task: "Report on technology and AI developments from today",
      expected_dimensions: ["depth", "accuracy", "clarity", "newsworthiness", "audio_readiness"],
      notes: "Tech-focused - should identify actual tech news and explain concepts clearly for audio"
    },
    {
      id: "eval-3",
      task: "Summarize breaking news about international relations and diplomacy",
      expected_dimensions: ["depth", "accuracy", "clarity", "newsworthiness", "audio_readiness"],
      notes: "Diplomacy focus - should handle nuanced stories with proper context and multiple viewpoints"
    },
    {
      id: "eval-4",
      task: "Cover economic and market news from the past 4 hours",
      expected_dimensions: ["depth", "accuracy", "clarity", "newsworthiness", "audio_readiness"],
      notes: "Business/economics - should include specific figures, market movements, and explain significance"
    },
    {
      id: "eval-5",
      task: "Report on science, health, and environment stories from today",
      expected_dimensions: ["depth", "accuracy", "clarity", "newsworthiness", "audio_readiness"],
      notes: "Science/health focus - should explain technical topics in accessible audio format"
    }
  ],
  scoring_guide: {
    depth: "1-10: Presence of specific facts, figures, named sources, and detailed context",
    accuracy: "1-10: Claims are traceable to sources, no factual errors",
    clarity: "1-10: Free of jargon, well-structured, easy to understand",
    newsworthiness: "1-10: Stories are genuinely significant and current",
    audio_readiness: "1-10: Natural spoken flow, proper pacing, works as audio"
  },
  pass_threshold: {
    minimum_average: 6.5,
    no_single_score_below: 5
  }
};

export function calculateOverallScore(scores: { [key: string]: number }): number {
  const values = Object.values(scores);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function checkPass(scores: { [key: string]: number }, threshold: { minimum_average: number; no_single_score_below: number }): boolean {
  const overall = calculateOverallScore(scores);
  const minScore = Math.min(...Object.values(scores));
  return overall >= threshold.minimum_average && minScore >= threshold.no_single_score_below;
}
